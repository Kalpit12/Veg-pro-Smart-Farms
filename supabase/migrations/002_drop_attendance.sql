drop policy if exists "workers insert own attendance" on public.attendance;
drop policy if exists "attendance read" on public.attendance;
drop policy if exists "attendance update" on public.attendance;

drop table if exists public.attendance;
