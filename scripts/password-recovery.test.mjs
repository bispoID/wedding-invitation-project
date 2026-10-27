import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../invite-app/admin/scripts/password-recovery.js', import.meta.url), 'utf8');
const recoveryModuleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const recovery = await import(recoveryModuleUrl);
const session = { access_token: 'synthetic-bearer', user: { id: 'synthetic-uuid' } };
const callback = 'https://example.invalid/sub/admin/reset-password.html#type=recovery&access_token=synthetic-bearer&refresh_token=synthetic-refresh';

function authDouble() {
  let listener;
  let unsubscribed = false;
  const calls = [];
  return {
    calls,
    onAuthStateChange(fn) { listener = fn; return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } }; },
    emit(event, data = session) { assert.equal(listener(event, data), undefined, 'callback must stay synchronous'); },
    unsubscribed: () => unsubscribed,
    async getSession() { calls.push(['getSession']); return { data: { session }, error: null }; },
    async updateUser(values) { calls.push(['updateUser', values]); return { data: { user: session.user }, error: null }; },
    async signOut(options) { calls.push(['signOut', options]); return { error: null }; },
  };
}

test('recovery redirect preserves root and subpaths and ignores URL-provided destinations', () => {
  for (const base of ['https://example.invalid/', 'https://example.invalid/wedding/', 'http://127.0.0.1:5500/invite-app/']) {
    assert.equal(recovery.recoveryRedirectUrl(base), `${base}admin/reset-password.html`);
  }
});

test('request normalizes email and uses only the supplied validated base callback', async () => {
  let values;
  const request = recovery.createRecoveryRequester({ async resetPasswordForEmail(...args) { values = args; return { error: null }; } }, recovery.recoveryRedirectUrl('https://example.invalid/sub/'));
  assert.equal(await request(' ADMIN@example.invalid '), recovery.RECOVERY_SENT_MESSAGE);
  assert.deepEqual(values, ['admin@example.invalid', { redirectTo: 'https://example.invalid/sub/admin/reset-password.html' }]);
});

test('known/unknown account and account-specific Auth rejections receive the same neutral message', async () => {
  for (const error of [null, { status: 400, code: 'user_not_found', message: 'internal account detail' }, { status: 422, message: 'private' }]) {
    const request = recovery.createRecoveryRequester({ resetPasswordForEmail: async () => ({ error }) }, 'https://example.invalid/admin/reset-password.html');
    assert.equal(await request('synthetic@example.invalid'), recovery.RECOVERY_SENT_MESSAGE);
  }
});

test('request handles rate limits, server errors and network failures without internal details', async () => {
  for (const error of [{ status: 429 }, { code: 'over_email_send_rate_limit' }, { status: 503 }, new Error('private token and URL')]) {
    const auth = { async resetPasswordForEmail() { if (!error.status && !error.code) throw error; return { error }; } };
    const message = await recovery.createRecoveryRequester(auth, 'https://example.invalid/')('user@example.invalid');
    assert.equal(message, recovery.requestErrorMessage(error));
    assert.doesNotMatch(message, /private|503|token|URL/);
  }
});

test('duplicate requests are suppressed and the request lock is released after failure', async () => {
  let finish;
  let calls = 0;
  const request = recovery.createRecoveryRequester({ resetPasswordForEmail: () => { calls++; return new Promise(resolve => { finish = resolve; }); } }, 'https://example.invalid/');
  const first = request('user@example.invalid');
  assert.equal(await request('user@example.invalid'), null);
  finish({ error: { status: 429 } });
  await first;
  const next = request('user@example.invalid');
  assert.equal(calls, 2);
  finish({ error: null });
  await next;
});

