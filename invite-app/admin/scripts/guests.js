import { getSupabaseClient } from "./supabase.js";

export const DEFAULT_GUEST_PAGE_SIZE = 10;

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
