-- Schema for collector assets table
CREATE TABLE IF NOT EXISTS public.assets (
  id text PRIMARY KEY,
  symbol text,
  name text,
  rank integer,
  price_usd numeric,
  change_percent_24hr numeric,
  market_cap_usd numeric,
  volume_usd_24hr numeric,
  supply numeric,
  max_supply numeric,
  explorer text,
  updated_at timestamptz DEFAULT now()
);

-- Optional index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assets_symbol ON public.assets(symbol);
