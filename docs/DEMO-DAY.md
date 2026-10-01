# VegPro demo day — scout data & GPS flow

**Full presenter script (PDF):** [`DEMO-SCRIPT-VegPro.pdf`](./DEMO-SCRIPT-VegPro.pdf) — what to say, screen-by-screen, readiness checklist, and Q&A.

Regenerate: `python scripts/generate-demo-script-pdf.py`

## What VegPro will see

| Topic | Where to show |
|--------|----------------|
| How scouts enter data | Worker → **Field work** → Start Scouting → Add observation |
| How GPS captures data | **Live GPS tracking** card (coords + nearest greenhouse) |
| GPS → farm & greenhouse | **Current assignment** banner (e.g. Bemack / BEGH 16) |
| Data on manager side | **Scouting**, **Map**, **Dashboard** (stops today KPI) |

## Demo script (Supabase — recommended)

### Before the meeting

1. Run every migration in `supabase/migrations/` (`001`–`023`) and `link-auth-users.sql` in Supabase SQL Editor.
2. Demo accounts: `worker@vegpro.com`, `manager@vegpro.com`, `admin@vegpro.com` (see migration `014_demo_manager_account.sql` for manager password).
3. Paste Auth UUIDs into `link-auth-users.sql` if IDs differ from the template.
4. Run `012_sample_bemack_demo.sql` for seed scouting + map data.
5. Confirm `.env.local` has Supabase URL + anon key; `npm run dev` on port 3000.

### Live demo (15 min)

**Worker (tablet/phone or second browser)**

1. Login `worker@vegpro.com` → **Field work**.
2. Allow location **or** pick greenhouse under **Override greenhouse**.
3. **Start Scouting** (Smart Scouting Tracker).
4. **Add observation** — tap a heat-map cell, then category, variety, pest/disease or None found → **Save**.
5. Optional: **Quick infestation report** (manager logs spray from the spray page).

**Manager (main screen)**

1. Login `manager@vegpro.com` → **Dashboard** — note **Scouting stops today** KPI.
2. **Precision scouting** — heat grid, scout route map (GPS path), records table with GPS column.
3. **Farm map** — infestation pins + worker GPS (realtime).

Worker saves should appear on manager views within seconds (realtime).

## Demo script (offline / no Supabase)

Cookie login as worker → same Field work flow. Data persists in browser storage and appears on manager scouting pages and Bemack-centered map.

## GPS notes for presenters

- Browser “location allowed” ≠ always a fix on Windows desktop — enable **Windows Location Services** or use **Override greenhouse**.
- Coordinates map to the **nearest Star greenhouse anchor** (67 GHs on the Star farm layout).
- Each scouting stop stores **latitude/longitude** for the route map.

## Accounts

| Role | Email | Route after login |
|------|--------|-------------------|
| Worker / scout | `worker@vegpro.com` | `/worker/field` |
| Farm manager | `manager@vegpro.com` | `/manager/dashboard` |
| Admin | `admin@vegpro.com` | `/admin/dashboard` |
