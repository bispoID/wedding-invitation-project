/**
 * Configuração pública consumida pelo navegador.
 *
 * Hosts públicos usam exclusivamente o projeto remoto. Hosts locais exigem o
 * arquivo `dev-config.json`, gerado pelo setup DEV, e falham fechados quando
 * ele não existe ou aponta para fora da rede local. Nenhuma chave privilegiada
 * deve ser adicionada a este módulo.
 */
// Public browser configuration. Never put service_role or backend secrets here.
const PRODUCTION_CONFIG = Object.freeze({
  appEnv: 'remote',
  supabaseUrl: 'https://bkkienyemqlkueygknzl.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJra2llbnllbXFsa3VleWdrbnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTI3MTgsImV4cCI6MjEwMjc2ODcxOH0.GYi2Fspdjg4RVhNu372xyvT_R-BG7iVjSQaph93Ku34',
});

const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '10.0.2.2',
]);

function isLocalSupabaseUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && LOCAL_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Resolve a configuração pelo host atual, mantendo DEV e remoto separados.
 *
 * @param {string} hostname Host usado para a decisão de ambiente.
 * @param {Record<string, unknown>|undefined} devConfig Configuração local injetada pelo bootstrap.
 * @returns {{appEnv: string, supabaseUrl: string, supabaseAnonKey: string}} Configuração pública efetiva.
 * @throws {Error} Quando um host local não possui configuração DEV válida.
 */
export function resolveRuntimeConfig(
  hostname = globalThis.location?.hostname ?? '',
  devConfig = globalThis.__INVITATION_DEV_CONFIG__,
) {
  if (!LOCAL_HOSTNAMES.has(String(hostname).toLowerCase())) {
    return PRODUCTION_CONFIG;
  }

  if (
    !devConfig ||
    devConfig.appEnv !== 'dev' ||
    typeof devConfig.supabaseUrl !== 'string' ||
    !isLocalSupabaseUrl(devConfig.supabaseUrl) ||
    typeof devConfig.supabaseAnonKey !== 'string' ||
    !devConfig.supabaseAnonKey.trim()
  ) {
    throw new Error(
      'DEV Supabase configuration is missing or invalid. Run the local DEV setup before opening the invitation.',
    );
  }

  return Object.freeze({
    appEnv: 'dev',
    supabaseUrl: new URL(devConfig.supabaseUrl).href.replace(/\/$/, ''),
    supabaseAnonKey: devConfig.supabaseAnonKey,
  });
}

const RUNTIME_CONFIG = resolveRuntimeConfig();

export const APP_ENV = RUNTIME_CONFIG.appEnv;
export const SUPABASE_URL = RUNTIME_CONFIG.supabaseUrl;
export const SUPABASE_PUBLIC_KEY = RUNTIME_CONFIG.supabaseAnonKey;

export const FUNCTIONS_BASE_URL = new URL('/functions/v1/', SUPABASE_URL).href;
// This module lives two directories below the invitation root, on any host.
export const APP_BASE_URL = new URL('../../', import.meta.url).href;
