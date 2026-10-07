import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from './supabase-config.js';

let supabaseClientPromise;

export async function getSupabaseClient() {
  if (!SUPABASE_PUBLIC_KEY.trim()) {
    throw new Error(
      'A chave pública do Supabase não está configurada em admin/scripts/supabase-config.js.'
    );
  }

  if (!supabaseClientPromise) {
    supabaseClientPromise = import('https://esm.sh/@supabase/supabase-js@2.117.2')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY))
      .catch((error) => {
        supabaseClientPromise = undefined;
        throw new Error(
          `Não foi possível carregar o cliente Supabase. Verifique sua conexão com a internet. ${error.message}`
        );
      });
  }

  return supabaseClientPromise;
}
