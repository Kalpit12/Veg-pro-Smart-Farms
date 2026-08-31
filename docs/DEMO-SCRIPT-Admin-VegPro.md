# VegPro Smart Farm — Admin / Manager Presenter Script

**Audience:** VegPro Kenya Ltd — farm managers, supervisors, and operations leads  
**Duration:** 20–25 minutes (admin walkthrough first)  
**App:** VegPro Smart Farm — `http://localhost:3000` (or deployed URL)  
**Role:** Admin / Manager login — `admin@vegpro.com`

---

## What this script covers

This script walks through the **VegPro Operations Center** — the admin and manager side of the platform. It covers every feature in the manager navigation and how field data from scouts flows into these views in near real time.

| Manager area | Route | What it does |
|--------------|-------|--------------|
| **Dashboard** | `/manager/dashboard` | KPI cards, alerts, spray program summary, activity chart, live feed |
| **Scouting** | `/manager/scouting` | Heat grid, scout routes, pressure analytics, spray/work program, records table |
| **Map** | `/manager/map` | Hotspots, spray pins, live worker GPS; mark sprayed / resolved |
| **Workers** | `/manager/workers` | Who is in the field, current problems, ratings by greenhouse |
| **History** | `/manager/history` | 3-month timeline, greenhouse health, improvement chart |

**Extended routes** (same admin role, direct URL):

| Area | Route | What it does |
|------|-------|--------------|
| Activity logs | `/manager/logs` | QR / activity log table |
| Supervisor panel | `/manager/supervisor` | Live activity review and approval |

---

## Pre-demo checklist (30 minutes before)

