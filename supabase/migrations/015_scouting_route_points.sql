-- Smart Scouting Tracker: continuous GPS route points + round metrics

alter table public.scouting_rounds
  add column if not exists distance_m numeric(12, 2) not null default 0,
  add column if not exists duration_s integer,
  add column if not exists point_count integer not null default 0,
  add column if not exists coverage_pct numeric(5, 2);

create table if not exists public.scouting_route_points (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.scouting_rounds(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_m numeric(8, 2),
  recorded_at timestamptz not null default now()
);

create index if not exists scouting_route_points_round_recorded_idx
  on public.scouting_route_points (round_id, recorded_at);

alter table public.scouting_route_points enable row level security;

drop policy if exists "scouts manage own route points" on public.scouting_route_points;
create policy "scouts manage own route points"
on public.scouting_route_points for all
using (
  exists (
    select 1 from public.scouting_rounds r
    where r.id = round_id and r.scout_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.scouting_rounds r
    where r.id = round_id and r.scout_id = auth.uid()
  )
);

drop policy if exists "ops read scouting route points" on public.scouting_route_points;
create policy "ops read scouting route points"
on public.scouting_route_points for select
using (
  exists (
    select 1 from public.scouting_rounds r
    where r.id = round_id
      and (
        r.scout_id = auth.uid()
        or public.current_role() in ('admin', 'supervisor')
      )
  )
);

alter publication supabase_realtime add table public.scouting_route_points;
