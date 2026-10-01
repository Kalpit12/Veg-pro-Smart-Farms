# VegPro — 100% Microsoft SQL Server

Production on FDB uses **only** the **`Scouting`** database on MS SQL. Supabase/PostgreSQL are for **local development** only if you still set those env vars.

---

## VegPro production env

```env
DATA_BACKEND=mssql
NEXT_PUBLIC_DATA_BACKEND=mssql
MSSQL_SERVER=192.168.16.14
MSSQL_DATABASE=Scouting
MSSQL_USER=...
MSSQL_PASSWORD=...
SESSION_SECRET=...
```

Optional: `EVIDENCE_STORAGE_PATH` for scout/spray photos (served via `/api/evidence/...`).

---

## Database scripts (run once on `Scouting`)

| Script | Purpose |
|--------|---------|
| `sql/mssql/001_schema.sql` | All core tables |
| `sql/mssql/002_seed_bemack_core.sql` | Farms, categories, sample greenhouses |
| `sql/mssql/003_activities.sql` | Activities + QR (optional) |

```powershell
npm run test:mssql
npm run seed:mssql-users
```

Default passwords: `VegPro2026!` for demo users.

---

## What runs on MS SQL

| Feature | MS SQL |
|---------|--------|
| Login / roles | `dbo.users` + session cookie |
| Scouting stops, rounds, GPS tracks | Yes |
| Infestation hotspots | Yes |
| Spray treatments | Yes |
| Worker live positions | Yes |
| Alerts | Yes |
| Admin staff accounts | Yes |
| Dashboard KPIs + weekly trends + admin charts | Yes |
| Photo evidence | Files on FDB + path in DB |

**Polling:** Manager maps refresh every ~12s (no Supabase Realtime).

---

## Local development

- **VegPro-like:** same `DATA_BACKEND=mssql` pointing at VPN SQL.  
- **Offline demo:** leave `DATA_BACKEND` unset → browser demo mode (no DB).

---

## Reporting

Imran can connect **Power BI / SSRS** directly to **`Scouting`** for VegPro reports alongside the web app.
