-- Initial schema for AMS_GLA
-- Tables: roles, users, assets, assets_history, alerts

CREATE TABLE IF NOT EXISTS public.roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assets table (kept compatible with collector/index.js)
CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY,
  symbol TEXT,
  name TEXT,
  rank INTEGER,
  price_usd NUMERIC,
  change_percent_24hr NUMERIC,
  market_cap_usd NUMERIC,
  volume_usd_24hr NUMERIC,
  supply NUMERIC,
  max_supply NUMERIC,
  explorer TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assets_history (
  id SERIAL PRIMARY KEY,
  asset_id TEXT REFERENCES public.assets(id),
  price_usd NUMERIC,
  market_cap_usd NUMERIC,
  volume_usd24hr NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  direction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts_notifications (
  id SERIAL PRIMARY KEY,
  alert_id INT REFERENCES public.alerts(id),
  asset_id TEXT,
  symbol TEXT,
  price NUMERIC,
  fired_at TIMESTAMPTZ DEFAULT now()
);

-- RPC compatibility functions used by server.js fallbacks
CREATE OR REPLACE FUNCTION public.rpc_create_user(p_email TEXT)
RETURNS TABLE(id INT, email TEXT) AS $$
BEGIN
  LOOP
    -- try to insert user, on conflict return existing
    INSERT INTO public.users (email) VALUES (p_email)
    ON CONFLICT (email) DO NOTHING;
    RETURN QUERY SELECT id, email FROM public.users WHERE email = p_email LIMIT 1;
    RETURN;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.rpc_get_user(p_email TEXT)
RETURNS TABLE(id INT, email TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY SELECT id, email, role FROM public.users WHERE email = p_email LIMIT 1;
END;
$$ LANGUAGE plpgsql;
