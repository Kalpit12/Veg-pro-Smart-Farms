# VegPro Smart Farm — Technical Handover Documentation

**Product:** VegPro Smart Farm (Scouting)  
**Live URL:** https://scouting.kongoniriverfarm.com/  
**Production host:** FDB (`192.168.16.14`)  
**Audience:** VegPro IT / Admin (Dev) / implementation partner  
**Version:** October 2026 handover  

This document describes how the live system is hosted, how it is configured, and how to operate it after handover.

---

## 1. System summary

| Layer | Technology |
|-------|------------|
| Public website | HTTPS on IIS (ports 80/443) |
| Application | Next.js 15 (Node.js) on `127.0.0.1:3000` |
| Reverse proxy | IIS URL Rewrite + Application Request Routing (ARR) |
| Database | Microsoft SQL Server — database **`Scouting`** on FDB |
| Authentication | App users in `dbo.users` (email + bcrypt password). SQL access uses **Windows auth** as `FDB\Scouting` |
| Evidence / photos | Files on FDB disk (`EVIDENCE_STORAGE_PATH`) |
| DNS name | `scouting.kongoniriverfarm.com` |
| Certificate | Wildcard `*.kongoniriverfarm.com` (bound in IIS) |

Users only open **https://scouting.kongoniriverfarm.com/**. They never use port 3000.

---

## 2. Roles and seed accounts

| App role | Typical user | Default seed email | Default password |
|----------|--------------|--------------------|------------------|
| `admin` | System admin | `admin@vegpro.com` | `VegPro2026!` |
| `supervisor` (UI: Farm manager) | Farm manager | `manager@vegpro.com` | `VegPro2026!` |
| `worker` | Field scout | `worker@vegpro.com` | `VegPro2026!` |

**Change these passwords after training.**

New field workers and farm managers are created in the app: **Admin → Staff**.

---

## 3. Server layout on FDB

| Item | Path / value |
|------|----------------|
| App folder | `C:\Users\Scouting\Veg-pro-Smart-Farms-master` |
| IIS site name | `VegPro` |
| IIS physical path | `C:\Users\Scouting\Veg-pro-Smart-Farms-master\iis` (web.config reverse proxy) |
| Node listen | `0.0.0.0:3000` |
| Auto-start task | Scheduled Task **`VegPro App`** (runs as `FDB\Scouting` at startup) |
| App start script | `C:\ProgramData\VegPro\start-vegpro.cmd` |
| App log | `C:\ProgramData\VegPro\vegpro-app.log` |
| Evidence folder | `C:\Users\Scouting\Veg-pro-Smart-Farms-master\data\evidence` |

### 3.1 How a request flows

```
Browser (HTTPS)
  → scouting.kongoniriverfarm.com:443 (IIS + certificate)
  → reverse proxy to http://127.0.0.1:3000
  → Next.js app
  → MS SQL database Scouting (Windows auth as FDB\Scouting)
```

---

## 4. Environment configuration (`.env.local`)

File: `C:\Users\Scouting\Veg-pro-Smart-Farms-master\.env.local`

Required production keys (values on server — do not commit secrets to git):

```env
DATA_BACKEND=mssql
NEXT_PUBLIC_DATA_BACKEND=mssql
MSSQL_SERVER=localhost
MSSQL_DATABASE=Scouting
MSSQL_AUTH=windows
MSSQL_TRUST_SERVER_CERTIFICATE=true
SESSION_SECRET=<long-secret>
SESSION_COOKIE_SECURE=true
EVIDENCE_STORAGE_PATH=C:\Users\Scouting\Veg-pro-Smart-Farms-master\data\evidence
```

**Notes**

- On FDB, `MSSQL_SERVER=localhost` is required for reliable Windows Integrated auth. Using the LAN IP can fail with “untrusted domain”.
- The Node process **must** run as `FDB\Scouting` (scheduled task already does this).
- Do not enable Supabase env vars on this production host.

---

## 5. Database

