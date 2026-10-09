-- No seed: first configuration is entered later through the authorized admin.
create table public.event_config (
  id smallint primary key default 1 check (id = 1),
  bride_name text not null check (char_length(btrim(bride_name)) between 1 and 200),
  groom_name text not null check (char_length(btrim(groom_name)) between 1 and 200),
  event_date date not null,
  event_time time(0) not null,
  city text not null check (char_length(btrim(city)) between 1 and 150),
  state text not null check (char_length(btrim(state)) between 1 and 100),
  ceremony_name text not null check (char_length(btrim(ceremony_name)) between 1 and 200),
  ceremony_address text check (ceremony_address is null or char_length(btrim(ceremony_address)) between 1 and 500),
  ceremony_maps_url text check (ceremony_maps_url is null or
    (char_length(ceremony_maps_url) between 1 and 2048 and ceremony_maps_url ~* '^https://[^[:space:]\\]+$')),
  reception_name text check (reception_name is null or char_length(btrim(reception_name)) between 1 and 200),
  reception_address text check (reception_address is null or char_length(btrim(reception_address)) between 1 and 500),
  monogram_url text check (monogram_url is null or
    (char_length(monogram_url) between 1 and 2048 and monogram_url ~* '^https://[^[:space:]\\]+$')),
  updated_at timestamptz not null default now(),
  constraint event_config_reception_dependency check (reception_address is null or reception_name is not null)
);
alter table public.event_config enable row level security;
revoke all privileges on table public.event_config from public, anon, authenticated, service_role;
grant select on table public.event_config to service_role;
-- id is required for atomic upsert's conflict target/update; CHECK keeps it at 1.
grant insert (id, bride_name, groom_name, event_date, event_time, city, state,
  ceremony_name, ceremony_address, ceremony_maps_url, reception_name,
  reception_address, monogram_url) on public.event_config to service_role;
grant update (id, bride_name, groom_name, event_date, event_time, city, state,
  ceremony_name, ceremony_address, ceremony_maps_url, reception_name,
  reception_address, monogram_url) on public.event_config to service_role;
create trigger event_config_set_updated_at before update on public.event_config
  for each row execute function public.set_updated_at();
-- No policies, DELETE, TRUNCATE or public Data API grants.
