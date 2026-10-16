import { validateEnvironmentConfig, sessionStorageKey } from './environment-config.js';
// O bootstrap valida antes de importar qualquer consumidor deste módulo.
export const APP_BASE_URL = new URL('../../', import.meta.url).href;
const config = validateEnvironmentConfig(globalThis.__INVITATION_CONFIG__, { runtimeBaseUrl: APP_BASE_URL });
export const APP_ENV = config.appEnv;
export const SUPABASE_URL = config.supabaseUrl;
export const SUPABASE_PUBLIC_KEY = config.supabaseAnonKey;
export const FUNCTIONS_BASE_URL = new URL('/functions/v1/', SUPABASE_URL).href;
export const AUTH_STORAGE_KEY = sessionStorageKey(config);
