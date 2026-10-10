import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { normalizePublicSiteUrl, prepareStaticSite, resolveInvitationTitle, resolveMetadata } from './prepare-static-site.mjs';

const sourceDir = new URL('../invite-app/', import.meta.url);
const originalHtml = await readFile(new URL('index.html', sourceDir), 'utf8');

async function assertCopiedTree(source, output, prefix = '') {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) {
      await assertCopiedTree(join(source, entry.name), join(output, entry.name), path);
    } else if (path !== 'index.html') {
      assert.deepEqual(await readFile(join(output, entry.name)),
        await readFile(join(source, entry.name)), `Copied file changed: ${path}`);
    }
  }
}

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

test('prepared artifact embeds the build-time title and keeps source generic', async (t) => {
  const temporary = await mkdtemp(join(tmpdir(), 'wedding-lot2-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const outputDir = join(temporary, 'site');
  await prepareStaticSite({
    publicSiteUrl: 'https://example.com/',
    eventConfigUrl: 'https://example.invalid/functions/v1/event-config',
    fetchImpl: async () => Response.json({
      success: true,
      config: { bride_name: 'NOME_FIXTURE_A', groom_name: 'NOME_FIXTURE_B' },
    }),
    sourceDir: fileURLToPath(sourceDir), outputDir,
  });
  const html = await readFile(join(outputDir, 'index.html'), 'utf8');
  assert.equal((html.match(/NOME_FIXTURE/g) ?? []).length, 6);
  assert.match(html, /Um convite especial — NOME_FIXTURE_A &amp; NOME_FIXTURE_B ♡/);
  assert.equal(await readFile(new URL('index.html', sourceDir), 'utf8'), originalHtml);
});

for (const base of ['https://example.github.io/wedding-invitation-project/', 'https://example.vercel.app/']) {
  test(`copy and inspect portable artifact without changing source: ${base}`, async (t) => {
    const temporary = await mkdtemp(join(tmpdir(), 'wedding-lot2-'));
    t.after(() => rm(temporary, { recursive: true, force: true }));
    const outputDir = join(temporary, 'site');
    await prepareStaticSite({ publicSiteUrl: base, sourceDir: fileURLToPath(sourceDir), outputDir });
    const html = await readFile(join(outputDir, 'index.html'), 'utf8');
    assert.equal(html, resolveMetadata(originalHtml, base));
    assert.ok(html.includes(`href="${base}"`));
    assert.ok(html.includes(`content="${base}"`));
    assert.equal(html.split(`${base}images/preview-link.webp`).length - 1, 2);
    assert.ok(!html.includes('__PUBLIC_'));
    assert.equal(await readFile(new URL('index.html', sourceDir), 'utf8'), originalHtml);
    assert.deepEqual(await readdir(outputDir), await readdir(sourceDir));
    await assertCopiedTree(fileURLToPath(sourceDir), outputDir);
    await assert.rejects(prepareStaticSite({ publicSiteUrl: base, outputDir }), /already exists/);
  });
}

test('preparer rejects source/output overlap before writing', async (t) => {
  const temporary = await mkdtemp(join(tmpdir(), 'wedding-lot2-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const source = join(temporary, 'source');
  await mkdir(source);
  await writeFile(join(source, 'index.html'), originalHtml);
  for (const outputDir of [source, join(source, 'site'), temporary]) {
    await assert.rejects(prepareStaticSite({ publicSiteUrl: 'https://example.com/', sourceDir: source, outputDir }), /overlap/);
  }
  assert.equal(await readFile(join(source, 'index.html'), 'utf8'), originalHtml);
});

test('missing or invalid configuration creates no artifact', async (t) => {
  const temporary = await mkdtemp(join(tmpdir(), 'wedding-lot2-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  for (const publicSiteUrl of [undefined, 'invalid']) {
    await assert.rejects(prepareStaticSite({ publicSiteUrl, outputDir: join(temporary, 'site') }), /PUBLIC_SITE_URL/);
    assert.deepEqual(await readdir(temporary), []);
  }
});
