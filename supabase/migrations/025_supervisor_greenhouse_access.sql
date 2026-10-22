-- Farm managers (supervisors) only see farms/greenhouses assigned by an admin.

create table if not exists public.supervisor_greenhouse_access (
  user_id uuid not null references public.users(id) on delete cascade,
  greenhouse_id uuid not null references public.greenhouses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, greenhouse_id)
);

create index if not exists supervisor_greenhouse_access_user_idx
  on public.supervisor_greenhouse_access (user_id);

alter table public.supervisor_greenhouse_access enable row level security;

create policy "admin manages supervisor greenhouse access"
on public.supervisor_greenhouse_access for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "supervisor reads own greenhouse access"
on public.supervisor_greenhouse_access for select
using (user_id = auth.uid());

create or replace function public.manager_has_site_access(
  p_farm_id uuid,
  p_greenhouse_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_role() = 'admin'
    or (
      public.current_role() = 'supervisor'
      and (
        (
          p_greenhouse_id is not null
          and exists (
            select 1
            from public.supervisor_greenhouse_access a
            where a.user_id = auth.uid()
              and a.greenhouse_id = p_greenhouse_id
          )
        )
        or (
          p_greenhouse_id is null
          and p_farm_id is not null
          and exists (
            select 1
            from public.supervisor_greenhouse_access a
            inner join public.greenhouses g on g.id = a.greenhouse_id
            where a.user_id = auth.uid()
              and g.farm_id = p_farm_id
          )
        )
      )
    );
$$;

revoke all on function public.manager_has_site_access(uuid, uuid) from public;
grant execute on function public.manager_has_site_access(uuid, uuid) to authenticated;

-- Existing supervisors keep full visibility until an admin narrows access.
insert into public.supervisor_greenhouse_access (user_id, greenhouse_id)
select u.id, g.id
from public.users u
cross join public.greenhouses g
where u.role = 'supervisor'
on conflict do nothing;

drop policy if exists "ops read farms" on public.farms;
create policy "ops read farms"
on public.farms for select
using (
  auth.uid() is not null
  and (
    public.current_role() in ('admin', 'worker')
    or (
      public.current_role() = 'supervisor'
      and exists (
        select 1
        from public.supervisor_greenhouse_access a
        inner join public.greenhouses g on g.id = a.greenhouse_id
        where a.user_id = auth.uid()
          and g.farm_id = farms.id
      )
    )
  )
);

drop policy if exists "ops read greenhouses" on public.greenhouses;
create policy "ops read greenhouses"
on public.greenhouses for select
using (
  auth.uid() is not null
  and (
    public.current_role() in ('admin', 'worker')
    or (
      public.current_role() = 'supervisor'
      and exists (
        select 1
        from public.supervisor_greenhouse_access a
        where a.user_id = auth.uid()
          and a.greenhouse_id = greenhouses.id
      )
    )
  )
);

drop policy if exists "ops read hotspots" on public.infestation_hotspots;
create policy "ops read hotspots"
on public.infestation_hotspots for select
using (
  reported_by = auth.uid()
  or public.manager_has_site_access(farm_id, greenhouse_id)
);

drop policy if exists "supervisor update hotspots" on public.infestation_hotspots;
create policy "supervisor update hotspots"
on public.infestation_hotspots for update
using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'supervisor'
    and public.manager_has_site_access(farm_id, greenhouse_id)
  )
)
with check (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'supervisor'
    and public.manager_has_site_access(farm_id, greenhouse_id)
  )
);

drop policy if exists "ops read sprays" on public.spray_treatments;
create policy "ops read sprays"
on public.spray_treatments for select
using (
  worker_id = auth.uid()
  or public.manager_has_site_access(farm_id, greenhouse_id)
);

drop policy if exists "ops read scouting records" on public.scouting_records;
create policy "ops read scouting records"
on public.scouting_records for select
using (
  scout_id = auth.uid()
  or public.manager_has_site_access(farm_id, greenhouse_id)
);

drop policy if exists "ops read scouting observations" on public.scouting_observations;
create policy "ops read scouting observations"
on public.scouting_observations for select
using (
  exists (
    select 1
    from public.scouting_records r
    where r.id = record_id
      and (
        r.scout_id = auth.uid()
        or public.manager_has_site_access(r.farm_id, r.greenhouse_id)
      )
  )
);

drop policy if exists "ops read scouting rounds" on public.scouting_rounds;
create policy "ops read scouting rounds"
on public.scouting_rounds for select
using (
  scout_id = auth.uid()
  or public.manager_has_site_access(farm_id, greenhouse_id)
);

drop policy if exists "ops read scouting route points" on public.scouting_route_points;
create policy "ops read scouting route points"
on public.scouting_route_points for select
using (
  exists (
    select 1
    from public.scouting_rounds r
    where r.id = round_id
      and (
        r.scout_id = auth.uid()
        or public.manager_has_site_access(r.farm_id, r.greenhouse_id)
      )
  )
);
