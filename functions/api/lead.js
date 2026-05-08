// POST /api/lead — form submission → ESP (Brevo by default, adapter-swappable)
//
// Deploy on Cloudflare Pages Functions (drop in /functions/api/lead.js).
// Required env vars (set in Cloudflare dashboard or wrangler.toml):
//   ESP_PROVIDER     — "brevo" | "mailchimp" | "hubspot" | "sendgrid" | "convertkit" | "resend"
//   ESP_API_KEY      — your ESP's API key
//   ALLOWED_ORIGINS  — comma-separated list of allowed origins

import * as brevo      from '../../adapters/brevo.js';
import * as mailchimp  from '../../adapters/mailchimp.js';
import * as hubspot    from '../../adapters/hubspot.js';
import * as sendgrid   from '../../adapters/sendgrid.js';
import * as convertkit from '../../adapters/convertkit.js';
import * as resend     from '../../adapters/resend.js';

const ADAPTERS = { brevo, mailchimp, hubspot, sendgrid, convertkit, resend };

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60_000;
const rateLimitMap = new Map();

function getAllowedOrigins(env) {
  if (env.ALLOWED_ORIGINS) return env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function corsHeaders(env, origin) {
  const allowed = getAllowedOrigins(env);
  const allow = allowed.includes(origin) ? origin : (allowed[0] ?? '');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(env, data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env, origin) },
  });
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) { rateLimitMap.set(ip, { count: 1, start: now }); return false; }
  return ++entry.count > RATE_LIMIT_MAX;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (s, max = 1000) => typeof s !== 'string' ? '' : s.trim().slice(0, max);
const safe  = (s) => clean(s).replace(/[\r\n]+/g, ' ');

export async function onRequestOptions({ request, env }) {
  const origin = request.headers.get('Origin') || '';
  return new Response(null, { status: getAllowedOrigins(env).includes(origin) ? 204 : 403, headers: corsHeaders(env, origin) });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') || '';
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  if (!getAllowedOrigins(env).includes(origin))
    return json(env, { success: false, error: 'origin_not_allowed' }, 403, origin);
  if (!env.ESP_API_KEY)
    return json(env, { success: false, error: 'server_misconfigured' }, 503, origin);
  if (isRateLimited(ip))
    return json(env, { success: false, error: 'rate_limited' }, 429, origin);

  let body;
  try { body = await request.json(); }
  catch { return json(env, { success: false, error: 'invalid_json' }, 400, origin); }

  // Honeypot — bots fill hidden fields; silently succeed so they don't retry
  if (body._honey || body.website || body.url) return json(env, { success: true }, 200, origin);

  const email = clean(body.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return json(env, { success: false, error: 'email_invalid' }, 422, origin);
  if (!body.list_id) return json(env, { success: false, error: 'list_id_required' }, 422, origin);

  // GDPR consent required
  if (body.consent !== true && body.consent !== 'true' && body.consent !== '1')
    return json(env, { success: false, error: 'consent_required' }, 422, origin);

  const payload = {
    email,
    listId:           body.list_id,
    firstname:        safe(body.firstname).slice(0, 100),
    lastname:         safe(body.lastname).slice(0, 100),
    company:          safe(body.company).slice(0, 200),
    phone:            safe(body.phone).slice(0, 50),
    subject:          safe(body.subject).slice(0, 200),
    message:          clean(body.message, 5000),
    source:           safe(body.source).slice(0, 500),
    formType:         safe(body.form_type).slice(0, 100),
    consentTimestamp: new Date().toISOString(),
  };

  const adapter = ADAPTERS[env.ESP_PROVIDER || 'brevo'];
  if (!adapter?.upsertContact) return json(env, { success: false, error: 'esp_provider_unknown' }, 503, origin);

  const result = await adapter.upsertContact(env, payload);
  if (!result.ok) return json(env, { success: false, error: 'esp_upsert_failed' }, 502, origin);

  return json(env, { success: true }, 200, origin);
}
