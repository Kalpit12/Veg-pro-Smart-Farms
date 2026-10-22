# VegPro Smart Farm — Admin User Manual

**Product:** VegPro Smart Farm (Scouting)  
**Live URL:** https://scouting.kongoniriverfarm.com/  
**Audience:** System Administrator (e.g. Dev)  
**Version:** October 2026 handover  

This manual is a step-by-step guide for correct daily use of the **Admin** role.

---

## 1. Access and sign-in

1. Open a browser (Chrome or Edge recommended).
2. Go to: **https://scouting.kongoniriverfarm.com/**
3. On the sign-in screen:
   - Choose **Admin** (or sign in with an admin email).
   - Enter your **email** and **password**.
   - Optionally tick **Remember me**.
4. Click **Sign in**.
5. You should land on the **Admin Dashboard**.

**Demo seed account (change after go-live):**

| Role | Email | Password |
|------|--------|----------|
| Admin | `admin@vegpro.com` | `VegPro2026!` |

> Change this password after training. Do not share admin credentials with field workers.

**If sign-in fails**

- Confirm you are on **https** (not http).
- Confirm the account is an **admin** role.
- Ask IT to confirm the site and database on FDB are running.

---

## 2. Admin menu overview

After login, the left menu shows:

| Menu item | Purpose |
|-----------|---------|
| **Dashboard** | Farm overview, KPIs, alerts, live activity |
| **Scouting** | Heat grid, scout routes, pressure, spray program, scouting records |
| **Map** | Hotspots and field locations on the farm map |
| **Staff** | Create field worker and farm manager logins; see who is in the field |
| **Trends** | Workforce / infestation trend views |
| **History** | Longer-term history and greenhouse health views |
| **Approvals** | Review and approve / reject pending field submissions |
| **Activity logs** | Activity / QR style log table |

Use the menu to move between areas. On a phone, open the menu with the menu (☰) button.

---

## 3. How to add users (staff accounts)

Admins can create **Field worker** and **Farm manager** logins from the app.

### 3.1 Open Staff

1. Sign in as **Admin**.
2. Click **Staff** in the left menu (`/admin/workforce`).

### 3.2 Create a new account

1. In **Create staff account**, fill in:
   - **Full name** — person’s real name.
   - **Email** — unique login email (required).
   - **Phone** — optional but recommended.
   - **Role**:
     - **Field worker** — scouting on phones in the greenhouse.
     - **Farm manager** — dashboards, scouting reports, spray logging, workers view.
   - **Password** — at least 8 characters (the screen can generate one).
2. Click **Create account** (or the equivalent primary button).
3. When creation succeeds, **copy the password immediately** and give it to the user securely. The system does not show the password again later.
4. Tell the user:
   - Website: https://scouting.kongoniriverfarm.com/
   - Email + password you created
   - Which role to choose on the login screen (Worker or Manager)

### 3.3 Rules

- Only **admins** can create staff accounts.
- Emails must be unique.
- Farm managers in the system use the **supervisor** role internally; the UI label is **Farm manager**.
- Creating additional **admin** accounts is an IT / database task — not done from the Staff form.

### 3.4 After creating a user — quick check

1. Sign out (or use another browser / phone).
2. Sign in with the new email and password.
3. Confirm the correct home screen opens:
   - Worker → **Home** / **Field work**
   - Farm manager → **Dashboard**

---

## 4. Master data: farms, greenhouses, varieties

The live system is configured for VegPro scouting on the **Star / Bemack** farm context, with greenhouse and variety lists used by the scout forms and reports.

### 4.1 What you use day to day (no change needed)

| Master data | How scouts / managers use it |
|-------------|------------------------------|
| **Farm** | Assigned automatically from the live farm configuration |
| **Greenhouses** | Selected by GPS nearest-house assignment, or override on Field work |
| **Varieties** | Chosen on each scout stop (lists come from configured variety master data) |
| **Pests / diseases** | Chosen on each scout stop from the configured lists |
| **Scouting parameters** | Optional ratings on the scout stop form |

### 4.2 How to add or change farms, greenhouses, varieties

