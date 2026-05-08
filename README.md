# lead-pipeline

Form submission handler for Cloudflare Pages/Workers — validates input, enforces GDPR consent, and upserts contacts into your ESP. Brevo is wired up by default; swap the adapter for any other provider without touching the core logic.

```
Browser form → POST /api/lead → validate + rate-limit + honeypot → ESP adapter → Brevo (or other)
```

## Features

- **CORS** — strict origin allowlist, preflight handled
- **Rate limiting** — 5 req/min per IP (in-memory, resets on worker restart)
- **Honeypot** — invisible fields trap bots; silently 200 so they don't retry
- **GDPR consent** — required field; server-side timestamp recorded
- **Adapter pattern** — swap ESP by changing one env var (`ESP_PROVIDER`)
- **Idempotent** — Brevo's `updateEnabled: true` prevents duplicate contacts

## Deploy

```bash
# Install Wrangler
npm install -g wrangler

# Set secrets
wrangler secret put ESP_API_KEY
wrangler secret put ALLOWED_ORIGINS   # https://your-domain.com,https://www.your-domain.com

# Deploy
wrangler pages deploy .
```

## Configuration

| Env var | Required | Description |
|---|---|---|
| `ESP_PROVIDER` | yes | `brevo` \| `mailchimp` \| `hubspot` \| `sendgrid` \| `convertkit` \| `resend` |
| `ESP_API_KEY` | yes | Your ESP's API key |
| `ALLOWED_ORIGINS` | yes | Comma-separated list of allowed origins |

## ESP adapters

| Provider | Status |
|---|---|
| Brevo | Implemented |
| Mailchimp | Stub (contribute via PR) |
| HubSpot | Stub |
| SendGrid | Stub |
| ConvertKit | Stub |
| Resend | Stub |

Each adapter exports one function: `upsertContact(env, payload) → { ok: boolean }`. See any existing adapter for the shape.

## Form example

See `examples/contact-form.html` for a drop-in form with honeypot, consent checkbox, and fetch-based submission. Edit `LIST_ID` and `FORM_TYPE` at the top.

## License

MIT
