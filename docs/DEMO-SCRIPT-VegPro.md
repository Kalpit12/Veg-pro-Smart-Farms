# VegPro Smart Farm — Demo Presenter Script

**Audience:** VegPro Kenya Ltd (Bemack scouting & GPS focus)  
**Duration:** 15–20 minutes (live walkthrough)  
**App:** VegPro Smart Farm — `http://localhost:3000` (or deployed URL)

---

## Demo readiness — your four focus areas

| VegPro focus | Ready? | Where in the app | Notes |
|--------------|--------|------------------|-------|
| How scouts enter data | **Yes** | Worker → **Field work** → Scout stop / infestation / spray | Bemack master lists from your scouting spreadsheet (categories, varieties, pests, diseases, 15 parameters) |
| How GPS captures data | **Yes** | **Live GPS tracking** card on Field work | Browser geolocation every 15s; coordinates saved on each stop; worker position synced to backend |
| GPS → farms & greenhouses | **Yes** | **Current assignment** banner; manager **Scouting** route map; **Farm map** | 17 Bemack greenhouse anchors (BEGH 01–17); nearest-greenhouse assignment from live coords |
| Data captured | **Yes** | Manager **Scouting** records table; **Dashboard** KPI; heat grid | Each stop stores farm, GH, column/bay, issue, rating, lat/lng, optional parameter observations |

**Verdict:** The demo is **ready** for your stated focus. Run the pre-demo checklist below so manager screens are populated and live saves work during the meeting.

---

## Pre-demo checklist (30 minutes before)

### Option A — Live Supabase (recommended for realtime)

