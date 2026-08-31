-- Fix 500 on GET /rest/v1/users: current_role() queried users under RLS (infinite recursion).
create or replace function public.current_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.current_role() to anon;

drop policy if exists "users can read own profile" on public.users;

create policy "users can read own profile"
on public.users for select
using (
  id = auth.uid()
  or public.current_role() in ('admin', 'supervisor')
);
