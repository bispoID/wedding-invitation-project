create policy "Authenticated users can select guests"
on public.guests
for select
to authenticated
using (true);

create policy "Authenticated users can insert guests"
on public.guests
for insert
to authenticated
with check (true);

create policy "Authenticated users can update guests"
on public.guests
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete guests"
on public.guests
for delete
to authenticated
using (true);