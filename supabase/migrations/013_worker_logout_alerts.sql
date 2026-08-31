-- Allow authenticated workers to create operational alerts (e.g. shift logout notifications).
create policy "authenticated insert alerts"
on public.alerts for insert
to authenticated
with check (auth.uid() is not null);
