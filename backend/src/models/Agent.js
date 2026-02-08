import db from '../database/db.js';

class Agent {
  static create({ userId, prompt, documentation, email, color }) {
    const stmt = db.prepare(`
      INSERT INTO agents (user_id, prompt, documentation, email, widget_color)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, prompt, documentation, email, color || '#667eea');
    return result.lastInsertRowid;
  }

  static findById(id, userId = null) {
    if (userId) {
      const stmt = db.prepare('SELECT * FROM agents WHERE id = ? AND user_id = ?');
      return stmt.get(id, userId);
    }
    const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
    return stmt.get(id);
  }

  static findAll(userId = null) {
    if (userId) {
      const stmt = db.prepare('SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC');
      return stmt.all(userId);
    }
    const stmt = db.prepare('SELECT * FROM agents ORDER BY created_at DESC');
    return stmt.all();
  }

  static update(id, { prompt, documentation, email, color }, userId = null) {
    if (userId) {
      const stmt = db.prepare(`
        UPDATE agents
        SET prompt = ?, documentation = ?, email = ?, widget_color = ?
        WHERE id = ? AND user_id = ?
      `);
      return stmt.run(prompt, documentation, email, color || '#667eea', id, userId);
    }
    const stmt = db.prepare(`
      UPDATE agents
      SET prompt = ?, documentation = ?, email = ?, widget_color = ?
      WHERE id = ?
    `);
    return stmt.run(prompt, documentation, email, color || '#667eea', id);
  }

  static delete(id, userId = null) {
    if (userId) {
      const stmt = db.prepare('DELETE FROM agents WHERE id = ? AND user_id = ?');
      return stmt.run(id, userId);
    }
    const stmt = db.prepare('DELETE FROM agents WHERE id = ?');
    return stmt.run(id);
  }
}

export default Agent;
