import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, '../../data/chatbot.db'));

// Créer le compte admin
const ADMIN_EMAIL = 'Chenrigtta@gmail.com';
const ADMIN_PASSWORD = 'Loic3192';
const ADMIN_NAME = 'Admin';

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
