import { cp, readFile, lstat, realpath, writeFile, readdir } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildInvitationTitle, DEFAULT_INVITATION_TITLE } from '../invite-app/scripts/shared/invitation-title.js';
import { validateEnvironmentConfig } from '../invite-app/scripts/shared/environment-config.js';
const publicAssets = new Set(JSON.parse(await readFile(new URL('../config/public-assets.json', import.meta.url), 'utf8')));
const environmentPolicy = JSON.parse(await readFile(new URL('../config/environments.json', import.meta.url), 'utf8'));

/**
 * Prepara um artefato portátil do frontend para publicação.
 * O diretório de origem nunca é sobrescrito; metadados públicos são resolvidos
 * no clone de saída e o título pode ser enriquecido por Event Config sem
 * tornar a falha do endpoint um bloqueio de publicação.
 */
const projectRoot = fileURLToPath(new URL('../', import.meta.url));

const EVENT_CONFIG_TIMEOUT_MS = 12_000;


/** Normaliza URL pública e rejeita credenciais, query, fragmento e encoding inválido. */
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

/** Escapa valores antes de inseri-los em atributos HTML. */
function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Substitui o fallback de título nos três metadados estáticos conhecidos. */
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

/** Consulta título build-time e retorna o fallback sem bloquear o build. */
export async function resolveInvitationTitle(eventConfigUrl, fetchImpl = globalThis.fetch) {
  if (!eventConfigUrl || typeof fetchImpl !== 'function') return DEFAULT_INVITATION_TITLE;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EVENT_CONFIG_TIMEOUT_MS);
  try {
    const response = await fetchImpl(eventConfigUrl, {
      method: 'GET', cache: 'no-store', redirect: 'manual', signal: controller.signal,
    });
    if (response?.status >= 300 && response?.status < 400 || response?.redirected || response?.url && response.url !== eventConfigUrl) throw new Error('CROSS_PROJECT_REDIRECT');
    if (!response || response.status !== 200) return DEFAULT_INVITATION_TITLE;
    return buildInvitationTitle((await response.json())?.config);
  } catch (error) {
    if (error.message === 'CROSS_PROJECT_REDIRECT') throw error;
    return DEFAULT_INVITATION_TITLE;
  } finally {
    clearTimeout(timeout);
  }
}

/** Resolve marcadores de publicação e garante que nenhum placeholder permaneça. */
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

/** Copia a árvore para saída nova após validar sobreposição e metadados. */
export async function prepareStaticSite({
  config,
  policy = environmentPolicy,
  fetchImpl,
  sourceDir = resolve(projectRoot, 'invite-app'),
  outputDir = resolve(projectRoot, '_site'),
} = {}) {
  const selected = validateBuildConfig(config, policy);
  const siteUrl = selected.publicSiteUrl;
  const eventConfigUrl = resolveBuildEventConfigUrl(selected);
  // Resolve links antes de conferir sobreposição; nunca escreve na origem.
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
  await inspectPublicTree(source);
  for (const asset of publicAssets) {
    if (!(await lstat(resolve(source, asset))).isFile()) throw new Error('Recurso público ausente ou inválido: ' + asset);
  }
  const invitationTitle = await resolveInvitationTitle(eventConfigUrl, fetchImpl);
  let preparedHtml = resolveMetadata(originalHtml, siteUrl,
    selected.appEnv === 'uat' ? '[Homologação] ' + invitationTitle : invitationTitle);
  if (selected.appEnv === 'uat') preparedHtml = preparedHtml.replace('</head>', '  <meta name="robots" content="noindex, nofollow" />\n</head>');
  await cp(source, output, {
    recursive: true,
    errorOnExist: true,
    force: false,
    filter: (entry) => isPublicPath(relative(source, entry).replaceAll('\\', '/')),
  });
  await writeFile(resolve(output, 'index.html'), preparedHtml, 'utf8');
  await writeFile(resolve(output, 'runtime-config.json'), JSON.stringify(selected, null, 2) + '\n', 'utf8');
  await inspectPublicTree(output);
  return { siteUrl, outputDir: output };
}

// Manifesto de destinos aprovado no repositório; UAT permanece não provisionado.
export function validateBuildConfig(config, policy = environmentPolicy) {
  const selected = validateEnvironmentConfig(config);
  if (!['uat', 'prd'].includes(selected.appEnv) || policy.contractVersion !== 1 ||
      !policy[selected.appEnv]?.projectRef || policy[selected.appEnv].projectRef !== selected.projectRef) {
    throw new Error('Ambiente não provisionado ou project ref não aprovado no manifesto.');
  }
  return selected;
}
export function resolveBuildEventConfigUrl(config) {
  const selected = validateEnvironmentConfig(config);
  return new URL('/functions/v1/event-config', selected.supabaseUrl).href;
}
export function configFromEnvironment(env) {
  if (env.EVENT_CONFIG_URL) throw new Error('EVENT_CONFIG_URL não é permitido; endpoint derivado do manifesto.');
  return {
    contractVersion: 1, appEnv: env.APP_ENV, projectRef: env.SUPABASE_PROJECT_REF,
    supabaseUrl: env.SUPABASE_URL, supabaseAnonKey: env.SUPABASE_PUBLIC_KEY,
    publicSiteUrl: env.PUBLIC_SITE_URL,
    ...(env.BUILD_ID ? { buildId: env.BUILD_ID } : {}),
  };
}
/** Lista exata de recursos públicos revisados; novos assets exigem inclusão explícita. */
export function isPublicPath(path) {
  return !path || publicAssets.has(path) || [...publicAssets].some(asset => asset.startsWith(path + '/'));
}
async function inspectPublicTree(root, prefix = '') {
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    const path = prefix ? prefix + '/' + entry.name : entry.name;
    if (!isPublicPath(path)) continue;
    if (entry.isSymbolicLink()) throw new Error('Symlink não permitido no artefato público.');
    if (entry.isDirectory()) await inspectPublicTree(root, path);
    else if (/\.(js|html|css|svg)$/.test(path)) {
      const content = await readFile(resolve(root, path), 'utf8');
      if (/sb_secret_[A-Za-z0-9_-]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) throw new Error('Credencial privilegiada no artefato.');
      for (const token of content.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []) {
        try { if (JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).role === 'service_role') throw new Error('Credencial privilegiada no artefato.'); }
        catch (error) { if (error.message.startsWith('Credencial')) throw error; }
      }
    }
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await prepareStaticSite({
      config: configFromEnvironment(process.env),
    });
    console.log(`Prepared ${result.outputDir} for ${result.siteUrl}`);
  } catch (error) {
    console.error(`Static site preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
