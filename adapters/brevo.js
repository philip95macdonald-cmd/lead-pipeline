// Brevo adapter
// Docs: https://developers.brevo.com/reference/createcontact
// Env:  ESP_API_KEY (xkeysib-... key with contact-write scope)

export async function upsertContact(env, p) {
  const body = {
    email: p.email,
    updateEnabled: true,
    listIds: [Number(p.listId)],
    attributes: removeEmpty({
      FIRSTNAME:         p.firstname,
      LASTNAME:          p.lastname,
      MESSAGE:           p.message,
      SOURCE_URL:        p.source,
      FORM_TYPE:         p.formType,
      CONSENT_TIMESTAMP: p.consentTimestamp,
    }),
  };

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'api-key':      env.ESP_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 201 || res.status === 204) return { ok: true };

  let detail = null;
  try { detail = await res.json(); } catch {}
  if (detail?.code === 'duplicate_parameter' || detail?.message?.includes('already exist')) return { ok: true };
  return { ok: false, status: res.status, detail };
}

function removeEmpty(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''));
}
