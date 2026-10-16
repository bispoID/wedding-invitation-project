import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDevProcessCommand } from './dev-process.mjs';

/**
 * Orquestra o ambiente DEV local sem operar o projeto Supabase remoto.
 *
 * O fluxo mantém estado operacional e credenciais sintéticas em `.dev/`
 * (ignorado pelo Git), gera a configuração pública local e inicia o sidecar
 * de contingência junto das Edge Functions locais. Comandos potencialmente
 * remotos são recusados em `runSupabase` antes de serem executados.
 */
const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const devDir = resolve(projectRoot, '.dev');
const statePath = resolve(devDir, 'state.json');
const frontendConfigPath = resolve(projectRoot, 'invite-app', 'dev-config.json');
const eventConfigPath = resolve(devDir, 'event-config.json');
const adminPath = resolve(devDir, 'admin.json');
const functionsEnvPath = resolve(devDir, 'functions.env');
const contingencyFilePath = resolve(devDir, 'contingency.json');
const contingencyLogPath = resolve(devDir, 'contingency.log');
const functionsLogPath = resolve(devDir, 'functions.log');

const EVENT_FIELDS = [
  'bride_name', 'groom_name', 'event_date', 'event_time', 'city', 'state',
  'ceremony_name', 'ceremony_address', 'ceremony_maps_url', 'reception_name',
  'reception_address', 'reception_city', 'reception_state', 'reception_maps_url',
];

