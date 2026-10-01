# VegPro setup runbook (today)

## 1. Network (on-site)

Work from the **VegPro site / LAN** so `192.168.16.14:1433` is reachable (confirmed by IT: server **FDB**, default port **1433**, firewall allows the port). Remote VPN alone may not be enough—use on-site Wi‑LAN or a PC on FDB for setup if connection times out from home.

## 2. Credentials in `.env.local`

Set (from Imran):

```env
MSSQL_USER=<your SQL login>
MSSQL_PASSWORD=<your SQL password>
```

Already set: `MSSQL_SERVER`, `MSSQL_DATABASE=Scouting`, `DATA_BACKEND=mssql`, `SESSION_SECRET`.

## 3. One command setup

```powershell
cd d:\vegpro-smart-farm
npm run setup:vegpro
```

This runs:

1. `npm run test:mssql` — connection check  
2. `npm run db:mssql:apply` — `sql/mssql/001` … `003`  
3. `npm run seed:mssql-users` — demo logins (`VegPro2026!`)

## 4. Run the app

```powershell
npm run dev
```

Open http://localhost:3000/auth/login — **worker@vegpro.com** / **VegPro2026!**

## 5. FDB (Imran)

After local UAT: deploy build to FDB, same `.env.local` values on the server, IIS → Node, HTTPS.

See **DEPLOY-FDB.md**.

## Troubleshooting

| Error | Fix |
|--------|-----|
| `Missing MSSQL_USER` | Fill user/password in `.env.local` |
| Connection timeout | Not on **VegPro LAN** / on-site; confirm Wi‑Fi can reach `192.168.16.14:1433` |
| Login failed for user | Ask Imran to confirm login on `Scouting` |
| Object already exists | DB partly migrated; use fresh DB or drop tables with Imran |
