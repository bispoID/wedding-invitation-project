-- Replace remote monogram configuration with an optional reception map.
-- Stop rather than discard unexpected historical URLs; review before applying.
do $$
begin
  if exists (select 1 from public.event_config where monogram_url is not null) then
    raise exception 'Review existing monogram_url values before removing the column';
  end if;
end $$;

alter table public.event_config
  add column reception_maps_url text
    check (reception_maps_url is null or
      (char_length(reception_maps_url) between 1 and 2048 and
       reception_maps_url ~* '^https://[^[:space:]\\]+$'));

grant insert (reception_maps_url), update (reception_maps_url)
  on public.event_config to service_role;

alter table public.event_config drop column monogram_url;
