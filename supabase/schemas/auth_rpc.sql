-- auth_rpc.sql
-- RPC helpers to create/get users directly in `auth.users` for local dev/testing.
-- WARNING: These functions bypass GoTrue password hashing and should be used only for local development.

-- Ensure pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- Drop previous versions to allow changing return types
drop function if exists public.rpc_create_user(text) cascade;
drop function if exists public.rpc_get_user(text) cascade;

-- Create a user directly in auth.users (minimal fields). Returns the inserted row id and email.
create or replace function public.rpc_create_user(p_email text)
returns table(user_id uuid, user_email text) as $$
declare
  v_id uuid := gen_random_uuid();
begin
  -- Insert only if same email does not already exist
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at)
  select v_id, 'authenticated', 'authenticated', p_email, json_build_object('created_via','rpc'), now()
  where not exists (select 1 from auth.users where email = p_email);

  return query select id, email::text from auth.users where email = p_email limit 1;
end;
$$ language plpgsql security definer;

-- Retrieve a user by email (for RPC login emulation)
create or replace function public.rpc_get_user(p_email text)
returns table(user_id uuid, user_email text, created_at_ts timestamptz) as $$
begin
  return query select id, email::text, created_at as created_at_ts from auth.users where email = p_email limit 1;
end;
$$ language plpgsql;
