import db from '../database/db.js';
import bcrypt from 'bcryptjs';

class User {
  static create({ email, password, name }) {
    // Hasher le mot de passe
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, name)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(email, passwordHash, name);
    return result.lastInsertRowid;
  }

  static findById(id) {
    const stmt = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  static findAll() {
    const stmt = db.prepare('SELECT id, email, name, created_at FROM users ORDER BY created_at DESC');
    return stmt.all();
  }

  static verifyPassword(plainPassword, hash) {
    return bcrypt.compareSync(plainPassword, hash);
  }

  static update(id, { email, name }) {
    const stmt = db.prepare(`
      UPDATE users
      SET email = ?, name = ?
      WHERE id = ?
    `);
    return stmt.run(email, name, id);
  }

  static updatePassword(id, newPassword) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    const stmt = db.prepare(`
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
    `);
    return stmt.run(passwordHash, id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  }

  static updateActivity(userId) {
    const stmt = db.prepare(`
      UPDATE users
      SET last_activity = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(userId);
  }

  static getLastActivity(userId) {
    const stmt = db.prepare('SELECT last_activity FROM users WHERE id = ?');
    const result = stmt.get(userId);
    return result?.last_activity;
  }
}

export default User;
