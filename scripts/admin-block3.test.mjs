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
const eventModule = await load('invite-app/admin/scripts/event-config.js', [
  ["import { callAdminFunction } from './functions.js';", 'const callAdminFunction = () => { throw new Error("No real network"); };'],
]);
const guest = { name: ' Nome Á Sintético ', email: ' TEST@example.invalid ', attendance: true, companions: 2 };
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
  for (const id of ['event-feedback', 'event-loading', 'event-retry', 'event-updated']) elements['#' + id] = new Element();
  return { querySelector: (id) => elements[id], fields, form, elements };
}
const eventFixture = Object.fromEntries(eventModule.EVENT_FIELDS.map((field) => [field, ['bride_name', 'groom_name', 'city', 'state', 'ceremony_name'].includes(field) ? 'Sintético' : null]));
eventFixture.event_date = '2030-01-01'; eventFixture.event_time = '12:30';
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
  assert.equal(Object.keys(received).length, 12);
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
  root.fields.monogram_url.value = 'javascript:alert(1)';
  await root.form.events.submit({ preventDefault() {} });
  assert.equal(puts, 0);
  root.fields.monogram_url.value = '';
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
