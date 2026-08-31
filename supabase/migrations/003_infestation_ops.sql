create type infestation_status as enum ('active', 'sprayed', 'resolved');

alter table public.greenhouses
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create table public.infestation_hotspots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  greenhouse_id uuid references public.greenhouses(id) on delete set null,
  reported_by uuid not null references public.users(id) on delete restrict,
  latitude double precision not null,
  longitude double precision not null,
  pest_type text not null,
  problem text not null,
  main_issue text not null,
  severity smallint not null check (severity between 1 and 5),
  status infestation_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.spray_treatments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.users(id) on delete restrict,
  hotspot_id uuid references public.infestation_hotspots(id) on delete set null,
  farm_id uuid not null references public.farms(id) on delete restrict,
  greenhouse_id uuid references public.greenhouses(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  product_name text not null,
  notes text,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.worker_positions (
  worker_id uuid primary key references public.users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  updated_at timestamptz not null default now()
);

alter table public.infestation_hotspots enable row level security;
alter table public.spray_treatments enable row level security;
alter table public.worker_positions enable row level security;

create policy "workers insert own hotspots"
on public.infestation_hotspots for insert
with check (reported_by = auth.uid());

create policy "ops read hotspots"
on public.infestation_hotspots for select
using (reported_by = auth.uid() or public.current_role() in ('admin', 'supervisor'));

create policy "supervisor update hotspots"
on public.infestation_hotspots for update
using (public.current_role() in ('admin', 'supervisor'))
with check (public.current_role() in ('admin', 'supervisor'));

create policy "workers insert own sprays"
on public.spray_treatments for insert
with check (worker_id = auth.uid());

create policy "ops read sprays"
on public.spray_treatments for select
using (worker_id = auth.uid() or public.current_role() in ('admin', 'supervisor'));

create policy "workers manage own position"
on public.worker_positions for all
using (worker_id = auth.uid())
with check (worker_id = auth.uid());

create policy "ops read worker positions"
on public.worker_positions for select
using (worker_id = auth.uid() or public.current_role() in ('admin', 'supervisor'));
