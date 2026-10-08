drop policy if exists "Authenticated users can select guests"
  on public.guests;
drop policy if exists "Authenticated users can insert guests"
  on public.guests;
drop policy if exists "Authenticated users can update guests"
  on public.guests;
drop policy if exists "Authenticated users can delete guests"
  on public.guests;

revoke all privileges on table public.guests
  from public, anon, authenticated;
revoke update (name, email, attendance, companions)
  on table public.guests
  from public, anon, authenticated;
revoke truncate on table public.guests
  from service_role;

alter function public.set_updated_at()
  set search_path = pg_catalog;
