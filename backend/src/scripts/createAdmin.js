import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Creer le compte admin a partir des variables d'environnement
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = 'Admin';

if (!ADMIN_PASSWORD) {
  console.error('ERREUR : La variable d\'environnement ADMIN_PASSWORD n\'est pas definie !');
  console.error('   Veuillez creer un fichier .env avec ADMIN_EMAIL et ADMIN_PASSWORD');
  process.exit(1);
}

try {
  // Verifier si l'admin existe deja
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);

  if (rows[0]) {
    console.log('Le compte admin existe deja (ID:', rows[0].id, ')');
  } else {
    // Creer le hash du mot de passe
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);

    // Inserer l'admin
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, is_admin, last_activity)
       VALUES ($1, $2, $3, TRUE, NOW()) RETURNING id`,
      [ADMIN_EMAIL, passwordHash, ADMIN_NAME]
    );

    console.log('Compte admin cree avec succes (ID:', result.rows[0].id, ')');
    console.log('Email:', ADMIN_EMAIL);
    console.log('Mot de passe: [masque]');
  }
} catch (error) {
  console.error('Erreur lors de la creation du compte admin:', error.message);
  process.exit(1);
}

await pool.end();
