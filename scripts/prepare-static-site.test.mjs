import assert from 'node:assert/strict';
import { access, cp, mkdtemp, readFile, readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateBuildConfig, configFromEnvironment, isPublicPath, normalizePublicSiteUrl, prepareStaticSite, resolveBuildEventConfigUrl, resolveInvitationTitle, resolveMetadata } from './prepare-static-site.mjs';

import { fixture, policy } from './environment-fixtures.mjs';

// Verifica que o build copia uma árvore portátil e só substitui metadados na saída.
const sourceDir = new URL('../invite-app/', import.meta.url);
const originalHtml = await readFile(new URL('index.html', sourceDir), 'utf8');

for (const input of [
  'https://example.github.io/wedding-invitation-project',
  'https://example.github.io/wedding-invitation-project/',
  'https://example.vercel.app',
  'https://example.vercel.app/',
]) {
  test(`normalize root/subpath and final slash: ${input}`, () => {
    assert.equal(normalizePublicSiteUrl(input), input.endsWith('/') ? input : `${input}/`);
  });
}

for (const value of [undefined, '', 'invalid', '/relative', 'ftp://example.com/',
  'https://user:password@example.com/', 'https://example.com/?x=1',
  'https://example.com/#fragment', ' https://example.com/', 'https:\\example.com',
  'https:example.com', 'https://example.com/%invalid']) {
  test(`reject missing/invalid operational URL: ${String(value)}`, () => {
    assert.throws(() => normalizePublicSiteUrl(value), /PUBLIC_SITE_URL/);
  });
}

test('metadata markers are mandatory, counted and fully resolved', () => {
  assert.throws(() => resolveMetadata(originalHtml.replace('__PUBLIC_SITE_URL__', ''), 'https://example.com/'), /exactly two/);
  assert.throws(() => resolveMetadata(`${originalHtml}__PUBLIC_UNKNOWN__`, 'https://example.com/'), /Unresolved/);
  assert.ok(!resolveMetadata(originalHtml, 'https://example.com/').includes('__PUBLIC_'));
});

test('metadata URLs escape HTML attribute delimiters', () => {
  const html = resolveMetadata(originalHtml, 'https://example.com/a&b/');
  assert.ok(html.includes('https://example.com/a&amp;b/'));
});

test('build-time Event Config title replaces static social metadata without changing source fallback', async () => {
  const eventConfigUrl = 'https://example.invalid/functions/v1/event-config';
  const invitationTitle = await resolveInvitationTitle(eventConfigUrl, async (url, options) => {
    assert.equal(url, eventConfigUrl);
    assert.equal(options.method, 'GET');
    assert.equal(options.cache, 'no-store');
    return Response.json({ success: true, config: { bride_name: 'NOME_FIXTURE_A', groom_name: 'NOME_FIXTURE_B' } });
  });
  const html = resolveMetadata(originalHtml, 'https://example.com/', invitationTitle);
  assert.equal(invitationTitle, 'Um convite especial — NOME_FIXTURE_A & NOME_FIXTURE_B ♡');
  assert.equal((html.match(/NOME_FIXTURE/g) ?? []).length, 6);
  assert.doesNotMatch(html, /Um convite especial — Nosso Dia ♡/);
  assert.match(html, /<meta property="og:title" content="Um convite especial — NOME_FIXTURE_A &amp; NOME_FIXTURE_B ♡" \/>/);
  assert.equal((await readFile(new URL('index.html', sourceDir), 'utf8')), originalHtml);
});

test('build-time Event Config title falls back without blocking publication', async () => {
  const invitationTitle = await resolveInvitationTitle('https://example.invalid/functions/v1/event-config', async () => {
    throw new Error('Synthetic offline failure');
  });
  assert.equal(invitationTitle, 'Um convite especial — Nosso Dia ♡');
  assert.doesNotMatch(resolveMetadata(originalHtml, 'https://example.com/', invitationTitle), /NOME_FIXTURE/);
});


