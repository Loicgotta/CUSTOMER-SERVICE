import pool from '../database/db.js';
import bcrypt from 'bcryptjs';

class User {
  static async create({ email, password, name }) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3) RETURNING id`,
      [email, passwordHash, name]
    );
    return result.rows[0].id;
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT id, email, name, created_at, is_admin FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  static async findAll() {
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static verifyPassword(plainPassword, hash) {
    return bcrypt.compareSync(plainPassword, hash);
  }

  static async update(id, { email, name }) {
    const result = await pool.query(
      `UPDATE users SET email = $1, name = $2 WHERE id = $3`,
      [email, name, id]
    );
    return result;
  }

  static async updatePassword(id, newPassword) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    const result = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, id]
    );
    return result;
  }

  static async delete(id) {
    // Recuperer tous les agents de l'utilisateur
    const agentsResult = await pool.query('SELECT id FROM agents WHERE user_id = $1', [id]);

    // Pour chaque agent, supprimer ses conversations et embeddings
    for (const agent of agentsResult.rows) {
      await pool.query('DELETE FROM conversations WHERE agent_id = $1', [agent.id]);
      await pool.query('DELETE FROM embeddings WHERE agent_id = $1', [agent.id]);
    }

    // Supprimer les agents
    await pool.query('DELETE FROM agents WHERE user_id = $1', [id]);

    // Supprimer l'utilisateur
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return result;
  }

  static async updateActivity(userId) {
    const result = await pool.query(
      `UPDATE users SET last_activity = NOW() WHERE id = $1`,
      [userId]
    );
    return result;
  }

  static async getLastActivity(userId) {
    const result = await pool.query('SELECT last_activity FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.last_activity;
  }
}

export default User;
