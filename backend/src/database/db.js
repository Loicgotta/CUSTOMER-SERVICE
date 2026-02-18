import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin de la base de données :
// - En production (Render) : DATABASE_PATH pointe vers /data/chatbot.db (Persistent Disk)
// - En local : utilise le dossier backend/data/chatbot.db
let dbPath;
if (process.env.DATABASE_PATH) {
  // Production : chemin explicite vers le Persistent Disk
  dbPath = process.env.DATABASE_PATH;
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('Persistent data directory created:', dbDir);
  }
} else {
  // Local : dossier data dans le projet
  const dataDir = path.join(__dirname, '../../data');
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

// Créer le compte admin automatiquement au démarrage si il n'existe pas
const ADMIN_EMAIL = 'Chenrigtta@gmail.com';
const ADMIN_PASSWORD = 'Loic3192';
try {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);
    db.prepare(`
      INSERT INTO users (email, password_hash, name, is_admin, last_activity)
      VALUES (?, ?, 'Admin', 1, CURRENT_TIMESTAMP)
    `).run(ADMIN_EMAIL, passwordHash);
    console.log('Compte admin créé automatiquement');
  } else {
    // S'assurer que le compte existant est bien marqué admin
    db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(ADMIN_EMAIL);
  }
} catch (e) {
  console.error('Erreur création compte admin:', e.message);
}

console.log('Database initialized successfully');

export default db;
