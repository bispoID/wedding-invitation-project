import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const configSource = await readFile(new URL('../invite-app/scripts/shared/app-config.js', import.meta.url), 'utf8');

async function loadConfig(moduleUrl) {
  // Exercise the real module, replacing only the host-provided import.meta.url.
  const source = configSource.replaceAll('import.meta.url', JSON.stringify(moduleUrl));
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

for (const base of [
  'https://example.github.io/wedding-invitation-project/',
  'https://example.vercel.app/',
  'http://localhost:5500/local/invite-app/',
]) {
  test(`App Config resolves base and contracts: ${base}`, async () => {
    const config = await loadConfig(new URL('scripts/shared/app-config.js', base).href);
    assert.equal(config.APP_BASE_URL, base);
    assert.equal(new URL(config.SUPABASE_URL).protocol, 'https:');
    assert.equal(config.FUNCTIONS_BASE_URL, `${config.SUPABASE_URL}/functions/v1/`);
    assert.equal(new URL('rsvp', config.FUNCTIONS_BASE_URL).href,
      `${config.SUPABASE_URL}/functions/v1/rsvp`);
    assert.ok(!new URL(config.FUNCTIONS_BASE_URL).pathname.includes('//'));
    assert.equal(new URL('admin/', config.APP_BASE_URL).href, `${base}admin/`);
    for (const target of ['cover', 'envelope-card', 'letter']) {
      const preview = new URL(config.APP_BASE_URL);
      preview.searchParams.set('devmode', target);
      assert.equal(preview.searchParams.get('devmode'), target);
      assert.equal(preview.pathname, new URL(base).pathname);
    }
    const claims = JSON.parse(Buffer.from(config.SUPABASE_PUBLIC_KEY.split('.')[1], 'base64url'));
    assert.equal(claims.role, 'anon');
  });
}

test('RSVP and admin consume the shared configuration without duplicated infrastructure', async () => {
  const rsvp = await readFile(new URL('../invite-app/scripts/letter/rsvp.js', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../invite-app/admin/scripts/supabase.js', import.meta.url), 'utf8');
  assert.ok(rsvp.includes("from '../shared/app-config.js'"));
  assert.ok(admin.includes("from '../../scripts/shared/app-config.js'"));
  assert.ok(!rsvp.includes('supabase.co'));
  assert.ok(!admin.includes('supabase.co'));
});
