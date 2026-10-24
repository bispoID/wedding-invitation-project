import { readFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { validateBuildConfig, prepareStaticSite } from './prepare-static-site.mjs';
import { sessionStorageKey } from '../invite-app/scripts/shared/environment-config.js';

export const PAGES_UAT_REF = 'eugvobtvjicvocttnkka';
export const PAGES_UAT_URL = 'https://bispoid.github.io/wedding-invitation-project/';
export const PAGES_UAT_BACKEND = `https://${PAGES_UAT_REF}.supabase.co`;
const root = new URL('../', import.meta.url);
const assets = JSON.parse(await readFile(new URL('config/public-assets.json', root), 'utf8'));

/** Gate específico de Pages; não altera o contrato portátil ou o runtime PRD. */
export function validatePagesUatConfig(config, { expectedSha, githubRef, githubActions = false } = {}) {
  const selected = validateBuildConfig(config);
  if (selected.appEnv !== 'uat' || selected.projectRef !== PAGES_UAT_REF ||
      selected.supabaseUrl !== PAGES_UAT_BACKEND || selected.publicSiteUrl !== PAGES_UAT_URL) {
    throw new Error('Pages requires the exact approved UAT backend and public URL.');
  }
  // Uma publishable é opaca: associação ao projeto depende de metadados oficiais,
  // nunca de claims inventadas ou do simples sucesso de um endpoint público.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(selected.supabaseAnonKey)) {
    throw new Error('Pages requires the UAT publishable key, not a JWT or privileged key.');
  }
  if (!/^[a-f0-9]{40}$/.test(expectedSha ?? '') || selected.buildId !== expectedSha) {
    throw new Error('BUILD_ID must equal the full checked-out commit SHA.');
  }
  if (githubActions && githubRef !== 'refs/heads/staging') {
    throw new Error('GitHub Actions may publish Pages only from staging.');
  }
  return selected;
}

/** Um único GET UAT; falha/redirect/dados não identificados como testes bloqueiam Pages. */
export async function readPagesUatEvent(fetchImpl = globalThis.fetch) {
  const endpoint = `${PAGES_UAT_BACKEND}/functions/v1/event-config`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'GET', cache: 'no-store', redirect: 'manual', signal: controller.signal,
    });
    if (response.status !== 200 || response.redirected || response.url && response.url !== endpoint) {
      throw new Error('UAT Event Config unavailable or redirected; refusing Pages build.');
    }
    const payload = await response.json();
    if (payload?.success !== true || !payload.config ||
        !['bride_name', 'groom_name'].every(field => typeof payload.config[field] === 'string' &&
          /\bUAT\b/i.test(payload.config[field]))) {
      throw new Error('Event Config must identify both names as synthetic UAT data.');
    }
    return payload;
  } finally { clearTimeout(timeout); }
}

