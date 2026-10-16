import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { validateEnvironmentConfig as validate, normalizeDevConfig, sessionStorageKey, LOCAL_HOSTNAMES } from '../invite-app/scripts/shared/environment-config.js';
import { loadRuntimeConfig, bootstrap } from '../invite-app/scripts/shared/dev-runtime-config.js';
import { fixture, jwt, UAT_REF } from './environment-fixtures.mjs';

for (const env of ['dev', 'uat', 'prd']) {
  for (const keyType of ['legacy', 'publishable']) test(`${env} explicit ${keyType} config`, () => {
    const config = fixture(env, keyType === 'publishable' ? { supabaseAnonKey: 'sb_publishable_synthetic' } : {});
    assert.deepEqual(validate(config), config);
    assert.ok(Object.isFrozen(validate(config)));
  });
  for (const bad of [undefined, null, {}, { ...fixture(env), contractVersion: 2 },
    { ...fixture(env), appEnv: 'remote' }, { ...fixture(env), supabaseAnonKey: 'sb_secret_synthetic' },
    { ...fixture(env), supabaseAnonKey: jwt({ role: 'service_role', ref: UAT_REF }) },
    { ...fixture(env), supabaseAnonKey: jwt({ role: 'anon', ref: 'wrong' }) },
    { ...fixture(env), serviceRoleKey: 'private' },
    { ...fixture(env), supabaseUrl: fixture(env).supabaseUrl + '/functions' }]) {
    test(`${env} rejects invalid contract ${JSON.stringify(bad)}`, () => assert.throws(() => validate(bad)));
  }
}
for (const host of LOCAL_HOSTNAMES) test(`DEV preserves local host ${host}`, () => {
  const hostname = host === '::1' ? '[::1]' : host;
  const config = fixture('dev', { supabaseUrl: `http://${hostname}:54321`, publicSiteUrl: `http://${hostname}:5500/invite-app/` });
  assert.equal(validate(config).appEnv, 'dev');
  const legacy = { appEnv: 'dev', supabaseUrl: config.supabaseUrl, supabaseAnonKey: jwt({ role: 'anon', iss: 'supabase-demo' }) };
  assert.equal(validate(normalizeDevConfig(legacy, config.publicSiteUrl)).appEnv, 'dev');
});
for (const [env, patch] of [
  ['dev', { supabaseUrl: fixture('prd').supabaseUrl }], ['uat', { projectRef: fixture('prd').projectRef }],
  ['uat', { supabaseUrl: fixture('prd').supabaseUrl }], ['prd', { projectRef: UAT_REF }],
  ['prd', { supabaseUrl: fixture('uat').supabaseUrl }], ['prd', { supabaseUrl: 'http://localhost:54321' }],
  ['uat', { publicSiteUrl: 'https://unknown.example/' }], ['prd', { publicSiteUrl: fixture('uat').publicSiteUrl }],
]) test(`${env} rejects crossed destination ${JSON.stringify(patch)}`, () => assert.throws(() => validate(fixture(env, patch))));

test('unknown host cannot consume a valid manifest from another site', async () => {
  await assert.rejects(loadRuntimeConfig('https://unknown.example/', async () => Response.json(fixture())));
});
test('runtime redirects and missing local config fail closed', async () => {
  await assert.rejects(loadRuntimeConfig(fixture('dev').publicSiteUrl, async () => new Response('', { status: 404 })));
  await assert.rejects(loadRuntimeConfig(fixture().publicSiteUrl, async () => ({ ok: true, redirected: true })));
});
test('session keys separate all environments and ignore legacy PRD storage', () => {
  const keys = ['dev','uat','prd'].map(env => sessionStorageKey(fixture(env)));
  assert.equal(new Set(keys).size, 3);
  for (const key of keys) assert.notEqual(key, `sb-${fixture('prd').projectRef}-auth-token`);
  assert.notEqual(sessionStorageKey(fixture()), sessionStorageKey(fixture('uat', {
    projectRef: 'tsrqponmlkjihgfedcba', supabaseUrl: 'https://tsrqponmlkjihgfedcba.supabase.co',
    supabaseAnonKey: 'sb_publishable_synthetic',
  })));
});
function fakeDocument() {
  const controls = [{ disabled: false }];
  const form = { inert: true, addEventListener(event, fn) { this.handler = fn; } };
  const message = { style: {}, attrs: {}, setAttribute(k,v) { this.attrs[k]=v; }, focus() { this.focused=true; } };
  return { controls, form, message, documentElement: { dataset: {} },
    querySelectorAll: selector => selector === 'form' ? [form] : controls,
    createElement: () => message, body: { prepend(node) { assert.equal(node, message); } } };
}
test('bootstrap validates before publishing config and importing application', async () => {
  const events = [];
  const document = fakeDocument();
  assert.equal(await bootstrap({ baseUrl: fixture().publicSiteUrl, entryUrl: 'app.js', document,
    fetchImpl: async (url, options) => { events.push('manifest'); assert.equal(options.redirect,'error'); return Response.json(fixture()); },
    publish: config => { assert.equal(config.appEnv, 'uat'); events.push('validated'); },
    importModule: async () => events.push('application'),
  }), true);
  assert.deepEqual(events, ['manifest','validated','application']);
  assert.equal(document.documentElement.dataset.configurationState, 'ready');
  assert.equal(document.form.inert, false);
});
for (const input of [undefined, fixture('prd'), { ...fixture(), supabaseAnonKey: 'sb_secret_invalid' }]) test('invalid bootstrap never initializes Supabase, displays accessible error', async () => {
  const document = fakeDocument(); let imports=0; let publishes=0; let prevented=false;
  assert.equal(await bootstrap({ baseUrl: fixture().publicSiteUrl, entryUrl: 'app.js', document,
    fetchImpl: async () => Response.json(input ?? {}), publish: () => publishes++, importModule: async () => imports++ }), false);
  assert.equal(imports,0); assert.equal(publishes,0); assert.equal(document.form.inert,true);
  assert.equal(document.message.attrs.role,'alert'); assert.equal(document.message.focused,true);
  assert.equal(document.controls[0].disabled,true);
  document.form.handler({ preventDefault() { prevented=true; } }); assert.equal(prevented,true);
});
test('all HTML entrypoints use only the controlled bootstrap', async () => {
  for (const path of ['index.html','admin/index.html','admin/login.html']) {
    const html = await readFile(new URL('../invite-app/' + path, import.meta.url),'utf8');
    assert.doesNotMatch(html, /<form (?!inert)/);
    assert.match(html, /shared\/bootstrap.js/); assert.doesNotMatch(html,/src="[^"]*scripts\/main.js"/);
  }
  const admin = await readFile(new URL('../invite-app/admin/scripts/supabase.js', import.meta.url),'utf8');
  assert.match(admin, /storageKey: AUTH_STORAGE_KEY/);
});