test('only a matching SDK PASSWORD_RECOVERY event authorizes the callback', () => {
  const auth = authDouble();
  const state = recovery.observeRecovery(auth, callback);
  assert.equal(state.allows(session), false);
  auth.emit('INITIAL_SESSION');
  assert.equal(state.allows(session), false);
  auth.emit('SIGNED_IN');
  assert.equal(state.allows(session), false);
  auth.emit('PASSWORD_RECOVERY', { ...session, access_token: 'different-token' });
  assert.equal(state.allows(session), false);
  auth.emit('PASSWORD_RECOVERY');
  assert.equal(state.allows(session), true);
  assert.equal(state.allows({ ...session, user: { id: 'other-user' } }), false);
  assert.deepEqual(auth.calls, [], 'event handling must not call Auth');
  state.dispose();
  assert.equal(state.allows(session), false);
  assert.equal(auth.unsubscribed(), true);
});

test('regression: SDK SIGNED_IN reannouncement for the same recovery session must not reject submission before updateUser', async () => {
  const auth = authDouble();
  const state = recovery.observeRecovery(auth, callback);
  auth.emit('PASSWORD_RECOVERY');
  assert.equal(state.allows(session), true);
  auth.emit('SIGNED_IN'); // SDK ao recuperar a mesma sessão em outra aba/retorno à visibilidade.
  const reset = recovery.createPasswordReset(auth, state);
  assert.equal((await reset('new-password', 'new-password')).status, 'success');
  assert.equal(auth.calls.filter(([method]) => method === 'updateUser').length, 1);
});

test('recovery stays bound to its SDK-validated session_id across token renewal and rejects a new session for the same user', () => {
  const token = (id, version) => `header.${Buffer.from(JSON.stringify({ session_id: id, version })).toString('base64url')}.signature`;
  const recovered = { ...session, access_token: token('session-one', 1) };
  const auth = authDouble();
  const state = recovery.observeRecovery(auth, `https://example.invalid/reset#type=recovery&access_token=${recovered.access_token}`);
  auth.emit('PASSWORD_RECOVERY', recovered);
  const renewed = { ...session, access_token: token('session-one', 2) };
  auth.emit('TOKEN_REFRESHED', renewed);
  auth.emit('SIGNED_IN', renewed);
  assert.equal(state.allows(renewed), true);
  const another = { ...session, access_token: token('session-two', 1) };
  assert.equal(state.allows(another), false);
  auth.emit('SIGNED_IN', another);
  assert.equal(state.allows(renewed), false);
});

test('session verification communication failure permits retry without claiming expiration or calling updateUser', async () => {
  const auth = authDouble();
  auth.getSession = async () => ({ data: { session: null }, error: { status: 503 } });
  const reset = recovery.createPasswordReset(auth, { allows: () => true, dispose() {} });
  const first = await reset('new-password', 'new-password');
  assert.equal(first.status, 'communication-error');
  assert.doesNotMatch(first.message, /expirou/);
  assert.deepEqual(auth.calls, []);
  auth.getSession = async () => ({ data: { session }, error: null });
  assert.equal((await reset('new-password', 'new-password')).status, 'success');
});

test('missing or mismatched update confirmation is unconfirmed and never logs out or repeats updateUser', async () => {
  for (const data of [null, { user: { id: 'other-user' } }]) {
    const auth = authDouble();
    let updates = 0;
    auth.updateUser = async () => { updates++; return { data, error: null }; };
    const reset = recovery.createPasswordReset(auth, { allows: () => true, dispose() {} });
    assert.equal((await reset('new-password', 'new-password')).status, 'unconfirmed');
    assert.equal((await reset('new-password', 'new-password')).status, 'unconfirmed');
    assert.equal(updates, 1);
    assert.deepEqual(auth.calls, [['getSession']]);
  }
});

test('direct access, marker alone, errors, reused/expired links and reload deny preexisting sessions', () => {
  for (const suffix of ['', '?type=recovery', '#type=recovery', '#error=access_denied&error_code=otp_expired']) {
    const auth = authDouble();
    const state = recovery.observeRecovery(auth, `https://example.invalid/admin/reset-password.html${suffix}`);
    auth.emit('INITIAL_SESSION');
    auth.emit('PASSWORD_RECOVERY'); // A broadcast from another tab cannot authorize this page.
    assert.equal(state.allows(session), false);
  }
});

