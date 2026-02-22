import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, '../../data/chatbot.db'));

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
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);

  if (existingAdmin) {
    console.log('✅ Le compte admin existe déjà (ID:', existingAdmin.id, ')');
  } else {
    // Créer le hash du mot de passe
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);

    // Insérer l'admin
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, name, is_admin, last_activity)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(ADMIN_EMAIL, passwordHash, ADMIN_NAME);
    console.log('✅ Compte admin créé avec succès (ID:', result.lastInsertRowid, ')');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Mot de passe: [masqué]');
  }
} catch (error) {
  console.error('❌ Erreur lors de la création du compte admin:', error.message);
  process.exit(1);
}

db.close();
