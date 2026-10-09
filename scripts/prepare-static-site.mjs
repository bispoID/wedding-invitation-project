import { cp, readFile, lstat, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

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

export function resolveMetadata(html, publicSiteUrl) {
  const siteUrl = normalizePublicSiteUrl(publicSiteUrl);
  const replacements = new Map([
    ['__PUBLIC_SITE_URL__', siteUrl],
    ['__PUBLIC_SHARE_IMAGE_URL__', new URL('images/previa-link-envelope.webp', siteUrl).href],
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
  const preparedHtml = resolveMetadata(originalHtml, siteUrl);
  await cp(source, output, { recursive: true, errorOnExist: true, force: false });
  await writeFile(resolve(output, 'index.html'), preparedHtml, 'utf8');
  return { siteUrl, outputDir: output };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await prepareStaticSite({ publicSiteUrl: process.env.PUBLIC_SITE_URL });
    console.log(`Prepared ${result.outputDir} for ${result.siteUrl}`);
  } catch (error) {
    console.error(`Static site preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
