# Guide : Créer la table alerts dans Supabase local

## Méthode 1 : Via l'interface Supabase Studio (Recommandée)

1. **Ouvrir Supabase Studio**
   - Aller sur `http://localhost:54323` (port par défaut)
   - Se connecter (user: supabase, password: this_password_is_super_secure)

2. **Accéder au SQL Editor**
   - Menu latéral → SQL Editor
   - Cliquer sur "New query"

3. **Copier-coller le script**
   - Ouvrir le fichier `database/create_alerts_table.sql`
   - Copier tout le contenu
   - Coller dans l'éditeur SQL
   - Cliquer sur "Run" (ou Ctrl+Enter)

4. **Vérifier la création**
   - Menu latéral → Table Editor
   - Vous devriez voir la table `alerts`

---

## Méthode 2 : Via psql en ligne de commande

1. **Se connecter à la base de données**
```bash
# Depuis Docker Desktop, ouvrir un terminal dans le container Postgres
# Ou depuis votre machine:
psql -h localhost -p 54322 -U postgres -d postgres
# Password: postgres (ou selon votre config)
```

2. **Exécuter le script**
```sql
\i database/create_alerts_table.sql
```

Ou directement dans psql:
```sql
-- Copier-coller le contenu du fichier create_alerts_table.sql
```

3. **Vérifier**
```sql
\dt public.alerts
SELECT * FROM public.alerts;
```

---

## Méthode 3 : Via Supabase CLI (si installée)

```bash
# Appliquer la migration
supabase db push --local --password postgres

# Ou exécuter directement le fichier
psql postgres://postgres:postgres@localhost:54322/postgres -f database/create_alerts_table.sql
```

---

## Vérification finale

Une fois créée, testez avec une requête:

```sql
-- Vérifier la structure
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'alerts' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Insérer une alerte de test
INSERT INTO public.alerts (user_id, symbol, threshold, direction) 
VALUES ('test-user', 'BTC', 50000, 'above');

-- Vérifier l'insertion
SELECT * FROM public.alerts;
```

---

## Résolution des problèmes

**Si erreur "table already exists"** :
```sql
DROP TABLE IF EXISTS public.alerts CASCADE;
-- Puis réexécuter le script
```

**Si erreur de permissions** :
```sql
GRANT ALL ON public.alerts TO postgres;
GRANT ALL ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO anon;
```

**Ports par défaut Supabase local** :
- Studio: `http://localhost:54323`
- PostgreSQL: `localhost:54322`
- API: `http://localhost:54321`
