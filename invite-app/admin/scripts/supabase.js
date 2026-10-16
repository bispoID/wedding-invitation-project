import { AUTH_STORAGE_KEY, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from '../../scripts/shared/app-config.js';

let supabaseClientPromise;

/**
 * Carrega o SDK sob demanda e compartilha uma única instância do cliente.
 * O cache da Promise evita downloads concorrentes e é limpo quando o import
 * falha, permitindo uma nova tentativa após corrigir a conectividade.
 */
export async function getSupabaseClient() {
  if (!SUPABASE_PUBLIC_KEY.trim()) {
    throw new Error(
      'A chave pública do Supabase não está configurada em scripts/shared/app-config.js.'
    );
  }

  if (!supabaseClientPromise) {
    supabaseClientPromise = import('https://esm.sh/@supabase/supabase-js@2.117.2')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, { auth: { storageKey: AUTH_STORAGE_KEY } }))
      .catch((error) => {
        supabaseClientPromise = undefined;
        throw new Error(
          `Não foi possível carregar o cliente Supabase. Verifique sua conexão com a internet. ${error.message}`
        );
      });
  }

  return supabaseClientPromise;
}
