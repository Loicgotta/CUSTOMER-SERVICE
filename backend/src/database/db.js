import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Pool } = pg;

// Connexion PostgreSQL via DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialisation asynchrone de la base de données
async function initDb() {
  console.log('Connecting to PostgreSQL...');

  // Créer les tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      last_activity TIMESTAMP DEFAULT NOW(),
      is_admin BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT DEFAULT NULL,
      prompt TEXT NOT NULL,
      documentation TEXT,
      email TEXT NOT NULL,
      widget_color TEXT DEFAULT '#667eea',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER NOT NULL REFERENCES agents(id),
      session_id TEXT NOT NULL,
      user_message TEXT NOT NULL,
      bot_response TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS embeddings (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER NOT NULL REFERENCES agents(id),
      chunk_text TEXT NOT NULL,
      embedding TEXT NOT NULL,
      document_name TEXT DEFAULT 'Documentation',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS daily_reports (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER NOT NULL REFERENCES agents(id),
      report_date DATE NOT NULL,
      report_content TEXT NOT NULL,
      sent BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Créer le compte admin automatiquement au démarrage
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  console.log('Verification du compte administrateur...');
  try {
    const { rows } = await pool.query('SELECT id, email, is_admin FROM users WHERE email = $1', [ADMIN_EMAIL]);
    const existingAdmin = rows[0];

    if (!ADMIN_PASSWORD) {
      if (existingAdmin) {
        console.warn('ADMIN_PASSWORD non defini : le mot de passe admin ne sera pas mis a jour.');
      } else {
        console.error('ERREUR : ADMIN_PASSWORD non defini et aucun compte admin existant.');
        process.exit(1);
      }
    } else if (!existingAdmin) {
      console.log('Creation du compte admin...');
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);

      const result = await pool.query(
        `INSERT INTO users (email, password_hash, name, is_admin, last_activity)
         VALUES ($1, $2, 'Admin', TRUE, NOW()) RETURNING id`,
        [ADMIN_EMAIL, passwordHash]
      );

      console.log('Compte admin cree avec succes (ID:', result.rows[0].id, ')');
      console.log('   Email:', ADMIN_EMAIL);
    } else {
      console.log('Compte admin trouve (ID:', existingAdmin.id, ')');

      if (!existingAdmin.is_admin) {
        await pool.query('UPDATE users SET is_admin = TRUE WHERE email = $1', [ADMIN_EMAIL]);
        console.log('Privileges admin restaures pour:', ADMIN_EMAIL);
      }

      console.log('Reinitialisation du mot de passe admin...');
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);
      await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, ADMIN_EMAIL]);
      console.log('Mot de passe admin reinitialise');
      console.log('   Email:', ADMIN_EMAIL);
    }

    // Verification finale
    const finalCheck = await pool.query('SELECT id, email, is_admin FROM users WHERE email = $1', [ADMIN_EMAIL]);
    if (!finalCheck.rows[0] || !finalCheck.rows[0].is_admin) {
      console.error('ERREUR CRITIQUE: Le compte admin n\'existe pas ou n\'a pas les privileges admin!');
      process.exit(1);
    }

  } catch (e) {
    console.error('ERREUR CRITIQUE lors de la creation du compte admin:', e.message);
    console.error('Stack:', e.stack);
    process.exit(1);
  }

  // Gerer le JWT_SECRET de maniere persistante
  console.log('Verification du JWT_SECRET...');
  try {
    const { rows } = await pool.query('SELECT value FROM config WHERE key = $1', ['JWT_SECRET']);
    const configRow = rows[0];

    if (process.env.JWT_SECRET) {
      const JWT_SECRET = process.env.JWT_SECRET;
      console.log('JWT_SECRET trouve dans les variables d\'environnement');

      if (!configRow) {
        await pool.query('INSERT INTO config (key, value) VALUES ($1, $2)', ['JWT_SECRET', JWT_SECRET]);
        console.log('JWT_SECRET sauvegarde dans la base de donnees');
      } else if (configRow.value !== JWT_SECRET) {
        await pool.query('UPDATE config SET value = $1, updated_at = NOW() WHERE key = $2', [JWT_SECRET, 'JWT_SECRET']);
        console.log('JWT_SECRET mis a jour dans la base de donnees');
      }
    } else if (configRow) {
      process.env.JWT_SECRET = configRow.value;
      console.log('JWT_SECRET recupere depuis la base de donnees');
    } else {
      console.log('Aucun JWT_SECRET trouve, generation d\'un nouveau...');
      const newSecret = crypto.randomBytes(64).toString('hex');
      process.env.JWT_SECRET = newSecret;

      await pool.query('INSERT INTO config (key, value) VALUES ($1, $2)', ['JWT_SECRET', newSecret]);
      console.log('JWT_SECRET genere et stocke dans la base de donnees');
      console.warn('Tous les utilisateurs devront se reconnecter');
    }

  } catch (e) {
    console.error('ERREUR lors de la gestion du JWT_SECRET:', e.message);
    console.error('Stack:', e.stack);
    process.exit(1);
  }

  console.log('Database initialized successfully');
}

export { initDb };
export default pool;
