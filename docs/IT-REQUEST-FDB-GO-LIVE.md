# VegPro scouting — what we need from IT to go live

**To:** Mohammed Khaja Imran, VegPro IT  
**From:** Kalpit Patel  
**Date:** 5 October 2026  
**Server:** FDB (`192.168.16.14`)  
**Database:** Microsoft SQL Server, database **Scouting** (already created)

This note answers the request for a full list before the scouting website goes online. The website name (domain) is **not chosen here**. VegPro IT will provide that name. The certificate and DNS must use the name IT provides.

The application is already installed on FDB. What remains is the company website address, a trusted HTTPS certificate, and IIS so the site stays up after a reboot.

---

## Already done on FDB

- Node.js is installed.
- The application is in `C:\Users\Scouting\Veg-pro-Smart-Farms-master`.
- Database **Scouting** exists. The application tables and the three demo logins are loaded.
- The application connects with the Windows account **FDB\Scouting** (Windows authentication). It does not use a SQL password login.
- Photos are stored on disk at `C:\Users\Scouting\Veg-pro-Smart-Farms-master\data\evidence`.
- A temporary test address works only while two Command Prompt windows are left open. That is not the live setup.

No Supabase and no PostgreSQL are used on FDB.

---

## What we need from IT

### 1. The website name

Please provide the hostname staff and scouts will open in the browser. Example shape only: a name on a domain VegPro already owns. We will not invent one.

That same name must be:

- The name on the HTTPS certificate
- The name in internal DNS
- The address printed for scouts

### 2. Internal DNS

On the VegPro network (office and farm Wi-Fi), that hostname must resolve to **192.168.16.14**.

Phones must reach FDB by that name. They must not be sent to the public internet for this site.

### 3. Trusted HTTPS certificate

Scouts’ phones need a real HTTPS certificate. GPS does not work on a plain `http://` address, and a self-signed certificate makes Chrome show “Your connection is not private.”

Please issue a certificate for the hostname from item 1, from the company certificate authority or a public authority the phones already trust.

Please provide:

- The certificate as a `.pfx` file (or install it in the Local Computer certificate store on FDB)
- The `.pfx` password, given in person or by a secure channel, not in a wide email
- Confirmation that farm phones and PCs trust the authority that signed it

### 4. IIS on FDB

IIS is **not** installed today. Please install, on FDB:

- Web Server (IIS), including IIS Management Tools
- URL Rewrite
- Application Request Routing (ARR), with the proxy enabled

IIS should listen on **HTTPS port 443** and forward all traffic to the Node.js application on this machine at `http://127.0.0.1:3000`.

IIS does not replace Node.js. Both must run. IIS only presents HTTPS. Node.js runs the website.

### 5. Keep the website running after reboot

The Node.js process must start when FDB starts, without someone logging in and opening a Command Prompt.

- Command: `npm run start`
- Working directory: `C:\Users\Scouting\Veg-pro-Smart-Farms-master`
- Windows account for that task: **FDB\Scouting**

It must be **FDB\Scouting**. The database login is that Windows account. If the task runs as another user, the site cannot open the Scouting database.

IIS should start on its own as a Windows service, which it normally does.

### 6. Firewall

| Port | Who needs it | Action |
|------|----------------|--------|
| **443** | Scout phones and PCs on the VegPro network | Allow to FDB |
| **3000** | This server only (IIS talks to Node.js locally) | Do not publish to the network if 443 is in place |
| **1433** | SQL Server, already used on the server | Do **not** publish to the internet |

---

## What we do not need

- A new SQL Server or a new database. **Scouting** on FDB is the database.
- Supabase, PostgreSQL, or a cloud database.
- The SQL password login. Windows authentication as **FDB\Scouting** is the working login.
- The site exposed on the public internet, unless VegPro later decides that. Farm Wi-Fi plus HTTPS is the requirement for go-live.
- Port 1433 opened to the internet.

---

## How the live site will be checked

After the hostname, certificate, DNS, and IIS are in place:

1. On farm Wi-Fi, open `https://<hostname-from-IT>/auth/login`.
2. The browser shows a padlock, with no certificate warning.
3. Sign in as `worker@vegpro.com` / `VegPro2026!` and reach the worker home page.
4. Start a scouting walk and save a stop.
5. Sign in as `manager@vegpro.com` / `VegPro2026!` and see that stop.
6. Restart FDB and confirm the site comes back without anyone opening a Command Prompt.

The three demo passwords should be changed after go-live.

---

## Reply we need from IT

Please send:

1. The hostname you will use
2. Who will create the certificate, and when the `.pfx` (or the installed certificate) will be ready
3. Confirmation that internal DNS will point that hostname to `192.168.16.14`
4. Confirmation that IIS, URL Rewrite, and ARR can be installed on FDB
5. Confirmation that a startup task can run `npm run start` as **FDB\Scouting**
6. Confirmation that TCP **443** will be allowed from the farm network to FDB, and that TCP **1433** will not be published to the internet