for (const env of ['uat','prd']) for (const subpath of ['', 'invite/']) test(`${env} artifact root/subpath ${subpath}`, async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'wedding-uat-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const source = join(temporary,'source'); await cp(sourceDir,source,{recursive:true});
  for (const name of ['dev-config.json','.env','secrets.json','snapshot.json','provision.js','scripts/fixture.js','scripts/credentials.js']) {
    await writeFile(join(source,name),'SENSITIVE_SYNTHETIC');
  }
  await mkdir(join(source,'.dev')); await writeFile(join(source,'.dev','snapshot.json'),'SENSITIVE_SYNTHETIC');
  const output = join(temporary,'site');
  const config = fixture(env, { publicSiteUrl: `https://synthetic.${env === 'uat' ? 'github.io' : 'example'}/${subpath}` });
  let calls=0;
  await prepareStaticSite({ config, policy, sourceDir: source, outputDir: output,
    fetchImpl: async (url, options) => {
      calls++; assert.equal(url,config.supabaseUrl+'/functions/v1/event-config'); assert.equal(options.redirect,'manual');
      return Response.json({ config: { bride_name:'Sintética A', groom_name:'Sintético B' } });
    } });
  assert.equal(calls,1);
  assert.deepEqual(JSON.parse(await readFile(join(output,'runtime-config.json'),'utf8')),config);
  const html = await readFile(join(output,'index.html'),'utf8');
  assert.ok(html.includes(config.publicSiteUrl));
  assert.ok(html.includes(config.publicSiteUrl+'images/preview-link.webp'));
  assert.equal(html.includes('[Homologação]'),env==='uat');
  assert.equal(html.includes('noindex, nofollow'),env==='uat');
  for (const name of ['dev-config.json','.env','secrets.json','snapshot.json','provision.js','scripts/fixture.js','scripts/credentials.js','.dev','admin/scripts/guest-metrics.test.ts']) await assert.rejects(access(join(output,name)));
  // Todos os recursos permitidos, inclusive fontes e imagens, são preservados byte a byte.
  const assets = JSON.parse(await readFile(new URL('../config/public-assets.json',import.meta.url),'utf8'));
  for (const asset of assets) if (asset !== 'index.html') assert.deepEqual(await readFile(join(output,asset)),await readFile(join(source,asset)),asset);
  await assert.rejects(prepareStaticSite({ config, policy, sourceDir: source, outputDir: output }),/already exists/);
});
for (const config of [undefined, {}, fixture('uat',{projectRef:fixture('prd').projectRef}),
  fixture('uat',{supabaseUrl:fixture('prd').supabaseUrl}), fixture('prd',{supabaseUrl:fixture().supabaseUrl}),
  fixture('uat',{supabaseAnonKey:'sb_secret_synthetic'})]) test('invalid build makes zero fetch calls and no artifact', async t => {
  const temporary=await mkdtemp(join(tmpdir(),'wedding-invalid-')); t.after(()=>rm(temporary,{recursive:true,force:true}));
  const outputDir=join(temporary,'site'); let calls=0;
  await assert.rejects(prepareStaticSite({config,policy,outputDir,fetchImpl:async()=>{ calls++; }}));
  assert.equal(calls,0); await assert.rejects(access(outputDir));
});
test('real UAT remains blocked until the versioned manifest is provisioned', () => {
  assert.throws(()=>validateBuildConfig(fixture()),/não provisionado/);
  assert.equal(validateBuildConfig(fixture('prd')).appEnv,'prd');
});
test('CLI requires explicit settings and refuses endpoint override', () => {
  assert.throws(()=>validateBuildConfig(configFromEnvironment({})));
  assert.throws(()=>configFromEnvironment({ EVENT_CONFIG_URL: fixture('prd').supabaseUrl }));
});
test('redirect response to another project is rejected', async t => {
  const temporary=await mkdtemp(join(tmpdir(),'wedding-redirect-')); t.after(()=>rm(temporary,{recursive:true,force:true}));
  const outputDir=join(temporary,'site');
  await assert.rejects(prepareStaticSite({config:fixture(),policy,outputDir,fetchImpl:async()=>({
    status:200, redirected:true, url:fixture('prd').supabaseUrl+'/functions/v1/event-config',
    json:async()=>({config:{bride_name:'A',groom_name:'B'}}),
  })}),/CROSS_PROJECT_REDIRECT/);
  await assert.rejects(access(outputDir));
});
test('output overlapping source is refused before fetch', async () => {
  let calls=0;
  await assert.rejects(prepareStaticSite({config:fixture(),policy,sourceDir:fileURLToPath(sourceDir),outputDir:fileURLToPath(sourceDir),fetchImpl:async()=>calls++}),/overlap/);
  assert.equal(calls,0);
});
test('allowlist excludes operational files even with a public extension',()=>{
  for(const path of ['.env','dev-config.json','scripts/secrets.js','scripts/seed.js','images/snapshot.png','scripts/test/fixture.js']) assert.equal(isPublicPath(path),false);
  assert.equal(isPublicPath('scripts/shared/app-config.js'),true);
});
test('privileged credential in an allowed file blocks output before fetch', async t=>{
  const temporary=await mkdtemp(join(tmpdir(),'wedding-private-')); t.after(()=>rm(temporary,{recursive:true,force:true}));
  const source=join(temporary,'source'); await cp(sourceDir,source,{recursive:true});
  await writeFile(join(source,'scripts','main.js'),'const key = "sb_secret_synthetic";');
  let calls=0;
  await assert.rejects(prepareStaticSite({config:fixture(),policy,sourceDir:source,outputDir:join(temporary,'site'),fetchImpl:async()=>calls++}),/Credencial privilegiada/);
  assert.equal(calls,0);
});

test('HTTP redirect is not followed and blocks build', async t => {
  const temporary=await mkdtemp(join(tmpdir(),'wedding-302-')); t.after(()=>rm(temporary,{recursive:true,force:true}));
  let calls=0;
  await assert.rejects(prepareStaticSite({config:fixture(),policy,outputDir:join(temporary,'site'),fetchImpl:async(url,options)=>{
    calls++; assert.equal(options.redirect,'manual');
    return new Response(null,{status:302,headers:{location:fixture('prd').supabaseUrl}});
  }}),/CROSS_PROJECT_REDIRECT/);
  assert.equal(calls,1);
});