test('a valid recovery can replace an existing session; logout and a different sign-in cancel it', () => {
  for (const event of ['SIGNED_OUT', 'SIGNED_IN']) {
    const auth = authDouble();
    const state = recovery.observeRecovery(auth, callback);
    auth.emit('INITIAL_SESSION', { ...session, user: { id: 'old-user' } });
    auth.emit('PASSWORD_RECOVERY');
    assert.equal(state.allows(session), true);
    auth.emit('TOKEN_REFRESHED');
    assert.equal(state.allows(session), true);
    auth.emit(event, event === 'SIGNED_IN' ? { ...session, access_token: 'different-session' } : null);
    assert.equal(state.allows(session), false);
  }
});

test('URL cleanup removes all callback secrets and arbitrary redirect parameters', () => {
  let cleaned;
  recovery.clearRecoveryUrl({ pathname: '/sub/admin/reset-password.html' }, { replaceState(...args) { cleaned = args; } });
  assert.deepEqual(cleaned, [null, '', '/sub/admin/reset-password.html']);
});

test('password validation preserves spaces, enforces documented minimum and confirmation', () => {
  assert.match(recovery.validateNewPassword('short', 'short'), /6 caracteres/);
  assert.match(recovery.validateNewPassword('123456', '654321'), /coincidem/);
  assert.equal(recovery.validateNewPassword('  abcdef  ', '  abcdef  '), '');
});

test('invalid passwords and unverified sessions never reach updateUser', async () => {
  const auth = authDouble();
  const reset = recovery.createPasswordReset(auth, { allows: () => false });
  assert.equal((await reset('short', 'short')).status, 'invalid');
  assert.equal((await reset('long-password', 'long-password')).status, 'expired');
  assert.deepEqual(auth.calls, [['getSession']]);
});

test('success updates only the password, logs out with explicit local scope and disposes recovery', async () => {
  const auth = authDouble();
  const state = recovery.observeRecovery(auth, callback);
  auth.emit('PASSWORD_RECOVERY');
  const reset = recovery.createPasswordReset(auth, state);
  assert.equal((await reset('new-password', 'new-password')).status, 'success');
  assert.deepEqual(auth.calls, [['getSession'], ['updateUser', { password: 'new-password' }], ['signOut', { scope: 'local' }]]);
  assert.equal(auth.unsubscribed(), true);
});

test('server policy/same-password/session failures do not claim success or log out', async () => {
  for (const error of [{ code: 'weak_password' }, { code: 'same_password' }, { status: 401 }, { status: 429 }, { status: 500, message: 'secret' }]) {
    const auth = authDouble();
    auth.updateUser = async () => ({ error });
    const reset = recovery.createPasswordReset(auth, { allows: () => true, dispose() {} });
    const result = await reset('new-password', 'new-password');
    assert.equal(result.status, error.status === 401 ? 'expired' : error.status === 500 ? 'unconfirmed' : 'error');
    assert.equal(result.message, error.status === 500 ? recovery.UNCONFIRMED_PASSWORD_MESSAGE : recovery.passwordErrorMessage(error));
    assert.doesNotMatch(result.message, /secret/);
    assert.deepEqual(auth.calls, [['getSession']]);
  }
});

test('logout failure is distinct from password update; retry only logs out', async () => {
  const auth = authDouble();
  let attempts = 0;
  auth.signOut = async options => { auth.calls.push(['signOut', options]); return { error: attempts++ === 0 ? new Error('secret') : null }; };
  const reset = recovery.createPasswordReset(auth, { allows: () => true, dispose() {} });
  const first = await reset('new-password', 'new-password');
  assert.equal(first.status, 'logout-error');
  assert.match(first.message, /Senha alterada com sucesso/);
  assert.equal((await reset('', '')).status, 'success');
  assert.equal(auth.calls.filter(([method]) => method === 'updateUser').length, 1);
  assert.equal(auth.calls.filter(([method]) => method === 'signOut').length, 2);
});

