import { getSupabaseClient } from './supabase.js';

/**
 * Erro normalizado das Edge Functions administrativas.
 * O painel usa `code` e `status` para exibir mensagens específicas sem
 * depender da implementação interna do SDK.
 */
export class AdminFunctionError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'AdminFunctionError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Invoca uma função administrativa e converte respostas HTTP de erro em
 * `AdminFunctionError` quando o SDK disponibiliza a resposta original.
 */
export async function callAdminFunction(name, options) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(name, options);

  if (error) {
    const response = error.context;

    if (response instanceof Response) {
      let body;
      try {
        body = await response.clone().json();
      } catch {
        body = null;
      }

      throw new AdminFunctionError(
        body?.error ?? 'FUNCTION_FAILED',
        body?.message ?? 'A solicitação administrativa falhou.',
        response.status
      );
    }

    throw error;
  }

  return data;
}
