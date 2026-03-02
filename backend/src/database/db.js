import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin de la base de données :
// - Si DATABASE_PATH est défini : utilise ce chemin (Persistent Disk ou chemin custom)
// - Sinon : utilise le dossier backend/data/chatbot.db (local et Render sans disk)
const dataDir = path.join(__dirname, '../../data');
let dbPath;

if (process.env.DATABASE_PATH) {
  dbPath = process.env.DATABASE_PATH;
  const dbDir = path.dirname(dbPath);
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('Persistent data directory created:', dbDir);
    }
  } catch (err) {
    console.warn('⚠️  Impossible de créer le dossier', dbDir, ':', err.message);
    console.warn('   Utilisation du dossier local backend/data/ à la place.');
    dbPath = null;
  }
}

if (!dbPath) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Data directory created');
  }
  dbPath = path.join(dataDir, 'chatbot.db');
}

console.log('Database path:', dbPath);
const db = new Database(dbPath);

// Créer les tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    prompt TEXT NOT NULL,
    documentation TEXT,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    report_date DATE NOT NULL,
    report_content TEXT NOT NULL,
    sent BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration : ajouter widget_color si absent
try {
  db.exec("ALTER TABLE agents ADD COLUMN widget_color TEXT DEFAULT '#667eea'");
} catch (e) {
  // Colonne déjà existe
}

// Migration : ajouter document_name aux embeddings
try {
  db.exec("ALTER TABLE embeddings ADD COLUMN document_name TEXT DEFAULT 'Documentation'");
} catch (e) {
  // Colonne déjà existe
}

// Migration : ajouter user_id aux agents existants
try {
  db.exec("ALTER TABLE agents ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE");
} catch (e) {
  // Colonne déjà existe
}

// Migration : ajouter last_activity aux users pour gérer l'inactivité
try {
  db.exec("ALTER TABLE users ADD COLUMN last_activity DATETIME DEFAULT CURRENT_TIMESTAMP");
} catch (e) {
  // Colonne déjà existe
}

// Migration : ajouter is_admin pour identifier les administrateurs
try {
  db.exec("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0");
} catch (e) {
  // Colonne déjà existe
}

// Migration : ajouter name aux agents pour personnalisation
try {
  db.exec("ALTER TABLE agents ADD COLUMN name TEXT DEFAULT NULL");
} catch (e) {
  // Colonne déjà existe
}

// Créer le compte admin automatiquement au démarrage si il n'existe pas
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

console.log('🔐 Vérification du compte administrateur...');
try {
  const existingAdmin = db.prepare('SELECT id, email, is_admin FROM users WHERE email = ?').get(ADMIN_EMAIL);

  if (!ADMIN_PASSWORD) {
    // Pas de mot de passe défini : avertissement mais ne pas bloquer si un admin existe déjà
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

    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, is_admin, last_activity)
      VALUES (?, ?, 'Admin', 1, CURRENT_TIMESTAMP)
    `).run(ADMIN_EMAIL, passwordHash);

    console.log('✅ Compte admin créé avec succès (ID:', result.lastInsertRowid, ')');
    console.log('   Email:', ADMIN_EMAIL);
  } else {
    console.log('✅ Compte admin trouvé (ID:', existingAdmin.id, ')');

    // S'assurer que le compte existant est bien marqué admin
    if (!existingAdmin.is_admin) {
      db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(ADMIN_EMAIL);
      console.log('🔄 Privilèges admin restaurés pour:', ADMIN_EMAIL);
    }

    // Réinitialiser le mot de passe admin au démarrage
    console.log('🔄 Réinitialisation du mot de passe admin...');
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, ADMIN_EMAIL);
    console.log('✅ Mot de passe admin réinitialisé');
    console.log('   Email:', ADMIN_EMAIL);
  }

  // Vérification finale
  const finalCheck = db.prepare('SELECT id, email, is_admin FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (!finalCheck || !finalCheck.is_admin) {
    console.error('❌ ERREUR CRITIQUE: Le compte admin n\'existe pas ou n\'a pas les privilèges admin!');
    process.exit(1);
  }

} catch (e) {
  console.error('❌ ERREUR CRITIQUE lors de la création du compte admin:', e.message);
  console.error('Stack:', e.stack);
  process.exit(1); // Arrêter le serveur si le compte admin ne peut pas être créé
}

// Gérer le JWT_SECRET de manière persistante
// Ordre de priorité (pour préserver les anciens tokens) :
// 1. JWT_SECRET dans les variables d'environnement
// 2. JWT_SECRET dans la base de données
// 3. Générer un nouveau JWT_SECRET
console.log('🔑 Vérification du JWT_SECRET...');
let JWT_SECRET;
try {
  const configRow = db.prepare('SELECT value FROM config WHERE key = ?').get('JWT_SECRET');

  if (process.env.JWT_SECRET) {
    // Utiliser le JWT_SECRET des variables d'environnement (priorité 1)
    JWT_SECRET = process.env.JWT_SECRET;
    console.log('✅ JWT_SECRET trouvé dans les variables d\'environnement');

    // Le stocker dans la DB s'il n'y est pas déjà
    if (!configRow) {
      db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run('JWT_SECRET', JWT_SECRET);
      console.log('📝 JWT_SECRET sauvegardé dans la base de données');
    } else if (configRow.value !== JWT_SECRET) {
      // Mettre à jour si différent
      db.prepare('UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(JWT_SECRET, 'JWT_SECRET');
      console.log('🔄 JWT_SECRET mis à jour dans la base de données');
    }
  } else if (configRow) {
    // Utiliser le JWT_SECRET de la base de données (priorité 2)
    JWT_SECRET = configRow.value;
    process.env.JWT_SECRET = JWT_SECRET;
    console.log('✅ JWT_SECRET récupéré depuis la base de données');
  } else {
    // Générer un nouveau JWT_SECRET (priorité 3)
    console.log('📝 Aucun JWT_SECRET trouvé, génération d\'un nouveau...');
    JWT_SECRET = require('crypto').randomBytes(64).toString('hex');
    process.env.JWT_SECRET = JWT_SECRET;

    db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run('JWT_SECRET', JWT_SECRET);
    console.log('✅ JWT_SECRET généré et stocké dans la base de données');
    console.log('⚠️  Tous les utilisateurs devront se reconnecter');
  }

} catch (e) {
  console.error('❌ ERREUR lors de la gestion du JWT_SECRET:', e.message);
  console.error('Stack:', e.stack);
  process.exit(1);
}

console.log('Database initialized successfully');

export default db;
