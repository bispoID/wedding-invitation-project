import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { isDevProcessCommand } from './dev-process.mjs';

// Contratos estáticos que impedem o frontend local e a contingência DEV de
// usar endpoints, chaves ou comandos privilegiados/remotos.
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('stale DEV PIDs never authorize stopping unrelated or unknown processes', () => {
  for (const command of [undefined, '', 'LenovoVantage-(VantageCoreAddin).exe',
    'node unrelated-server.mjs', 'supabase start', 'supabase functions list']) {
    assert.equal(isDevProcessCommand(command, 'functions'), false);
    assert.equal(isDevProcessCommand(command, 'contingency'), false);
  }
});

test('DEV process identity distinguishes the local function server and sidecar', () => {
  const functions = 'cmd.exe /c npx.cmd --no-install supabase functions serve --env-file .dev/functions.env';
  const sidecar = '"C:\\Program Files\\nodejs\\node.exe" scripts/local-contingency-server.mjs';
  assert.equal(isDevProcessCommand(functions, 'functions'), true);
  assert.equal(isDevProcessCommand(sidecar, 'contingency'), true);
  assert.equal(isDevProcessCommand(functions, 'contingency'), false);
  assert.equal(isDevProcessCommand(sidecar, 'functions'), false);
});

test('frontend DEV configuration is explicit and never contains a privileged key', async () => {
  const config = await read('invite-app/scripts/shared/environment-config.js');
  assert.match(config, /validateEnvironmentConfig/);
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
