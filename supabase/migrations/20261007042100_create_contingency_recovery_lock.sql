create table public.contingency_recovery_locks (
  resource text primary key
    check (resource = 'google_sheets_rsvp_recovery'),
  owner_id uuid not null,
  acquired_at timestamptz not null,
  expires_at timestamptz not null
);

alter table public.contingency_recovery_locks enable row level security;

revoke all on table public.contingency_recovery_locks
from public, anon, authenticated, service_role;

grant select on table public.guests to service_role;

create or replace function public.acquire_contingency_recovery_lock(
  p_owner_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acquired boolean;
  v_now timestamptz := clock_timestamp();
begin
  insert into public.contingency_recovery_locks (
    resource,
    owner_id,
    acquired_at,
    expires_at
  )
  values (
    'google_sheets_rsvp_recovery',
    p_owner_id,
    v_now,
    v_now + interval '180 seconds'
  )
  on conflict (resource)
  do update
  set
    owner_id = excluded.owner_id,
    acquired_at = excluded.acquired_at,
    expires_at = excluded.expires_at
  where public.contingency_recovery_locks.expires_at <= v_now
  returning true into v_acquired;

  return coalesce(v_acquired, false);
end;
$$;

create or replace function public.release_contingency_recovery_lock(
  p_owner_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_released boolean;
begin
  delete from public.contingency_recovery_locks
  where resource = 'google_sheets_rsvp_recovery'
    and owner_id = p_owner_id
  returning true into v_released;

  return coalesce(v_released, false);
end;
$$;

revoke all on function public.acquire_contingency_recovery_lock(uuid)
from public, anon, authenticated;

revoke all on function public.release_contingency_recovery_lock(uuid)
from public, anon, authenticated;

grant execute
on function public.acquire_contingency_recovery_lock(uuid)
to service_role;

grant execute
on function public.release_contingency_recovery_lock(uuid)
to service_role;