test('concurrent updates are suppressed and lost update responses remain unconfirmed without resubmission', async () => {
  const auth = authDouble();
  let rejectUpdate;
  auth.updateUser = () => new Promise((resolve, reject) => { rejectUpdate = reject; });
  const reset = recovery.createPasswordReset(auth, { allows: () => true, dispose() {} });
  const first = reset('new-password', 'new-password');
  await Promise.resolve();
  assert.equal((await reset('new-password', 'new-password')).status, 'busy');
  rejectUpdate(new Error('private'));
  assert.equal((await first).status, 'unconfirmed');
  auth.updateUser = async () => { assert.fail('Must not retry an update with unknown outcome'); };
  assert.equal((await reset('new-password', 'new-password')).status, 'unconfirmed');
});

test('reset page is blocked initially, bootstrapped and included with all recovery assets', async () => {
  const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const html = await read('invite-app/admin/reset-password.html');
  assert.match(html, /<form inert[^>]*id="reset-form" hidden>/);
  assert.match(html, /autocomplete="new-password"/);
  assert.match(html, /id="reset-description"/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /shared\/bootstrap.js/);
  const bootstrap = await read('invite-app/scripts/shared/bootstrap.js');
  assert.match(bootstrap, /page === 'reset-password'.*admin\/scripts\/reset-password.js/);
  const assets = JSON.parse(await read('config/public-assets.json'));
  for (const asset of ['admin/reset-password.html', 'admin/scripts/reset-password.js', 'admin/scripts/password-recovery.js', 'admin/scripts/recovery-request.js']) assert.ok(assets.includes(asset));
});