/** Enumera toda a saída, incluindo arquivos inesperados; não segue symlinks. */
export async function auditPagesUatArtifact(outputDir, config, options) {
  const selected = validatePagesUatConfig(config, options);
  const allowed = new Set([...assets, 'runtime-config.json']);
  const files = [];
  const texts = new Map();
  async function walk(prefix = '') {
    for (const entry of await readdir(resolve(outputDir, prefix), { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error('Artifact symlink is forbidden.');
      if (entry.isDirectory()) {
        if (![...allowed].some(asset => asset.startsWith(`${path}/`))) throw new Error('Unexpected artifact directory.');
        await walk(path); continue;
      }
      if (!entry.isFile() || !allowed.has(path)) throw new Error('Unexpected artifact file.');
      const bytes = await readFile(resolve(outputDir, path));
      if (/\.(?:js|json|html|css|svg)$/.test(path)) {
        const text = bytes.toString('utf8');
        texts.set(path, text);
        if (/sb_secret_[A-Za-z0-9_-]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|"private_key"\s*:/.test(text)) {
          throw new Error('Private credential detected in artifact.');
        }
        for (const token of text.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g) || []) {
          try {
            if (JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).role === 'service_role') {
              throw new Error('Privileged JWT detected in artifact.');
            }
          } catch (error) { if (error.message.startsWith('Privileged')) throw error; }
        }
        if (text.includes('https://bkkienyemqlkueygknzl.supabase.co')) throw new Error('Active PRD URL in UAT artifact.');
      }
      if (path !== 'index.html' && path !== 'runtime-config.json') {
        const source = await readFile(new URL(`invite-app/${path}`, root));
        if (!bytes.equals(source)) throw new Error('Artifact asset differs from reviewed source.');
      }
      files.push({ path, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  if (!(await lstat(outputDir)).isDirectory() || (await lstat(outputDir)).isSymbolicLink()) throw new Error('Invalid artifact root.');
  await walk(); files.sort((a, b) => a.path.localeCompare(b.path));
  if (files.length !== allowed.size) throw new Error('Artifact is missing reviewed assets.');
  const runtime = JSON.parse(await readFile(resolve(outputDir, 'runtime-config.json'), 'utf8'));
  if (JSON.stringify(runtime) !== JSON.stringify(selected)) throw new Error('Artifact runtime differs from approved UAT config.');
  const html = await readFile(resolve(outputDir, 'index.html'), 'utf8');
  for (const value of [PAGES_UAT_URL, `${PAGES_UAT_URL}images/preview-link.webp`, '[Homologação]', 'noindex, nofollow']) {
    if (!html.includes(value)) throw new Error('Missing UAT metadata.');
  }
  if (/__PUBLIC_[A-Z_]+__/.test(html)) throw new Error('Unresolved artifact metadata.');
  let relativeReferences = 0;
  const externalResources = new Set();
  for (const [path, text] of texts) {
    const patterns = path.endsWith('.html') ? [/\b(?:src|href|poster)=["']([^"']+)["']/g]
      : path.endsWith('.css') ? [/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g]
      : path.endsWith('.js') ? [/\b(?:import|export)\s+(?:[^'";]+?\s+from\s*)?['"]([^'"]+)['"]/g, /\bimport\(\s*['"]([^'"]+)['"]/g] : [];
    for (const pattern of patterns) for (const match of text.matchAll(pattern)) {
      const ref = match[1];
      if (ref.startsWith('#') || /^(?:data|mailto|tel):/.test(ref)) continue;
      const target = new URL(ref, new URL(path, PAGES_UAT_URL));
      if (target.origin !== new URL(PAGES_UAT_URL).origin) { externalResources.add(target.origin); continue; }
      const basePath = new URL(PAGES_UAT_URL).pathname;
      let asset = decodeURIComponent(target.pathname.slice(basePath.length));
      if (!asset || asset.endsWith('/')) asset += 'index.html';
      if (!target.pathname.startsWith(basePath) || !allowed.has(asset)) throw new Error(`Broken or escaping artifact reference in ${path}.`);
      relativeReferences++;
    }
  }
  return {
    fileCount: files.length, files, buildId: selected.buildId, projectRef: selected.projectRef,
    publicSiteUrl: selected.publicSiteUrl, sessionNamespace: sessionStorageKey(selected),
    manifestSha256: createHash('sha256').update(JSON.stringify(files)).digest('hex'),
    relativeReferences, externalResources: [...externalResources].sort(),
  };
}

export async function preparePagesUatSite({ config, outputDir, fetchImpl, ...options }) {
  const selected = validatePagesUatConfig(config, options);
  try { await lstat(outputDir); throw new Error('Output directory already exists; use a fresh destination.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const payload = await readPagesUatEvent(fetchImpl);
  await prepareStaticSite({ config: selected, outputDir,
    fetchImpl: async url => {
      if (url !== `${PAGES_UAT_BACKEND}/functions/v1/event-config`) throw new Error('Unexpected build destination.');
      return Response.json(payload);
    } });
  return auditPagesUatArtifact(outputDir, selected, options);
}
