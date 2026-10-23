create table public.chemicals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active_ingredient text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index chemicals_name_lower_unique on public.chemicals (lower(trim(name)));

alter table public.chemicals enable row level security;

create policy "ops read chemicals"
on public.chemicals for select
using (
  is_active = true
  or public.current_role() = 'admin'
);

create policy "admin manage chemicals"
on public.chemicals for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
