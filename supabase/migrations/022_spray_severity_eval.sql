-- Spray Action Evaluate: capture pre/post severity on linked hotspot treatments
alter table public.spray_treatments
  add column if not exists severity_before smallint
    check (severity_before is null or severity_before between 1 and 5),
  add column if not exists severity_after smallint
    check (severity_after is null or severity_after between 1 and 5);

comment on column public.spray_treatments.severity_before is
  'Hotspot severity at spray time (Action Evaluate baseline)';
comment on column public.spray_treatments.severity_after is
  'Observed severity after treatment (Action Evaluate outcome)';