test('Supabase client receives the namespace and never reads legacy storage', async () => {
  const config = fixture();
  const storageKey=sessionStorageKey(config);
  let calls=0;
  globalThis.__testCreateClient=(url,key,options)=>{
    calls++; assert.equal(url,config.supabaseUrl); assert.equal(key,config.supabaseAnonKey);
    assert.deepEqual(options,{auth:{storageKey}});
    return { synthetic:true };
  };
  try {
    const source=(await readFile(new URL('../invite-app/admin/scripts/supabase.js',import.meta.url),'utf8'))
      .replace(/^import[^;]+;/, `const AUTH_STORAGE_KEY=${JSON.stringify(storageKey)}, SUPABASE_URL=${JSON.stringify(config.supabaseUrl)}, SUPABASE_PUBLIC_KEY=${JSON.stringify(config.supabaseAnonKey)};`)
      .replace("import('https://esm.sh/@supabase/supabase-js@2.117.2')","Promise.resolve({createClient:globalThis.__testCreateClient})");
    const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
    assert.deepEqual(await api.getSupabaseClient(),{synthetic:true});
    await api.getSupabaseClient(); assert.equal(calls,1);
  } finally { delete globalThis.__testCreateClient; }
});
test('runtime DEV legacy file loads before the app, without changing endpoint',async()=>{
  const config=fixture('dev');
  const legacy={appEnv:'dev',supabaseUrl:config.supabaseUrl,supabaseAnonKey:config.supabaseAnonKey};
  const result=await loadRuntimeConfig(config.publicSiteUrl,async url=>{
    assert.equal(url,config.publicSiteUrl+'dev-config.json'); return Response.json(legacy);
  });
  assert.deepEqual(result,config);
});

for (const env of ['dev','uat','prd']) test(`${env} consumers expose only validated config and portable base`,async()=>{
  const config=fixture(env);
  const original=await readFile(new URL('../invite-app/scripts/shared/app-config.js',import.meta.url),'utf8');
  const source=original.replace('./environment-config.js',new URL('../invite-app/scripts/shared/environment-config.js',import.meta.url).href)
    .replaceAll('import.meta.url',JSON.stringify(config.publicSiteUrl+'scripts/shared/app-config.js'));
  const previous=globalThis.__INVITATION_CONFIG__;
  try {
    globalThis.__INVITATION_CONFIG__=config;
    const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
    assert.equal(api.APP_ENV,env); assert.equal(api.APP_BASE_URL,config.publicSiteUrl);
    assert.equal(api.FUNCTIONS_BASE_URL,config.supabaseUrl+'/functions/v1/');
    assert.equal(api.AUTH_STORAGE_KEY,sessionStorageKey(config));
    delete globalThis.__INVITATION_CONFIG__;
    await assert.rejects(import('data:text/javascript;base64,'+Buffer.from(source+'\n// missing').toString('base64')));
  } finally {
    if(previous===undefined) delete globalThis.__INVITATION_CONFIG__; else globalThis.__INVITATION_CONFIG__=previous;
  }
});
