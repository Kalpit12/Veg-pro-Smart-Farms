-- Remove legacy North Farm / East Farm seed (replaced by Bemack in 007_seed_bemack.sql)

delete from public.spray_treatments
where
  farm_id in (
    'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
  )
  or hotspot_id in (
    'ccccccc1-cccc-cccc-cccc-ccccccccccc1',
    'ccccccc2-cccc-cccc-cccc-ccccccccccc2'
  )
  or id = 'ddddddd1-dddd-dddd-dddd-ddddddddddd1';

delete from public.scouting_records
where farm_id in (
  'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
);

delete from public.scouting_rounds
where farm_id in (
  'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
);

delete from public.activities
where farm_id in (
  'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
);

delete from public.infestation_hotspots
where
  farm_id in (
    'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
  )
  or id in (
    'ccccccc1-cccc-cccc-cccc-ccccccccccc1',
    'ccccccc2-cccc-cccc-cccc-ccccccccccc2'
  );

delete from public.qr_codes
where farm_id in (
  'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
);

delete from public.alerts
where message ilike '%North Farm%'
   or message ilike '%East Farm%'
   or message ilike '%GH-A1%'
   or message ilike '%GH-E1%';

delete from public.greenhouses
where farm_id in (
  'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
);

delete from public.farms
where id in (
  'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
);