There is **no “Add farm / Add greenhouse / Add variety” button** in the Admin screens in this release. Master data is maintained in the **MS SQL `Scouting` database** on FDB (and matching app master lists where required).

**Correct procedure when VegPro needs a new greenhouse, variety, or farm:**

1. Collect the details in writing:
   - Farm name
   - Greenhouse codes/names, GPS anchors if known, area if known
   - Crop category and variety names
2. Send the request to the person responsible for FDB / SQL (IT or your implementation partner).
3. They apply the change in database `Scouting` (tables such as `dbo.farms`, `dbo.greenhouses`, `dbo.crop_categories`, `dbo.crop_varieties`) using the approved SQL scripts / change process.
4. If the field form also uses built-in Star/Bemack lists in the app, the same change may need a small app update and rebuild on FDB.
5. After the change, smoke-test:
   - Worker can select the new greenhouse / variety on **Field work**.
   - Manager **Scouting** / **Map** show the new house when data is logged.

### 4.3 Current seeded baseline (reference)

Production was seeded with core farm/greenhouse/variety rows for scouting go-live. Exact codes on site may include Star house labels (STGH…) as used in the field UI. Confirm the live list on:

- Worker → **Field work** → greenhouse override list  
- Manager/Admin → **Scouting** → greenhouse dropdowns  

---

## 5. How to access reports (Admin)

### 5.1 Dashboard (daily overview)

1. Open **Dashboard**.
2. Review KPI cards (scouting activity, hotspots, sprays, workers in field, severe issues — labels as shown on screen).
3. Review **alerts / needs attention**.
4. Use the **live activity feed** to see recent field events.
5. Use quick links (if shown) to jump to Scouting, Map, Workers/Staff, or History.

### 5.2 Scouting report

1. Open **Scouting**.
2. Use this screen for:
   - **Spray / work program** — houses/varieties needing spray or monitoring from recent pressure  
   - **Heat grid** — pressure by location inside a greenhouse  
   - **Scout routes** — rounds and stops  
   - **Records table** — detailed scouting stops (greenhouse, variety, issue, rating, time)
3. Change the greenhouse filter/dropdown to compare houses.
4. Click cells or rows where the UI allows drill-down for issue detail.

### 5.3 Map report

1. Open **Map**.
2. Review hotspot / spray pins and worker-related markers as shown.
3. Use map actions (for example mark sprayed / resolved) only when those buttons are available for the selected item.

### 5.4 Trends and History

1. Open **Trends** for workforce / infestation trend panels.
2. Open **History** for multi-week / multi-month style views and greenhouse health summaries.

### 5.5 Activity logs

1. Open **Activity logs**.
2. Review tabular activity history for audit-style checks.

### 5.6 Export / PDF (where available)

Some screens support browser print or in-app PDF download controls. Use **Print → Save as PDF** from the browser if you need a file for email or filing.

---

## 6. Approvals (Admin)

1. Open **Approvals**.
2. Review the list of **pending** field submissions.
3. Open evidence / notes when shown.
4. Choose **Approve** or **Reject** for each item.
5. Confirm the item leaves the pending list after a successful update.

> If the list is empty, there are no pending items — that is normal.

---

## 7. Recommended daily Admin checklist

1. Sign in and open **Dashboard** — check alerts and KPIs.
2. Open **Scouting** — review today’s pressure and spray program.
3. Open **Map** — confirm hotspots look correct.
4. Open **Approvals** — clear any pending items.
5. Open **Staff** only when you need to create or check accounts.

---

## 8. Security and good practice

- Do not share the admin password.
- Create separate logins for each person (no shared “worker” account if avoidable).
- When creating accounts, send passwords privately (not in a group WhatsApp if possible).
- Prefer **HTTPS** on phones so GPS and sign-in cookies work correctly.
- After training, change demo passwords (`VegPro2026!`).

---

## 9. Getting help

| Issue | Who |
|-------|-----|
| Site down / cannot open URL | IT (FDB, IIS, DNS, certificate) |
| Cannot create users / login errors | Admin + IT (database `Scouting`, app service) |
| Wrong greenhouse or variety list | Master-data change request (see section 4) |
| Training / how to use screens | Admin trainer (train-the-trainer) |
