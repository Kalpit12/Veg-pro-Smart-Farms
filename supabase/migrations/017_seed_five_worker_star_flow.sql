-- Five field workers: scouting rounds, infestation reports, sprays, live GPS, alerts.
-- Star farm. Password for new worker logins: VegPro2026!
-- Existing worker@vegpro.com is worker 1. Safe to re-run.

create or replace function public._upsert_star_demo_worker(
  p_id uuid,
  p_email text,
  p_name text,
  p_phone text
) returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt('VegPro2026!', extensions.gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name),
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    ''
  )
  on conflict (id) do update set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = timezone('utc', now());

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    p_id,
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email',
    p_id::text,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (provider_id, provider) do update set
    identity_data = excluded.identity_data,
    user_id = excluded.user_id,
    updated_at = timezone('utc', now());

  insert into public.users (id, full_name, email, phone, role)
  values (p_id, p_name, p_email, p_phone, 'worker')
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    role = excluded.role;
end;
$$;

create or replace function public._seed_star_worker_flow(
  p_worker uuid,
  p_farm uuid,
  p_cat uuid,
  p_note text,
  p_gh_name text,
  p_variety text,
  p_round uuid,
  p_issue_a text,
  p_issue_a_name text,
  p_issue_a_rating int,
  p_issue_b text,
  p_issue_b_name text,
  p_issue_b_rating int,
  p_hotspot uuid,
  p_pest_type text,
  p_problem text,
  p_main_issue text,
  p_severity int,
  p_status text,
  p_spray_product text,
  p_minutes_ago int,
  p_bay int
) returns void
language plpgsql
as $$
declare
  v_gh uuid;
  v_lat double precision;
  v_lng double precision;
  v_var uuid;
  v_start timestamptz;
  v_end timestamptz;
  i int;
begin
  select id, latitude, longitude
    into v_gh, v_lat, v_lng
  from public.greenhouses
  where farm_id = p_farm and name = p_gh_name;

  if v_gh is null then
    raise exception 'Missing greenhouse %', p_gh_name;
  end if;

  select id into v_var
  from public.crop_varieties
  where category_id = p_cat and name = p_variety
  limit 1;

  if v_var is null then
    raise exception 'Missing variety %', p_variety;
  end if;

  v_start := timezone('utc', now()) - make_interval(mins => p_minutes_ago + 45);
  v_end := timezone('utc', now()) - make_interval(mins => p_minutes_ago + 10);

  insert into public.scouting_rounds (
    id, scout_id, farm_id, greenhouse_id, status, started_at, ended_at,
    stop_count, distance_m, duration_s, point_count, coverage_pct
  )
  values (
    p_round, p_worker, p_farm, v_gh, 'completed', v_start, v_end,
    0, 180 + p_bay * 12, 2100, 16, 14.5
  );

  for i in 0..15 loop
    insert into public.scouting_route_points (
      round_id, latitude, longitude, accuracy_m, recorded_at
    )
    values (
      p_round,
      v_lat + (i * 0.000012),
      v_lng + (sin(i::double precision / 3) * 0.00002),
      7,
      v_start + make_interval(mins => i * 2)
    );
  end loop;

  insert into public.scouting_records (
    scout_id, farm_id, greenhouse_id, category_id, variety_id,
    beds, column_no, bay_no, issue_type, issue_name, rating,
    latitude, longitude, notes, recorded_at, round_id
  )
  values
    (
      p_worker, p_farm, v_gh, p_cat, v_var,
      11, 1, p_bay::smallint, p_issue_a::scouting_issue_type, p_issue_a_name, p_issue_a_rating::smallint,
      v_lat + 0.00004, v_lng + 0.00003, p_note,
      timezone('utc', now()) - make_interval(mins => p_minutes_ago + 30),
      p_round
    ),
    (
      p_worker, p_farm, v_gh, p_cat, v_var,
      11, 2, least(p_bay + 2, 11)::smallint, p_issue_b::scouting_issue_type, p_issue_b_name, p_issue_b_rating::smallint,
      v_lat + 0.00007, v_lng + 0.00005, p_note,
      timezone('utc', now()) - make_interval(mins => p_minutes_ago + 18),
      p_round
    );

  insert into public.infestation_hotspots (
    id, farm_id, greenhouse_id, reported_by, latitude, longitude,
    pest_type, problem, main_issue, severity, status, created_at
  )
  values (
    p_hotspot, p_farm, v_gh, p_worker,
    v_lat + 0.00005, v_lng + 0.00004,
    p_pest_type, p_problem, p_main_issue, p_severity::smallint, p_status::infestation_status,
    timezone('utc', now()) - make_interval(mins => p_minutes_ago + 12)
  );

  if p_spray_product is not null then
    insert into public.spray_treatments (
      worker_id, hotspot_id, farm_id, greenhouse_id, latitude, longitude,
      product_name, notes, created_at
    )
    values (
      p_worker, p_hotspot, p_farm, v_gh, v_lat + 0.00005, v_lng + 0.00004,
      p_spray_product, p_note,
      timezone('utc', now()) - make_interval(mins => p_minutes_ago)
    );
  end if;

  insert into public.activities (
    worker_id, farm_id, greenhouse_id, activity_type, notes, gps_location, status, created_at
  )
  values (
    p_worker, p_farm, v_gh, 'Scouting', p_note,
    v_lat::text || ',' || v_lng::text, 'approved',
    timezone('utc', now()) - make_interval(mins => p_minutes_ago + 28)
  );

  insert into public.worker_positions (worker_id, latitude, longitude, updated_at)
  values (
    p_worker,
    v_lat + 0.00002,
    v_lng + 0.00001,
    timezone('utc', now()) - make_interval(mins => 4)
  )
  on conflict (worker_id) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    updated_at = excluded.updated_at;
