-- This function is intentionally read-only. It validates the schema objects
-- and privileges required by the public RSVP flow without invoking the
-- rate-limit RPC, which increments a persisted request counter.
create or replace function public.check_rsvp_health()
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if to_regclass('public.guests') is null
    or to_regclass('public.rsvp_rate_limits') is null
    or to_regprocedure('public.consume_rsvp_rate_limit(text)') is null
  then
    return false;
  end if;

  if not has_table_privilege('service_role', 'public.guests', 'INSERT')
    or not has_function_privilege(
      'service_role',
      'public.consume_rsvp_rate_limit(text)',
      'EXECUTE'
    )
  then
    return false;
  end if;

  -- Confirm that both relations can be resolved without returning data.
  perform 1 from public.guests limit 1;
  perform 1 from public.rsvp_rate_limits limit 1;

  return true;
exception
  when others then
    return false;
end;
$$;

revoke all on function public.check_rsvp_health()
from public, anon, authenticated, service_role;

grant execute on function public.check_rsvp_health()
to service_role;
