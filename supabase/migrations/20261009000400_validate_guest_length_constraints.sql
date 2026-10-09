alter table public.guests
  validate constraint guests_name_length,
  validate constraint guests_email_length;
