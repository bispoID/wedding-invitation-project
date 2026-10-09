import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = async (path, replacements = []) => {
  let code = await readFile(new URL('../' + path, import.meta.url), 'utf8');
  for (const [from, to] of replacements) code = code.replace(from, to);
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
};
const validation = await load('invite-app/admin/scripts/guest-validation.js');
const navigation = await load('invite-app/admin/scripts/navigation.js', [
  ["import { APP_BASE_URL } from '../../scripts/shared/app-config.js';", "const APP_BASE_URL = 'https://example.invalid/invite/';"],
]);
const dateTimeSource = await readFile(new URL('../invite-app/admin/scripts/date-time.js', import.meta.url), 'utf8');
const dateTimeUrl = 'data:text/javascript;base64,' + Buffer.from(dateTimeSource).toString('base64');
const dateTime = await import(dateTimeUrl);
const timestampImport = ["import { formatTimestamp } from './date-time.js';", "import { formatTimestamp } from '" + dateTimeUrl + "';"];
const eventModule = await load('invite-app/admin/scripts/event-config.js', [
  timestampImport,
  ["import { callAdminFunction } from './functions.js';", 'const callAdminFunction = () => { throw new Error("No real network"); };'],
]);
const guest = { name: ' Nome Á Sintético ', email: ' TEST@example.invalid ', attendance: true, companions: 2 };
const rsvpModule = await load('invite-app/scripts/letter/rsvp.js', [
  ["import { FUNCTIONS_BASE_URL } from '../shared/app-config.js';", "const FUNCTIONS_BASE_URL = 'https://example.invalid/functions/v1/';"],
]);

async function withRsvpForm(run) {
  const previous = { document: globalThis.document, FormData: globalThis.FormData, fetch: globalThis.fetch };
  const fields = { name: 'Synthetic RSVP', email: 'rsvp@example.invalid', attendance: 'yes', companions: '2' };
  const button = { disabled: false };
  const companions = { disabled: false, focus() {} };
  const feedback = { textContent: '' };
  const attrs = {};
  let submit, resets = 0;
  const requests = [];
  const form = {
    querySelector: (selector) => selector === '#companions' ? companions : button,
    addEventListener: (_, listener) => { submit = listener; },
    checkValidity: () => true,
    reportValidity() {},
    setAttribute: (name, value) => { attrs[name] = value; },
    removeAttribute: (name) => { delete attrs[name]; },
    reset() { resets++; Object.assign(fields, { name: '', email: '', attendance: '', companions: '0' }); },
  };
  globalThis.document = { querySelector: (selector) => selector === '.rsvp-form' ? form : feedback };
  globalThis.FormData = class { get(name) { return fields[name]; } };
  globalThis.fetch = (url, options) => new Promise((resolve, reject) => {
    requests.push({ url, payload: JSON.parse(options.body), resolve, reject });
  });
  try {
    rsvpModule.initRsvp();
    await run({ fields, button, companions, feedback, attrs, requests,
      submit: () => submit({ preventDefault() {} }), resets: () => resets });
  } finally {
    Object.assign(globalThis, previous);
  }
}

test('RSVP 201 resets defaults, preserves success and allows second submit without double-submit', async () => {
  await withRsvpForm(async (ui) => {
    const first = ui.submit();
    assert.equal(ui.button.disabled, true);
    assert.equal(ui.attrs['aria-busy'], 'true');
    assert.match(ui.feedback.textContent, /Enviando/);
    assert.doesNotMatch(ui.feedback.textContent, /Presença confirmada/);
    await ui.submit();
    assert.equal(ui.requests.length, 1);
    assert.equal(ui.requests[0].payload.attendance, true);
    assert.equal(ui.resets(), 0);
    ui.companions.disabled = true;
    ui.requests[0].resolve(new Response(null, { status: 201 }));
    await first;
    assert.equal(ui.feedback.textContent, 'Presença confirmada! Agradecemos pela sua confirmação.');
    assert.deepEqual(ui.fields, { name: '', email: '', attendance: '', companions: '0' });
    assert.equal(ui.companions.disabled, false);
    assert.equal(ui.button.disabled, false);
    assert.equal(ui.attrs['aria-busy'], undefined);
    assert.equal(ui.resets(), 1);
    Object.assign(ui.fields, { name: 'Second synthetic RSVP', email: 'second@example.invalid', attendance: 'yes', companions: '1' });
    const second = ui.submit();
    assert.equal(ui.requests.length, 2);
    assert.equal(ui.requests[1].payload.email, 'second@example.invalid');
    assert.equal(ui.button.disabled, true);
    ui.requests[1].resolve(new Response(null, { status: 201 }));
    await second;
    assert.equal(ui.resets(), 2);
    assert.equal(ui.button.disabled, false);
  });
});

