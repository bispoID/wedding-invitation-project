alter table public.guests
  add constraint guests_absent_without_companions
  check (attendance or companions = 0);

revoke truncate on table public.guests
from public, anon, authenticated;

grant update (name, email, attendance, companions)
on table public.guests
to service_role;

grant delete
on table public.guests
to service_role;
