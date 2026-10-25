import { AUTH_STORAGE_KEY, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from '../../scripts/shared/app-config.js';
import { observeRecovery } from './password-recovery.js';

let supabaseClientPromise;
let recovery;

export function getRecoveryState() { return recovery; }

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
      .then(({ createClient }) => {
        const client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
          auth: { storageKey: AUTH_STORAGE_KEY, flowType: 'implicit', detectSessionInUrl: true },
        });
        // Registra antes de aguardar getSession/initialize: o SDK emite recovery no startup.
        recovery = observeRecovery(client.auth, window.location.href);
        return client;
      })
      .catch(() => {
        supabaseClientPromise = undefined;
        throw new Error(
          'Não foi possível carregar o cliente Supabase. Verifique sua conexão com a internet.'
        );
      });
  }

  return supabaseClientPromise;
}
