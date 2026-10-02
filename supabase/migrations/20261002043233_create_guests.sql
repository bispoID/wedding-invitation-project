create table public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  attendance boolean not null,
  companions integer not null default 0
    check (companions between 0 and 15),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger guests_set_updated_at
before update on public.guests
for each row
execute function public.set_updated_at();