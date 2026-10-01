-- Scout stop photo evidence (storage path in activity-evidence bucket)
alter table public.scouting_records
  add column if not exists image_url text;

comment on column public.scouting_records.image_url is
  'Storage object path for optional stop photo evidence';
