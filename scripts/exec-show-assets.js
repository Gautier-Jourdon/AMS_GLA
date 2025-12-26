// scripts/exec-show-assets.js
// Utilise docker exec pour lire les données de public.assets dans le conteneur supabase_db_AMS_GLA

import { execSync } from 'child_process';

const CONTAINER = 'supabase_db_AMS_GLA';
const SQL = 'SELECT * FROM public.assets LIMIT 20;';

try {
  const cmd = `docker exec -i ${CONTAINER} psql -U postgres -d postgres -c "${SQL}" -P pager=off`;
  const output = execSync(cmd, { encoding: 'utf-8' });
  console.log('Résultat de la requête SQL dans le conteneur :\n');
  console.log(output);
} catch (e) {
  console.error('Erreur lors de l\'exécution de la commande docker exec :', e.message);
  process.exit(1);
}
