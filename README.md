# VegPro Smart Farm Operations MVP

Production-ready MVP for realtime farm infestation monitoring, GPS hotspots, and spray tracking.

## Tech Stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Supabase (Auth, Postgres, Realtime, Storage, RLS)
- Zustand, React Hook Form, Zod, Recharts, Framer Motion
- PWA via `next-pwa`

## Local Setup

1. Install dependencies: `npm install`
2. Create `.env.local` from `.env.example`
3. Run app: `npm run dev`

## Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run migrations in order: `001` → `002` → `003` → `004` → `005` → `006_scouting_bemack` → `007_seed_bemack` → `008_scouting_realtime` → `009_scouting_phase2` → `010_scouting_rounds_realtime` → `011_remove_legacy_seed` → `014_demo_manager_account` → optional `012_sample_bemack_demo` (demo seed data).
3. See **[docs/DEMO-DAY.md](docs/DEMO-DAY.md)** for the live VegPro demo script (scout entry, GPS, manager views).
4. **Authentication → Users**: demo accounts (or run migration `014_demo_manager_account.sql`):
   - `admin@vegpro.com` — Admin
   - `manager@vegpro.com` — Farm manager (`supervisor` role) — password `VegPro2026!`
   - `worker@vegpro.com` — Field worker
5. Copy each user’s UUID, paste into `supabase/link-auth-users.sql`, and run it.
6. (Optional) Run `supabase/seed.sql` — notes only; Bemack data lives in `007_seed_bemack.sql`.
7. Copy `.env.example` to `.env.local` with your project URL and anon key; restart `npm run dev`.
8. Storage bucket `activity-evidence` is created by `001_init.sql`.

## Deployment

### Vercel Frontend
- Import repository and add environment variables.
- Deploy from main branch.

### Supabase Backend
- Apply migration and seed scripts.
- Validate RLS and storage access.

## Phase 2 (Future Scope)

- AI assistant insights and predictive analytics
- IoT data ingestion
- Facial recognition
- Advanced map visualizations
