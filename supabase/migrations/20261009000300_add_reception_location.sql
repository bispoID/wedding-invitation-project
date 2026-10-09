-- Independent optional reception location; existing event data stays unchanged.
alter table public.event_config
  add column reception_city text
    check (reception_city is null or char_length(btrim(reception_city)) between 1 and 150),
  add column reception_state text
    check (reception_state is null or char_length(btrim(reception_state)) between 1 and 100);

grant insert (reception_city, reception_state), update (reception_city, reception_state)
  on public.event_config to service_role;
