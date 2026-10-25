import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fixture } from './environment-fixtures.mjs';
import { validatePagesUatConfig, readPagesUatEvent, preparePagesUatSite, auditPagesUatArtifact,
  PAGES_UAT_REF, PAGES_UAT_URL, PAGES_UAT_BACKEND } from './pages-uat.mjs';

const sha = 'a'.repeat(40);
const config = () => fixture('uat', { projectRef: PAGES_UAT_REF, supabaseUrl: PAGES_UAT_BACKEND,
  publicSiteUrl: PAGES_UAT_URL, supabaseAnonKey: 'sb_publishable_synthetic_UAT_only', buildId: sha });
const options = { expectedSha: sha, githubRef: 'refs/heads/staging', githubActions: true };
const event = () => ({ success: true, config: { bride_name: 'Pessoa Alfa UAT', groom_name: 'Pessoa Beta UAT' } });

test('Pages accepts exact UAT config and a full same-commit BUILD_ID', () => {
  assert.deepEqual(validatePagesUatConfig(config(), options), config());
  assert.equal(validatePagesUatConfig(config(), { expectedSha: sha }).appEnv, 'uat');
});

for (const [name, changes] of [
  ['missing environment', { appEnv: undefined }], ['PRD', { appEnv: 'prd' }], ['DEV', { appEnv: 'dev' }],
  ['wrong ref', { projectRef: 'abcdefghijklmnopqrst' }], ['wrong URL', { supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co' }],
  ['missing public key', { supabaseAnonKey: '' }], ['secret key', { supabaseAnonKey: 'sb_secret_synthetic' }],
  ['legacy anon JWT', { supabaseAnonKey: fixture().supabaseAnonKey }],
  ['wrong Pages account', { publicSiteUrl: 'https://other.github.io/wedding-invitation-project/' }],
  ['wrong subpath', { publicSiteUrl: 'https://bispoid.github.io/other/' }],
  ['missing build ID', { buildId: undefined }], ['short SHA', { buildId: 'a'.repeat(12) }],
  ['different SHA', { buildId: 'b'.repeat(40) }], ['unknown contract', { contractVersion: 2 }],
]) test(`Pages rejects ${name}`, () => assert.throws(() => validatePagesUatConfig({ ...config(), ...changes }, options)));

for (const branch of ['refs/heads/feature/landing-page', 'refs/heads/production', 'refs/tags/staging', undefined]) {
  test(`Pages Actions rejects non-staging ref ${branch}`, () => {
    assert.throws(() => validatePagesUatConfig(config(), { ...options, githubRef: branch }));
  });
}

for (const [name, response] of [
  ['redirect', () => new Response(null, { status: 302, headers: { Location: 'https://example.invalid' } })],
  ['unavailable', () => new Response(null, { status: 503 })],
  ['non-fictional names', () => Response.json({ success: true, config: { bride_name: 'Actual A', groom_name: 'Actual B' } })],
  ['invalid payload', () => Response.json({ success: false })],
]) test(`Pages blocks ${name} Event Config`, async () => {
  await assert.rejects(readPagesUatEvent(async () => response()));
});

test('invalid Pages config makes no network request and creates no artifact', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pages-gate-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  let calls = 0; const outputDir = join(dir, 'site');
  await assert.rejects(preparePagesUatSite({ config: { ...config(), publicSiteUrl: 'https://other.github.io/' },
    outputDir, ...options, fetchImpl: async () => { calls++; return Response.json(event()); } }));
  assert.equal(calls, 0); await assert.rejects(access(outputDir));
});

test('Pages builds and audits a complete traceable artifact using exactly one guarded UAT GET', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pages-artifact-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const outputDir = join(dir, 'site'); let calls = 0;
  const result = await preparePagesUatSite({ config: config(), outputDir, ...options, fetchImpl: async (url, init) => {
    calls++; assert.equal(url, `${PAGES_UAT_BACKEND}/functions/v1/event-config`);
    assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'manual'); return Response.json(event());
  } });
  assert.equal(calls, 1); assert.equal(result.fileCount, 75); assert.ok(result.relativeReferences > 70);
  assert.equal(result.sessionNamespace, `invitation-v1-uat-${PAGES_UAT_REF}-auth`);
  assert.equal(result.buildId, sha); assert.match(result.manifestSha256, /^[a-f0-9]{64}$/);
  const html = await readFile(join(outputDir, 'index.html'), 'utf8');
  assert.match(html, /Pessoa Alfa UAT/); assert.match(html, /noindex, nofollow/);
  await assert.rejects(preparePagesUatSite({ config: config(), outputDir, ...options,
    fetchImpl: async () => { calls++; return Response.json(event()); } }), /already exists/);
  assert.equal(calls, 1);
  await writeFile(join(outputDir, 'extra.json'), '{}');
  await assert.rejects(auditPagesUatArtifact(outputDir, config(), options), /Unexpected artifact file/);
});

