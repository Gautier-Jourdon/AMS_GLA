-- Table for user alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  symbol text NOT NULL,
  threshold numeric NOT NULL,
  direction text NOT NULL CHECK (direction IN ('above','below')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON public.alerts(symbol);
