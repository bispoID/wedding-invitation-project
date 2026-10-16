const fields = new Set(['contractVersion', 'appEnv', 'supabaseUrl', 'supabaseAnonKey', 'projectRef', 'publicSiteUrl', 'buildId']);
export const PRD_PROJECT_REF = 'bkkienyemqlkueygknzl';
export const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]', '10.0.2.2']);
function reject() { throw new Error('Configuração do ambiente ausente, inválida ou incompatível.'); }
function url(value) {
  if (typeof value !== 'string' || !/^https?:\/\/[^/]/i.test(value) || /[\\\s]/.test(value) || /%(?![a-f\d]{2})/i.test(value)) reject();
  let parsed;
  try { parsed = new URL(value); } catch { reject(); }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || /[?#]/.test(value)) reject();
  return parsed;
}
/** JWT público é inspecionado, não autenticado; publishable é opaca. */
function validateKey(key, config) {
  if (typeof key !== 'string' || !key || /\s/.test(key)) reject();
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return;
  try {
    const parts = key.split('.');
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) reject();
    const claims = JSON.parse(atob(parts[1].replaceAll('-', '+').replaceAll('_', '/')));
    if (claims.role !== 'anon') reject();
    if (config.appEnv === 'dev') {
      if (claims.ref && claims.ref !== config.projectRef) reject();
      if (!claims.ref && claims.iss !== 'supabase-demo') reject();
    } else if (claims.ref !== config.projectRef) reject();
  } catch { reject(); }
}
export function validateEnvironmentConfig(input, { runtimeBaseUrl } = {}) {
  if (!input || Array.isArray(input) || typeof input !== 'object' ||
      Object.keys(input).some(key => !fields.has(key)) || input.contractVersion !== 1 ||
      !['dev', 'uat', 'prd'].includes(input.appEnv)) reject();
  const config = { ...input };
  const backend = url(config.supabaseUrl);
  const site = url(config.publicSiteUrl);
  if (backend.pathname !== '/' || backend.port && config.appEnv !== 'dev') reject();
  if (!site.pathname.endsWith('/')) site.pathname += '/';
  if (config.buildId !== undefined && (typeof config.buildId !== 'string' || !/^[\w.-]{1,128}$/.test(config.buildId))) reject();
  if (config.appEnv === 'dev') {
    if (config.projectRef !== 'local' || backend.protocol !== 'http:' || site.protocol !== 'http:' ||
        !LOCAL_HOSTNAMES.has(backend.hostname) || !LOCAL_HOSTNAMES.has(site.hostname)) reject();
  } else {
    if (!/^[a-z]{20}$/.test(config.projectRef) || backend.protocol !== 'https:' ||
        backend.hostname !== `${config.projectRef}.supabase.co` || site.protocol !== 'https:' ||
        site.port || LOCAL_HOSTNAMES.has(site.hostname)) reject();
    if (config.appEnv === 'uat') {
      if (config.projectRef === PRD_PROJECT_REF || !site.hostname.endsWith('.github.io')) reject();
    } else if (config.projectRef !== PRD_PROJECT_REF || site.hostname.endsWith('.github.io')) reject();
  }
  validateKey(config.supabaseAnonKey, config);
  config.supabaseUrl = backend.origin;
  config.publicSiteUrl = site.href;
  if (runtimeBaseUrl && new URL(runtimeBaseUrl).href !== config.publicSiteUrl) reject();
  return Object.freeze(config);
}
/** Compatibilidade restrita ao arquivo DEV anterior ao contrato v1. */
export function normalizeDevConfig(input, publicSiteUrl) {
  if (input?.contractVersion !== undefined) return input;
  if (!input || Object.keys(input).some(key => !['appEnv', 'supabaseUrl', 'supabaseAnonKey'].includes(key))) reject();
  return { ...input, contractVersion: 1, projectRef: 'local', publicSiteUrl };
}
export function sessionStorageKey(config) {
  const valid = validateEnvironmentConfig(config);
  return `invitation-v1-${valid.appEnv}-${valid.projectRef}-auth`;
}