const localHostnames = new Set(['localhost', '127.0.0.1', '0.0.0.0', '10.0.2.2']);
const cli = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const cliEnv = { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' };

/** Interrompe o comando com uma mensagem orientada à correção local. */
function fail(message) {
  throw new Error(message);
}

/** Lê JSON de estado gerado pelo próprio ambiente DEV. */
async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

/** Persiste JSON privado com permissões restritivas e diretório criado. */
async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

async function readState() {
  try {
    return await readJson(statePath);
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

async function updateState(values) {
  await writeJson(statePath, { ...(await readState()), ...values });
}

/** Executa apenas comandos Supabase explicitamente locais e permitidos. */
function runSupabase(args, options = {}) {
  const blocked = [
    '--linked', '--project-ref', '--db-url', 'deploy', 'link', 'secrets', 'push',
  ];
  if (args.some((arg) => blocked.includes(arg))) {
    fail(`Refusing potentially remote Supabase command: ${args.join(' ')}`);
  }
  return execFileSync(cli, ['--no-install', 'supabase', ...args], {
    cwd: projectRoot,
    env: cliEnv,
    encoding: 'utf8',
    stdio: options.stdio ?? 'inherit',
    shell: process.platform === 'win32',
  });
}

/** Obtém endpoints e chaves sintéticas do stack local em execução. */
function statusEnv() {
  let output;
  try {
    output = runSupabase(['status', '-o', 'env'], { stdio: 'pipe' });
  } catch {
    fail('Supabase local services are not running. Start Docker Desktop and run `npm run dev:up`.');
  }
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  if (!values.API_URL || !values.ANON_KEY || !values.SERVICE_ROLE_KEY) {
    fail('Supabase status did not return the local API URL and keys.');
  }
  return values;
}

function localApiUrl(status) {
  return status.API_URL.replace(/\/$/, '');
}

/** Monta a allowlist CORS para hosts de navegador local e emulador Android. */
function createOrigins(frontendHost) {
  const hosts = new Set([...localHostnames, frontendHost]);
  return [...hosts].flatMap((host) => [
    `http://${host}:5500`,
    `http://${host}:8000`,
  ]).join(',');
}

/** Reutiliza ou cria o segredo local do sidecar, sem compartilhá-lo com produção. */
async function ensureToken() {
  const state = await readState();
  if (typeof state.localContingencyToken === 'string' && state.localContingencyToken) {
    return state.localContingencyToken;
  }
  const token = randomBytes(32).toString('base64url');
  await updateState({ localContingencyToken: token });
  return token;
}

/** Gera a configuração pública que o navegador local carregará. */
async function ensureFrontendConfig(status) {
  const frontendHost = process.env.DEV_FRONTEND_HOST?.trim() || '127.0.0.1';
  if (!localHostnames.has(frontendHost)) {
    fail('DEV_FRONTEND_HOST must be localhost, 127.0.0.1, 0.0.0.0 or 10.0.2.2.');
  }
  await writeJson(frontendConfigPath, {
    appEnv: 'dev',
    supabaseUrl: `http://${frontendHost}:54321`,
    supabaseAnonKey: status.ANON_KEY,
  });
  await updateState({ frontendHost, apiUrl: localApiUrl(status) });
  return frontendHost;
}

/** Monta variáveis da Edge Runtime apontando para Docker/sidecar locais. */
function functionsEnv(status, adminUserId, token, frontendHost) {
  const values = {
    APP_ENV: 'dev',
    // Functions run in the local Edge Runtime container; loopback there is
    // not the Windows host that exposes the local Supabase API.
    SUPABASE_URL: 'http://host.docker.internal:54321',
    SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    ADMIN_AUTH_USER_IDS: adminUserId,
    ADMIN_ALLOWED_ORIGINS: createOrigins(frontendHost),
    CONTINGENCY_PROVIDER: 'local',
    LOCAL_CONTINGENCY_URL: 'http://host.docker.internal:54328',
    LOCAL_CONTINGENCY_TOKEN: token,
  };
  return `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n')}\n`;
}

async function writeFunctionsEnv(status, adminUserId, token, frontendHost) {
  await mkdir(devDir, { recursive: true });
  await writeFile(functionsEnvPath, functionsEnv(status, adminUserId, token, frontendHost), {
    encoding: 'utf8', mode: 0o600,
  });
}

/** Executa GET/JSON sem cache e tolera respostas sem corpo. */
async function requestJson(url, init = {}) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  let body = null;
  try { body = await response.json(); } catch { /* response body is optional for errors */ }
  return { response, body };
}

async function signInAdmin(status, email, password) {
  const result = await requestJson(`${localApiUrl(status)}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: status.ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return result.response.ok ? result.body : null;
}

/** Cria ou recupera um usuário administrativo sintético do Supabase local. */
async function ensureAdmin(status) {
  let existing = null;
  try { existing = await readJson(adminPath); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (existing?.email && existing?.password) {
    const session = await signInAdmin(status, existing.email, existing.password);
    if (session?.user?.id) return { ...existing, id: session.user.id };
  }

  const email = 'dev-admin@local.test';
  const password = process.env.DEV_ADMIN_PASSWORD?.trim() ||
    `Dev-${randomBytes(18).toString('base64url')}`;
  const response = await fetch(`${localApiUrl(status)}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: status.ANON_KEY,
      Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  let body = null;
  try { body = await response.json(); } catch { /* handled below */ }

  if (!response.ok && response.status !== 422) {
    fail(`Could not create the synthetic local admin (HTTP ${response.status}).`);
  }

  const userId = body?.id ?? body?.user?.id;
  if (!userId) {
    const users = await requestJson(`${localApiUrl(status)}/auth/v1/admin/users?page=1&per_page=50`, {
      headers: {
        apikey: status.ANON_KEY,
        Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
      },
    });
    const user = users.body?.users?.find((candidate) => candidate.email === email);
    if (!user?.id) fail('The synthetic local admin could not be located.');
    const update = await fetch(`${localApiUrl(status)}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        apikey: status.ANON_KEY,
        Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password, email_confirm: true }),
    });
    if (!update.ok) fail(`Could not refresh the synthetic local admin (HTTP ${update.status}).`);
    await writeJson(adminPath, { email, password, id: user.id });
    return { email, password, id: user.id };
  }
  await writeJson(adminPath, { email, password, id: userId });
  return { email, password, id: userId };
}

/** Confere o contrato de 14 campos antes de gravar o snapshot local. */
function validateEventConfig(config) {
  if (!config || typeof config !== 'object') fail('Event Config response did not contain an object.');
  const keys = Object.keys(config).sort();
  if (keys.join('|') !== [...EVENT_FIELDS].sort().join('|')) {
    fail('Event Config response did not contain exactly the expected 14 fields.');
  }
  for (const field of EVENT_FIELDS) {
    const value = config[field];
    if (value !== null && typeof value !== 'string') fail(`Event Config field ${field} is invalid.`);
    if (value !== null && !value.trim() && !['ceremony_address', 'ceremony_maps_url', 'reception_name', 'reception_address', 'reception_city', 'reception_state', 'reception_maps_url'].includes(field)) {
      fail(`Event Config field ${field} is empty.`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.event_date) || !/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(config.event_time)) {
    fail('Event Config date or time is invalid.');
  }
  return Object.fromEntries(EVENT_FIELDS.map((field) => [field, config[field]]));
}

/** Obtém a configuração pública uma única vez quando não há snapshot local. */
async function fetchPublicEventConfig() {
  const appConfig = await import('../invite-app/scripts/shared/app-config.js');
  const eventConfigUrl = new URL('event-config', appConfig.FUNCTIONS_BASE_URL).href;
  const { response, body } = await requestJson(eventConfigUrl, { method: 'GET' });
  if (!response.ok || body?.success !== true) {
    fail(`The public Event Config GET failed (HTTP ${response.status}). No privileged fallback is allowed.`);
  }
  const config = validateEventConfig(body.config);
  await writeJson(eventConfigPath, { source: 'public-event-config-get', config });
  console.log(`Saved local Event Config snapshot (${EVENT_FIELDS.length} validated fields).`);
  return config;
}

/** Prefere o snapshot ignorado e evita novos acessos ao endpoint público. */
async function loadEventConfig() {
  try {
    const saved = await readJson(eventConfigPath);
    return validateEventConfig(saved.config);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return fetchPublicEventConfig();
  }
}

/** Faz upsert da fotografia sintética no singleton local e verifica os campos. */
async function seedEventConfig(status, config) {
  const { response, body } = await requestJson(`${localApiUrl(status)}/rest/v1/event_config?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: status.SERVICE_ROLE_KEY,
      Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
      Prefer: 'resolution=merge-duplicates,return=representation',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: 1, ...config }),
  });
  if (!response.ok) fail(`Local Event Config seed failed (HTTP ${response.status}).`);
  const local = Array.isArray(body) ? body[0] : body;
  for (const field of EVENT_FIELDS) {
    const expected = field === 'event_time' ? config[field].slice(0, 5) : config[field];
    const actual = typeof local?.[field] === 'string' && field === 'event_time'
      ? local[field].slice(0, 5) : local?.[field];
    if (actual !== expected) fail(`Local Event Config verification failed for ${field}.`);
  }
  console.log(`Seeded local Event Config (${EVENT_FIELDS.length} fields compared; values omitted).`);
}

/** Inicia um processo local desacoplado e direciona stdout/stderr a um log DEV. */
async function spawnDetached(command, args, logPath, env) {
  await mkdir(dirname(logPath), { recursive: true });
  const output = openSync(logPath, 'a');
  const child = spawn(command, args, {
    cwd: projectRoot,
    env,
    detached: true,
    windowsHide: true,
    shell: process.platform === 'win32' && command.endsWith('npx.cmd'),
    stdio: ['ignore', output, output],
  });
  child.unref();
  return child.pid;
}

/** Inicia o provider local de contingência se ainda não estiver saudável. */
async function startSidecar(token) {
  const health = await requestJson('http://127.0.0.1:54328/health', {
    headers: { 'X-Dev-Contingency-Token': token },
  }).catch(() => null);
  if (health?.response.ok) return;
  const pid = await spawnDetached(process.execPath, ['scripts/local-contingency-server.mjs'], contingencyLogPath, {
    ...process.env,
    LOCAL_CONTINGENCY_TOKEN: token,
    LOCAL_CONTINGENCY_FILE: contingencyFilePath,
    LOCAL_CONTINGENCY_HOST: '0.0.0.0',
    LOCAL_CONTINGENCY_PORT: '54328',
  });
  await updateState({ contingencyPid: pid });
}

/** Inicia as Edge Functions locais e exige HTTP 200 no health para prontidão. */
async function startFunctions() {
  const state = await readState();
  if (state.functionsPid) {
    const health = await fetch(`${state.apiUrl}/functions/v1/health`).catch(() => null);
    if (health?.status === 200) return;
    await stopPid(state.functionsPid, 'functions');
    await updateState({ functionsPid: null });
  }
  const pid = await spawnDetached(cli, ['--no-install', 'supabase', 'functions', 'serve', '--env-file', '.dev/functions.env'], functionsLogPath, cliEnv);
  await updateState({ functionsPid: pid });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await fetch(`${state.apiUrl || statusEnv().API_URL}/functions/v1/health`).catch(() => null);
    // Gateway errors (including 503 for a stopped runtime) are not readiness.
    if (response?.status === 200) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  fail(`Local Edge Functions did not become reachable. Inspect ${functionsLogPath}.`);
}

/** Confere o tipo de comando antes de encerrar um PID persistido, que pode ter sido reutilizado. */
async function stopPid(pid, kind) {
  if (!Number.isInteger(pid)) return;
  let commandLine;
  try {
    commandLine = process.platform === 'win32'
      ? execFileSync('powershell.exe', ['-NoProfile', '-Command',
        `(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine`],
      { encoding: 'utf8', windowsHide: true })
      : execFileSync('ps', ['-p', String(pid), '-o', 'args='], { encoding: 'utf8' });
  } catch { return; }
  if (!isDevProcessCommand(commandLine, kind)) {
    console.log(`Ignoring stale DEV ${kind} PID ${pid}; no matching process was stopped.`);
    return;
  }
  if (process.platform === 'win32') {
    try { execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* already stopped */ }
  } else {
    try { process.kill(pid, 'SIGTERM'); } catch { /* already stopped */ }
  }
}

async function stopFunctionsAndSidecar() {
  const state = await readState();
  await stopPid(state.functionsPid, 'functions');
  await stopPid(state.contingencyPid, 'contingency');
  await updateState({ functionsPid: null, contingencyPid: null });
}

/** Sobe Supabase, Auth sintético, sidecar, funções e seed local. */
async function up() {
  runSupabase(['start'], { stdio: 'pipe' });
  const status = statusEnv();
  const frontendHost = await ensureFrontendConfig(status);
  const admin = await ensureAdmin(status);
  const token = await ensureToken();
  await writeFunctionsEnv(status, admin.id, token, frontendHost);
  await startSidecar(token);
  await startFunctions();
  await seedEventConfig(status, await loadEventConfig());
  console.log(`DEV ready: frontend backend ${frontendHost}:54321; admin ${admin.email}; production services untouched.`);
}

/** Recria apenas o banco local e reaplica o bootstrap DEV. */
async function reset() {
  await stopFunctionsAndSidecar();
  runSupabase(['db', 'reset', '--local', '--no-seed']);
  await up();
}

/** Para serviços locais, mantendo snapshots para a próxima inicialização. */
async function down() {
  await stopFunctionsAndSidecar();
  runSupabase(['stop']);
  try { await unlink(frontendConfigPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  console.log('DEV services stopped. Local snapshots and credentials remain under .dev/ for the next reset/setup.');
}

async function rotateToken() {
  await stopFunctionsAndSidecar();
  const token = randomBytes(32).toString('base64url');
  await updateState({ localContingencyToken: token });
  const status = statusEnv();
  const admin = await readJson(adminPath);
  const state = await readState();
  await writeFunctionsEnv(status, admin.id, token, state.frontendHost || '127.0.0.1');
  await startSidecar(token);
  await startFunctions();
  console.log('Local DEV contingency token rotated.');
}

/** Verifica API, health, Event Config e contingência local. */
async function health() {
  const status = statusEnv();
  const state = await readState();
  const token = state.localContingencyToken;
  const local = await requestJson(`${localApiUrl(status)}/functions/v1/health`, { method: 'GET' });
  const event = await requestJson(`${localApiUrl(status)}/functions/v1/event-config`, { method: 'GET' });
  const contingency = token
    ? await requestJson('http://127.0.0.1:54328/health', { headers: { 'X-Dev-Contingency-Token': token } })
    : null;
  if (!local.response.ok || !event.response.ok || !contingency?.response.ok) {
    fail(`DEV health check failed (health=${local.response.status}, event-config=${event.response.status}, contingency=${contingency?.response.status ?? 'unreachable'}).`);
  }
  validateEventConfig(event.body?.config);
  console.log('DEV health: Supabase API, Edge Functions, Event Config and local contingency are reachable.');
}

async function tests() {
  const args = [
    '--test', 'scripts/app-config.test.mjs', 'scripts/prepare-static-site.test.mjs',
    'scripts/admin-block3.test.mjs', 'scripts/guest-list-controller.test.mjs',
    'scripts/event-config.test.mjs', 'scripts/envelope-motion.test.mjs',
  ];
  execFileSync(process.execPath, args, { cwd: projectRoot, stdio: 'inherit' });
  console.log('DEV-safe Node test set passed; no remote service was contacted by these tests.');
}

const command = process.argv[2] || 'up';
try {
  if (command === 'up' || command === 'setup') await up();
  else if (command === 'reset') await reset();
  else if (command === 'down' || command === 'stop') await down();
  else if (command === 'health') await health();
  else if (command === 'test') await tests();
  else if (command === 'rotate-token') await rotateToken();
  else fail(`Unknown DEV command: ${command}`);
} catch (error) {
  console.error(`DEV environment failed: ${error.message}`);
  process.exitCode = 1;
}