test('RSVP absent 201 uses submitted attendance, sends zero companions and resets the form', async () => {
  await withRsvpForm(async (ui) => {
    Object.assign(ui.fields, { attendance: 'no', companions: '0' });
    const sending = ui.submit();
    assert.equal(ui.requests.length, 1);
    assert.deepEqual(ui.requests[0].payload, {
      name: 'Synthetic RSVP', email: 'rsvp@example.invalid', attendance: false, companions: 0,
    });
    // A later form change must not replace the response that was actually sent.
    ui.fields.attendance = 'yes';
    ui.requests[0].resolve(new Response(null, { status: 201 }));
    await sending;
    assert.equal(ui.feedback.textContent, 'Resposta confirmada! Agradecemos por nos avisar.');
    assert.deepEqual(ui.fields, { name: '', email: '', attendance: '', companions: '0' });
    assert.equal(ui.resets(), 1);
    assert.equal(ui.companions.disabled, false);
    assert.equal(ui.button.disabled, false);
    assert.equal(ui.attrs['aria-busy'], undefined);
  });
});

for (const attendance of ['yes', 'no']) for (const status of [400, 409, 429, 500, 200, 202]) {
  test(`RSVP attendance=${attendance} HTTP ${status} does not reset and allows retry`, async () => {
    await withRsvpForm(async (ui) => {
      Object.assign(ui.fields, { attendance, companions: attendance === 'yes' ? '2' : '0' });
      const initial = { ...ui.fields };
      const sending = ui.submit();
      ui.requests[0].resolve(Response.json({ success: false }, { status }));
      await sending;
      assert.deepEqual(ui.fields, initial);
      assert.equal(ui.resets(), 0);
      assert.equal(ui.button.disabled, false);
      assert.equal(ui.attrs['aria-busy'], undefined);
      assert.doesNotMatch(ui.feedback.textContent, /Presença confirmada|Resposta confirmada/);
      const retry = ui.submit();
      assert.equal(ui.requests.length, 2);
      ui.requests[1].resolve(Response.json({ success: false }, { status }));
      await retry;
    });
  });
}

test('RSVP network failure retains entered data and enables retry', async () => {
  await withRsvpForm(async (ui) => {
    const initial = { ...ui.fields };
    const sending = ui.submit();
    ui.requests[0].reject(new Error('Synthetic offline failure'));
    await sending;
    assert.deepEqual(ui.fields, initial);
    assert.equal(ui.resets(), 0);
    assert.equal(ui.button.disabled, false);
    assert.equal(ui.attrs['aria-busy'], undefined);
    assert.match(ui.feedback.textContent, /Verifique sua conexão/);
  });
});

