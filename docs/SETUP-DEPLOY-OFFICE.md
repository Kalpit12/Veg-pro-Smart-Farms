# VegPro scouting — office setup and deploy

**For:** Kalpit Patel, on site at VegPro (FDB)  
**Database:** Microsoft SQL Server, database **Scouting**  
**Server:** **FDB**, `192.168.16.14`, port **1433** (confirmed by Imran)

The app uses **only MS SQL**. Do not configure Supabase on this server.

---

## Bring with you

- This PDF
- The project folder from your laptop (`vegpro-smart-farm`), including `.env.local` and `sql\mssql\`
- A USB stick if the office PC cannot copy from your laptop

GitHub does **not** have the latest MS SQL scripts. Copy the folder from your laptop. Do not clone and expect it to be complete.

---

## Confirmed connection

| Item | Value |
|------|--------|
| Server name | FDB |
| IP | `192.168.16.14` |
| Port | `1433` |
| Database | `Scouting` |
| SQL login | In `.env.local` as `MSSQL_USER` / `MSSQL_PASSWORD` |
| Where to work | On the VegPro LAN, or on the FDB computer itself |

On FDB, this check already succeeded once (`TcpTestSucceeded : True`). Node.js was **not** installed yet.

---

## Part 1 — Database (SSMS, about 10 minutes)

Do this first. It does not need Node.js.

1. On FDB, open **SQL Server Management Studio**.
2. Connect to `192.168.16.14` with the SQL login from Imran (not Windows login unless IT says so).
3. Select database **Scouting**.
4. Open each file and click **Execute**, in this order:

| Order | File | What it does |
|------:|------|----------------|
| 1 | `sql\mssql\001_schema.sql` | Tables |
| 2 | `sql\mssql\002_seed_bemack_core.sql` | Farm / crop master data |
| 3 | `sql\mssql\003_activities.sql` | Activities and QR tables |
| 4 | `sql\mssql\004_seed_users.sql` | Demo logins |

5. In a new query on **Scouting**, run:

```sql
SELECT email, role FROM dbo.users ORDER BY email;
```

You should see `admin@vegpro.com`, `manager@vegpro.com`, and `worker@vegpro.com`.

Demo password for all three (app login, not the SQL login): **`VegPro2026!`**

If a script says the object already exists, it is safe to continue. These scripts skip tables that are already there.

---

## Part 2 — Install Node.js on FDB

1. In a browser on FDB, open [https://nodejs.org](https://nodejs.org) and install the **LTS** Windows installer (64-bit).
2. Accept the defaults, including **Add to PATH**.
3. Close every Command Prompt window, open a **new** one, and run:

```bat
node -v
npm -v
```

Both must print a version. If `node` is not recognized, the PATH was not refreshed — open a new window or sign out and back in.

---

## Part 3 — Copy the app onto FDB

1. Copy the project to:

```text
D:\Apps\vegpro-scouting
```

2. Confirm these files are inside that folder:

- `.env.local`
- `package.json`
- `sql\mssql\001_schema.sql` through `004_seed_users.sql`

3. If `.env.local` is missing, create it (Part 4) before the next commands.

4. Open Command Prompt **as a normal user** (Administrator only if `npm` is blocked):

```bat
cd /d D:\Apps\vegpro-scouting
npm install
npm run test:mssql
```

`test:mssql` must print a success line. If it times out, you are not on the VegPro network. If it says login failed, check the SQL user and password with Imran.

Optional one-shot (only if Part 1 was **not** done in SSMS):

```bat
npm run setup:vegpro
```

That command tests SQL, runs scripts 001–003, and seeds users. If you already ran all four scripts in SSMS, skip it and use `npm run test:mssql` only.

---

## Part 4 — `.env.local` on FDB

File: `D:\Apps\vegpro-scouting\.env.local`

Copy the file from your laptop. It must look like this (fill the blanks from your laptop file; do not email the password):

```env
DATA_BACKEND=mssql
NEXT_PUBLIC_DATA_BACKEND=mssql
MSSQL_SERVER=192.168.16.14
MSSQL_DATABASE=Scouting
MSSQL_USER=your-sql-login
MSSQL_PASSWORD="your-sql-password"
MSSQL_TRUST_SERVER_CERTIFICATE=true
SESSION_SECRET=paste-the-long-secret-from-your-laptop

