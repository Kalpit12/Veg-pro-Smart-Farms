-- Run AFTER creating users in Supabase Dashboard → Authentication → Users

insert into public.users (id, full_name, email, phone, role)
values
  ('de8dcff5-7166-406a-b76a-d2ddda7ab8d2', 'Admin User', 'admin@vegpro.com', '+919000000001', 'admin'),
  ('c3d4e5f6-0001-4001-8001-000000000001', 'Farm Manager', 'manager@vegpro.com', '+254700000002', 'supervisor'),
  ('49b389f8-8113-4773-b92c-b52c498284a2', 'Worker User', 'worker@vegpro.com', '+919000000003', 'worker')
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  role = excluded.role;

-- Farm manager auth user is created by migration 014_demo_manager_account.sql
-- Login: manager@vegpro.com / VegPro2026! → select "Farm manager" on sign-in
