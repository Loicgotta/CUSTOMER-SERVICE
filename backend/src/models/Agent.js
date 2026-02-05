import db from '../database/db.js';

class Agent {
  static create({ prompt, documentation, email, color }) {
    const stmt = db.prepare(`
      INSERT INTO agents (prompt, documentation, email, widget_color)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(prompt, documentation, email, color || '#667eea');
    return result.lastInsertRowid;
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
    return stmt.get(id);
  }

  static findAll() {
    const stmt = db.prepare('SELECT * FROM agents ORDER BY created_at DESC');
    return stmt.all();
  }

  static update(id, { prompt, documentation, email, color }) {
    const stmt = db.prepare(`
      UPDATE agents
      SET prompt = ?, documentation = ?, email = ?, widget_color = ?
      WHERE id = ?
    `);
    return stmt.run(prompt, documentation, email, color || '#667eea', id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM agents WHERE id = ?');
    return stmt.run(id);
  }
}

export default Agent;
