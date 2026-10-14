import { readFile } from 'node:fs/promises';

/**
 * Smoke/integration test contra o stack DEV já iniciado.
 * Todas as entidades criadas usam e-mails sintéticos e são removidas ao final;
 * o primeiro guard impede que um endpoint remoto seja usado por acidente.
 */
const state = JSON.parse(await readFile('.dev/state.json', 'utf8'));
const admin = JSON.parse(await readFile('.dev/admin.json', 'utf8'));
const frontend = JSON.parse(await readFile('invite-app/dev-config.json', 'utf8'));
const apiUrl = new URL(state.apiUrl);

if (!['localhost', '127.0.0.1', '10.0.2.2'].includes(apiUrl.hostname)) {
  throw new Error('Integration test refused a non-local API URL.');
}

const origin = 'http://127.0.0.1:5500';
/** Constrói URLs apenas dentro do API URL previamente validado como local. */
const functionUrl = (name) => `${apiUrl.origin}/functions/v1/${name}`;

/** Faz requisição JSON e conserva status para asserções de contrato. */
async function jsonRequest(url, init = {}) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  let body = null;
  try { body = await response.json(); } catch { /* empty response */ }
  return { response, body };
}

/** Produz uma falha legível quando um passo HTTP diverge do cenário. */
function assertStatus(result, expected, label) {
  if (result.response.status !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, got ${result.response.status}`);
  }
}

/** Monta headers comuns às chamadas administrativas autenticadas. */
function adminHeaders(accessToken) {
  return {
    apikey: frontend.supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
    Origin: origin,
    'Content-Type': 'application/json',
  };
}

const tokenResult = await jsonRequest(`${apiUrl.origin}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: frontend.supabaseAnonKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: admin.email, password: admin.password }),
});
assertStatus(tokenResult, 200, 'local admin login');
const accessToken = tokenResult.body?.access_token;
if (!accessToken) throw new Error('Local admin login returned no access token.');

const event = await jsonRequest(functionUrl('event-config'));
assertStatus(event, 200, 'local event-config');
if (event.body?.success !== true || Object.keys(event.body.config ?? {}).length !== 14) {
  throw new Error('Local event-config did not return the 14-field contract.');
}

const unauthorized = await jsonRequest(`${functionUrl('admin-list-guests')}?page=1&page_size=10`, {
  headers: { apikey: frontend.supabaseAnonKey, Origin: origin },
});
if (![401, 403].includes(unauthorized.response.status)) {
  throw new Error(`Unauthorized admin request unexpectedly returned ${unauthorized.response.status}.`);
}

