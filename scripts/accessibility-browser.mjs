/** Regressão opcional de navegador: build LOCAL e fixture em memória, sem rede real.
 * Não instala Playwright nem usa perfil pessoal; ver docs/qa-accessibility-motion.md.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
import { prepareStaticSite } from './prepare-static-site.mjs';

const require = createRequire(import.meta.url);
// Dependência opcional fornecida pelo executor, nunca instalada automaticamente.
const { chromium } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, '.dev/qa/stage5d1', new Date().toISOString().replaceAll(/[:.]/g, '-'));
await mkdir(out, { recursive: true });
const assets = JSON.parse(await readFile(new URL('../config/public-assets.json', import.meta.url), 'utf8'));
const allowed = new Set([...assets, 'runtime-config.json']);
const base = 'https://bispoid.github.io/wedding-invitation-project/';
const backend = 'https://eugvobtvjicvocttnkka.supabase.co';
const fixture = { bride_name: 'Pessoa Alfa UAT', groom_name: 'Pessoa Beta UAT',
  event_date: '2030-01-15', event_time: '18:30', city: 'Cidade Fictícia UAT', state: 'Estado Fictício UAT',
  ceremony_name: 'Local Sintético UAT', ceremony_address: 'Endereço fictício para homologação', ceremony_maps_url: null,
  reception_name: 'Recepção Sintética UAT', reception_address: 'Endereço fictício da recepção UAT',
  reception_city: 'Cidade Fictícia UAT', reception_state: 'Estado Fictício UAT', reception_maps_url: null };
const config = { contractVersion: 1, appEnv: 'uat', projectRef: 'eugvobtvjicvocttnkka',
  supabaseUrl: backend, supabaseAnonKey: 'sb_publishable_synthetic_local_qa_only',
  publicSiteUrl: base, buildId: 'local-qa-5d1-not-a-published-commit' };
const artifact = resolve(out, 'artifact');
await prepareStaticSite({ config, outputDir: artifact, fetchImpl: async (url, init) => {
  assert.equal(url, backend + '/functions/v1/event-config');
  assert.equal(init.method, 'GET');
  return Response.json({ success: true, config: fixture });
} });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [];
for (const path of [...allowed].sort()) {
  const bytes = await readFile(resolve(artifact, path));
  if (!['index.html', 'runtime-config.json'].includes(path)) {
    assert.ok(bytes.equals(await readFile(resolve(root, 'invite-app', path))), 'Artifact differs from local source: ' + path);
  }
  if (/\.(?:js|json|html|css|svg)$/.test(path)) {
    assert.doesNotMatch(bytes.toString(), /sb_secret_[\w-]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|"private_key"\s*:/);
    assert.ok(!bytes.includes(Buffer.from('https://bkkienyemqlkueygknzl.supabase.co')));
  }
  files.push({ path, sha256: hash(bytes) });
}
assert.equal(files.length, 71);
const report = { startedAt: new Date().toISOString(), source: 'local working-tree artifact; NOT published Pages',
  buildId: config.buildId, fileCount: files.length, manifestSha256: hash(JSON.stringify(files)), files,
  configKey: 'synthetic, not a real credential', realNetworkRequests: 0, backendFixtureGets: 0,
  writesAttempted: 0, blocked: [], pageErrors: [], consoleErrors: [], checks: [], browsers: [], screenshots: [],
  contextsClosed: false };
const save = () => writeFile(resolve(out, 'evidence.json'), JSON.stringify(report, null, 2));
const selectedCase = process.env.QA_BROWSER_CASE;
if (selectedCase) assert.match(selectedCase, /^(edge|chrome)-(normal|reduce)-(1365|390)$/);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf', '.ico': 'image/x-icon' };
async function snapshot(page) {
  return page.evaluate(() => {
    const e = document.activeElement, s = getComputedStyle(e), r = e.getBoundingClientRect();
    return { id: e.id, className: e.className, label: e.getAttribute('aria-label'),
      focusVisible: e.matches(':focus-visible'), outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth, outlineColor: s.outlineColor,
      width: r.width, height: r.height, hidden: !!e.closest('[hidden],[inert]') };
  });
}
async function screenshot(page, name) {
  await page.screenshot({ path: resolve(out, name) }); report.screenshots.push(name);
}
async function ready(page) {
  await page.waitForFunction(() => document.documentElement.dataset.configurationState === 'ready' &&
    document.querySelector('main').dataset.eventState === 'ready');
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
}
async function runBrowser(name, executablePath) {
  await access(executablePath);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--disable-background-networking'] });
  report.browsers.push({ name, version: browser.version() });
  try {
    for (const reduced of [false, true]) for (const viewport of [{ width: 1365, height: 900 }, { width: 390, height: 844 }]) {
      const id = `${name}-${reduced ? 'reduce' : 'normal'}-${viewport.width}`;
      if (selectedCase && id !== selectedCase) continue;
      const context = await browser.newContext({ viewport, reducedMotion: reduced ? 'reduce' : 'no-preference',
        serviceWorkers: 'block', hasTouch: viewport.width < 700, acceptDownloads: false });
      try {
        await context.route('**/*', async route => {
          const request = route.request(), url = new URL(request.url());
          const info = { host: url.hostname, path: url.pathname, method: request.method() };
          if (request.method() !== 'GET') { report.writesAttempted++; report.blocked.push(info); return route.abort('blockedbyclient'); }
          if (url.origin === backend && url.pathname === '/functions/v1/event-config') {
            report.backendFixtureGets++;
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, config: fixture }),
              headers: { 'access-control-allow-origin': 'https://bispoid.github.io' } });
          }
          if (url.origin === 'https://bispoid.github.io' && url.pathname.startsWith('/wedding-invitation-project/')) {
            const path = decodeURIComponent(url.pathname.slice('/wedding-invitation-project/'.length)) || 'index.html';
            const full = resolve(artifact, path);
            if (allowed.has(path) && full.startsWith(artifact + sep)) {
              return route.fulfill({ status: 200, body: await readFile(full), contentType: mime[extname(full)] || 'application/octet-stream' });
            }
          }
          report.blocked.push(info); return route.abort('blockedbyclient');
        });
        const page = await context.newPage();
        page.on('pageerror', e => report.pageErrors.push({ id, message: e.message.slice(0, 400) }));
        page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push({ id, message: m.text().slice(0, 400) }); });
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setBlockedURLs', { urls: ['*bkkienyemqlkueygknzl.supabase.co*', '*://localhost/*', '*://127.0.0.1/*'] });
        if (reduced) await page.clock.install();
        await page.goto(base); await ready(page);
        assert.deepEqual(await page.evaluate(() => ({ env: __INVITATION_CONFIG__.appEnv, build: __INVITATION_CONFIG__.buildId,
          keys: Object.keys(localStorage), reduced: matchMedia('(prefers-reduced-motion: reduce)').matches })),
        { env: 'uat', build: config.buildId, keys: [], reduced });
        await page.keyboard.press('Tab'); assert.ok((await snapshot(page)).className.includes('envelope__seal'));
        const start = Date.now(); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
        await page.locator('.card-pause-control').waitFor({ state: 'visible', timeout: 12000 });
        const controlMs = Date.now() - start;
        if (reduced) {
          assert.ok(controlMs < 1500, 'Reduced control still has an animation-sized wait');
          assert.equal((await snapshot(page)).className, 'card-pause-control');
          assert.equal(await page.locator('.card-pause-control').textContent(), 'Continuar');
          await page.clock.fastForward(60000);
          assert.equal(await page.locator('.letter').isVisible(), false, 'Reduced card must remain manually retained');
        } else {
          assert.ok(controlMs >= 5000 && controlMs < 9000);
          await page.keyboard.press('Tab'); assert.equal((await snapshot(page)).className, 'card-pause-control');
          await page.keyboard.press('Enter');
          assert.equal(await page.locator('.card-pause-control').textContent(), 'Continuar');
        }
        const motion = await page.evaluate(() => {
          const flap = getComputedStyle(document.querySelector('.envelope__flap'));
          const card = getComputedStyle(document.querySelector('.envelope__card'));
          return { flapDuration: flap.animationDuration, flapDelay: flap.animationDelay, cardDuration: card.animationDuration };
        });
        assert.equal(motion.flapDelay, reduced ? '0s' : '1.5s');
        assert.equal(motion.flapDuration, reduced ? '1e-05s' : '6.5s');
        assert.equal(motion.cardDuration, reduced ? '1e-05s' : '3.3s');
        if (reduced) await screenshot(page, `${id}-card-retained.png`);
        await page.keyboard.press(' ');
        await page.locator('#letter-title').waitFor({ state: 'visible', timeout: 7000 });
        assert.equal((await snapshot(page)).id, 'letter-title');
        const letterMs = Date.now() - start;
        await page.waitForFunction(() => document.querySelector('.letter').getAnimations().every(a => a.playState === 'finished'));
        const focuses = [];
        for (const expected of ['guest-name', 'guest-email', 'attendance', 'companions']) {
          const before = await page.locator('#' + expected).boundingBox();
          await page.keyboard.press('Tab');
          // CSS global de reduce usa transition-duration:0.01ms até nos inputs.
          // Medir após o estilo chegar ao estado visível, nunca alterar o CSS.
          const initialFocus = await snapshot(page);
          await page.waitForFunction(id => {
            const e = document.activeElement, s = getComputedStyle(e);
            return e.id === id && s.outlineStyle === 'solid' && s.outlineWidth === '2px';
          }, expected, { timeout: 2000 });
          const f = await snapshot(page);
          f.initialOutlineWidth = initialFocus.outlineWidth;
          assert.equal(f.id, expected); assert.ok(f.focusVisible); assert.equal(f.outlineStyle, 'solid');
          assert.equal(f.outlineWidth, '2px', `${id}: ${expected} computed focus`); assert.notEqual(f.outlineColor, 'rgba(0, 0, 0, 0)'); assert.equal(f.hidden, false);
          assert.ok(Math.abs(f.width - before.width) < 0.1 && Math.abs(f.height - before.height) < 0.1, 'Focus must not resize the field');
          focuses.push(f);
          if (expected === 'guest-email') {
            await page.waitForFunction(() => { const r = document.activeElement.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
            await screenshot(page, `${id}-email-focus.png`);
          }
        }
        await page.keyboard.press('Tab'); const submit = await snapshot(page);
        assert.ok(submit.className.includes('button')); assert.equal(submit.outlineWidth, '2px', `${id}: submit focus ${JSON.stringify(submit)}`);
        await page.keyboard.press('Shift+Tab'); assert.equal((await snapshot(page)).id, 'companions');
        await page.locator('#attendance').selectOption('no'); assert.ok(await page.locator('#companions').isDisabled());
        await page.locator('#attendance').press('Tab'); assert.ok((await snapshot(page)).className.includes('button'));
        await page.keyboard.press('Shift+Tab'); assert.equal((await snapshot(page)).id, 'attendance');
        await page.locator('#attendance').selectOption('yes'); await page.keyboard.press('Tab');
        assert.equal((await snapshot(page)).id, 'companions'); assert.ok(await page.locator('#companions').isEnabled());
        assert.ok(await page.locator('#guest-name').evaluate(e => e.required && !e.validity.valid));
        const bounds = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
        assert.ok(bounds.scroll <= bounds.width + 1);
        await page.locator('.back-to-cover').press('Enter'); assert.ok((await snapshot(page)).className.includes('envelope__seal'));
        const nextStart = Date.now(); await page.keyboard.press(' ');
        if (reduced) {
          await page.locator('.card-pause-control').waitFor({ state: 'visible' });
          await page.keyboard.press('Enter');
        }
        await page.locator('#letter-title').waitFor({ state: 'visible', timeout: 16000 });
        const autoOrManualMs = Date.now() - nextStart;
        if (!reduced) assert.ok(autoOrManualMs >= 9900 && autoOrManualMs < 15000, 'Normal auto-open timing changed');
        assert.equal((await snapshot(page)).id, 'letter-title');
        await page.goto(base + '?devmode=envelope-card'); await ready(page);
        await page.locator('.card-pause-control').press('Enter'); assert.equal(await page.locator('.card-pause-control').textContent(), 'Continuar');
        await page.getByRole('button', { name: 'Capa', exact: true }).click();
        assert.equal(await page.locator('.card-pause-control').isVisible(), false);
        assert.equal(await page.locator('.letter').isVisible(), false);
        report.checks.push({ id, result: 'passed', controlMs, letterMs, autoOrManualMs, motion, focuses, submit, bounds });
        console.log('PASS ' + id + ': control=' + controlMs + 'ms, letter=' + letterMs + 'ms');
      } catch (e) {
        const page = context.pages()[0];
        report.checks.push({ id, result: 'failed', message: String(e.message).slice(0, 1000),
          focus: page ? await snapshot(page).catch(() => null) : null });
        if (page) await screenshot(page, `${id}-failure.png`).catch(() => {});
        console.log('FAIL ' + id + ': ' + e.name);
      } finally { await context.close(); await save(); }
    }
  } finally { await browser.close(); }
}
try {
  await Promise.all([
    runBrowser('edge', process.env.QA_EDGE_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'),
    runBrowser('chrome', process.env.QA_CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe'),
  ]);
  report.selectedCase = selectedCase || 'full matrix';
  assert.equal(report.checks.length, selectedCase ? 1 : 8); assert.ok(report.checks.every(c => c.result === 'passed'));
  assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.consoleErrors, []);
  assert.equal(report.writesAttempted, 0); assert.deepEqual(report.blocked, []);
} catch (e) { report.failure = String(e.message).slice(0, 700); process.exitCode = 1; }
finally {
  report.contextsClosed = true; report.finishedAt = new Date().toISOString(); await save();
  console.log(JSON.stringify({ evidence: resolve(out, 'evidence.json'), cases: report.checks.length,
    failed: report.checks.filter(c => c.result === 'failed').map(c => c.id), realNetworkRequests: 0,
    writesAttempted: report.writesAttempted, blocked: report.blocked.length }));
}
