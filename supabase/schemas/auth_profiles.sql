-- auth_profiles.sql
-- Creates a `profiles` table synced with `auth.users` and a `user_settings` table.
-- Intended for local Supabase/Postgres. Apply with psql or inside the Postgres container.

-- Create `profiles` table that references `auth.users` (Supabase-managed)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create a simple settings table for per-user preferences
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  timezone text default 'UTC',
  notifications boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Function: insert a profile when a new auth.user is created
create or replace function public.handle_auth_user_created()
returns trigger as $$
begin
  insert into public.profiles(id, email, metadata, created_at)
  values (new.id, new.email, new.raw_user_meta_data, now())
  on conflict (id) do update set email = coalesce(new.email, public.profiles.email), metadata = coalesce(new.raw_user_meta_data, public.profiles.metadata), updated_at = now();
  -- ensure a settings row exists
  insert into public.user_settings(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Function: keep profile email/metadata updated on auth.users update
create or replace function public.handle_auth_user_updated()
returns trigger as $$
begin
  update public.profiles
  set email = coalesce(new.email, public.profiles.email), metadata = coalesce(new.raw_user_meta_data, public.profiles.metadata), updated_at = now()
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing triggers if present, then create them
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_auth_user_created();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_auth_user_updated();

-- Note: Deletions cascade because profiles.user_id references auth.users with ON DELETE CASCADE.
-- Verify with: select * from public.profiles limit 5;