- Server: FDB SQL Server  
- Database: **`Scouting`**  
- Schema scripts (repo): `sql/mssql/001_schema.sql` through `007_supervisor_greenhouse_access.sql` (run in numeric order on **`Scouting`**)  
- Core tables include: `users`, `farms`, `greenhouses`, `crop_categories`, `crop_varieties`, scouting rounds/records, activities, evidence-related tables as applied  

### 5.1 Connectivity test (on FDB as Scouting)

Run these commands **on FDB**, signed in as **`FDB\Scouting`** (same account as the **VegPro App** scheduled task). Do **not** run this test from a random admin desktop unless that PC is on the farm network and you intentionally use SQL login (production uses Windows auth on the server).

```bat
cd /d C:\Users\Scouting\Veg-pro-Smart-Farms-master
whoami
npm run test:mssql
```

**Expected success**

- `whoami` → `fdb\scouting` (domain may show as `FDB\Scouting`)
- `npm run test:mssql` → lines similar to:
  - `Connecting with Windows login to Scouting on localhost`
  - `OK: connected to Scouting as FDB\Scouting`
  - A SQL Server version line

If you see that output, the database layer is healthy. Restart the app only if the website still errors after a config change (see §7).

### 5.2 If the connectivity test fails — reconnect checklist

Work through the steps below in order. Stop when `npm run test:mssql` succeeds, then restart the Node app (§7) and retry login on https://scouting.kongoniriverfarm.com/

#### Step A — Confirm Windows identity

```bat
whoami
```

| Result | Action |
|--------|--------|
| Shows `fdb\scouting` | Continue to Step B |
| Shows another user (e.g. `fdb\administrator`) | Sign out and sign in as **`FDB\Scouting`**, or open **Command Prompt → Run as different user** as `FDB\Scouting`, then repeat §5.1 |

The app and this test **must** use the same Windows account that has rights on the **`Scouting`** database.

#### Step B — Confirm `.env.local` (production MSSQL settings)

File must exist:

`C:\Users\Scouting\Veg-pro-Smart-Farms-master\.env.local`

Required keys for FDB (values must match the live server):

```env
DATA_BACKEND=mssql
NEXT_PUBLIC_DATA_BACKEND=mssql
MSSQL_SERVER=localhost
MSSQL_DATABASE=Scouting
MSSQL_AUTH=windows
MSSQL_TRUST_SERVER_CERTIFICATE=true
SESSION_SECRET=<long-secret>
SESSION_COOKIE_SECURE=true
EVIDENCE_STORAGE_PATH=C:\Users\Scouting\Veg-pro-Smart-Farms-master\data\evidence
```

Quick check (does not print secrets):

```bat
cd /d C:\Users\Scouting\Veg-pro-Smart-Farms-master
if not exist .env.local echo MISSING .env.local
if not exist .env.local exit /b 1
findstr /B /C:"DATA_BACKEND=" .env.local
findstr /B /C:"MSSQL_SERVER=" .env.local
findstr /B /C:"MSSQL_DATABASE=" .env.local
findstr /B /C:"MSSQL_AUTH=" .env.local
```

| Problem | Fix |
|---------|-----|
| `Set MSSQL_SERVER in .env.local` | Create or edit `.env.local`; set `MSSQL_SERVER=localhost` and keys above |
| `MSSQL_AUTH=windows` missing | Add `MSSQL_AUTH=windows` (production on FDB does **not** use SQL password login for the app) |
| `MSSQL_SERVER=192.168.16.14` on FDB | Change to **`MSSQL_SERVER=localhost`** for Windows Integrated auth on the server (LAN IP often causes “untrusted domain” errors) |
| Supabase URL keys present | Remove or comment out `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` on production |

After any `.env.local` change, restart the app (§7).

#### Step C — Confirm SQL Server is running

On FDB (IT / admin):

```bat
sc query MSSQLSERVER
```

| Result | Action |
|--------|--------|
| `STATE : 4 RUNNING` | Continue to Step D |
| Stopped / not found | Start the **SQL Server (MSSQLSERVER)** service in **services.msc**, or ask VegPro IT to start SQL Server on FDB |

If your instance is named (not default), use `sc query MSSQL$<InstanceName>` instead.

#### Step D — Test SQL outside Node (Windows auth)

Still as **`FDB\Scouting`**:

```bat
sqlcmd -S localhost -E -d Scouting -Q "SELECT DB_NAME(), SYSTEM_USER"
```

| Result | Action |
|--------|-----|
| One row: `Scouting`, `FDB\Scouting` | SQL Server and permissions are OK → go to Step E |
| `sqlcmd` not recognized | Install **SQL Server Command Line Tools** or use **SSMS → New Query** with the same query while logged in as Scouting |
| Login failed for user | IT must grant **`FDB\Scouting`** access to database **`Scouting`** (db_datareader/db_datawriter or role as deployed) |
| Cannot open database "Scouting" | Database missing or offline → Step F |

Optional: open **SQL Server Management Studio (SSMS)** → connect to **`localhost`** → Windows Authentication → confirm database **`Scouting`** exists and is **Online**.

#### Step E — Node driver and app folder

From the app folder as **`FDB\Scouting`**:

```bat
cd /d C:\Users\Scouting\Veg-pro-Smart-Farms-master
node -v
npm run test:mssql
```

| Error / symptom | Likely cause | Fix |
|-----------------|--------------|-----|
| `Cannot find module 'mssql'` or `msnodesqlv8` | Dependencies not installed | `npm install` (on FDB, use the same install method used at deploy time) |
| ODBC / driver errors | Missing ODBC driver | Install **Microsoft ODBC Driver 17 for SQL Server** (or 18) on FDB |
| `Login failed` / `untrusted domain` | Wrong server name or wrong Windows user | `MSSQL_SERVER=localhost`, run as `FDB\Scouting` (Steps A–B) |
| Timeout / ECONNREFUSED | SQL not listening or wrong port | Step C; confirm port **1433** locally (do **not** expose 1433 to the internet) |
| Works in `sqlcmd` but fails in Node | Stale env or wrong working directory | Confirm `.env.local` in app root; restart command prompt; `npm run test:mssql` again |

#### Step F — Database missing or empty schema

If **`Scouting`** does not exist or tables are missing, apply repo scripts **in order** (SSMS → database **`Scouting`**, or from FDB app folder when VPN/network allows):

```bat
cd /d C:\Users\Scouting\Veg-pro-Smart-Farms-master
npm run db:mssql:apply
npm run seed:mssql-users
```

Manual equivalent: run each file under `sql/mssql/` in numeric order (`001` … `007`) in SSMS.

Then repeat:

```bat
npm run test:mssql
```

#### Step G — After SQL connects again — restart the website app

```bat
schtasks /End /TN "VegPro App"
schtasks /Run /TN "VegPro App"
netstat -ano | findstr :3000
type C:\ProgramData\VegPro\vegpro-app.log
```

Smoke-test: https://scouting.kongoniriverfarm.com/auth/login

#### Step H — Testing from a laptop (not on FDB)

| Location | What to use |
|----------|-------------|
| **On FDB as `FDB\Scouting`** | §5.1 — authoritative production test |
| **Developer PC on VegPro VPN** | May use `MSSQL_SERVER=192.168.16.14` with **SQL login** in `.env.local` only if IT provided `MSSQL_USER` / `MSSQL_PASSWORD`; run `npm run test:mssql` from the repo. This is for setup/troubleshooting, not the IIS production `.env.local` on FDB |
| **Off VPN / internet only** | SQL to FDB will fail by design (port 1433 is not public). Use the public website URL only |

#### Escalation (when still failing)

Collect and send to VegPro IT / support (no passwords in email):

1. Output of `whoami`
2. Output of `npm run test:mssql` (full error text)
3. Output of `sqlcmd` test (Step D) or SSMS screenshot
4. Last 30 lines of `C:\ProgramData\VegPro\vegpro-app.log`
5. Confirmation whether `.env.local` has `MSSQL_SERVER=localhost` and `MSSQL_AUTH=windows`

### 5.3 Master data changes

Farms, greenhouses, and varieties are **not** edited from Admin UI in this release. Changes are applied in SQL (`dbo.farms`, `dbo.greenhouses`, `dbo.crop_varieties`, etc.) and may also require updating app master lists and rebuilding. Follow a controlled change process.

---