end;
$$;

do $$
declare
  v_farm uuid := 'beee0001-0001-4001-8001-000000000001';
  v_cat uuid := 'ccccccc3-3333-3333-3333-333333333333';
  v_worker uuid := '49b389f8-8113-4773-b92c-b52c498284a2';
  v_amina uuid := 'aaaaaa01-0001-4001-8001-000000000001';
  v_james uuid := 'aaaaaa01-0001-4001-8001-000000000002';
  v_faith uuid := 'aaaaaa01-0001-4001-8001-000000000003';
  v_daniel uuid := 'aaaaaa01-0001-4001-8001-000000000004';
  v_note text := 'demo-seed-star-five';
begin
  perform public._upsert_star_demo_worker(v_amina, 'amina.otieno@vegpro.com', 'Amina Otieno', '+254700000011');
  perform public._upsert_star_demo_worker(v_james, 'james.mwangi@vegpro.com', 'James Mwangi', '+254700000012');
  perform public._upsert_star_demo_worker(v_faith, 'faith.wanjiku@vegpro.com', 'Faith Wanjiku', '+254700000013');
  perform public._upsert_star_demo_worker(v_daniel, 'daniel.kipchoge@vegpro.com', 'Daniel Kipchoge', '+254700000014');

  delete from public.scouting_observations
  where record_id in (select id from public.scouting_records where notes = v_note);
  delete from public.scouting_records where notes = v_note;
  delete from public.scouting_route_points
  where round_id in (
    'dddddd01-0001-4001-8001-000000000001'::uuid,
    'dddddd01-0001-4001-8001-000000000002'::uuid,
    'dddddd01-0001-4001-8001-000000000003'::uuid,
    'dddddd01-0001-4001-8001-000000000004'::uuid,
    'dddddd01-0001-4001-8001-000000000005'::uuid
  );
  delete from public.scouting_rounds
  where id in (
    'dddddd01-0001-4001-8001-000000000001'::uuid,
    'dddddd01-0001-4001-8001-000000000002'::uuid,
    'dddddd01-0001-4001-8001-000000000003'::uuid,
    'dddddd01-0001-4001-8001-000000000004'::uuid,
    'dddddd01-0001-4001-8001-000000000005'::uuid
  );
  delete from public.spray_treatments where notes = v_note;
  delete from public.infestation_hotspots
  where id in (
    'eeeeee01-0001-4001-8001-000000000001'::uuid,
    'eeeeee01-0001-4001-8001-000000000002'::uuid,
    'eeeeee01-0001-4001-8001-000000000003'::uuid,
    'eeeeee01-0001-4001-8001-000000000004'::uuid,
    'eeeeee01-0001-4001-8001-000000000005'::uuid
  );
  delete from public.activities where notes = v_note;
  delete from public.alerts where message like '[Star demo]%';

  perform public._seed_star_worker_flow(
    v_worker, v_farm, v_cat, v_note,
    'STGH01A', 'Red Calypso',
    'dddddd01-0001-4001-8001-000000000001',
    'pest', 'Thrips', 4,
    'disease', 'Powdery Mildew', 3,
    'eeeeee01-0001-4001-8001-000000000001',
    'Thrips', 'Silver streaks on upper leaves', 'Pressure rising in bays 4–6', 4, 'sprayed',
    'Abamectin 1.8 EC',
    80, 3
  );

  perform public._seed_star_worker_flow(
    v_amina, v_farm, v_cat, v_note,
    'STGH02A', 'Fuschiana',
    'dddddd01-0001-4001-8001-000000000002',
    'pest', 'Aphids', 5,
    'pest', 'White Flies', 3,
    'eeeeee01-0001-4001-8001-000000000002',
    'Aphids', 'Colonies on new shoots', 'High pressure on Fuschiana — spray crew needed', 5, 'active',
    null,
    70, 2
  );

  perform public._seed_star_worker_flow(
    v_james, v_farm, v_cat, v_note,
    'STGH03A', 'Athena',
    'dddddd01-0001-4001-8001-000000000003',
    'pest', 'False Codling Moth', 3,
    'disease', 'Botrytis', 4,
    'eeeeee01-0001-4001-8001-000000000003',
    'False Codling Moth', 'Larvae in buds', 'Spot treatment completed after scout round', 3, 'sprayed',
    'Spinosad 480 SC',
    55, 4
  );

  perform public._seed_star_worker_flow(
    v_faith, v_farm, v_cat, v_note,
    'STGH05A', 'Confidential',
    'dddddd01-0001-4001-8001-000000000004',
    'pest', 'Mites', 4,
    'disease', 'Downey Mildew', 2,
    'eeeeee01-0001-4001-8001-000000000004',
    'Mites', 'Stippling on lower foliage', 'Spreading along the west walkway', 4, 'active',
    null,
    40, 5
  );

  perform public._seed_star_worker_flow(
    v_daniel, v_farm, v_cat, v_note,
    'STGH07A', 'Moonwalk',
    'dddddd01-0001-4001-8001-000000000005',
    'pest', 'Helicoverpa', 5,
    'disease', 'Back Spot', 3,
    'eeeeee01-0001-4001-8001-000000000005',
    'Helicoverpa', 'Chewed buds and petals', 'Urgent — feeding damage in bay 8', 5, 'active',
    null,
    25, 1
  );

  insert into public.alerts (type, message, status, created_at)
  values
    ('infestation', '[Star demo] Severity 5 Aphids at Star / STGH02A (Amina Otieno) — assign spray crew.', 'open', timezone('utc', now()) - interval '70 minutes'),
    ('infestation', '[Star demo] Mites still active at STGH05A after Faith Wanjiku report.', 'open', timezone('utc', now()) - interval '40 minutes'),
    ('infestation', '[Star demo] Severity 5 Helicoverpa at STGH07A (Daniel Kipchoge).', 'open', timezone('utc', now()) - interval '20 minutes');
end $$;

drop function public._seed_star_worker_flow(
  uuid, uuid, uuid, text, text, text, uuid,
  text, text, int, text, text, int,
  uuid, text, text, text, int, text, text, int, int
);
drop function public._upsert_star_demo_worker(uuid, text, text, text);
