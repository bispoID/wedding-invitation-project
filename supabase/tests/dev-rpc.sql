-- Local PostgreSQL only. Synthetic fixtures and rate counters are rolled back.
-- Run with psql -X -v ON_ERROR_STOP=1 after block3.sql and all migrations.
begin;

do $$
declare
  role_name text;
  rpc_name text;
begin
  if exists (select 1 from pg_class where oid in (
    'public.guests'::regclass, 'public.rsvp_rate_limits'::regclass,
    'public.contingency_recovery_locks'::regclass) and not relrowsecurity) then
    raise exception 'RLS must be enabled on DEV service tables';
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.guests'::regclass) then
    raise exception 'Direct browser guest policies must remain removed';
  end if;
  foreach role_name in array array['anon', 'authenticated'] loop
    if has_any_column_privilege(role_name, 'public.guests', 'SELECT,INSERT,UPDATE')
      or has_table_privilege(role_name, 'public.guests', 'DELETE,TRUNCATE') then
      raise exception 'Direct guest access granted to %', role_name;
    end if;
    foreach rpc_name in array array[
      'public.admin_list_guests(integer,integer,text,boolean)',
      'public.consume_rsvp_rate_limit(text)', 'public.check_rsvp_health()',
      'public.acquire_contingency_recovery_lock(uuid)',
      'public.release_contingency_recovery_lock(uuid)'] loop
      if has_function_privilege(role_name, rpc_name, 'EXECUTE')
        or not has_function_privilege('service_role', rpc_name, 'EXECUTE') then
        raise exception 'Unexpected RPC grants for % / %', role_name, rpc_name;
      end if;
    end loop;
  end loop;
  raise notice 'PASS: guest RLS, browser privileges and service RPC grants';
end $$;

set local role service_role;
do $$
declare
  rate_key text := 'dev-sql-' || gen_random_uuid()::text;
  result record;
  attempt integer;
begin
  if public.check_rsvp_health() is distinct from true then
    raise exception 'RSVP prerequisites are unhealthy';
  end if;
  for attempt in 1..11 loop
    select * into result from public.consume_rsvp_rate_limit(rate_key);
    if result.request_count <> attempt or result.allowed is distinct from (attempt <= 10) then
      raise exception 'Rate limit mismatch at request %', attempt;
    end if;
  end loop;
  update public.rsvp_rate_limits set window_started_at = now() - interval '11 minutes'
    where ip_hash = rate_key;
  select * into result from public.consume_rsvp_rate_limit(rate_key);
  if result.request_count <> 1 or result.allowed is distinct from true then
    raise exception 'Expired rate window did not reset';
  end if;
  raise notice 'PASS: health RPC, first ten requests, eleventh blocked and expired window';
end $$;

do $$
declare
  tag text := 'dev-sql-' || gen_random_uuid()::text;
  baseline jsonb;
  first_page jsonb;
  second_page jsonb;
  all_rows jsonb;
  rejected boolean := false;
begin
  baseline := public.admin_list_guests(1, 10, tag, false);
  insert into public.guests (name, email, attendance, companions)
    select tag || case when n = 1 then '%_' else '-' end || n,
      tag || '-' || n || '@example.invalid', true, 1 from generate_series(1, 12) n;
  first_page := public.admin_list_guests(1, 10, tag, false);
  second_page := public.admin_list_guests(2, 10, tag, false);
  all_rows := public.admin_list_guests(1, 10, tag, true);
  if jsonb_array_length(first_page->'records') <> 10
    or jsonb_array_length(second_page->'records') <> 2
    or jsonb_array_length(all_rows->'records') <> 12
    or (first_page->>'total')::integer <> 12 then
    raise exception 'Pagination or include-all returned incorrect counts';
  end if;
  if exists (select 1 from jsonb_array_elements(first_page->'records') a
    join jsonb_array_elements(second_page->'records') b on a->>'id' = b->>'id') then
    raise exception 'Pagination repeats a guest across pages';
  end if;
  if (first_page#>>'{metrics,totalGuests}')::integer <>
      (baseline#>>'{metrics,totalGuests}')::integer + 12
    or (first_page#>>'{metrics,confirmedPeople}')::integer <>
      (baseline#>>'{metrics,confirmedPeople}')::integer + 24 then
    raise exception 'Global metrics diverge from inserted fixtures';
  end if;
  if (public.admin_list_guests(1, 10, tag || '%_', false)->>'total')::integer <> 1 then
    raise exception 'Search did not treat LIKE metacharacters literally';
  end if;
  begin
    perform public.admin_list_guests(0, 10, tag, false);
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Invalid page accepted'; end if;
  raise notice 'PASS: pagination 10+2, unique pages, search, metrics, include-all and invalid page';
end $$;
reset role;
rollback;
