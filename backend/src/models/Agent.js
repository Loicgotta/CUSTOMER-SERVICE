import pool from '../database/db.js';

class Agent {
  static async create({ userId, name, prompt, documentation, email, color }) {
    const result = await pool.query(
      `INSERT INTO agents (user_id, name, prompt, documentation, email, widget_color)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, name || null, prompt, documentation, email, color || '#667eea']
    );
    return result.rows[0].id;
  }

  static async findById(id, userId = null) {
    if (userId) {
      const result = await pool.query('SELECT * FROM agents WHERE id = $1 AND user_id = $2', [id, userId]);
      return result.rows[0] || null;
    }
    const result = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findAll(userId = null) {
    if (userId) {
      const result = await pool.query('SELECT * FROM agents WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return result.rows;
    }
    const result = await pool.query('SELECT * FROM agents ORDER BY created_at DESC');
    return result.rows;
  }

  static async update(id, { name, prompt, documentation, email, color }, userId = null) {
    if (userId) {
      const result = await pool.query(
        `UPDATE agents
         SET name = $1, prompt = $2, documentation = $3, email = $4, widget_color = $5
         WHERE id = $6 AND user_id = $7`,
        [name || null, prompt, documentation, email, color || '#667eea', id, userId]
      );
      return result;
    }
    const result = await pool.query(
      `UPDATE agents
       SET name = $1, prompt = $2, documentation = $3, email = $4, widget_color = $5
       WHERE id = $6`,
      [name || null, prompt, documentation, email, color || '#667eea', id]
    );
    return result;
  }

  static async delete(id, userId = null) {
    if (userId) {
      const result = await pool.query('DELETE FROM agents WHERE id = $1 AND user_id = $2', [id, userId]);
      return result;
    }
    const result = await pool.query('DELETE FROM agents WHERE id = $1', [id]);
    return result;
  }
}

export default Agent;