for (const attendance of ['yes', 'no']) test(`RSVP attendance=${attendance} confirmed contingency preserves existing behavior without reset`, async () => {
  await withRsvpForm(async (ui) => {
    Object.assign(ui.fields, { attendance, companions: attendance === 'yes' ? '2' : '0' });
    const initial = { ...ui.fields };
    const sending = ui.submit();
    ui.requests[0].resolve(Response.json({ success: false, contingency: true, error: 'RSVP_SAVED_TO_CONTINGENCY' }, { status: 202 }));
    await sending;
    assert.deepEqual(ui.fields, initial);
    assert.equal(ui.resets(), 0);
    assert.equal(ui.feedback.textContent, 'Sua confirmação foi recebida e salva. Devido a uma instabilidade, ela será processada posteriormente.');
    assert.equal(ui.button.disabled, true);
    assert.equal(ui.attrs['aria-busy'], 'false');
    await ui.submit();
    assert.equal(ui.requests.length, 1);
  });
});
for (const change of [
  { name: '' }, { name: 'a'.repeat(201) }, { email: 'invalid' },
  { email: 'a'.repeat(307) + '@example.invalid' }, { attendance: 'false' },
  { companions: -1 }, { companions: 16 }, { companions: 1.5 },
]) test('browser guest rejects ' + JSON.stringify(change).slice(0, 35), () => {
  assert.ok(validation.validateGuest({ ...guest, ...change }).error);
});
test('browser guest normalization and Unicode boundaries', () => {
  assert.deepEqual(validation.validateGuest({ ...guest, attendance: false }).guest,
    { name: 'Nome Á Sintético', email: 'test@example.invalid', attendance: false, companions: 0 });
  assert.ok(validation.validateGuest({ ...guest, name: '😀'.repeat(200) }).guest);
});
for (const base of ['https://example.invalid/', 'https://example.invalid/repository/']) {
  test('preview URLs root/subpath ' + base, () => {
    const links = navigation.buildInvitationLinks(base);
    assert.equal(links.main, base);
    for (const mode of ['cover', 'envelope-card', 'letter']) {
      const url = new URL(links[mode]);
      assert.equal(url.pathname, new URL(base).pathname);
      assert.equal(url.searchParams.get('devmode'), mode);
    }
  });
}
class Element {
  constructor() { this.value = ''; this.disabled = false; this.hidden = false; this.textContent = ''; this.dataset = {}; this.attrs = {}; this.events = {}; this.children = []; }
  addEventListener(name, listener) { this.events[name] = listener; }
  setAttribute(name, value) { this.attrs[name] = value; }
  getAttribute(name) { return this.attrs[name] ?? null; }
  removeAttribute(name) { delete this.attrs[name]; }
  replaceChildren(...children) { this.children = children; }
  append(...children) { this.children.push(...children); }
  reportValidity() { return true; }
  focus() {}
  close() { this.open = false; }
  showModal() { this.open = true; }
}
function eventRoot() {
  const fields = Object.fromEntries(eventModule.EVENT_FIELDS.map((field) => [field, new Element()]));
  const form = new Element();
  form.elements = Object.values(fields);
  form.elements.namedItem = (name) => fields[name];
  const save = new Element(); form.elements.push(save);
  const elements = { '#event-form': form };
  for (const id of ['event-feedback', 'event-loading', 'event-retry', 'event-updated', 'event-toggle', 'event-content']) elements['#' + id] = new Element();
  elements['#event-toggle'].setAttribute('aria-controls', 'event-content');
  return { querySelector: (id) => elements[id], fields, form, elements };
}
function assertEventExpanded(root, expanded) {
  assert.equal(root.elements['#event-toggle'].getAttribute('aria-expanded'), String(expanded));
  assert.equal(root.elements['#event-content'].hidden, !expanded);
}
const eventFixture = Object.fromEntries(eventModule.EVENT_FIELDS.map((field) => [field, ['bride_name', 'groom_name', 'city', 'state', 'ceremony_name'].includes(field) ? 'Sintético' : null]));
eventFixture.event_date = '2030-01-01'; eventFixture.event_time = '12:30';
test('event collapsible starts closed, loads all fields while closed and toggles without requests or data loss', async () => {
  const root = eventRoot();
  const requests = [];
  let resolve;
  const loading = eventModule.initializeEventConfig(root, (method) => {
    requests.push(method);
    return new Promise((done) => { resolve = done; });
  });
  assertEventExpanded(root, false);
  assert.equal(root.elements['#event-toggle'].getAttribute('aria-controls'), 'event-content');
  assert.deepEqual(requests, ['GET']);
  assert.ok(root.form.elements.every((element) => element.disabled));
  resolve({ ...eventFixture, updated_at: '2026-10-09T03:04:02.407812+00:00' });
  await loading;
  assertEventExpanded(root, false);
  assert.equal(root.form.hidden, false);
  for (const field of eventModule.EVENT_FIELDS) assert.equal(root.fields[field].value, eventFixture[field] ?? '');
  assert.equal(root.elements['#event-updated'].textContent, 'Atualizado em: 09/10/2026 às 00:04');
  root.fields.reception_city.value = 'Cidade em edição';
  const values = eventModule.readEventForm(root.form);
  root.elements['#event-toggle'].events.click();
  assertEventExpanded(root, true);
  assert.deepEqual(eventModule.readEventForm(root.form), values);
  root.elements['#event-toggle'].events.click();
  assertEventExpanded(root, false);
  assert.deepEqual(eventModule.readEventForm(root.form), values);
  assert.deepEqual(requests, ['GET']);
});
test('event collapsible state is not carried over to a new page initialization', async () => {
  const first = eventRoot();
  await eventModule.initializeEventConfig(first, async () => eventFixture);
  first.elements['#event-toggle'].events.click();
  assertEventExpanded(first, true);
  const next = eventRoot();
  await eventModule.initializeEventConfig(next, async () => eventFixture);
  assertEventExpanded(next, false);
});
test('event collapsible keeps editing, save and confirmed success expanded with the same 14-field payload', async () => {
  const root = eventRoot();
  let resolve, payload;
  await eventModule.initializeEventConfig(root, (method, config) => {
    if (method === 'GET') return Promise.resolve(eventFixture);
    payload = config;
    return new Promise((done) => { resolve = done; });
  });
  root.elements['#event-toggle'].events.click();
  root.fields.city.value = 'Cidade editada';
  assertEventExpanded(root, true);
  const saving = root.form.events.submit({ preventDefault() {} });
  assertEventExpanded(root, true);
  assert.deepEqual(Object.keys(payload), eventModule.EVENT_FIELDS);
  assert.equal(payload.city, 'Cidade editada');
  assert.ok(root.form.elements.every((element) => element.disabled));
  resolve({ ...payload, updated_at: '2026-10-09T03:04:02.407812+00:00' });
  await saving;
  assertEventExpanded(root, true);
  assert.equal(root.elements['#event-feedback'].hidden, false);
  assert.match(root.elements['#event-feedback'].textContent, /confirmada/);
  assert.deepEqual(eventModule.readEventForm(root.form), payload);
  root.elements['#event-toggle'].events.click();
  assertEventExpanded(root, false);
  assert.deepEqual(eventModule.readEventForm(root.form), payload);
  root.elements['#event-toggle'].events.click();
  const nextSave = root.form.events.submit({ preventDefault() {} });
  root.elements['#event-toggle'].events.click();
  assertEventExpanded(root, false);
  resolve(payload);
  await nextSave;
  assertEventExpanded(root, true);
  assert.equal(root.elements['#event-feedback'].hidden, false);
});
test('event collapsible reveals save failure even after manual collapse and preserves edits', async () => {
  const root = eventRoot();
  let reject;
  await eventModule.initializeEventConfig(root, (method) => method === 'GET'
    ? Promise.resolve(eventFixture) : new Promise((_, fail) => { reject = fail; }));
  root.elements['#event-toggle'].events.click();
  root.fields.reception_city.value = 'Edição preservada';
  const values = eventModule.readEventForm(root.form);
  const saving = root.form.events.submit({ preventDefault() {} });
  root.elements['#event-toggle'].events.click();
  assertEventExpanded(root, false);
  reject(new Error('Synthetic save failure'));
  await saving;
  assertEventExpanded(root, true);
  assert.equal(root.elements['#event-feedback'].hidden, false);
  assert.match(root.elements['#event-feedback'].textContent, /edições foram preservadas/);
  assert.deepEqual(eventModule.readEventForm(root.form), values);
  assert.ok(root.form.elements.every((element) => !element.disabled));
});
test('event collapsible reveals GET failure and retry success does not close the section', async () => {
  const root = eventRoot();
  let reject, calls = 0;
  const loading = eventModule.initializeEventConfig(root, () => {
    calls++;
    return calls === 1 ? new Promise((_, fail) => { reject = fail; }) : Promise.resolve(eventFixture);
  });
  assertEventExpanded(root, false);
  reject(new Error('Synthetic load failure'));
  await loading;
  assertEventExpanded(root, true);
  assert.equal(root.elements['#event-retry'].hidden, false);
  assert.equal(root.elements['#event-feedback'].hidden, false);
  await root.elements['#event-retry'].events.click();
  assertEventExpanded(root, true);
  assert.equal(root.elements['#event-retry'].hidden, true);
  assert.equal(root.fields.city.value, eventFixture.city);
  assert.equal(calls, 2);
});
test('event collapsible reveals validation feedback without changing the PUT behavior', async () => {
  const root = eventRoot();
  let puts = 0;
  await eventModule.initializeEventConfig(root, async (method) => {
    if (method === 'PUT') puts++;
    return eventFixture;
  });
  root.fields.reception_maps_url.value = 'javascript:alert(1)';
  await root.form.events.submit({ preventDefault() {} });
  assertEventExpanded(root, true);
  assert.equal(root.elements['#event-feedback'].hidden, false);
  assert.match(root.elements['#event-feedback'].textContent, /URLs HTTPS/);
  assert.equal(root.fields.reception_maps_url.value, 'javascript:alert(1)');
  assert.equal(puts, 0);
});
test('event collapsible markup associates a native heading button with all content and scoped focus and chevron styles', async () => {
  const html = await readFile(new URL('../invite-app/admin/index.html', import.meta.url), 'utf8');
  const section = html.match(/<section class="event-panel"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section);
  assert.match(section, /<h2 id="event-title">\s*<button id="event-toggle" class="event-toggle" type="button" aria-expanded="false" aria-controls="event-content">/);
  assert.match(section, /<span class="event-toggle__chevron" aria-hidden="true"><\/span>/);
  const content = section.match(/<div id="event-content" hidden>([\s\S]*)<\/div>\s*<\/section>/)?.[1];
  assert.ok(content);
  assert.doesNotMatch(content, /id="event-toggle"/);
  assert.match(content, /Os dados cadastrados serão públicos/);
  for (const id of ['event-loading', 'event-feedback', 'event-retry', 'event-form', 'event-updated']) assert.ok(content.includes('id="' + id + '"'));
  assert.match(content, /type="submit">Salvar configuração<\/button>/);
  assert.deepEqual([...content.matchAll(/<input[^>]+name="([^"]+)"/g)].map((match) => match[1]), eventModule.EVENT_FIELDS);
  const css = await readFile(new URL('../invite-app/admin/styles/dashboard.css', import.meta.url), 'utf8');
  assert.match(css, /\.event-toggle:focus-visible\s*\{\s*outline: 3px solid var\(--admin-focus\)/);
  assert.match(css, /\.event-toggle\[aria-expanded="true"\] \.event-toggle__chevron\s*\{\s*transform: rotate\(225deg\)/);
  const source = await readFile(new URL('../invite-app/admin/scripts/event-config.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|keydown|keyup/);
});
test('event UI loading and empty config allow first fill', async () => {
  const root = eventRoot();
  let resolve;
  const task = eventModule.initializeEventConfig(root, () => new Promise((done) => { resolve = done; }));
  assert.ok(root.form.elements.every((element) => element.disabled));
  assert.equal(root.elements['#event-loading'].hidden, false);
  resolve(null); await task;
  assert.equal(root.form.hidden, false);
  assert.ok(root.form.elements.every((element) => !element.disabled));
  assert.equal(root.fields.bride_name.value, '');
  assert.match(root.elements['#event-feedback'].textContent, /Nenhuma configuração/);
  assertEventExpanded(root, true);
});
test('event UI GET failure is isolated and offers retry', async () => {
  const root = eventRoot();
  await eventModule.initializeEventConfig(root, () => Promise.reject(new Error('failure')));
  assert.equal(root.form.hidden, true);
  assert.equal(root.elements['#event-retry'].hidden, false);
  assert.match(root.elements['#event-feedback'].textContent, /outros módulos/);
});
test('event UI PUT waits for confirmation and retains edits on failure', async () => {
  const root = eventRoot();
  let resolve, reject;
  let received;
  await eventModule.initializeEventConfig(root, (method, config) => {
    if (method === 'GET') return Promise.resolve(eventFixture);
    received = config; return new Promise((yes, no) => { resolve = yes; reject = no; });
  });
  root.fields.city.value = '<img src=x onerror=alert(1)>';
  const submit = root.form.events.submit({ preventDefault() {} });
  assert.ok(root.form.elements.every((element) => element.disabled));
  assert.equal(root.elements['#event-feedback'].hidden, true);
  assert.equal(Object.keys(received).length, 14);
  assert.ok(!('id' in received) && !('updated_at' in received));
  reject(new Error('database')); await submit;
  assert.equal(root.fields.city.value, '<img src=x onerror=alert(1)>');
  assert.match(root.elements['#event-feedback'].textContent, /Não foi possível salvar/);
  const success = root.form.events.submit({ preventDefault() {} });
  resolve({ ...received, updated_at: '2030-01-01T00:00:00Z' }); await success;
  assert.match(root.elements['#event-feedback'].textContent, /confirmada/);
  assert.equal(root.fields.city.value, '<img src=x onerror=alert(1)>');
});
test('event API GET/PUT exact payload and no optimistic false success', async () => {
  let options;
  await eventModule.requestEventConfig('PUT', eventFixture, async (name, received) => {
    assert.equal(name, 'admin-manage-event-config'); options = received;
    return { success: true, config: eventFixture };
  });
  assert.deepEqual(options, { method: 'PUT', body: { config: eventFixture } });
  await assert.rejects(eventModule.requestEventConfig('PUT', eventFixture, () => Promise.resolve({ success: true, config: null })));
  await assert.rejects(eventModule.requestEventConfig('GET', undefined, () => Promise.resolve({ success: false })));
});
test('event UI rejects unsafe URLs and reception without name', async () => {
  const root = eventRoot(); let puts = 0;
  await eventModule.initializeEventConfig(root, (method) => {
    if (method === 'PUT') puts++;
    return Promise.resolve(eventFixture);
  });
  root.fields.reception_maps_url.value = 'javascript:alert(1)';
  await root.form.events.submit({ preventDefault() {} });
  assert.equal(puts, 0);
  root.fields.reception_maps_url.value = '';
  root.fields.reception_address.value = 'Endereço sintético';
  await root.form.events.submit({ preventDefault() {} });
  assert.equal(puts, 0);
});
test('guest create/update UI uses shared dialog and confirms backend before closing', async () => {
  const oldDocument = globalThis.document;
  const oldFormData = globalThis.FormData;
  const oldHooks = globalThis.__block3;
  const elements = {};
  const get = (id) => elements[id] ??= new Element();
  const form = get('#guest-form');
  const fields = Object.fromEntries(['name', 'email', 'attendance', 'companions'].map((field) => [field, get('#guest-' + field)]));
  form.elements = Object.assign(Object.values(fields), fields);
  form.elements.push(get('#guest-cancel'), get('#guest-save'));
  form.reset = () => { for (const [name, element] of Object.entries(fields)) element.value = name === 'attendance' ? 'true' : ''; };
  let resolve, reject, payload;
  globalThis.__block3 = {
    guest: { id: 'synthetic-uuid', name: '<b>Nome sintético</b>', email: 'test@example.invalid', attendance: true, companions: 0 },
    manage: (...args) => { payload = args; return new Promise((done, fail) => { resolve = done; reject = fail; }); },
  };
  globalThis.document = {
    body: { dataset: { page: 'dashboard' } }, querySelector: get,
    createElement: () => new Element(),
  };
  globalThis.FormData = class { constructor(target) { this.form = target; } get(name) { return this.form.elements[name].value; } };
  try {
    await load('invite-app/admin/scripts/main.js', [
      timestampImport,
      ["import { getCurrentSession, signIn, signOut } from './auth.js';", "const getCurrentSession = async () => ({user:{email:'admin@example.invalid'}}); const signIn = async()=>{}; const signOut=async()=>{};"],
      ["import { getPendingContingency, manageGuest, recoverContingency } from './contingency.js';", "const getPendingContingency=async()=>[]; const manageGuest=(...args)=>globalThis.__block3.manage(...args); const recoverContingency=async()=>{};"],
      ["import { getGuests } from './guests.js';", "const getGuests=async()=>[globalThis.__block3.guest];"],
      ["import { calculateGuestMetrics } from './guest-metrics.js';", "const calculateGuestMetrics=()=>({});"],
      ["import { validateGuest } from './guest-validation.js';", 'const validateGuest = ' + validation.validateGuest.toString() + ';'],
      ["import { initializeEventConfig } from './event-config.js';", "const initializeEventConfig=async()=>{};"],
      ["import { initializeInvitationLinks } from './navigation.js';", "const initializeInvitationLinks=()=>{};"],
    ]);
    await new Promise((done) => setImmediate(done));
    get('#guest-create').events.click();
    assert.equal(get('#guest-dialog-title').textContent, 'Criar convidado');
    assert.equal(form.dataset.guestId, undefined);
    fields.name.value = 'Nome sintético'; fields.email.value = 'test@example.invalid';
    const saving = form.events.submit({ preventDefault() {} });
    assert.equal(payload[0], 'create');
    assert.equal(get('#guest-dialog').open, true);
    assert.ok(form.elements.every((control) => control.disabled));
    resolve({ success: true }); await saving;
    assert.equal(get('#guest-dialog').open, false);
    assert.ok(form.elements.every((control) => !control.disabled));
    const row = get('#guests-table-body').children[0];
    assert.equal(row.children[0].textContent, '<b>Nome sintético</b>');
    row.children.at(-1).children[0].events.click();
    assert.equal(form.dataset.mode, 'update');
    const edit = form.events.submit({ preventDefault() {} });
    assert.equal(payload[0], 'update'); assert.equal(payload[1], 'synthetic-uuid');
    reject(new Error('Falha sintética')); await edit;
    assert.equal(get('#guest-dialog').open, true);
    assert.equal(get('#guest-form-error').textContent, 'Falha sintética');
    assert.ok(form.elements.every((control) => !control.disabled));
    const retry = form.events.submit({ preventDefault() {} });
    resolve({ success: true }); await retry;
    assert.equal(get('#guest-dialog').open, false);
  } finally {
    globalThis.document = oldDocument; globalThis.FormData = oldFormData; globalThis.__block3 = oldHooks;
  }
});
test('shared admin helper preserves errors and create/update/delete payloads', async () => {
  const oldHook = globalThis.__adminInvoke;
  const oldCall = globalThis.__adminCall;
  let outcome = { data: null, error: null };
  let request;
  globalThis.__adminInvoke = async (name, options) => { request = { name, options }; return outcome; };
  try {
    const helper = await load('invite-app/admin/scripts/functions.js', [
      ["import { getSupabaseClient } from './supabase.js';", "const getSupabaseClient=async()=>({functions:{invoke:(...args)=>globalThis.__adminInvoke(...args)}});"],
    ]);
    globalThis.__adminCall = helper.callAdminFunction;
    const api = await load('invite-app/admin/scripts/contingency.js', [
      ["import { callAdminFunction } from './functions.js';", "const callAdminFunction=(...args)=>globalThis.__adminCall(...args);"],
      ["export { AdminFunctionError } from './functions.js';", ''],
    ]);
    for (const [action, result] of [['create', 'created'], ['update', 'updated'], ['delete', 'deleted']]) {
      outcome = { data: { success: true, action: result, id: 'synthetic-id' }, error: null };
      await api.manageGuest(action, action === 'create' ? undefined : 'synthetic-id', guest);
      assert.equal(request.name, 'admin-manage-guests');
      assert.equal(request.options.body.action, action);
      assert.equal('id' in request.options.body, action !== 'create');
      assert.equal('guest' in request.options.body, action !== 'delete');
    }
    outcome = { data: { success: false }, error: null };
    await assert.rejects(api.manageGuest('create', undefined, guest), /não foi confirmada/);
    outcome = { data: null, error: { context: Response.json({ error: 'EMAIL_ALREADY_REGISTERED', message: 'Duplicado' }, { status: 409 }) } };
    await assert.rejects(api.manageGuest('create', undefined, guest), (error) => error.code === 'EMAIL_ALREADY_REGISTERED' && error.status === 409);
  } finally { globalThis.__adminInvoke = oldHook; globalThis.__adminCall = oldCall; }
});

test('timestamp presentation is explicitly Sao Paulo regardless of machine timezone', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(dateTime.formatTimestamp('2026-10-09T03:04:02.407812+00:00'), '09/10/2026 às 00:04');
      assert.equal(dateTime.formatTimestamp('2026-10-09T01:00:00Z'), '08/10/2026 às 22:00');
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});
test('timestamp presentation handles invalid or absent values safely', () => {
  for (const value of [null, undefined, '', 'not-a-date']) assert.equal(dateTime.formatTimestamp(value), '—');
});
test('event admin GET preserves existing fields, null reception location and civil time without auto-save', async () => {
  const root = eventRoot(); let puts = 0;
  const config = { ...eventFixture, event_time: '17:00', updated_at: '2026-10-09T03:04:02.407812+00:00' };
  await eventModule.initializeEventConfig(root, async (method) => { if (method === 'PUT') puts++; return config; });
  for (const field of eventModule.EVENT_FIELDS) assert.equal(root.fields[field].value, config[field] ?? '');
  assert.equal(root.fields.reception_city.value, '');
  assert.equal(root.fields.reception_state.value, '');
  assert.equal(root.fields.event_time.value, '17:00');
  assert.equal(root.elements['#event-updated'].textContent, 'Atualizado em: 09/10/2026 às 00:04');
  assert.equal(puts, 0);
  root.fields.reception_city.value = ' Cidade independente ';
  root.fields.reception_state.value = ' UF ';
  const payload = eventModule.readEventForm(root.form);
  assert.equal(payload.reception_city, 'Cidade independente');
  assert.equal(payload.reception_state, 'UF');
  assert.equal(Object.keys(payload).length, 14);
  root.fields.reception_city.value = ' '; root.fields.reception_state.value = '';
  assert.equal(eventModule.readEventForm(root.form).reception_city, null);
  assert.equal(eventModule.readEventForm(root.form).reception_state, null);
  assert.equal(payload.event_time, '17:00');
});
test('event form has accessible optional reception location and isolated approved spacing', async () => {
  const html = await readFile(new URL('../invite-app/admin/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../invite-app/admin/styles/dashboard.css', import.meta.url), 'utf8');
  for (const [field, limit] of [['reception_city', 150], ['reception_state', 100]]) {
    assert.ok(html.includes('for="event-' + field + '"'));
    assert.ok(html.includes('id="event-' + field + '" name="' + field + '" type="text" maxlength="' + limit + '"'));
  }
  assert.match(css, /#event-feedback\s*\{\s*margin-bottom:\s*12px;/);
  assert.match(css, /#event-updated\s*\{\s*margin-top:\s*12px;/);
  const main = await readFile(new URL('../invite-app/admin/scripts/main.js', import.meta.url), 'utf8');
  assert.match(main, /formatTimestamp\(guest.created_at\)/);
  assert.match(main, /formatTimestamp\(record.created_at\)/);
});

test('admin touch highlight is limited to interactive controls and preserves visible keyboard focus', async () => {
  const css = await readFile(new URL('../invite-app/admin/styles/main.css', import.meta.url), 'utf8');
  const dashboard = await readFile(new URL('../invite-app/admin/styles/dashboard.css', import.meta.url), 'utf8');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*-webkit-tap-highlight-color[^{}]*)\}/g)];
  assert.equal(rules.length, 1);
  assert.deepEqual(rules[0][1].trim().split(/\s*,\s*/).sort(), ['a', 'button', 'input', 'select']);
  assert.equal(rules[0][2].trim(), '-webkit-tap-highlight-color: transparent;');
  assert.match(css, /\.button:focus-visible,\s*input:focus-visible,\s*select:focus-visible\s*\{\s*outline: 3px solid var\(--admin-focus\);\s*outline-offset: 2px;/);
  assert.match(dashboard, /\.event-toggle:focus-visible\s*\{\s*outline: 3px solid var\(--admin-focus\);\s*outline-offset: 2px;/);
  assert.doesNotMatch(css + dashboard, /outline(?:-style)?\s*:\s*(?:none|0\b)/);
  assert.match(css, /\.button:hover\s*\{/);
  assert.match(css, /\.button:active:not\(:disabled\)\s*\{/);
});
