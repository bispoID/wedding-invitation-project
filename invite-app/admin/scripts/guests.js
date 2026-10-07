import { getSupabaseClient } from './supabase.js';

export async function getGuests() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .select('id, name, email, attendance, companions, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
