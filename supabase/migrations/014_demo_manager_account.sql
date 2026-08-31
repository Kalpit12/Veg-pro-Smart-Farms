-- Demo farm manager account (supervisor role → /manager/* portal)
-- Email: manager@vegpro.com
-- Password: VegPro2026!
-- Safe to re-run.

do $$
declare
  v_manager_id uuid := 'c3d4e5f6-0001-4001-8001-000000000001';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_manager_id,
    'authenticated',
    'authenticated',
    'manager@vegpro.com',
    extensions.crypt('VegPro2026!', extensions.gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Farm Manager"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    ''
  )
  on conflict (id) do update set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    updated_at = timezone('utc', now());

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_manager_id,
    jsonb_build_object(
      'sub', v_manager_id::text,
      'email', 'manager@vegpro.com',
      'email_verified', true
    ),
    'email',
    v_manager_id::text,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (provider_id, provider) do update set
    identity_data = excluded.identity_data,
    updated_at = timezone('utc', now());

  insert into public.users (id, full_name, email, phone, role)
  values (
    v_manager_id,
    'Farm Manager',
    'manager@vegpro.com',
    '+254700000002',
    'supervisor'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    role = excluded.role;
end $$;
