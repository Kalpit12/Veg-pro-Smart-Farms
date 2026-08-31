-- Optional demo data for manager dashboards (run after 007, link-auth-users, 011).
-- Adds sample scouting stops + one infestation hotspot on Bemack BEGH 01.
-- Safe to re-run: removes prior demo rows first.

-- Order matters: remove observations → rounds → records (so re-runs do not duplicate demo rows)
delete from public.scouting_observations
where record_id in (
  select id from public.scouting_records
  where farm_id = 'beee0001-0001-4001-8001-000000000001'
    and notes = 'demo-seed'
);

delete from public.scouting_rounds
where farm_id = 'beee0001-0001-4001-8001-000000000001'
  and id in (
    select round_id from public.scouting_records
    where notes = 'demo-seed' and round_id is not null
  );

delete from public.scouting_records
where farm_id = 'beee0001-0001-4001-8001-000000000001'
  and notes = 'demo-seed';

delete from public.infestation_hotspots
where farm_id = 'beee0001-0001-4001-8001-000000000001'
  and main_issue like 'Pressure rising%';

delete from public.alerts
where message like '%Bemack BEGH%'
   or message like '%BEGH 01 column%';

do $$
declare
  v_worker uuid;
  v_farm uuid := 'beee0001-0001-4001-8001-000000000001';
  v_gh01 uuid := 'beeeee01-0001-0001-0001-000000000001';
  v_gh05 uuid := 'beeeee01-0001-0001-0001-000000000005';
  v_cat_sp uuid := 'ccccccc1-1111-1111-1111-111111111111';
  v_var_annakarina uuid;
  v_var_explorer uuid;
  v_round uuid := gen_random_uuid();
begin
  select id into v_worker from public.users where email = 'worker@vegpro.com' limit 1;
  if v_worker is null then
    raise exception 'Run link-auth-users.sql after creating worker@vegpro.com in Supabase Auth';
  end if;

  select id into v_var_annakarina from public.crop_varieties
  where category_id = v_cat_sp and name = 'ANNAKARINA' limit 1;

  select id into v_var_explorer from public.crop_varieties
  where category_id = v_cat_sp and name = 'EXPLORER' limit 1;

  insert into public.scouting_rounds (id, scout_id, farm_id, greenhouse_id, status, stop_count)
  values (v_round, v_worker, v_farm, v_gh01, 'active', 0)
  on conflict (id) do nothing;

  insert into public.scouting_records (
    scout_id, farm_id, greenhouse_id, category_id, variety_id,
    beds, column_no, bay_no, issue_type, issue_name, rating,
    latitude, longitude, round_id, recorded_at, notes
  )
  values
    (v_worker, v_farm, v_gh01, v_cat_sp, v_var_annakarina,
     20, 1, 25, 'disease', 'Agrobacterium', 4,
     -1.2921, 36.8219, v_round, now() - interval '2 hours', 'demo-seed'),
    (v_worker, v_farm, v_gh01, v_cat_sp, v_var_annakarina,
     20, 3, 12, 'pest', 'White Flies', 3,
     -1.29215, 36.82195, v_round, now() - interval '90 minutes', 'demo-seed'),
    (v_worker, v_farm, v_gh05, v_cat_sp, v_var_explorer,
     18, 2, 8, 'pest', 'Thrips', 5,
     -1.2921, 36.8227, v_round, now() - interval '45 minutes', 'demo-seed');

  insert into public.infestation_hotspots (
    farm_id, greenhouse_id, reported_by,
    latitude, longitude, pest_type, problem, main_issue, severity, status
  )
  values (
    v_farm, v_gh01, v_worker,
    -1.29218, 36.82192, 'Thrips', 'Silver streaks on upper leaves',
    'Pressure rising in bay 12–15', 4, 'active'
  );

  insert into public.alerts (type, message, status)
  values
    ('scouting', 'High thrips rating (5) at Bemack BEGH 05 — review spray program.', 'open'),
    ('infestation', 'Agrobacterium pressure at BEGH 01 column 1.', 'open');

  update public.scouting_rounds
  set stop_count = 3,
      status = 'completed',
      ended_at = now()
  where id = v_round;
end $$;