test('Pages artifact audit rejects runtime tampering even when the replacement remains public', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pages-runtime-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const outputDir = join(dir, 'site');
  await preparePagesUatSite({ config: config(), outputDir, ...options, fetchImpl: async () => Response.json(event()) });
  await writeFile(join(outputDir, 'runtime-config.json'), JSON.stringify({ ...config(), buildId: 'b'.repeat(40) }));
  await assert.rejects(auditPagesUatArtifact(outputDir, config(), options), /runtime differs/);
});

test('Pages artifact audit rejects private material, active PRD, escaping links and modified assets', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pages-integrity-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const outputDir = join(dir, 'site');
  await preparePagesUatSite({ config: config(), outputDir, ...options, fetchImpl: async () => Response.json(event()) });
  const index = join(outputDir, 'index.html'); const html = await readFile(index, 'utf8');
  for (const [content, error] of [
    ['sb_secret_SYNTHETIC_ONLY', /Private credential/],
    ['https://bkkienyemqlkueygknzl.supabase.co', /Active PRD URL/],
    ['<script src="/outside.js"></script>', /Broken or escaping/],
  ]) {
    await writeFile(index, html + content);
    await assert.rejects(auditPagesUatArtifact(outputDir, config(), options), error);
  }
  await writeFile(index, html);
  await writeFile(join(outputDir, 'scripts/main.js'), '// synthetic modification');
  await assert.rejects(auditPagesUatArtifact(outputDir, config(), options), /differs from reviewed source/);
});

test('Pages workflow gates deploy on full reusable CI from the same SHA without expanded validation permissions', async () => {
  const pages = await readFile(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
  const baseline = await readFile(new URL('../.github/workflows/test.yml', import.meta.url), 'utf8');
  assert.match(baseline, /^  workflow_call:/m);
  assert.match(pages, /push:\s+branches:\s+- staging/);
  assert.equal((pages.match(/if: github.ref == 'refs\/heads\/staging'/g) || []).length, 2);
  assert.match(pages, /validate:[\s\S]*?contents: read\s+uses: \.\/\.github\/workflows\/test\.yml/);
  assert.match(pages, /deploy:\s+needs: validate/);
  assert.match(pages, /ref: \$\{\{ github.sha \}\}/);
  assert.doesNotMatch(pages, /ref: staging/);
  assert.match(pages, /persist-credentials: false/);
  assert.match(pages, /name: github-pages/);
  for (const name of ['UAT_SUPABASE_PROJECT_REF', 'UAT_SUPABASE_URL', 'UAT_SUPABASE_PUBLIC_KEY']) assert.ok(pages.includes(`vars.${name}`));
  assert.match(pages, /BUILD_ID: \$\{\{ github.sha \}\}/);
  assert.match(pages, /PUBLIC_SITE_URL: \$\{\{ steps.pages.outputs.base_url \}\}/);
  assert.ok(pages.indexOf('node scripts/prepare-pages-uat.mjs') < pages.indexOf('actions/upload-pages-artifact'));
  assert.ok(pages.indexOf('actions/upload-pages-artifact') < pages.indexOf('actions/deploy-pages'));
  assert.doesNotMatch(pages, /continue-on-error: true|if:.*always\(|secrets: inherit/);
});
