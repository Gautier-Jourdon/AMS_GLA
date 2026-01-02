-- Script de création de la table alerts pour Supabase
-- À exécuter dans votre base de données Supabase locale

-- Table alerts pour stocker les alertes de prix
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    threshold NUMERIC NOT NULL CHECK (threshold > 0),
    direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
    delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'discord')),
    confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON public.alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_alerts_updated_at ON public.alerts;
CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON public.alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documenter la table
COMMENT ON TABLE public.alerts IS 'Stocke les alertes de prix configurées par les utilisateurs';
COMMENT ON COLUMN public.alerts.id IS 'Identifiant unique de l''alerte';
COMMENT ON COLUMN public.alerts.user_id IS 'ID de l''utilisateur propriétaire de l''alerte';
COMMENT ON COLUMN public.alerts.symbol IS 'Symbole de la crypto (ex: BTC, ETH)';
COMMENT ON COLUMN public.alerts.threshold IS 'Prix seuil pour déclencher l''alerte';
COMMENT ON COLUMN public.alerts.direction IS 'Direction du déclenchement: above (au-dessus) ou below (en-dessous)';
COMMENT ON COLUMN public.alerts.delivery_method IS 'Méthode de livraison: email ou discord';
COMMENT ON COLUMN public.alerts.confirmed IS 'Indique si l''alerte a été confirmée par l''utilisateur';
COMMENT ON COLUMN public.alerts.created_at IS 'Date de création de l''alerte';
COMMENT ON COLUMN public.alerts.updated_at IS 'Date de dernière modification';
