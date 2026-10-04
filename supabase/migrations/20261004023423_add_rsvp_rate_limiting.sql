create table public.rsvp_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0
    check (request_count >= 0)
);

alter table public.rsvp_rate_limits enable row level security;

revoke all on table public.rsvp_rate_limits from public;
revoke all on table public.rsvp_rate_limits from anon;
revoke all on table public.rsvp_rate_limits from authenticated;
revoke all on table public.rsvp_rate_limits from service_role;

grant select, insert, update
on table public.rsvp_rate_limits
to service_role;


create or replace function public.consume_rsvp_rate_limit(
  p_ip_hash text
)
returns table (
  allowed boolean,
  request_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_window interval := interval '10 minutes';
  v_count integer;
begin

  insert into public.rsvp_rate_limits (
    ip_hash,
    window_started_at,
    request_count
  )
  values (
    p_ip_hash,
    v_now,
    1
  )

  on conflict (ip_hash)
  do update
  set
    window_started_at =
      case
        when public.rsvp_rate_limits.window_started_at
             <= v_now - v_window
        then v_now
        else public.rsvp_rate_limits.window_started_at
      end,

    request_count =
      case
        when public.rsvp_rate_limits.window_started_at
             <= v_now - v_window
        then 1
        else public.rsvp_rate_limits.request_count + 1
      end

  returning public.rsvp_rate_limits.request_count
  into v_count;

  return query
  select
    v_count <= 10,
    v_count;

end;
$$;


revoke execute
on function public.consume_rsvp_rate_limit(text)
from public;

revoke execute
on function public.consume_rsvp_rate_limit(text)
from anon;

revoke execute
on function public.consume_rsvp_rate_limit(text)
from authenticated;

grant execute
on function public.consume_rsvp_rate_limit(text)
to service_role;