1. Apply Supabase migrations `006` through `012` and run `supabase/link-auth-users.sql`.
2. Create Auth users: `worker@vegpro.com` and `admin@vegpro.com` (passwords you control). Update UUIDs in `link-auth-users.sql` if they differ.
3. Run `supabase/migrations/012_sample_bemack_demo.sql` — pre-fills scout routes, heat grid, and farm map pins.
4. Confirm `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Start the app: `npm run dev` (port 3000).
6. **Two screens:** Manager on laptop (projector); worker on phone/tablet or second browser window.
7. On the worker device: allow browser location **or** plan to use **Override greenhouse** (see GPS notes).

### Option B — Offline / no Supabase

- Cookie login works; field data saves to browser storage and appears on manager scouting views.
- Say: *“Today we can show the full flow locally; production connects to your Supabase project for multi-device realtime.”*

### GPS presenter tip (Windows laptops)

Browser “location allowed” is not always enough on desktop. If live coords fail:

- Enable **Windows → Settings → Privacy & security → Location**, **or**
- Use **Override greenhouse** on the worker Field work page (still demonstrates farm/GH assignment and saved coordinates).

---

## Accounts & navigation

| Role | Login | After login |
|------|-------|-------------|
| Scout / worker | `worker@vegpro.com` | **Field work** (`/worker/field`) |
| Manager | `admin@vegpro.com` | **Dashboard** → **Scouting** → **Farm map** |

---

## Opening (1 minute) — what to say

> “Thank you for your time. Today we’ll walk through how VegPro Smart Farm supports **Bemack precision scouting** — the same priorities you outlined: **how scouts enter data in the field**, **how GPS captures and assigns location**, **how that maps to your farms and greenhouses**, and **exactly what data is stored** for managers.
>
> We’ll use the **Bemack** farm with your **17 greenhouses (BEGH 01–17)** and master lists derived from your scouting spreadsheet. You’ll see a scout on a phone and the manager view update in near real time.”

---

## Part 1 — How scouts enter data (5 minutes)

**Screen:** Worker login → **Field work**

### 1a. Set context — data flow panel (30 sec)

Point to the blue **“Demo: how to capture field data”** panel.

> “The field app is designed for scouts walking the crop. Step one is GPS assignment; step two is structured data entry aligned with how you scout today — category, variety, column, bay, pests and diseases — not free text in a notebook.”

### 1b. Live GPS → greenhouse assignment (1 min)

Scroll to **Live GPS tracking**.

> “When the scout opens Field work, the device reads GPS every **15 seconds**. We don’t ask them to pick a greenhouse manually in normal use — the system finds the **nearest Bemack greenhouse anchor** and sets **Current assignment**, for example **Bemack / BEGH 16**.
>
> You can see coordinates here and distance to the greenhouse anchor. If GPS isn’t available on a demo laptop, we use **Override greenhouse** — in the field, scouts rely on live GPS on their phones.”

**Action:** Allow location or select **BEGH 16** (or any GH) in Override. Confirm **Current assignment** appears.

### 1c. Scout route round (1 min)

Point to **Scout route (Scarab-style)**.

> “Before recording stops, the scout **starts a round** — similar to a Scarab scouting session. Each stop they save is linked to that round with a timestamp and GPS. When they **complete the round**, the route is locked for reporting.”

**Action:** Click **Start round**.

### 1d. Scout stop form — core data entry (2 min)

Click **Scout stop (Bemack)**.

> “This is the main scouting capture screen, built from your **Bemack Scouting Data** lists:
>
> - **Category** — Super Premium or Alstroemeria  
> - **Variety** — your full variety list per category  
> - **Beds, column, bay** — exact location inside the greenhouse  
> - **Issue type** — pest or disease, then the specific issue from your lists  
> - **Rating** — severity 1–5  
> - **15 scouting parameters** — optional toggles with ratings (white flies, thrips, botrytis, crop vigor, etc.)  
> - **Notes** — free text when needed  
>
> The farm and greenhouse at the top come from GPS — the scout doesn’t re-type Bemack or BEGH numbers.”

**Action:** Fill a realistic example, e.g. Super Premium → ANNAKARINA → Column 2, Bay 8 → Pest → Thrips → Rating 4 → tick **Thrips** under parameters → **Save**.

> “On save, we capture GPS again at the moment of the observation, so each stop has its own latitude and longitude — not just the greenhouse default.”

---

## Part 2 — How GPS captures data (3 minutes)

**Stay on worker Field work**, then briefly mention other capture paths.

### What to say

> “GPS works at **three levels** in the system:
>
> 1. **Continuous tracking** — every 15 seconds while Field work is open; updates **Current assignment** and, when connected, the manager **Farm map** worker dot.  
> 2. **Stop-level capture** — when the scout hits Save, we store precise coordinates on that scouting record.  
> 3. **Same GPS context** for **Quick infestation report** and **Log spray** — one location model for all field actions.
>
> Coordinates are stored as decimal latitude/longitude. On desktop demos without a GPS fix, we fall back to the selected greenhouse anchor so you still see the full manager workflow.”

**Optional action:** Click **Refresh GPS now** and point at the coordinate line and distance in metres.

---

## Part 3 — GPS → farms & greenhouses (4 minutes)

**Switch to manager screen:** `admin@vegpro.com`

### 3a. Dashboard (30 sec)

> “Managers land on the dashboard. **Scouting stops today** reflects field activity. Alerts and the live feed show new stops as scouts save them.”

### 3b. Precision scouting — heat grid & route map (2 min)

Open **Scouting** (`/manager/scouting`).

Point to **Greenhouse heat grid**:

> “Pressure rolls up by **greenhouse** — which BEGH units need attention based on recent stop ratings and issues.”

Point to **Scout route map**:

> “This is the GPS story for managers. Each saved stop is a point on the map — greenhouse, column, bay, issue, time. Select a **scouting round** to see the path the scout walked. Seed data from BEGH 01 and BEGH 05 illustrates a multi-greenhouse route.”

**Action:** Select the demo round from the dropdown; zoom/pan the map.

### 3c. Farm map (1 min)

Open **Farm map** (`/manager/map`).

> “The **farm map** ties operational data to geography: **infestation hotspots** from scout reports, spray activity, and **live worker GPS**. Everything is anchored to **Bemack** and the correct greenhouse — so GPS isn’t abstract; it drives which GH appears in tables, heat maps, and alerts.”

### 3d. Live proof (30 sec)

If Supabase is live: save **one more stop** on the worker device.

> “Watch the scouting table and route map — the new stop should appear within seconds without refresh.”

---

## Part 4 — Data captured (3 minutes)

**Screen:** Manager **Scouting** → scroll to **Recent scouting stops**

### What to say

> “Every scouting stop persists structured data your agronomy and IPM teams can report on. Here’s what we store per stop:”

| Field | Example | Purpose |
|-------|---------|---------|
| Date & time | Today 10:42 | When the observation was recorded |
| Scout | Worker name | Accountability |
| Farm | Bemack | Farm context |
| Greenhouse | BEGH 16 | GH from GPS assignment |
| Category | Super Premium | Crop program |
| Variety | ANNAKARINA | Variety-level pressure |
| Beds / Column / Bay | 20 / 2 / 8 | In-greenhouse location |
| Issue type & name | Pest · Thrips | IPM targeting |
| Rating | 1–5 | Severity / pressure |
| GPS | -1.29210, 36.82190 | Route map & audit trail |
| Parameter observations | Thrips present, rating 4 | Multi-parameter scouting |
| Round ID | Linked session | Scarab-style route & timing |
| Notes | Optional text | Scout comments |

> “We also capture **infestation hotspots** (pest type, problem description, severity, GPS) and **spray logs** (product, greenhouse, time) through the same Field work hub — so scouting, escalation, and treatment sit in one platform.”

---

## Closing (1 minute) — what to say

> “To summarise for VegPro: scouts enter data through a **mobile Field work** flow aligned with your **Bemack lists**; **GPS assigns the greenhouse automatically** and records coordinates on every stop; managers see that on **heat grids, scout routes, the farm map, and exportable records**; and we capture the full scouting payload — location, crop, pest/disease, ratings, and parameters — ready for your spray program and reporting.
>
> Next steps we’d suggest: connect this to your production Supabase project, onboard scout accounts, and optionally align greenhouse anchor coordinates with your survey GPS if you have sub-metre GH corners.”

---

## Quick reference — demo flow (cheat sheet)

| Step | Who | Do | Say (one line) |
|------|-----|-----|----------------|
| 1 | Worker | Open Field work | “Scout’s daily screen.” |
| 2 | Worker | GPS / Override GH | “Nearest Bemack GH assigned automatically.” |
| 3 | Worker | Start round | “Scarab-style session starts.” |
| 4 | Worker | Scout stop → Save | “Structured Bemack data + GPS on save.” |
| 5 | Manager | Dashboard | “Stops today KPI.” |
| 6 | Manager | Scouting → route map | “GPS path and stops by GH.” |
| 7 | Manager | Farm map | “Hotspots + live worker position.” |
| 8 | Manager | Records table | “Full data captured per stop.” |

---

## Likely questions & suggested answers

**Q: Do scouts scan QR codes?**  
A: GPS-first assignment to the nearest greenhouse. QR scanning is available for other activity flows; Bemack scouting demo uses GPS geofencing to match how scouts move between houses.

**Q: Can this work offline?**  
A: The demo supports offline/local storage. Production uses Supabase with sync when connectivity returns.

**Q: How accurate is greenhouse assignment?**  
A: We use haversine distance to the nearest of 17 anchored GH positions. For production, anchors can be set to your surveyed GH coordinates.

**Q: Does this replace Scarab?**  
A: It mirrors Scarab-style **rounds, routes, and stop timing** while integrating infestation, spray, and manager dashboards in one VegPro platform.

**Q: What about other farms besides Bemack?**  
A: The data model is multi-farm; this demo is seeded for Bemack per your spreadsheet and SOW scope.

---

## Troubleshooting during the demo

| Problem | Fix |
|---------|-----|
| “Worker profile missing” on save | Run `link-auth-users.sql` after creating Auth user |
| “Master data missing” | Run migrations `006`–`007` |
| Empty manager scouting views | Run `012_sample_bemack_demo.sql` or save a live stop |
| GPS stuck on worker laptop | Use **Override greenhouse**; explain field phones use real GPS |
| Manager doesn’t update live | Check Supabase env vars and Realtime migrations `004`, `008`, `010` |

---

*VegPro Smart Farm · Demo script · Bemack scouting & GPS · June 2026*
