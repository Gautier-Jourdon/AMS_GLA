// scripts/docker-psql-assets.js
// Exécute une commande psql dans le conteneur Docker Supabase/Postgres pour compter les lignes de public.assets

import { execSync } from 'child_process';

function getContainerName() {
  try {
    const output = execSync('docker ps --no-trunc --format "{{.Names}} {{.Image}}"').toString();
    console.log('[DEBUG] Liste brute des conteneurs:\n' + output);
    const lines = output.split('\n').map(l => l.trim()).filter(l => l && l.includes(' '));
    if (lines.length === 0) {
      throw new Error('Aucun conteneur Docker n\'est listé. Vérifiez que Docker fonctionne.');
    }
    // 1. Cherche d'abord l'image postgres
    for (const line of lines) {
      const [name, ...imageParts] = line.split(' ');
      const image = imageParts.join(' ');
      if (
        image.startsWith('public.ecr.aws/supabase/postgres') ||
        image.includes('postgres')
      ) {
        return name;
      }
    }
    // 2. Sinon, prend le premier nom contenant '_db_'
    for (const line of lines) {
      const [name] = line.split(' ');
      if (name.includes('_db_')) {
        return name;
      }
    }
    throw new Error('Aucun conteneur Postgres/Supabase trouvé. Liste brute:\n' + output);
  } catch (e) {
    throw new Error('Erreur lors de la recherche du conteneur : ' + e.message);
  }
}

function runPsqlCount(container) {
  try {
    const cmd = `docker exec -i ${container} psql -U postgres -d postgres -c "SELECT COUNT(*) FROM public.assets;"`;
    const result = execSync(cmd, { stdio: 'inherit' });
    return result;
  } catch (e) {
    throw new Error('Erreur lors de l\'exécution de psql : ' + e.message);
  }
}

try {
  const container = getContainerName();
  console.log('Conteneur détecté :', container);
  runPsqlCount(container);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
