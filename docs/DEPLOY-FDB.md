# VegPro scouting platform — setup on FDB

**For:** Imran (IT) and VegPro team  
**From:** Kalpit Patel  

The production app uses **only Microsoft SQL Server** on FDB (`Scouting` database). **No Supabase** and **no PostgreSQL**.

---

## Stack on FDB

| Piece | Technology |
|--------|------------|
| Website | Next.js on **IIS** + **HTTPS** + Node.js |
| Database | **MS SQL** — database **`Scouting`** on `192.168.16.14` |
| Photos | Folder on FDB disk (`data/evidence` or `EVIDENCE_STORAGE_PATH`) |
| Logins | Email/password in `dbo.users` |

---

## Before you start

- [ ] SQL login with rights on **`Scouting`** (Imran provided)
- [ ] **Node.js 20 LTS** on FDB
- [ ] **HTTPS** for scouts’ phones (GPS requires TLS)
- [ ] **On-site** VegPro network (or FDB server) to reach `192.168.16.14:1433` during initial DB setup from a dev PC

---

## Step 1 — Database scripts (SSMS → `Scouting`)

Run in order:

1. `sql/mssql/001_schema.sql`
2. `sql/mssql/002_seed_bemack_core.sql`
3. `sql/mssql/003_activities.sql` (if using activities / QR)

Then from a dev PC on VPN:

```powershell
npm run seed:mssql-users
```

---

## Step 2 — App configuration (`.env.local` on FDB)

```env
DATA_BACKEND=mssql
NEXT_PUBLIC_DATA_BACKEND=mssql

MSSQL_SERVER=192.168.16.14
MSSQL_DATABASE=Scouting
MSSQL_USER=
MSSQL_PASSWORD=
MSSQL_TRUST_SERVER_CERTIFICATE=true

SESSION_SECRET=long-random-secret

# Optional — photo storage on FDB disk
# EVIDENCE_STORAGE_PATH=D:\Apps\vegpro-scouting\data\evidence
```

Do **not** set Supabase URL/keys on VegPro production.

---

## Step 3 — Deploy website

```powershell
npm ci
npm run build
npm run start
```

Use **IIS reverse proxy** to port `3000` with HTTPS (see prior FDB IIS notes).

---

## Step 4 — Smoke test

| # | Test |
|---|------|
| 1 | Login `worker@vegpro.com` / `VegPro2026!` |
| 2 | Start scouting walk, save a stop |
| 3 | Manager sees stop on **Scouting** dashboard |
| 4 | Report infestation + log spray |
| 5 | Admin creates a new worker account |

Full technical notes: **[MSSQL-MIGRATION.md](./MSSQL-MIGRATION.md)**.