let moduleRun = 0;
async function withResetPage({ valid = true, initError = null, logoutFails = false } = {}, run) {
  const previous = { document: globalThis.document, window: globalThis.window, FormData: globalThis.FormData, __resetPage: globalThis.__resetPage };
  const elements = {};
  const get = selector => elements[selector] ??= {
    hidden: true, inert: true, disabled: false, events: {}, attrs: {}, textContent: '',
    addEventListener(type, fn) { this.events[type] = fn; },
    setAttribute(key, value) { this.attrs[key] = value; },
    removeAttribute(key) { delete this.attrs[key]; },
    focus() { this.focused = true; },
    reset() { this.cleared = true; },
  };
  get('#reset-description').hidden = false;
  const auth = authDouble();
  const state = recovery.observeRecovery(auth, valid ? callback : 'https://example.invalid/sub/admin/reset-password.html');
  let initialized = false;
  auth.initialize = async () => {
    assert.equal(get('#reset-form').inert, true);
    if (valid) setTimeout(() => auth.emit('PASSWORD_RECOVERY'), 0);
    initialized = true;
    return { error: initError };
  };
  if (logoutFails) auth.signOut = async () => ({ error: { status: 503 } });
  const navigations = [];
  const cleanups = [];
  globalThis.document = { querySelector: get };
  globalThis.window = {
    location: { pathname: '/sub/admin/reset-password.html', replace: url => navigations.push(url) },
    history: { replaceState(...args) { assert.equal(initialized, true); cleanups.push(args); } },
  };
  globalThis.FormData = class { get(name) { return name === 'password' ? 'new-password' : 'new-password'; } };
  globalThis.__resetPage = { client: { auth }, state };
  try {
    let code = await readFile(new URL('../invite-app/admin/scripts/reset-password.js', import.meta.url), 'utf8');
    code = code.replace("import { APP_BASE_URL } from '../../scripts/shared/app-config.js';", "const APP_BASE_URL = 'https://example.invalid/sub/';")
      .replace("import { getSupabaseClient, getRecoveryState } from './supabase.js';", 'const getSupabaseClient = async () => globalThis.__resetPage.client; const getRecoveryState = () => globalThis.__resetPage.state;')
      .replace("from './password-recovery.js'", `from '${recoveryModuleUrl}'`)
      .replace('void initialize();', 'await initialize();');
    await import(`data:text/javascript;base64,${Buffer.from(`${code}\n// run ${moduleRun++}`).toString('base64')}`);
    await run({ get, auth, navigations, cleanups, state });
  } finally { Object.assign(globalThis, previous); }
}

test('reset UI waits for the SDK event, cleans callback and shows password form without dashboard redirect', async () => {
  await withResetPage({}, async ({ get, navigations, cleanups }) => {
    assert.equal(get('#reset-form').inert, false);
    assert.equal(get('#reset-form').hidden, false);
    assert.equal(get('#reset-description').hidden, false);
    assert.equal(get('#new-password').focused, true);
    assert.deepEqual(navigations, []);
    assert.deepEqual(cleanups, [[null, '', '/sub/admin/reset-password.html']]);
    await get('#reset-form').events.submit({ preventDefault() {} });
    assert.equal(get('#reset-form').cleared, true);
    assert.equal(get('#reset-form').inert, true);
    assert.deepEqual(navigations, []);
    assert.equal(get('#reset-login').href, 'https://example.invalid/sub/admin/login.html?password-reset=success');
    assert.equal(get('#reset-login').textContent, 'Ir para o login');
    assert.equal(get('#reset-login').focused, true);
    assert.equal(get('#reset-login').hidden, false);
    assert.equal(get('#reset-login').attrs['aria-describedby'], 'reset-feedback');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(get('#reset-feedback').textContent, 'Senha alterada com sucesso.');
    assert.equal(get('#reset-description').hidden, true);
    assert.deepEqual(navigations, []);
    assert.equal(get('#reset-button').disabled, false);
  });
});

test('invalid callbacks and preexisting sessions keep the reset UI blocked and clean the URL', async () => {
  for (const options of [{ valid: false }, { initError: { status: 401 } }]) {
    await withResetPage(options, ({ get, navigations, cleanups }) => {
      assert.equal(get('#reset-form').inert, true);
      assert.equal(get('#reset-form').hidden, true);
      assert.equal(get('#reset-feedback').textContent, recovery.INVALID_RECOVERY_MESSAGE);
      assert.deepEqual(navigations, []);
      assert.equal(cleanups.length, 1);
    });
  }
});

test('logout failure UI clears password fields and exposes only the logout retry', async () => {
  await withResetPage({ logoutFails: true }, async ({ get, auth, navigations }) => {
    await get('#reset-form').events.submit({ preventDefault() {} });
    assert.equal(get('#reset-form').hidden, true);
    assert.equal(get('#reset-form').cleared, true);
    assert.equal(get('#reset-login').hidden, true);
    assert.equal(get('#reset-logout').hidden, false);
    assert.match(get('#reset-feedback').textContent, /Senha alterada com sucesso/);
    assert.equal(get('#reset-description').hidden, true);
    auth.signOut = async () => ({ error: null });
    await get('#reset-logout').events.click({ preventDefault() {} });
    assert.equal(auth.calls.filter(([method]) => method === 'updateUser').length, 1);
    assert.equal(navigations.length, 0);
    assert.equal(get('#reset-login').textContent, 'Ir para o login');
  });
});

test('regression UI: preventDefault, same-session reannouncement, confirmed update before delayed logout and stable success', async () => {
  await withResetPage({}, async ({ get, auth, state, navigations }) => {
    auth.getSession = async () => { auth.emit('SIGNED_IN'); return { data: { session }, error: null }; };
    let finishUpdate, finishLogout;
    let updates = 0;
    auth.updateUser = () => { updates++; return new Promise(resolve => { finishUpdate = resolve; }); };
    auth.signOut = () => new Promise(resolve => { finishLogout = resolve; });
    let prevented = false;
    const pending = get('#reset-form').events.submit({ preventDefault() { prevented = true; } });
    await Promise.resolve();
    assert.equal(prevented, true);
    assert.equal(get('#reset-button').disabled, true);
    assert.equal(get('#reset-feedback').textContent, 'Atualizando sua senha...');
    assert.equal(get('#reset-description').hidden, false);
    await get('#reset-form').events.submit({ preventDefault() {} });
    assert.equal(updates, 1);
    assert.deepEqual(navigations, []);
    finishUpdate({ data: { user: session.user }, error: null });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(get('#reset-feedback').textContent, 'Senha alterada com sucesso.');
    assert.equal(get('#reset-description').hidden, true);
    assert.equal(get('#reset-form').hidden, true);
    assert.deepEqual(navigations, []);
    auth.emit('SIGNED_OUT', null);
    assert.equal(state.allows(session), false);
    finishLogout({ error: null });
    await pending;
    assert.equal(get('#reset-feedback').textContent, 'Senha alterada com sucesso.');
    assert.deepEqual(navigations, []);
    assert.equal(get('#reset-login').href, 'https://example.invalid/sub/admin/login.html?password-reset=success');
    await get('#reset-form').events.submit({ preventDefault() {} });
    assert.equal(updates, 1);
  });
});

test('lost update response UI reports unconfirmed outcome, clears fields and blocks further updates', async () => {
  await withResetPage({}, async ({ get, auth, navigations }) => {
    let updates = 0;
    auth.updateUser = async () => { updates++; throw new Error('offline'); };
    await get('#reset-form').events.submit({ preventDefault() {} });
    assert.equal(get('#reset-feedback').textContent, recovery.UNCONFIRMED_PASSWORD_MESSAGE);
    assert.equal(get('#reset-form').hidden, true);
    assert.equal(get('#reset-form').inert, true);
    assert.equal(get('#reset-form').cleared, true);
    await get('#reset-form').events.submit({ preventDefault() {} });
    assert.equal(updates, 1);
    assert.deepEqual(navigations, []);
  });
});

async function withLoginPage({ activeSession = session, search = '', isRecovery = false }, run) {
  const previous = { document: globalThis.document, window: globalThis.window, __loginPage: globalThis.__loginPage };
  const elements = {};
  const get = selector => elements[selector] ??= {
    hidden: true, attrs: {}, events: {}, textContent: '',
    setAttribute(key, value) { this.attrs[key] = value; },
    addEventListener(type, fn) { this.events[type] = fn; },
  };
  const navigations = [];
  const requestOptions = [];
  globalThis.document = { body: { dataset: { page: 'login' } }, querySelector: get };
  globalThis.window = { location: { search, pathname: '/sub/admin/login.html', replace: url => navigations.push(url) }, history: { replaceState() {} } };
  globalThis.__loginPage = {
    getCurrentSession: async () => activeSession,
    getSupabaseClient: async () => ({ auth: {} }),
    getRecoveryState: () => ({ allows: () => isRecovery }),
    initializeRecoveryRequest: (auth, document, options) => requestOptions.push(options),
  };
  try {
    let code = await readFile(new URL('../invite-app/admin/scripts/login.js', import.meta.url), 'utf8');
    code = code.replace(/^import (\{[^;]+\}) from '[^']+';/gm, (line, names) => `const ${names} = globalThis.__loginPage;`);
    code += '\nawait initializeLogin();';
    await import(`data:text/javascript;base64,${Buffer.from(`${code}\n// run ${moduleRun++}`).toString('base64')}`);
    await run({ get, navigations, requestOptions });
  } finally { Object.assign(globalThis, previous); }
}

test('ordinary preexisting session retains the existing automatic dashboard redirect', async () => {
  await withLoginPage({}, ({ navigations, requestOptions }) => {
    assert.deepEqual(navigations, ['./index.html']);
    assert.deepEqual(requestOptions, []);
  });
});

test('invalid/reloaded recovery can request another link despite a preexisting session', async () => {
  await withLoginPage({ search: '?recovery=request&redirect_to=https://untrusted.invalid/' }, ({ get, navigations, requestOptions }) => {
    assert.deepEqual(navigations, []);
    assert.deepEqual(requestOptions, [{ open: true }]);
    assert.equal(get('#login-form').hidden, false);
  });
});

test('recovery takes precedence over automatic login redirect, while the success notice grants no session', async () => {
  await withLoginPage({ isRecovery: true }, ({ get, navigations }) => {
    assert.deepEqual(navigations, []);
    assert.match(get('#login-error').textContent, /Solicite outro link/);
  });
  await withLoginPage({ activeSession: null, search: '?password-reset=success' }, ({ get, navigations }) => {
    assert.deepEqual(navigations, []);
    assert.equal(get('#login-success').hidden, false);
    assert.equal(get('#login-success').textContent, 'Senha alterada com sucesso.');
  });
});

const requestSource = (await readFile(new URL('../invite-app/admin/scripts/recovery-request.js', import.meta.url), 'utf8'))
  .replace("import { APP_BASE_URL } from '../../scripts/shared/app-config.js';", "const APP_BASE_URL = 'https://example.invalid/sub/';")
  .replace("from './password-recovery.js'", `from '${recoveryModuleUrl}'`);
const { initializeRecoveryRequest } = await import(`data:text/javascript;base64,${Buffer.from(requestSource).toString('base64')}`);

async function withRecoveryCard({ open = false, auth = { resetPasswordForEmail: async () => ({ error: null }) } } = {}, run) {
  const previousFormData = globalThis.FormData;
  const elements = {};
  const focus = [];
  const get = selector => elements[selector] ??= {
    hidden: false, inert: false, disabled: false, textContent: '', value: '', attrs: {}, events: {},
    setAttribute(key, value) { this.attrs[key] = value; },
    removeAttribute(key) { delete this.attrs[key]; },
    addEventListener(type, listener) { this.events[type] = listener; },
    reportValidity() { return true; },
    focus() { focus.push(selector); },
  };
  get('#login-title').textContent = 'Entrar';
  get('#login-description').textContent = 'Acesse com o e-mail e a senha do administrador.';
  globalThis.FormData = class { get() { return get('#recovery-email').value; } };
  try {
    initializeRecoveryRequest(auth, { querySelector: get }, { open });
    await run({ get, focus, submit: () => get('#recovery-form').events.submit({ preventDefault() {} }),
      recover: () => get('#forgot-password').events.click(), back: () => get('#recovery-back').events.click() });
  } finally { globalThis.FormData = previousFormData; }
}

test('card switches title, description and exclusive hidden/inert panels with email focus in both directions', async () => {
  await withRecoveryCard({}, ({ get, focus, recover, back }) => {
    assert.equal(get('#recovery-panel').hidden, true);
    assert.equal(get('#recovery-panel').inert, true);
    assert.equal(focus.at(-1), '#email');
    recover();
    assert.equal(get('#login-panel').hidden, true);
    assert.equal(get('#login-panel').inert, true);
    assert.equal(get('#recovery-panel').hidden, false);
    assert.equal(get('#recovery-panel').inert, false);
    assert.equal(get('#login-title').textContent, 'Recuperar senha');
    assert.equal(get('#login-description').textContent, 'Informe seu e-mail para receber as instruções de recuperação.');
    assert.equal(focus.at(-1), '#recovery-email');
    back();
    assert.equal(get('#login-panel').hidden, false);
    assert.equal(get('#login-panel').inert, false);
    assert.equal(get('#recovery-panel').hidden, true);
    assert.equal(get('#recovery-panel').inert, true);
    assert.equal(get('#login-title').textContent, 'Entrar');
    assert.equal(get('#login-description').textContent, 'Acesse com o e-mail e a senha do administrador.');
    assert.equal(focus.at(-1), '#email');
  });
});

test('email transfers both ways, including edits and intentional clearing, without resetting login password', async () => {
  await withRecoveryCard({}, ({ get, recover, back }) => {
    get('#email').value = 'typed@example.invalid';
    get('#password').value = 'synthetic-existing-password';
    recover();
    assert.equal(get('#recovery-email').value, 'typed@example.invalid');
    get('#recovery-email').value = 'edited@example.invalid';
    back();
    assert.equal(get('#email').value, 'edited@example.invalid');
    assert.equal(get('#password').value, 'synthetic-existing-password');
    get('#email').value = '';
    recover();
    assert.equal(get('#recovery-email').value, '');
  });
});

test('direct recovery request mode shows only recovery and can return to login', async () => {
  await withRecoveryCard({ open: true }, ({ get, focus, back }) => {
    assert.equal(get('#login-panel').hidden, true);
    assert.equal(get('#recovery-panel').hidden, false);
    assert.equal(get('#login-title').textContent, 'Recuperar senha');
    assert.equal(focus.at(-1), '#recovery-email');
    back();
    assert.equal(get('#login-panel').hidden, false);
    assert.equal(focus.at(-1), '#email');
  });
});

test('switching during a request preserves its lock and confines feedback to the recovery panel', async () => {
  let finish;
  let calls = 0;
  const auth = { resetPasswordForEmail: () => { calls++; return new Promise(resolve => { finish = resolve; }); } };
  await withRecoveryCard({ auth }, async ({ get, recover, back, submit }) => {
    recover();
    get('#recovery-email').value = 'synthetic@example.invalid';
    get('#login-error').textContent = 'Login feedback';
    get('#login-success').textContent = 'Login success';
    const pending = submit();
    assert.equal(get('#recovery-button').disabled, true);
    back();
    recover();
    await submit();
    assert.equal(calls, 1);
    back();
    finish({ error: { status: 429 } });
    await pending;
    assert.equal(get('#recovery-panel').hidden, true);
    assert.equal(get('#recovery-panel').inert, true);
    assert.match(get('#recovery-feedback').textContent, /Aguarde/);
    assert.equal(get('#login-error').textContent, 'Login feedback');
    assert.equal(get('#login-success').textContent, 'Login success');
    recover();
    assert.equal(get('#recovery-button').disabled, false);
    assert.equal(get('#recovery-form').attrs['aria-busy'], undefined);
    assert.equal(get('#recovery-feedback').hidden, false);
  });
});

test('the HTML groups live feedback with each form and initially hides/inerts recovery', async () => {
  const html = await readFile(new URL('../invite-app/admin/login.html', import.meta.url), 'utf8');
  const login = html.match(/<div id="login-panel">([\s\S]*?)<\/div>/)?.[1];
  const request = html.match(/<div id="recovery-panel" hidden inert>([\s\S]*?)<\/div>/)?.[1];
  assert.ok(login && request);
  assert.match(login, /id="login-form"/);
  assert.match(login, /id="login-error"/);
  assert.match(login, /id="login-success"/);
  assert.doesNotMatch(login, /id="recovery-feedback"/);
  assert.match(request, /id="recovery-form"/);
  assert.match(request, /id="recovery-feedback"/);
  assert.match(request, /type="button"[^>]*aria-controls="login-panel">Voltar para o login/);
  assert.doesNotMatch(request, /id="login-error"|id="login-success"/);
});

test('success and communication feedback stay with recovery across switches', async () => {
  for (const fails of [false, true]) {
    const auth = { async resetPasswordForEmail() { if (fails) throw new Error('offline'); return { error: null }; } };
    await withRecoveryCard({ auth }, async ({ get, recover, back, submit }) => {
      recover();
      get('#recovery-email').value = 'synthetic@example.invalid';
      await submit();
      const message = fails ? recovery.requestErrorMessage(new Error('offline')) : recovery.RECOVERY_SENT_MESSAGE;
      assert.equal(get('#recovery-feedback').textContent, message);
      back();
      assert.equal(get('#recovery-panel').hidden, true);
      recover();
      assert.equal(get('#recovery-feedback').textContent, message);
      assert.equal(get('#recovery-feedback').hidden, false);
      assert.equal(get('#recovery-button').disabled, false);
    });
  }
});
