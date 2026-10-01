-- Reproject Star greenhouse anchors from Nairobi demo origin onto the Star /
-- Naivasha farm centroid so phone GPS geofence / nearest-house work on site.
-- Per-house surveyed GPS should replace these via admin import when available.

-- Relative offsets from legacy demo origin (-1.2921, 36.8219) are preserved.
do $$
declare
  demo_lat constant double precision := -1.2921;
  demo_lng constant double precision := 36.8219;
  -- Lake Naivasha floriculture corridor (survey centroid TBD)
  farm_lat constant double precision := -0.7172;
  farm_lng constant double precision := 36.431;
begin
  update public.greenhouses g
  set
    latitude = farm_lat + (g.latitude - demo_lat),
    longitude = farm_lng + (g.longitude - demo_lng)
  from public.farms f
  where g.farm_id = f.id
    and f.name = 'Star'
    and g.latitude is not null
    and g.longitude is not null
    -- Only shift rows still sitting on the Nairobi demo grid
    and g.latitude between -1.30 and -1.28
    and g.longitude between 36.82 and 36.83;
end $$;

comment on column public.greenhouses.latitude is
  'Greenhouse GPS anchor (WGS84). Prefer surveyed coords; seed uses Star farm base.';
comment on column public.greenhouses.longitude is
  'Greenhouse GPS anchor (WGS84). Prefer surveyed coords; seed uses Star farm base.';
