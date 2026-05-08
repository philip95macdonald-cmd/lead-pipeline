[![CI](https://github.com/philip95macdonald-cmd/lead-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/philip95macdonald-cmd/lead-pipeline/actions)
![License](https://img.shields.io/badge/license-MIT-blue)

# lead-pipeline

Form submission handler for Cloudflare Pages/Workers. Built to replace the typical "paste an ESP embed code and hope for the best" approach — this gives you full control over validation, GDPR consent logging, bot filtering, and rate limiting, without managing a server.

```
Browser form → POST /api/lead → validate + rate-limit + honeypot → ESP adapter → Brevo (or other)
```

Brevo is wired up. Swap to any other ESP by changing one env var.

## Features

- **CORS** — strict origin allowlist, preflight handled correctly
- **Rate limiting** — 5 req/min per IP
- **Honeypot** — invisible fields trap bots; silently 200 so they don't retry
- **GDPR consent** — required field; server-side timestamp recorded (clients can't fake it)
- **Adapter pattern** — switch ESP by changing `ESP_PROVIDER`; zero core logic changes
- **Idempotent** — `updateEnabled: true` on Brevo; no duplicates

## Deploy (Cloudflare Pages)

```bash
npm install -g wrangler
wrangler secret put ESP_API_KEY
wrangler secret put ALLOWED_ORIGINS   # https://your-domain.com
wrangler pages deploy .
```

## Configuration

| Env var | Required | Description |
|---|---|---|
| `ESP_PROVIDER` | yes | `brevo` \| `mailchimp` \| `hubspot` \| `sendgrid` \| `convertkit` \| `resend` |
| `ESP_API_KEY` | yes | Your ESP's API key |
| `ALLOWED_ORIGINS` | yes | Comma-separated allowed origins |

## ESP adapters

| Provider | Status |
|---|---|
| Brevo | Full implementation |
| Mailchimp | Stub — contribute via PR |
| HubSpot | Stub |
| SendGrid | Stub |
| ConvertKit | Stub |
| Resend | Stub |

Each adapter exports one function: `upsertContact(env, payload) → { ok: boolean }`.

## Drop-in form

`examples/contact-form.html` — honeypot included, consent checkbox wired, submits via fetch. Edit `LIST_ID` at the top.

## License

MIT
