-- Bemack farm master data + sample scouting (run after 006, link-auth-users, optional seed)

insert into public.farms (id, name, location, type)
values (
  'beee0001-0001-4001-8001-000000000001',
  'Bemack',
  'Protected floriculture',
  'Greenhouse'
)
on conflict (id) do update set name = excluded.name;

insert into public.crop_categories (id, name)
values
  ('ccccccc1-1111-1111-1111-111111111111', 'Super Premium'),
  ('ccccccc2-2222-2222-2222-222222222222', 'Alstroemeria')
on conflict (name) do nothing;

-- Super Premium varieties
insert into public.crop_varieties (category_id, name)
select 'ccccccc1-1111-1111-1111-111111111111', v from unnest(array[
  'ANNAKARINA','ANNAKYRA','ARCTICA','CERAMIC','CONFIDENTIAL','CREAM DREAM','DEEP PURPLE',
  'EVER PINK','EVER RED','EXPLORER','GOLD FINCH','GOVINDA','JACUZZI','LOVE POTION',
  'MADAM CERISE','MADAM RED','MANDALA','MOODY BLUE','NIGHTNGALE','PALOMA','PERFECT PEACH',
  'PROUD','REVIVAL','ROSE ROYCE','SILANTOI','SUGAR PLUM','TRIALS SUPER PREMIUM'
]::text[]) as v
on conflict (category_id, name) do nothing;

-- Alstroemeria varieties
insert into public.crop_varieties (category_id, name)
select 'ccccccc2-2222-2222-2222-222222222222', v from unnest(array[
  'AKEMI','BAHIA','CAMARO','CANYON','CINNAMON','DUBAI','FLORIDA','FORTUNE','GRAND LADY',
  'LIVORNO','MISTRAL','NAPOLI','PLANTINA','STRATUS','TRIALS ALSTRO','WINNIPEG'
]::text[]) as v
on conflict (category_id, name) do nothing;

insert into public.scouting_parameters (param_key, param_group, name, sort_order)
values
  ('sp-white-flies', 'pest', 'White Flies', 1),
  ('sp-thrips', 'pest', 'Thrips', 2),
  ('sp-aphids', 'pest', 'Aphids', 3),
  ('sp-mites', 'pest', 'Mites', 4),
  ('sp-fcm', 'pest', 'False Codling Moth', 5),
  ('sp-helicoverpa', 'pest', 'Helicoverpa', 6),
  ('sp-caterpillers', 'pest', 'Other Caterpillers', 7),
  ('sp-spondoptera', 'pest', 'Spondoptera', 8),
  ('sd-botrytis', 'disease', 'Botrytis', 9),
  ('sd-powdery', 'disease', 'Powdery Mildew', 10),
  ('sd-agrobacterium', 'disease', 'Agrobacterium', 11),
  ('sd-downey', 'disease', 'Downey Mildew', 12),
  ('sd-stem-bot', 'disease', 'Stem Bot', 13),
  ('ch-vigor', 'crop_health', 'Crop vigor', 14),
  ('ch-nutrient', 'crop_health', 'Nutrient stress signs', 15)
on conflict (param_key) do nothing;

-- Greenhouses BEGH 01–17
insert into public.greenhouses (id, farm_id, name, crop_type, latitude, longitude, area_ha)
values
  ('beeeee01-0001-0001-0001-000000000001', 'beee0001-0001-4001-8001-000000000001', 'BEGH 01', 'Floriculture', -1.2921, 36.8219, 0.70),
  ('beeeee01-0001-0001-0001-000000000002', 'beee0001-0001-4001-8001-000000000001', 'BEGH 02', 'Floriculture', -1.2929, 36.8219, 0.50),
  ('beeeee01-0001-0001-0001-000000000003', 'beee0001-0001-4001-8001-000000000001', 'BEGH 03', 'Floriculture', -1.2937, 36.8219, 0.50),
  ('beeeee01-0001-0001-0001-000000000004', 'beee0001-0001-4001-8001-000000000001', 'BEGH 04', 'Floriculture', -1.2945, 36.8219, 0.50),
  ('beeeee01-0001-0001-0001-000000000005', 'beee0001-0001-4001-8001-000000000001', 'BEGH 05', 'Floriculture', -1.2921, 36.8227, 0.50),
  ('beeeee01-0001-0001-0001-000000000006', 'beee0001-0001-4001-8001-000000000001', 'BEGH 06', 'Floriculture', -1.2929, 36.8227, 0.50),
  ('beeeee01-0001-0001-0001-000000000007', 'beee0001-0001-4001-8001-000000000001', 'BEGH 07', 'Floriculture', -1.2937, 36.8227, 0.50),
  ('beeeee01-0001-0001-0001-000000000008', 'beee0001-0001-4001-8001-000000000001', 'BEGH 08', 'Floriculture', -1.2945, 36.8227, 0.50),
  ('beeeee01-0001-0001-0001-000000000009', 'beee0001-0001-4001-8001-000000000001', 'BEGH 09', 'Floriculture', -1.2921, 36.8235, 0.50),
  ('beeeee01-0001-0001-0001-000000000010', 'beee0001-0001-4001-8001-000000000001', 'BEGH 10', 'Floriculture', -1.2929, 36.8235, 0.50),
  ('beeeee01-0001-0001-0001-000000000011', 'beee0001-0001-4001-8001-000000000001', 'BEGH 11', 'Floriculture', -1.2937, 36.8235, 0.50),
  ('beeeee01-0001-0001-0001-000000000012', 'beee0001-0001-4001-8001-000000000001', 'BEGH 12', 'Floriculture', -1.2945, 36.8235, 0.50),
  ('beeeee01-0001-0001-0001-000000000013', 'beee0001-0001-4001-8001-000000000001', 'BEGH 13', 'Floriculture', -1.2921, 36.8243, 0.50),
  ('beeeee01-0001-0001-0001-000000000014', 'beee0001-0001-4001-8001-000000000001', 'BEGH 14', 'Floriculture', -1.2929, 36.8243, 0.50),
  ('beeeee01-0001-0001-0001-000000000015', 'beee0001-0001-4001-8001-000000000001', 'BEGH 15', 'Floriculture', -1.2937, 36.8243, 0.50),
  ('beeeee01-0001-0001-0001-000000000016', 'beee0001-0001-4001-8001-000000000001', 'BEGH 16', 'Floriculture', -1.2945, 36.8243, 0.50),
  ('beeeee01-0001-0001-0001-000000000017', 'beee0001-0001-4001-8001-000000000001', 'BEGH 17', 'Floriculture', -1.2933, 36.8251, 0.50)
on conflict (id) do update set
  name = excluded.name,
  area_ha = excluded.area_ha,
  latitude = excluded.latitude,
  longitude = excluded.longitude;

insert into public.qr_codes (farm_id, greenhouse_id, qr_value)
select
  'beee0001-0001-4001-8001-000000000001',
  g.id,
  'VEGPRO|BEMACK|' || replace(g.name, ' ', '-')
from public.greenhouses g
where g.farm_id = 'beee0001-0001-4001-8001-000000000001'
on conflict (qr_value) do nothing;
