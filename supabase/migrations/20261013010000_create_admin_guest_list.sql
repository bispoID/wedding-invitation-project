-- The Edge Function validates the request and calls this RPC with service_role.
-- The security-definer boundary keeps guest rows and global metrics out of the
-- browser and out of anon/authenticated Data API access.
create or replace function public.admin_list_guests(
  p_page integer default 1,
  p_page_size integer default 10,
  p_search text default '',
  p_include_all boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_search text := btrim(coalesce(p_search, ''));
  v_escaped_search text;
  v_total bigint;
  v_records jsonb;
begin
  if p_page is null or p_page < 1 or p_page > 100000 then
    raise exception 'Invalid guest list page';
  end if;

  if p_page_size is null
    or (not p_include_all and p_page_size not in (10, 20, 50))
  then
    raise exception 'Invalid guest list page size';
  end if;

  if char_length(v_search) > 320 then
    raise exception 'Invalid guest list search';
  end if;

  -- Treat LIKE metacharacters as user text. The query remains parameterized
  -- and the escaping also keeps PostgREST-independent RPC semantics literal.
  v_escaped_search := replace(
    replace(
      replace(v_search, chr(92), chr(92) || chr(92)),
      '%',
      chr(92) || '%'
    ),
    '_',
    chr(92) || '_'
  );

  with filtered as materialized (
    select
      g.id,
      g.name,
      g.email,
      g.attendance,
      g.companions,
      g.created_at
    from public.guests as g
    where v_search = ''
      or g.name ilike '%' || v_escaped_search || '%' escape E'\\'
      or g.email ilike '%' || v_escaped_search || '%' escape E'\\'
  )
  select count(*) into v_total from filtered;

  with filtered as materialized (
    select
      g.id,
      g.name,
      g.email,
      g.attendance,
      g.companions,
      g.created_at
    from public.guests as g
    where v_search = ''
      or g.name ilike '%' || v_escaped_search || '%' escape E'\\'
      or g.email ilike '%' || v_escaped_search || '%' escape E'\\'
  ), paged as (
    select f.*
    from filtered as f
    order by f.created_at desc, f.id desc
    limit case
      when p_include_all then greatest(v_total, 1)
      else p_page_size
    end
    offset case
      when p_include_all then 0
      else (p_page - 1) * p_page_size
    end
  )
  select coalesce(
    jsonb_agg(to_jsonb(paged) order by paged.created_at desc, paged.id desc),
    '[]'::jsonb
  )
  into v_records
  from paged;

  return jsonb_build_object(
    'records', v_records,
    'total', v_total,
    'metrics', (
      select jsonb_build_object(
        'totalGuests', count(*),
        'confirmedGuests', count(*) filter (where g.attendance),
        'declinedGuests', count(*) filter (where not g.attendance),
        'totalCompanions', coalesce(sum(g.companions), 0),
        'confirmedPeople', coalesce(sum(case when g.attendance then 1 + g.companions else 0 end), 0)
      )
      from public.guests as g
    )
  );
end;
$$;

revoke all on function public.admin_list_guests(integer, integer, text, boolean)
from public, anon, authenticated, service_role;

grant execute on function public.admin_list_guests(integer, integer, text, boolean)
to service_role;
