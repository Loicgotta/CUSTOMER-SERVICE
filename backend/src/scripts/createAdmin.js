import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

const { Pool } = pg;

// Charger les variables d'environnement
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Créer le compte admin à partir des variables d'environnement
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = 'Admin';

if (!ADMIN_PASSWORD) {
  console.error('❌ ERREUR : La variable d\'environnement ADMIN_PASSWORD n\'est pas définie !');
  console.error('   Veuillez créer un fichier .env avec ADMIN_EMAIL et ADMIN_PASSWORD');
  process.exit(1);
}

try {
  // Vérifier si l'admin existe déjà
  const existingAdminResult = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
  const existingAdmin = existingAdminResult.rows[0];

  if (existingAdmin) {
    console.log('✅ Le compte admin existe déjà (ID:', existingAdmin.id, ')');
  } else {
    // Créer le hash du mot de passe
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);

    // Insérer l'admin
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, is_admin, last_activity)
       VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
       RETURNING id`,
      [ADMIN_EMAIL, passwordHash, ADMIN_NAME]
    );

    console.log('✅ Compte admin créé avec succès (ID:', result.rows[0].id, ')');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Mot de passe: [masqué]');
  }
} catch (error) {
  console.error('❌ Erreur lors de la création du compte admin:', error.message);
  process.exit(1);
}

await pool.end();
