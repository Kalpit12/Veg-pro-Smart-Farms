-- Trigger-only helper must not be callable via PostgREST as anon/authenticated.
revoke all on function public.increment_round_stop_count() from public;
revoke all on function public.increment_round_stop_count() from anon;
revoke all on function public.increment_round_stop_count() from authenticated;

-- current_role() is used by RLS for signed-in users only.
revoke all on function public.current_role() from public;
revoke all on function public.current_role() from anon;
grant execute on function public.current_role() to authenticated;
