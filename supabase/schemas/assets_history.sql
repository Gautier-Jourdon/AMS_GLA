-- Table for asset historical snapshots
CREATE TABLE IF NOT EXISTS public.assets_history (
  id bigserial PRIMARY KEY,
  asset_id text NOT NULL,
  price_usd numeric,
  market_cap_usd numeric,
  volume_usd24hr numeric,
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_history_asset ON public.assets_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_history_recorded_at ON public.assets_history(recorded_at);