EVIDENCE_STORAGE_PATH=D:\Apps\vegpro-scouting\data\evidence
```

Rules:

- Quote the password if it contains `*` or other symbols: `MSSQL_PASSWORD="..."`.
- Copy `SESSION_SECRET` from your laptop `.env.local`. Do not invent a short one.
- Do **not** put Supabase URL or keys in this file on FDB.
- Create the photo folder:

```bat
mkdir D:\Apps\vegpro-scouting\data\evidence
```

---

## Part 5 — Prove the app before IIS

Still in `D:\Apps\vegpro-scouting`:

```bat
npm run dev
```

On that PC, open:

```text
http://localhost:3000/auth/login
```

| Email | Password | Role |
|-------|----------|------|
| worker@vegpro.com | VegPro2026! | Worker |
| manager@vegpro.com | VegPro2026! | Manager |
| admin@vegpro.com | VegPro2026! | Admin |

Sign in as the worker. If login works, stop the dev server with **Ctrl+C** and continue to production.

---

## Part 6 — Production deploy (IIS + HTTPS)

Scouts’ phones need **HTTPS**. GPS does not work on plain `http://` except localhost.

### 6.1 Build

```bat
cd /d D:\Apps\vegpro-scouting
npm run build
```

Wait until the build finishes with no errors.

### 6.2 Keep Node running

The site is served by Node on port **3000**. IIS only forwards HTTPS traffic to it.

For the first day you can start it in a window and leave that window open:

```bat
cd /d D:\Apps\vegpro-scouting
npm run start
```

Ask Imran to keep that process running after reboot (Task Scheduler at startup, or NSSM). The command is:

```bat
cd /d D:\Apps\vegpro-scouting
npm run start
```

Working directory must be `D:\Apps\vegpro-scouting`.

Check: `http://localhost:3000/auth/login` still opens while `npm run start` is running.

### 6.3 IIS reverse proxy

On FDB, IIS needs:

- **IIS** (Web Server role)
- **URL Rewrite**
- **Application Request Routing (ARR)**

Then enable the proxy (Command Prompt as Administrator):

```bat
%windir%\system32\inetsrv\appcmd.exe set config -section:system.webServer/proxy /enabled:"True" /commit:apphost
```

Create a site folder, for example `D:\Apps\vegpro-scouting\iis`, and save this as `web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyToNode" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

In **IIS Manager**:

1. Add a website (or use the existing FDB site if Imran prefers).
2. Physical path: the folder that contains `web.config`.
3. Binding: **https**, port **443**, with the farm certificate Imran already uses.
4. Browse `https://<server-name>/auth/login` from another PC on the farm Wi-Fi.

Do not publish SQL port 1433 to the internet. Phones only need **443**.

---

## Part 7 — Smoke test on the farm Wi-Fi

Use a phone or another PC, not only localhost.

| # | Check | Pass |
|---|--------|------|
| 1 | Open the HTTPS address Imran assigned | Login page loads, padlock present |
| 2 | `worker@vegpro.com` / `VegPro2026!` | Lands on the worker home |
| 3 | Start a scouting walk and save a stop | Stop is stored |
| 4 | `manager@vegpro.com` / `VegPro2026!` | Stop appears on the Scouting screen within about 15 seconds |
| 5 | Report an infestation and log a spray | Both save; photo opens |
| 6 | `admin@vegpro.com` / `VegPro2026!` | Admin can open staff / create a user |

Change the three demo passwords after go-live (admin screen, or ask for a reset script).

---

## If something fails

| What you see | What to do |
|--------------|------------|
| `node` is not recognized | New Command Prompt after install. If it still fails, reinstall Node LTS and tick Add to PATH |
| Timeout to `192.168.16.14` | PC is not on the VegPro LAN. Use FDB itself or office Wi-Fi |
| Login failed for SQL user | User or password in `.env.local` does not match Imran’s login. Quote the password |
| App login says invalid email or password | Part 1 script `004_seed_users.sql` was not run. Run it in SSMS on **Scouting** |
| Page opens on the server but not on a phone | IIS binding, certificate, or firewall port 443. Node must still be running (`npm run start`) |
| GPS missing on the phone | The site must be **HTTPS**, not `http://192.168...` |
| Build fails | Stay on Node LTS. Run `npm install` again in `D:\Apps\vegpro-scouting`, then `npm run build` |

---

## Order of the day

1. SSMS: run `001`, `002`, `003`, `004` on **Scouting**
2. Install Node.js LTS
3. Copy the app to `D:\Apps\vegpro-scouting` with `.env.local`
4. `npm install` then `npm run test:mssql`
5. `npm run dev` and log in once
6. `npm run build` then `npm run start`
7. IIS HTTPS proxy to port 3000
8. Phone smoke test on farm Wi-Fi
