-- Staff accounts can be deactivated; inactive users cannot sign in.
alter table public.users
  add column if not exists is_active boolean not null default true;

create index if not exists users_is_active_idx on public.users (is_active);
