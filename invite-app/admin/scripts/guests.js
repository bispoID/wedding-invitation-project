import { callAdminFunction } from './functions.js';
import { getSupabaseClient } from "./supabase.js";

export const DEFAULT_GUEST_PAGE_SIZE = 10;

/**
 * Busca uma página de convidados pela Edge Function administrativa.
 * O painel recebe também métricas calculadas no banco para não inferir totais
 * a partir de uma página parcial.
 */
export async function getGuests({ page = 1, pageSize = DEFAULT_GUEST_PAGE_SIZE, search = '' } = {}) {
  const supabase = await getSupabaseClient();
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const normalizedSearch = String(search).trim();
  if (normalizedSearch) params.set('search', normalizedSearch);

  const { data, error } = await supabase.functions.invoke(`admin-list-guests?${params.toString()}`, {
    method: "GET",
  });

  if (error) {
    throw error;
  }

  if (!Array.isArray(data?.records) || !data?.pagination || !data?.metrics) {
    throw new Error('A função retornou uma lista de convidados inválida.');
  }

  return {
    records: data.records,
    total: data.pagination.total,
    metrics: data.metrics,
  };
}

/** Executa create/update/delete e valida a confirmação explícita da API. */
export async function manageGuest(action, id, guest) {
  const result = await callAdminFunction('admin-manage-guests', {
    body: { action, ...(action !== 'create' ? { id } : {}), ...(['create', 'update'].includes(action) ? { guest } : {}) },
  });
  const expected = { create: 'created', update: 'updated', delete: 'deleted' }[action];
  if (result?.success !== true || result.action !== expected || typeof result.id !== 'string') {
    throw new Error('A operação não foi confirmada pelo backend.');
  }
  return result;
}
