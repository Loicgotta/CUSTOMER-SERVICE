import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Pool } = pg;

// Connexion PostgreSQL via DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.PG_POOL_MAX || '5', 10),           // max connexions par instance (défaut 5, safe pour scaling)
  idleTimeoutMillis: 30000,         // fermer les connexions idle après 30s
  connectionTimeoutMillis: 5000     // timeout si pas de connexion dispo après 5s
});

// Fonction d'initialisation asynchrone de la base de données
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Créer les tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER NOT NULL REFERENCES agents(id),
        session_id TEXT NOT NULL,
        user_message TEXT NOT NULL,
        bot_response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS embeddings (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER NOT NULL REFERENCES agents(id),
        chunk_text TEXT NOT NULL,
        embedding TEXT NOT NULL,
        document_name TEXT DEFAULT 'Documentation',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS daily_reports (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER NOT NULL REFERENCES agents(id),
        report_date DATE NOT NULL,
        report_content TEXT NOT NULL,
        sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Créer le compte admin automatiquement au démarrage
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    console.log('🔐 Vérification du compte administrateur...');

    const existingAdminResult = await client.query(
      'SELECT id, email, is_admin FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );
    const existingAdmin = existingAdminResult.rows[0];

    if (!ADMIN_PASSWORD) {
      if (existingAdmin) {
        console.warn('⚠️  ADMIN_PASSWORD non défini : le mot de passe admin ne sera pas mis à jour.');
        console.warn('   Ajoutez ADMIN_EMAIL et ADMIN_PASSWORD dans les variables d\'environnement Render.');
      } else {
        console.error('❌ ERREUR : ADMIN_PASSWORD non défini et aucun compte admin existant.');
        console.error('   Ajoutez ADMIN_EMAIL et ADMIN_PASSWORD dans les variables d\'environnement Render.');
        process.exit(1);
      }
    } else if (!existingAdmin) {
      console.log('📝 Création du compte admin...');
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);

      const result = await client.query(
        `INSERT INTO users (email, password_hash, name, is_admin, last_activity)
         VALUES ($1, $2, 'Admin', TRUE, CURRENT_TIMESTAMP)
         RETURNING id`,
        [ADMIN_EMAIL, passwordHash]
      );

      console.log('✅ Compte admin créé avec succès (ID:', result.rows[0].id, ')');
      console.log('   Email:', ADMIN_EMAIL);
    } else {
      console.log('✅ Compte admin trouvé (ID:', existingAdmin.id, ')');

      if (!existingAdmin.is_admin) {
        await client.query('UPDATE users SET is_admin = TRUE WHERE email = $1', [ADMIN_EMAIL]);
        console.log('🔄 Privilèges admin restaurés pour:', ADMIN_EMAIL);
      }

      console.log('🔄 Réinitialisation du mot de passe admin...');
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);
      await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, ADMIN_EMAIL]);
      console.log('✅ Mot de passe admin réinitialisé');
      console.log('   Email:', ADMIN_EMAIL);
    }

    // Vérification finale
    const finalCheckResult = await client.query(
      'SELECT id, email, is_admin FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );
    const finalCheck = finalCheckResult.rows[0];
    if (!finalCheck || !finalCheck.is_admin) {
      console.error('❌ ERREUR CRITIQUE: Le compte admin n\'existe pas ou n\'a pas les privilèges admin!');
      process.exit(1);
    }

    // Gérer le JWT_SECRET de manière persistante
    console.log('🔑 Vérification du JWT_SECRET...');
    let JWT_SECRET;

    const configResult = await client.query('SELECT value FROM config WHERE key = $1', ['JWT_SECRET']);
    const configRow = configResult.rows[0];

    if (process.env.JWT_SECRET) {
      JWT_SECRET = process.env.JWT_SECRET;
      console.log('✅ JWT_SECRET trouvé dans les variables d\'environnement');

      if (!configRow) {
        await client.query('INSERT INTO config (key, value) VALUES ($1, $2)', ['JWT_SECRET', JWT_SECRET]);
        console.log('📝 JWT_SECRET sauvegardé dans la base de données');
      } else if (configRow.value !== JWT_SECRET) {
        await client.query('UPDATE config SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2', [JWT_SECRET, 'JWT_SECRET']);
        console.log('🔄 JWT_SECRET mis à jour dans la base de données');
      }
    } else if (configRow) {
      JWT_SECRET = configRow.value;
      process.env.JWT_SECRET = JWT_SECRET;
      console.log('✅ JWT_SECRET récupéré depuis la base de données');
    } else {
      console.log('📝 Aucun JWT_SECRET trouvé, génération d\'un nouveau...');
      JWT_SECRET = crypto.randomBytes(64).toString('hex');
      process.env.JWT_SECRET = JWT_SECRET;

      await client.query('INSERT INTO config (key, value) VALUES ($1, $2)', ['JWT_SECRET', JWT_SECRET]);
      console.log('✅ JWT_SECRET généré et stocké dans la base de données');
      console.log('⚠️  Tous les utilisateurs devront se reconnecter');
    }

    console.log('Database initialized successfully');
  } catch (e) {
    console.error('❌ ERREUR CRITIQUE lors de l\'initialisation de la base de données:', e.message);
    console.error('Stack:', e.stack);
    process.exit(1);
  } finally {
    client.release();
  }
}

export { pool, initializeDatabase };
export default pool;
