-- Bemack precision scouting (VegPro / Scarab-style data model)

create type scouting_issue_type as enum ('disease', 'pest');
create type scouting_parameter_group as enum ('pest', 'disease', 'crop_health');

create table public.crop_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.crop_varieties (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.crop_categories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create table public.scouting_parameters (
  id uuid primary key default gen_random_uuid(),
  param_key text not null unique,
  param_group scouting_parameter_group not null,
  name text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.greenhouses
  add column if not exists area_ha numeric(6, 2);

create table public.scouting_records (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.users(id) on delete restrict,
  farm_id uuid not null references public.farms(id) on delete restrict,
  greenhouse_id uuid not null references public.greenhouses(id) on delete restrict,
  category_id uuid not null references public.crop_categories(id) on delete restrict,
  variety_id uuid not null references public.crop_varieties(id) on delete restrict,
  beds smallint not null check (beds > 0),
  column_no smallint not null check (column_no > 0),
  bay_no smallint not null check (bay_no > 0),
  issue_type scouting_issue_type not null,
  issue_name text not null,
  rating smallint check (rating is null or (rating between 1 and 5)),
  latitude double precision,
  longitude double precision,
  notes text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.scouting_observations (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.scouting_records(id) on delete cascade,
  parameter_id uuid not null references public.scouting_parameters(id) on delete restrict,
  present boolean not null default false,
  rating smallint check (rating is null or (rating between 1 and 5)),
  unique (record_id, parameter_id)
);

create index scouting_records_farm_gh_idx on public.scouting_records (farm_id, greenhouse_id, recorded_at desc);
create index scouting_records_variety_idx on public.scouting_records (variety_id, recorded_at desc);

alter table public.crop_categories enable row level security;
alter table public.crop_varieties enable row level security;
alter table public.scouting_parameters enable row level security;
alter table public.scouting_records enable row level security;
alter table public.scouting_observations enable row level security;

create policy "ops read crop categories"
on public.crop_categories for select
using (auth.uid() is not null);

create policy "admin write crop categories"
on public.crop_categories for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "ops read crop varieties"
on public.crop_varieties for select
using (auth.uid() is not null);

create policy "admin write crop varieties"
on public.crop_varieties for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "ops read scouting parameters"
on public.scouting_parameters for select
using (auth.uid() is not null);

create policy "admin write scouting parameters"
on public.scouting_parameters for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "scouts insert own scouting records"
on public.scouting_records for insert
with check (scout_id = auth.uid());

create policy "ops read scouting records"
on public.scouting_records for select
using (
  scout_id = auth.uid()
  or public.current_role() in ('admin', 'supervisor')
);

create policy "scouts insert observations for own records"
on public.scouting_observations for insert
with check (
  exists (
    select 1 from public.scouting_records r
    where r.id = record_id and r.scout_id = auth.uid()
  )
);

create policy "ops read scouting observations"
on public.scouting_observations for select
using (
  exists (
    select 1 from public.scouting_records r
    where r.id = record_id
      and (r.scout_id = auth.uid() or public.current_role() in ('admin', 'supervisor'))
  )
);
