import { cp, readFile, lstat, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildInvitationTitle, DEFAULT_INVITATION_TITLE } from '../invite-app/scripts/event-config.js';
import { FUNCTIONS_BASE_URL } from '../invite-app/scripts/shared/app-config.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const DEFAULT_EVENT_CONFIG_URL = new URL('event-config', FUNCTIONS_BASE_URL).href;
const EVENT_CONFIG_TIMEOUT_MS = 12_000;

export function normalizePublicSiteUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('PUBLIC_SITE_URL is required.');
  }
  if (value !== value.trim() || /[\\\s]/.test(value)) {
    throw new Error('PUBLIC_SITE_URL must not contain whitespace or backslashes.');
  }
  if (!/^https?:\/\//i.test(value) || /%(?![a-f\d]{2})/i.test(value)) {
    throw new Error('PUBLIC_SITE_URL must be an absolute HTTP(S) URL with valid encoding.');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('PUBLIC_SITE_URL must be an absolute HTTP(S) URL.');
  }
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname ||
      url.username || url.password || url.search || url.hash || /[?#]/.test(value)) {
    throw new Error('PUBLIC_SITE_URL must be HTTP(S), without credentials, query or fragment.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function replaceInvitationTitle(html, invitationTitle) {
  const safeTitle = escapeAttribute(invitationTitle);
  const titleTags = [
    [/(<meta property="og:title" content=")[^"]*(" \/>)/, 'og:title'],
    [/(<meta name="twitter:title" content=")[^"]*(" \/>)/, 'twitter:title'],
    [/(<title>)[^<]*(<\/title>)/, 'title'],
  ];
  for (const [pattern, label] of titleTags) {
    if (!pattern.test(html)) throw new Error(`Missing static ${label} metadata.`);
    html = html.replace(pattern, (_, prefix, suffix) => `${prefix}${safeTitle}${suffix}`);
  }
  return html;
}

export async function resolveInvitationTitle(eventConfigUrl, fetchImpl = globalThis.fetch) {
  if (!eventConfigUrl || typeof fetchImpl !== 'function') return DEFAULT_INVITATION_TITLE;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EVENT_CONFIG_TIMEOUT_MS);
  try {
    const response = await fetchImpl(eventConfigUrl, {
      method: 'GET', cache: 'no-store', signal: controller.signal,
    });
    if (!response || response.status !== 200) return DEFAULT_INVITATION_TITLE;
    return buildInvitationTitle((await response.json())?.config);
  } catch {
    return DEFAULT_INVITATION_TITLE;
  } finally {
    clearTimeout(timeout);
  }
}

export function resolveMetadata(html, publicSiteUrl, invitationTitle = DEFAULT_INVITATION_TITLE) {
  const siteUrl = normalizePublicSiteUrl(publicSiteUrl);
  const title = typeof invitationTitle === 'string' && invitationTitle.trim()
    ? invitationTitle : DEFAULT_INVITATION_TITLE;
  html = replaceInvitationTitle(html, title);
  const replacements = new Map([
    ['__PUBLIC_SITE_URL__', siteUrl],
    ['__PUBLIC_SHARE_IMAGE_URL__', new URL('images/preview-link.webp', siteUrl).href],
  ]);
  for (const [marker, value] of replacements) {
    if (html.split(marker).length - 1 !== 2) {
      throw new Error(`Expected exactly two occurrences of ${marker}.`);
    }
    html = html.replaceAll(marker, escapeAttribute(value));
  }
  if (/__PUBLIC_[A-Z_]+__/.test(html)) {
    throw new Error('Unresolved public metadata marker.');
  }
  return html;
}

function isWithin(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

export async function prepareStaticSite({
  publicSiteUrl,
  eventConfigUrl,
  fetchImpl,
  sourceDir = resolve(projectRoot, 'invite-app'),
  outputDir = resolve(projectRoot, '_site'),
} = {}) {
  const siteUrl = normalizePublicSiteUrl(publicSiteUrl);
  // Resolve symlinks before checking overlap; never write back into the source.
  const source = await realpath(resolve(sourceDir));
  const output = resolve(outputDir);
  const outputParent = await realpath(dirname(output));
  const resolvedOutput = resolve(outputParent, relative(dirname(output), output));
  if (isWithin(source, resolvedOutput) || isWithin(resolvedOutput, source)) {
    throw new Error('Output must not overlap the source directory.');
  }
  try {
    await lstat(output);
    throw new Error('Output directory already exists; use a fresh destination.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const sourceIndex = resolve(source, 'index.html');
  if (!(await lstat(sourceIndex)).isFile()) {
    throw new Error('Source index.html must be a regular file, not a symlink.');
  }
  const originalHtml = await readFile(sourceIndex, 'utf8');
  const invitationTitle = await resolveInvitationTitle(eventConfigUrl, fetchImpl);
  const preparedHtml = resolveMetadata(originalHtml, siteUrl, invitationTitle);
  await cp(source, output, { recursive: true, errorOnExist: true, force: false });
  await writeFile(resolve(output, 'index.html'), preparedHtml, 'utf8');
  return { siteUrl, outputDir: output };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await prepareStaticSite({
      publicSiteUrl: process.env.PUBLIC_SITE_URL,
      eventConfigUrl: process.env.EVENT_CONFIG_URL || DEFAULT_EVENT_CONFIG_URL,
    });
    console.log(`Prepared ${result.outputDir} for ${result.siteUrl}`);
  } catch (error) {
    console.error(`Static site preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
