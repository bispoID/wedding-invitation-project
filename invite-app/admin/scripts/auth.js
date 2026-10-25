import { getSupabaseClient } from './supabase.js';

/** Retorna a sessão atual; ausência de sessão é um resultado válido (`null`). */
export async function getCurrentSession() {
  const client = await getSupabaseClient();
  await client.auth.initialize();
  await new Promise(resolve => setTimeout(resolve, 0));
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

/** Autentica o administrador pelo fluxo de senha do Supabase Auth. */
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

/** Encerra a sessão local e remota mantida pelo cliente Supabase. */
export async function signOut() {
  const client = await getSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}