## 6. IIS / HTTPS checklist

- Site **VegPro** Started  
- Bindings: host header `scouting.kongoniriverfarm.com` on **80** and **443**  
- SSL certificate: company wildcard `*.kongoniriverfarm.com`  
- ARR proxy enabled; `preserveHostHeader=true`  
- `web.config` rewrites to `http://127.0.0.1:3000/{R:1}` and sets forwarded proto/host variables  
- Windows Firewall allows inbound **80** and **443**  
- Do **not** publish SQL port **1433** to the public internet  

### 6.1 Next.js behind IIS

`next.config.ts` includes:

```ts
experimental: {
  serverActions: {
    allowedOrigins: ["scouting.kongoniriverfarm.com", "127.0.0.1:3000"],
  },
},
```

This is required so login and other Server Actions work through the reverse proxy.

---

## 7. Application auto-start

Scheduled Task **`VegPro App`**:

- Trigger: At system startup (short delay)
- Run as: `FDB\Scouting`
- Action: `cmd.exe /c C:\ProgramData\VegPro\start-vegpro.cmd`
- Starts: `node .\node_modules\next\dist\bin\next start`

**Manual restart**

```bat
schtasks /End /TN "VegPro App"
schtasks /Run /TN "VegPro App"
```

**Check app is up**

```bat
netstat -ano | findstr :3000
type C:\ProgramData\VegPro\vegpro-app.log
```

IIS starts with Windows automatically. The Node app depends on this scheduled task.

---

## 8. Deploy / update procedure

1. Put updated code in `C:\Users\Scouting\Veg-pro-Smart-Farms-master` (keep `.env.local`).
2. In that folder:

```bat
npm install
npm run build
```

3. Restart the app task:

```bat
schtasks /End /TN "VegPro App"
schtasks /Run /TN "VegPro App"
```

4. Smoke-test: open https://scouting.kongoniriverfarm.com/auth/login and sign in.

---

## 9. Network / DNS behaviour

| Client location | How the name resolves | Expected |
|-----------------|------------------------|----------|
| Public internet / mobile data | Public IP (e.g. `41.220.120.234`) with 80/443 forwarded to FDB | Site loads |
| Farm LAN | Should resolve to `192.168.16.14` (internal/split DNS) | Site loads without hairpin issues |
| If LAN still uses public IP only | Hairpin NAT may time out | Ask IT for internal A record, or temporary hosts file: `192.168.16.14 scouting.kongoniriverfarm.com` |

---

## 10. Operational smoke tests (handover)

| # | Test | Pass criteria |
|---|------|----------------|
| 1 | Open live URL on mobile data | Login page loads with valid certificate |
| 2 | Admin login | Dashboard opens |
| 3 | Create staff (Admin → Staff) | New worker can sign in |
| 4 | Worker Field work | Can start round and save a scout stop |
| 5 | Manager Scouting | New stop appears in records / pressure views |
| 6 | Reboot FDB | After ~1 minute, site works again without manual `npm start` |
| 7 | `npm run test:mssql` | Connects as `FDB\Scouting` |

---

## 11. Known limitations (honest handover)

1. **Master data UI** — farms / greenhouses / varieties are not maintained from Admin screens; SQL (+ possible app list update) is required.
2. **Approvals** — Admin Approvals UI is present; farm manager primary tools are reports (Dashboard / Scouting / Map / History) and Log spray.
3. **Phone hardware testing** — VegPro noted phones are still being procured; final project closure waits for on-farm device testing with no open bugs.
4. **Demo passwords** must be rotated after training.

---

## 12. Support contacts (fill as needed)

| Area | Owner |
|------|--------|
| App / training | Kalpit Patel |
| FDB / IIS / DNS / certificate | VegPro IT (Imran) |
| System Admin user | Dev |
| Farm operations testing | VegPro farm managers + scouts |

---

## 13. Document set delivered with this handover

1. **Admin User Manual** — staff, reports, approvals, master-data change process  
2. **Farm Manager & Field User Manual** — scout and manager step-by-step procedures  
3. **Technical Handover** — this document  

Live site: https://scouting.kongoniriverfarm.com/
