import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from './supabase-config.js';

let supabaseClientPromise;

async function getSupabaseClient() {
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

export async function getCurrentSession() {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signIn(email, password) {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signOut() {
  const client = await getSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}
