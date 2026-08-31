create extension if not exists "pgcrypto";

create type user_role as enum ('admin', 'supervisor', 'worker');
create type alert_status as enum ('open', 'resolved');
create type activity_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role user_role not null default 'worker',
  created_at timestamptz not null default now()
);

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.greenhouses (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  crop_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.users(id) on delete restrict,
  farm_id uuid not null references public.farms(id) on delete restrict,
  greenhouse_id uuid references public.greenhouses(id) on delete set null,
  activity_type text not null,
  notes text,
  image_url text,
  gps_location text,
  status activity_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.users(id) on delete restrict,
  check_in timestamptz not null default now(),
  check_out timestamptz,
  gps_location text,
  created_at timestamptz not null default now()
);

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  greenhouse_id uuid references public.greenhouses(id) on delete cascade,
  qr_value text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  message text not null,
  status alert_status not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.farms enable row level security;
alter table public.greenhouses enable row level security;
alter table public.activities enable row level security;
alter table public.attendance enable row level security;
alter table public.qr_codes enable row level security;
alter table public.alerts enable row level security;

create or replace function public.current_role()
returns user_role
language sql
stable
as $$
  select role from public.users where id = auth.uid()
$$;

create policy "users can read own profile"
on public.users for select
using (id = auth.uid() or public.current_role() in ('admin', 'supervisor'));

create policy "admin manages users"
on public.users for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "ops read farms"
on public.farms for select
using (auth.uid() is not null);

create policy "admin writes farms"
on public.farms for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "ops read greenhouses"
on public.greenhouses for select
using (auth.uid() is not null);

create policy "admin writes greenhouses"
on public.greenhouses for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "workers insert own activity"
on public.activities for insert
with check (worker_id = auth.uid());

create policy "workers read own activity"
on public.activities for select
using (worker_id = auth.uid() or public.current_role() in ('admin', 'supervisor'));

create policy "supervisor approve activity"
on public.activities for update
using (public.current_role() in ('admin', 'supervisor'))
with check (public.current_role() in ('admin', 'supervisor'));

create policy "workers insert own attendance"
on public.attendance for insert
with check (worker_id = auth.uid());

create policy "attendance read"
on public.attendance for select
using (worker_id = auth.uid() or public.current_role() in ('admin', 'supervisor'));

create policy "attendance update"
on public.attendance for update
using (worker_id = auth.uid() or public.current_role() in ('admin', 'supervisor'))
with check (worker_id = auth.uid() or public.current_role() in ('admin', 'supervisor'));

create policy "ops read qr"
on public.qr_codes for select
using (auth.uid() is not null);

create policy "admin writes qr"
on public.qr_codes for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "ops read alerts"
on public.alerts for select
using (auth.uid() is not null);

create policy "supervisor updates alerts"
on public.alerts for update
using (public.current_role() in ('admin', 'supervisor'))
with check (public.current_role() in ('admin', 'supervisor'));

insert into storage.buckets (id, name, public)
values ('activity-evidence', 'activity-evidence', false)
on conflict (id) do nothing;

create policy "authenticated uploads evidence"
on storage.objects for insert
to authenticated
with check (bucket_id = 'activity-evidence');

create policy "authenticated reads evidence"
on storage.objects for select
to authenticated
using (bucket_id = 'activity-evidence');
