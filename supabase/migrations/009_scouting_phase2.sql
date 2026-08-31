-- Phase 2: scout rounds (route tracking), round-linked stops

create type scouting_round_status as enum ('active', 'completed');

create table public.scouting_rounds (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.users(id) on delete restrict,
  farm_id uuid not null references public.farms(id) on delete restrict,
  greenhouse_id uuid not null references public.greenhouses(id) on delete restrict,
  status scouting_round_status not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  stop_count smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.scouting_records
  add column if not exists round_id uuid references public.scouting_rounds(id) on delete set null;

create index scouting_rounds_scout_active_idx
  on public.scouting_rounds (scout_id, status)
  where status = 'active';

create index scouting_records_round_idx on public.scouting_records (round_id);

alter table public.scouting_rounds enable row level security;

create policy "scouts manage own rounds"
on public.scouting_rounds for all
using (scout_id = auth.uid())
with check (scout_id = auth.uid());

create policy "ops read scouting rounds"
on public.scouting_rounds for select
using (
  scout_id = auth.uid()
  or public.current_role() in ('admin', 'supervisor')
);

create or replace function public.increment_round_stop_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.round_id is not null then
    update public.scouting_rounds
    set stop_count = stop_count + 1
    where id = new.round_id;
  end if;
  return new;
end;
$$;

drop trigger if exists scouting_record_increment_round on public.scouting_records;
create trigger scouting_record_increment_round
after insert on public.scouting_records
for each row execute function public.increment_round_stop_count();
