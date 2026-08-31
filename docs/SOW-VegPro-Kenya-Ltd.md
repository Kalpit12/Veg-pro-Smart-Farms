# STATEMENT OF WORK

## VegPro Smart Farm — Precision Scouting Platform

**Prepared for:** VegPro Kenya Ltd  
**Created by:** Kalpit Patel (AI & Software Developer)  
**Date:** 20 May 2026  
**Quote validity:** 30 days  

---

## 1. Summary

Development of a **company-wide, mobile-first precision scouting platform** for VegPro Kenya Ltd operations across **multiple farm sites** . The system supports **many greenhouses** organisation-wide—not a single-farm tool—with live GPS scouting, manager dashboards, heat maps, scout routes, and a daily spray/work program.

**Bemack scouting data** (shared Excel) is used **for reference only** to shape the scouting form and master lists—final **data columns and fields will be confirmed with VegPro** before go-live. The platform is built for all company sites and greenhouses as VegPro expands.

**Quote: KES 150,000**

**Timeline: 5 weeks** from signed agreement and deposit.

---

## 2. Scope (included)

### Field app (Scout / Worker)
- Live **GPS tracking** — position updates automatically; nearest greenhouse assigned by location (multi-site)
- Scouting stop form (fields per agreed column list—reference: Bemack sheet; subject to VegPro verification)
- 15 scouting parameters (pest / disease / crop health) with checkbox + 1–5 scale
- Scout rounds with GPS route and stops
- Spray and infestation logging with GPS stamp
- PWA for mobile browsers

### Manager / Supervisor (company-wide)
- Operations across **all farms / sites** under VegPro
- Daily scouting pressure by site, greenhouse, and variety
- **GH heat map** (column × bay)
- **Scout route map** (live GPS paths and stops)
- **Spray / work program** (priority tasks from scouting data)
- Farm map, worker positions, history and alerts

### Technical
- Roles: Admin, Supervisor, Scout/Worker
- Multi-farm / multi-greenhouse database structure
- Backend (auth, database, realtime, storage)
- Reference data model from Bemack sample (not production master data until VegPro confirms columns and site lists)
- Deployment and **self-hosting documentation** (client may host on their own infrastructure or use managed cloud)
- Remote handover (2 hours)

---

## 3. Out of scope

- QR code scanning for location
- Orders / forecast / AI allocation module
- Native iOS/Android store apps
- Hardware supply
- On-site training beyond remote handover

---

## 4. Deliverables

1. Production-ready web application (source code)  
2. Database migrations and multi-site data model  
3. Reference scouting template (Bemack sample); production master data after column verification with VegPro  
4. Deployed staging/production URL **or** handover package for **client self-hosting**  
5. User setup (initial accounts)  
6. Handover and brief user guide (including hosting options)  

---

## 5. Timeline (5 weeks)

| Week | Milestone |
|------|-----------|
| 1 | Setup, multi-site data model, auth, live GPS; agree scouting columns with VegPro |
| 2 | Scouting forms (verified fields), database, manager views (company-wide) |
| 3 | Maps, pressure analytics, heat map |
| 4 | Scout routes, spray work program, UAT |
| 5 | Fixes, deploy or self-host handover, training |

*Assumes client feedback within 3 business days per review.*

---

## 6. Commercial terms

**Quote: KES 150,000** (Kenya Shillings one hundred fifty thousand)

| Payment | Amount (KES) | When |
|---------|--------------|------|
| Deposit (40%) | 60,000 | Signed SOW |
| Beta (40%) | 60,000 | Staging live, core features demo |
| Final (20%) | 30,000 | Acceptance and handover |

Payment within 14 days of invoice. VAT extra if applicable.

---

## 7. Hosting

VegPro may choose either:

- **Managed cloud** — e.g. Vercel (app) and Supabase (database); hosting fees paid directly by VegPro to the provider, or  
- **Self-hosting** — VegPro hosts the application and database on their own servers; deliverables include documentation and support for setup during handover.

Hosting choice does not change the quote above.

---

## 8. Client responsibilities

- Single point of contact for UAT  
- Hosting decision (managed cloud or self-hosted)  
- Database / server access if self-hosting  
- Scout user list (name, email, role, assigned site)  
- Confirmation of **required scouting columns** and farm/greenhouse lists for all sites  
- Smartphones with GPS enabled for field use  
- Timely feedback during the 5-week period  

---

## 9. Acceptance

Accepted when scouts can record stops via **live GPS** using **VegPro-verified** fields, managers can view company-wide pressure, heat map, routes, and spray program, and the app is deployed (or handed over for self-hosting). **10 business days** for UAT feedback after beta.

---

## 10. Signatures

**VegPro Kenya Ltd**

Name: _________________________  
Title: _________________________  
Signature: _________________________  
Date: _________________________  

**Kalpit Patel — AI & Software Developer**

Signature: _________________________  
Date: _________________________  