const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const rsvpEmail = `dev-rsvp-${suffix}@example.invalid`;
const rsvp = await jsonRequest(functionUrl('rsvp'), {
  method: 'POST',
  headers: { apikey: frontend.supabaseAnonKey, Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Convidado DEV Sintético', email: rsvpEmail, attendance: true, companions: 1 }),
});
assertStatus(rsvp, 201, 'valid local RSVP');

const duplicate = await jsonRequest(functionUrl('rsvp'), {
  method: 'POST',
  headers: { apikey: frontend.supabaseAnonKey, Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Convidado DEV Sintético', email: rsvpEmail, attendance: true, companions: 1 }),
});
assertStatus(duplicate, 409, 'duplicate local RSVP');

const invalid = await jsonRequest(functionUrl('rsvp'), {
  method: 'POST',
  headers: { apikey: frontend.supabaseAnonKey, Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: '', email: 'invalid', attendance: 'yes', companions: 99 }),
});
assertStatus(invalid, 400, 'invalid local RSVP');

const manualEmail = `dev-admin-${suffix}@example.invalid`;
const created = await jsonRequest(functionUrl('admin-manage-guests'), {
  method: 'POST',
  headers: adminHeaders(accessToken),
  body: JSON.stringify({
    action: 'create',
    guest: { name: 'Convidado Admin DEV', email: manualEmail, attendance: false, companions: 0 },
  }),
});
if (!created.response.ok || created.body?.success !== true || typeof created.body.id !== 'string') {
  throw new Error(`Admin create failed with HTTP ${created.response.status}.`);
}
const manualId = created.body.id;

const updated = await jsonRequest(functionUrl('admin-manage-guests'), {
  method: 'POST',
  headers: adminHeaders(accessToken),
  body: JSON.stringify({
    action: 'update',
    id: manualId,
    guest: { name: 'Convidado Admin DEV Atualizado', email: manualEmail, attendance: true, companions: 2 },
  }),
});
if (!updated.response.ok || updated.body?.success !== true) throw new Error('Admin update failed.');

const listed = await jsonRequest(`${functionUrl('admin-list-guests')}?page=1&page_size=10&search=${encodeURIComponent(rsvpEmail)}`, {
  headers: adminHeaders(accessToken),
});
assertStatus(listed, 200, 'admin paginated local list');
if (listed.body?.success !== true || listed.body.records?.[0]?.email !== rsvpEmail) {
  throw new Error('Admin list did not return the local RSVP.');
}

const contingencyId = crypto.randomUUID();
const contingencyToken = state.localContingencyToken;
const contingencyRecord = {
  request_id: contingencyId,
  created_at: new Date().toISOString(),
  name: 'Convidado Contingência DEV',
  email: `dev-contingency-${suffix}@example.invalid`,
  attendance: true,
  companions: 0,
  status: 'pending',
  error_type: 'DATABASE_ERROR',
  synced_at: new Date().toISOString(),
};
const localQueue = await jsonRequest('http://127.0.0.1:54328/records', {
  method: 'POST',
  headers: { 'X-Dev-Contingency-Token': contingencyToken, 'Content-Type': 'application/json' },
  body: JSON.stringify(contingencyRecord),
});
assertStatus(localQueue, 200, 'local contingency append');

const pending = await jsonRequest(functionUrl('admin-list-contingency'), {
  headers: adminHeaders(accessToken),
});
assertStatus(pending, 200, 'admin local contingency list');
if (!pending.body.records?.some((record) => record.request_id === contingencyId)) {
  const returnedIds = pending.body?.records?.map((record) => record.request_id).join(',') || 'none';
  throw new Error(`Admin contingency list did not return the synthetic record (HTTP ${pending.response.status}, error=${pending.body?.error ?? 'none'}, records=${pending.body?.records?.length ?? 'n/a'}, ids=${returnedIds}).`);
}

const recovered = await jsonRequest(functionUrl('admin-recover-contingency'), {
  method: 'POST',
  headers: adminHeaders(accessToken),
  body: JSON.stringify({ request_id: contingencyId }),
});
if (!recovered.response.ok || recovered.body?.success !== true || recovered.body?.contingency_removed !== true) {
  throw new Error(`Local contingency recovery failed with HTTP ${recovered.response.status}.`);
}

const recoveredList = await jsonRequest(`${functionUrl('admin-list-guests')}?page=1&page_size=10&search=${encodeURIComponent(contingencyRecord.email)}`, {
  headers: adminHeaders(accessToken),
});
assertStatus(recoveredList, 200, 'recovered local contingency guest list');
const recoveredId = recoveredList.body.records?.[0]?.id;

for (const id of [manualId, recoveredId, listed.body.records?.[0]?.id]) {
  if (!id) continue;
  await jsonRequest(functionUrl('admin-manage-guests'), {
    method: 'POST',
    headers: adminHeaders(accessToken),
    body: JSON.stringify({ action: 'delete', id }),
  });
}

const pendingAfter = await jsonRequest(functionUrl('admin-list-contingency'), {
  headers: adminHeaders(accessToken),
});
assertStatus(pendingAfter, 200, 'local contingency cleanup');
if (pendingAfter.body.records?.some((record) => record.request_id === contingencyId)) {
  throw new Error('Recovered local contingency record was not removed.');
}

console.log('DEV integration: Auth, Event Config, RSVP, duplicate/invalid validation, admin CRUD/pagination, local contingency recovery and cleanup passed.');
