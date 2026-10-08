import { getSupabaseClient } from "./supabase.js";

export async function getGuests() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("admin-list-guests", {
    method: "GET",
  });

  if (error) {
    throw error;
  }

  if (!Array.isArray(data?.records)) {
    throw new Error("A função retornou uma lista de convidados inválida.");
  }

  return data.records;
}
