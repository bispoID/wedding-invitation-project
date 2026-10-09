-- NOT VALID enforces new writes without assuming historical data is compliant.
alter table public.guests
  add constraint guests_name_length check (char_length(btrim(name)) between 1 and 200) not valid,
  add constraint guests_email_length check (char_length(btrim(email)) between 1 and 320) not valid;
-- VALIDATE is intentionally deferred until a read-only historical-data audit.
-- See docs/event-config.md. Never truncate or delete historical records to pass.
