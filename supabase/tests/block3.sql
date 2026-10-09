-- LOCAL DISPOSABLE DATABASE ONLY, after all migrations. No remote execution.
-- Run with psql -v ON_ERROR_STOP=1 -f supabase/tests/block3.sql <local connection>.
begin;
do $$
declare role_name text; column_name text;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'event_config' and column_name = 'monogram_url') or
    not exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'event_config' and column_name = 'reception_maps_url') then
    raise exception 'Unexpected Event Config contract';
  end if;
  if (select count(*) from information_schema.columns where table_schema = 'public'
      and table_name = 'event_config' and column_name in ('reception_city', 'reception_state')
      and is_nullable = 'YES') <> 2 then
    raise exception 'Reception location columns must exist and be nullable';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.event_config'::regclass) then
    raise exception 'event_config RLS disabled';
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.event_config'::regclass) then
    raise exception 'Unexpected event_config policy';
  end if;
  foreach role_name in array array['anon', 'authenticated'] loop
    if has_table_privilege(role_name, 'public.event_config', 'SELECT') or
       has_any_column_privilege(role_name, 'public.event_config', 'SELECT,INSERT,UPDATE') or
       has_table_privilege(role_name, 'public.event_config', 'DELETE,TRUNCATE') then
      raise exception 'Unexpected direct privileges for %', role_name;
    end if;
  end loop;
  if not has_table_privilege('service_role', 'public.event_config', 'SELECT') or
     has_table_privilege('service_role', 'public.event_config', 'DELETE,TRUNCATE') or
     has_column_privilege('service_role', 'public.event_config', 'updated_at', 'INSERT,UPDATE') then
    raise exception 'Invalid service_role privileges';
  end if;
  foreach column_name in array array['id', 'bride_name', 'groom_name', 'event_date', 'event_time',
    'city', 'state', 'ceremony_name', 'ceremony_address', 'ceremony_maps_url',
    'reception_name', 'reception_address', 'reception_city', 'reception_state', 'reception_maps_url'] loop
    if not has_column_privilege('service_role', 'public.event_config', column_name, 'INSERT') or
       not has_column_privilege('service_role', 'public.event_config', column_name, 'UPDATE') then
      raise exception 'Missing service_role column privilege %', column_name;
    end if;
  end loop;
  if (select count(*) from pg_constraint where conrelid = 'public.guests'::regclass
    and conname in ('guests_name_length', 'guests_email_length') and convalidated) <> 2 then
    raise exception 'Guest length constraints must be validated after all migrations';
  end if;
end $$;
-- A disposable local database is required, so existing config is removed only
-- inside this rolled-back transaction by its owner (never by service_role).
delete from public.event_config;
set local role service_role;
insert into public.event_config (id, bride_name, groom_name, event_date, event_time, city, state, ceremony_name)
values (1, 'Pessoa A', 'Pessoa B', '2030-01-01', '12:30', 'Cidade sintética', 'Estado sintético', 'Cerimônia sintética')
on conflict (id) do update set bride_name = excluded.bride_name;
insert into public.event_config (id, bride_name, groom_name, event_date, event_time, city, state, ceremony_name)
values (1, 'Pessoa A atualizada', 'Pessoa B', '2030-01-01', '12:30', 'Cidade sintética', 'Estado sintético', 'Cerimônia sintética')
on conflict (id) do update set id = excluded.id, bride_name = excluded.bride_name;
do $$ begin
  if (select count(*) from public.event_config) <> 1 or
     (select bride_name from public.event_config where id = 1) <> 'Pessoa A atualizada' then
    raise exception 'Singleton atomic upsert failed';
  end if;
  begin
    delete from public.event_config;
    raise exception 'service_role DELETE unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin
    truncate public.event_config;
    raise exception 'service_role TRUNCATE unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  begin
    insert into public.event_config (id, bride_name, groom_name, event_date, event_time, city, state, ceremony_name)
    values (2, 'Pessoa A', 'Pessoa B', '2030-01-01', '12:30', 'Cidade', 'Estado', 'Cerimônia');
    raise exception 'Second singleton id accepted';
  exception when check_violation then null; end;
  begin
    insert into public.event_config (bride_name, groom_name, event_date, event_time, city, state, ceremony_name)
    values ('Pessoa A', 'Pessoa B', '2030-01-01', '12:30', 'Cidade', 'Estado', 'Cerimônia');
    raise exception 'Duplicate singleton accepted';
  exception when unique_violation then null; end;
  begin
    update public.event_config set bride_name = ' ';
    raise exception 'Whitespace name accepted';
  exception when check_violation then null; end;
  begin
    update public.event_config set reception_address = 'Endereço', reception_name = null;
    raise exception 'Reception dependency missing';
  exception when check_violation then null; end;
  begin
    update public.event_config set reception_maps_url = 'http://example.invalid/a';
    raise exception 'HTTP URL accepted';
  exception when check_violation then null; end;
  begin
    update public.event_config set reception_city = repeat('a', 151);
    raise exception 'Long reception city accepted';
  exception when check_violation then null; end;
  begin
    update public.event_config set reception_state = repeat('a', 101);
    raise exception 'Long reception state accepted';
  exception when check_violation then null; end;
  begin
    update public.event_config set reception_city = ' ';
    raise exception 'Blank reception city accepted';
  exception when check_violation then null; end;
  begin
    update public.event_config set reception_state = ' ';
    raise exception 'Blank reception state accepted';
  exception when check_violation then null; end;
  begin
    insert into public.guests (name, email, attendance, companions)
    values (repeat('a', 201), 'synthetic-length@example.invalid', true, 0);
    raise exception 'Long guest name accepted';
  exception when check_violation then null; end;
  begin
    insert into public.guests (name, email, attendance, companions)
    values ('Sintético', repeat('a', 321), true, 0);
    raise exception 'Long guest email accepted';
  exception when check_violation then null; end;
  if (select ceremony_address is not null or reception_name is not null or reception_maps_url is not null
      or reception_city is not null or reception_state is not null
      from public.event_config where id = 1) then raise exception 'Optional defaults are not NULL'; end if;
end $$;
-- Reception map remains independent from optional name/address.
set local role service_role;
update public.event_config set reception_maps_url = 'https://example.invalid/maps';
do $$ begin
  if (select reception_maps_url <> 'https://example.invalid/maps' or
      reception_address is not null or reception_name is not null
      from public.event_config where id = 1) then
    raise exception 'Reception map independence failed';
  end if;
end $$;
update public.event_config set reception_maps_url = null;
reset role;
-- Trigger timestamp test does not depend on transaction-time advancement.
alter table public.event_config disable trigger event_config_set_updated_at;
update public.event_config set updated_at = '2000-01-01T00:00:00Z';
alter table public.event_config enable trigger event_config_set_updated_at;
update public.event_config set city = 'Outra cidade sintética';
do $$ begin
  if (select updated_at <= '2000-01-01T00:00:00Z' from public.event_config where id = 1) then
    raise exception 'updated_at trigger did not run';
  end if;
end $$;
set local role anon;
do $$ begin
  begin
    perform id from public.event_config;
    raise exception 'anon SELECT unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin
    perform id from public.event_config;
    raise exception 'authenticated SELECT unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
