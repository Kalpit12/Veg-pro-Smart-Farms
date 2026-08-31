-- Enable Realtime for live dashboard / map updates (run after 001–003)
alter publication supabase_realtime add table public.infestation_hotspots;
alter publication supabase_realtime add table public.spray_treatments;
alter publication supabase_realtime add table public.worker_positions;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.activities;
