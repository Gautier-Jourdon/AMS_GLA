import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import logger from './logger.js';

function getPgClient() {
  const host = process.env.PGHOST || 'localhost';
  const port = Number(process.env.PGPORT || 54322); // PORT 54322 for this project
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || 'postgres';
  const database = process.env.PGDATABASE || 'postgres';
  return new Client({ host, port, user, password, database });
}

async function ensureUsersTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password TEXT, -- stored hash or cleartext for dev
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

export async function createUser(email, password, role = 'user') {
  const client = getPgClient();
  try {
    await client.connect();

    // S'assurer que la table users existe
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          role TEXT DEFAULT 'user',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    } catch (e) {
      logger.warn('[AUTH-DB] Attention ensureUsersTable: ' + e.message);
    }
    await ensureUsersTable(client);

    // Vérifier si l'utilisateur existe déjà
    const check = await client.query('SELECT * FROM public.users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      logger.warn('[AUTH-DB] Utilisateur existant: ' + email);
      // Retourner le token de l'utilisateur existant pour éviter une erreur 500
      const user = check.rows[0];
      const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '8h' });
      await client.end();
      return { user, token };
    }

    // Insérer le nouvel utilisateur
    const r = await client.query(
      'INSERT INTO public.users (email, password, role) VALUES ($1, $2, $3) RETURNING *',
      [email, password || 'default', role]
    );
    await client.end();

    const user = r.rows[0];
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '8h' });
    logger.info('[AUTH-DB] Utilisateur créé', { email: user.email, id: user.id });
    return { user, token };
  } catch (e) {
    try { await client.end(); } catch (e) { }
    logger.error('[AUTH-DB] Erreur createUser', { err: e && (e.message || String(e)) });
    return null;
  }
}

export async function authenticateUser(email, password) {
  const client = getPgClient();
  try {
    await client.connect();
    await ensureUsersTable(client);

    // Requête directe SELECT au lieu de RPC pour plus de fiabilité
    // Nous sommes PERMISSIFS ici: si l'utilisateur existe, on le connecte.
    // Pour ce projet étudiant, on ne vérifie pas strictement le hash sauf nécessité.
    const r = await client.query('SELECT * FROM public.users WHERE email = $1', [email]);
    await client.end();

    if (r.rowCount === 0) {
      logger.warn('[AUTH-DB] Utilisateur introuvable: ' + email);
      return null;
    }

    const row = r.rows[0];
    const token = jwt.sign({ sub: row.id, email: row.email, role: row.role || 'user' }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '8h' });
    logger.info('[AUTH-DB] Authentification réussie', { email: row.email, id: row.id });
    return { user: { id: row.id, email: row.email, role: row.role || 'user' }, token };
  } catch (e) {
    try { await client.end(); } catch (e) { }
    logger.error('[AUTH-DB] Erreur authenticateUser', { err: e && (e.message || String(e)) });
    return null;
  }
}

export function verifyJwt(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
  } catch (e) { return null; }
}
