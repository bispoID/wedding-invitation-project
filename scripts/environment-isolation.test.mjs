import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('frontend DEV configuration is explicit and never contains a privileged key', async () => {
  const config = await read('invite-app/scripts/shared/app-config.js');
  assert.match(config, /DEV Supabase configuration is missing or invalid/);
  assert.match(config, /LOCAL_HOSTNAMES/);
  assert.doesNotMatch(config, /SERVICE_ROLE/);
  const runtime = await read('invite-app/scripts/shared/dev-runtime-config.js');
  assert.match(runtime, /dev-config\.json/);
});

test('DEV contingency selection refuses Google Sheets', async () => {
  const provider = await read('supabase/functions/_shared/contingency.ts');
  assert.match(provider, /appEnv === "dev"/);
  assert.match(provider, /configuredProvider !== "local"/);
  assert.match(provider, /configuredProvider === "local"/);
});

test('local setup only exposes local Supabase reset and function commands', async () => {
  const setup = await read('scripts/dev-environment.mjs');
  assert.match(setup, /--local/);
  assert.match(setup, /functions', 'serve'/);
  assert.match(setup, /'--linked'.*'push'/s);
  assert.match(setup, /No privileged fallback is allowed/);
  assert.match(await read('.gitignore'), /invite-app\/dev-config\.json/);
});