1. Apply Supabase migrations `006` through `012` and run `supabase/link-auth-users.sql`.
2. Create Auth user `admin@vegpro.com` (and optionally `worker@vegpro.com` for live updates). Update UUIDs in `link-auth-users.sql` if they differ.
3. Run `supabase/migrations/012_sample_bemack_demo.sql` — pre-fills scout routes, heat grid, farm map pins, and demo history.
4. Confirm `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Start the app: `npm run dev` (port 3000).
6. Log in as **admin** on the main screen (projector or laptop).
7. Optional second device: worker login to show live updates during the admin demo.

**Offline mode:** Without Supabase, cookie login still works and manager views use local demo data. Say: *“Production connects to your Supabase project for multi-device realtime.”*

---

## Opening (1 minute) — what to say

> “Thank you for your time. Today we’ll start on the **manager side** — the VegPro Operations Center — where your team sees everything scouts capture in the field.
>
> We’ll walk through the **dashboard**, **precision scouting**, **farm map**, **workers**, and **history**. The demo uses **Bemack** with your **17 greenhouses (BEGH 01–17)**. If a scout saves a stop on a phone, you’ll see it appear here within seconds.”

**Action:** Log in as `admin@vegpro.com`. Confirm the sidebar shows **VegPro Operations Center** with Dashboard, Scouting, Map, Workers, and History.

---

## Part 1 — Dashboard (5 minutes)

**Route:** `/manager/dashboard`  
**Header:** *Bemack · Precision scouting — Farm overview*

### 1a. KPI metric cards (2 min)

Point to the five metric cards across the top. Each card is clickable and deep-links to the relevant screen.

> “The dashboard opens with live KPIs that refresh automatically when field activity changes:
>
> - **Scouting stops today** — precision stops saved from the field app today  
> - **Active hotspots** — open infestation reports still needing action  
> - **Sprays today** — insecticide treatments logged in the field  
> - **Workers in field** — scouts whose GPS updated in the last 30 minutes  
> - **Severe issues** — active hotspots rated severity 4 or 5  
>
> These numbers update in real time when Supabase is connected — no manual refresh.”

**Action:** Click **Scouting stops today** to show navigation; return to Dashboard.

### 1b. Quick action links (30 sec)

> “Below the KPIs are shortcuts to **Scouting dashboard**, **Open map**, **View workers**, and **View history** — the same areas we’ll cover in detail.”

### 1c. Operations alerts (1 min)

> “**Needs attention** surfaces open operational alerts — for example a new severe infestation or a spray overdue. When everything is normal, you see a green ‘all clear’ message. Alerts also push through Supabase Realtime.”

### 1d. Spray / work program — compact view (30 sec)

> “The dashboard includes a compact **Spray / work program** panel. It auto-generates today’s intervention list from scouting pressure — urgent sprays, items scheduled within 48 hours, and monitor-only rows. The full program lives under **Scouting**.”

### 1e. Activity chart & live feed (1 min)

Point to the weekly line chart and the live activity feed on the right.

> “The **weekly activity chart** compares infestation reports and spray treatments day by day — useful for spotting busy periods.
>
> The **live activity feed** shows the latest field events: who did what, where, and when — scouting stops, infestation reports, and spray logs as they arrive from scouts.”

---

## Part 2 — Precision scouting (6 minutes)

**Route:** `/manager/scouting`  
**Header:** *Precision scouting — Bemack*

### 2a. Data flow panel (30 sec)

Point to the blue **“Demo: scout data → GPS → dashboards”** panel.

> “This panel summarises the pipeline: GPS assigns farm and greenhouse → scouts enter structured data in Field work → each stop stores coordinates → **these manager views update** — heat grid, routes, spray program, map, and records.”

### 2b. Spray / work program — full view (1 min)

> “The full **Spray / work program — today** ranks greenhouses and varieties by scouting pressure. Items are tagged **Spray today** (urgent), **Within 48h** (scheduled), or **Monitor**. Each row shows greenhouse, variety, bed location, issue, and average rating — so agronomy can plan the day’s spray crew without re-keying scout sheets.”

**Action:** Scroll through urgent and scheduled items. Click **Open field map** if shown.

### 2c. Greenhouse heat grid (1.5 min)

> “The **GH heat map** is a column × bay grid inside a selected greenhouse. Darker red means higher scouting pressure from recent stops. Switch the greenhouse dropdown across **BEGH 01–17** to compare houses. Click a cell to see issue type, pest or disease, and rating.”

**Action:** Select **BEGH 05** or a demo GH with data. Point at a red cell.

### 2d. Scout route map (1.5 min)

> “The **Scout route map** is the GPS story for managers. Each saved stop is a map point with greenhouse, column, bay, issue, and time. Select a **scouting round** from the dropdown to see the path the scout walked — Scarab-style session timing and multi-stop routes. Seed data includes a demo round across **BEGH 01** and **BEGH 05**.”

**Action:** Select the demo round; zoom and pan the map. Point out stop markers and route line.

### 2e. Scouting pressure analytics (1 min)

> “**Pressure analytics** roll up the last 30 days: bar charts by greenhouse (pest vs disease pressure) and by variety. This helps managers see which houses and crop lines need IPM focus beyond today’s heat grid.”

### 2f. Recent scouting stops — records table (1 min)

Scroll to **Recent scouting stops**.

> “Every scouting stop is stored in a full audit table — date, scout name, farm, greenhouse, category, variety, bed/column/bay, issue type and name, rating, and GPS coordinates. This is the structured payload your reporting and spray program build on.”

| Column | Example | Purpose |
|--------|---------|---------|
| Date | Today 10:42 | When recorded |
| Scout | Worker name | Accountability |
| Farm / GH | Bemack / BEGH 16 | Location context |
| Category / Variety | Super Premium · ANNAKARINA | Crop program |
| Bed/Col/Bay | 20 / 2 / 8 | In-greenhouse position |
| Issue | Pest · Thrips | IPM targeting |
| Rating | 1–5 | Severity |
| GPS | -1.29210, 36.82190 | Route map & audit |

---

## Part 3 — Farm map (4 minutes)

**Route:** `/manager/map`  
**Header:** *Farm map — Live hotspots, spray locations, and worker GPS*

### 3a. Map layers (2 min)

> “The farm map ties operational data to geography on one screen:
>
> - **Red pins** — active infestation hotspots from scout reports  
> - **Green pins** — spray treatments logged in the field  
> - **Blue dots** — live worker GPS (updated every 15 seconds while Field work is open)  
>
> Use the **Farm** filter to focus on Bemack or all farms. The map auto-centres on visible activity.”

**Action:** Point out each pin type in the legend. Pan the map around Bemack.

### 3b. Hotspot actions (1.5 min)

**Action:** Click a red hotspot pin.

> “Selecting a hotspot opens the detail panel — pest type, greenhouse, severity, problem description, and main issue. Managers can **Mark sprayed** or **Mark resolved** to close the loop without leaving the map. Status changes flow back to KPIs and alerts.”

**Action:** Demonstrate **Mark resolved** or **Mark sprayed** (demo mode works offline).

### 3c. Live worker proof (30 sec)

If a worker device is available:

> “Watch the blue worker dot move as the scout walks — the same GPS that assigns BEGH greenhouses in the field app.”

---

## Part 4 — Workers (3 minutes)

**Route:** `/manager/workers`  
**Header:** *Workers — Who is working where, current problems, and ratings*

> “The **Workers** screen answers: who is in the field right now, what greenhouse they’re assigned to, and what problem they’re working on.
>
> Rows are grouped by greenhouse. Each worker shows **Working on** (current assignment), **Problem**, **Main issue**, and **Rating** out of 5. Filter by greenhouse to focus a supervisor on one BEGH unit during a walk-through.”

**Action:** Set greenhouse filter to **All**, then filter to a single GH. Point at worker name and rating columns.

> “This view refreshes from live GPS and latest scouting or infestation activity — linked from the same data scouts enter on their phones.”

---

## Part 5 — History (4 minutes)

**Route:** `/manager/history`  
**Header:** *History — Greenhouse health, improvement chart, and field activity for the last 3 months*

### 5a. Greenhouse selector & filters (30 sec)

> “History is organised by **greenhouse** and **activity type** — all events, reports only, or sprays only. The default lookback is **three months** of field activity.”

**Action:** Select a greenhouse from the dropdown (e.g. BEGH 01).

### 5b. Improvement chart & condition panel (1.5 min)

> “For the selected greenhouse you get an **improvement chart** — how pressure and treatments trend over time — and a **greenhouse condition** summary comparing current vs previous period: average severity, open hotspots, spray count, and direction (improving, stable, or worsening).”

**Action:** Point at the chart trend line and condition badges.

### 5c. Activity timeline (1.5 min)

Scroll to **Activity timeline**.

> “The timeline lists every infestation report and spray log chronologically — who worked on it, when, severity badges, and resolution status. Supervisors use this for audits, traceability, and proving intervention after a scout escalation.”

**Action:** Expand one report and one spray entry. Note severity badge and worker attribution.

---

## Part 6 — Extended admin features (optional, 2 minutes)

### Activity logs — `/manager/logs`

> “**Farm Activity Logs** shows the QR and general activity log table — useful when scouts scan bed codes or log non-scouting activities. Same admin login; navigate directly to `/manager/logs`.”

### Supervisor panel — `/manager/supervisor`

> “The **Supervisor Panel** supports live activity monitoring, evidence review, and approve/reject workflows for field submissions. It complements the dashboard live feed for teams that require sign-off before work is closed.”

---

## Part 7 — How field data feeds the admin views (2 minutes)

**Brief context only — after admin tour**

> “Everything you saw on the manager side comes from the **Field work** app scouts use on their phones:
>
> 1. **GPS** assigns the nearest Bemack greenhouse every 15 seconds  
> 2. **Scout stop** captures category, variety, column/bay, pests/diseases, 15 parameters, and coordinates on save  
> 3. **Infestation reports** and **spray logs** use the same location model  
> 4. **Scouting rounds** (start → stops → complete) drive the route map  
>
> When a scout hits Save, manager KPIs, heat grid, map pins, workers table, and history timeline update within seconds on Supabase.”

*If time allows, show one live save on a worker device while the manager screen is visible.*

---

## Closing (1 minute) — what to say

> “To summarise the **admin side**: one Operations Center gives you **live KPIs and alerts**, **precision scouting** with heat grids and GPS routes, an **auto-generated spray program**, a **geographic farm map** with hotspot workflow, **worker visibility** by greenhouse, and **three months of history** with improvement trends.
>
> Next steps: connect to your production Supabase project, onboard manager and scout accounts, and align greenhouse GPS anchors with your surveyed coordinates for sub-metre assignment.”

---

## Quick reference — admin demo flow (cheat sheet)

| Step | Screen | Do | Say (one line) |
|------|--------|-----|----------------|
| 1 | Login | Admin login | “Operations Center for managers.” |
| 2 | Dashboard | Scan KPI cards | “Five live metrics from the field.” |
| 3 | Dashboard | Alerts + spray summary | “What needs attention today.” |
| 4 | Dashboard | Chart + live feed | “Weekly trends and latest events.” |
| 5 | Scouting | Heat grid | “Pressure by column and bay inside each GH.” |
| 6 | Scouting | Route map | “GPS path and stops by scouting round.” |
| 7 | Scouting | Spray program + records | “Interventions and full audit table.” |
| 8 | Map | Hotspots + workers | “Geography + mark sprayed/resolved.” |
| 9 | Workers | Filter by GH | “Who is working on what, with ratings.” |
| 10 | History | Chart + timeline | “3-month health and traceability.” |

---

## Likely questions & suggested answers

**Q: Who can access the manager screens?**  
A: Users with **admin** or **supervisor** role. Scouts use the worker Field work app only.

**Q: Do KPIs refresh automatically?**  
A: Yes — with Supabase and Realtime migrations applied, dashboard cards, alerts, map, and feed update without page reload.

**Q: How is the spray program generated?**  
A: From recent scouting ratings and pressure thresholds — urgent (spray today), scheduled (48h), or monitor. Full logic aligns with VegPro SOW §3.

**Q: Can managers close hotspots from the map?**  
A: Yes — select a pin and **Mark sprayed** or **Mark resolved**. Status syncs to KPIs and history.

**Q: How far back does History go?**  
A: Three months by default, filterable by greenhouse and activity type (reports vs sprays).

**Q: Does this replace Scarab?**  
A: Manager scouting mirrors Scarab-style **rounds, routes, and stop timing** while integrating infestation, spray, dashboards, and auto spray program in one VegPro platform.

**Q: What about farms beyond Bemack?**  
A: The data model is multi-farm; this demo is seeded for Bemack per your spreadsheet. Farm filter on the map supports additional sites as you onboard them.

---

## Troubleshooting during the admin demo

| Problem | Fix |
|---------|-----|
| Empty KPIs / scouting views | Run `012_sample_bemack_demo.sql` or save a live scout stop |
| “Dashboard not ready” toast | Check `.env.local` Supabase vars; run migrations `006`–`012` |
| Manager doesn’t update live | Confirm Realtime migrations `004`, `008`, `010` |
| Blank heat grid | Select a GH with seed data (e.g. BEGH 01 or BEGH 05) |
| No worker dots on map | Open Field work on a worker device; GPS must be active or use demo seed |
| History chart empty | Select a greenhouse with reports or sprays in the last 3 months |

---

*VegPro Smart Farm · Admin / Manager demo script · Bemack operations · June 2026*
