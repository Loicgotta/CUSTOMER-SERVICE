import pool from '../database/db.js';

class Conversation {
  static async create({ agentId, sessionId, userMessage, botResponse }) {
    const result = await pool.query(
      `INSERT INTO conversations (agent_id, session_id, user_message, bot_response)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [agentId, sessionId, userMessage, botResponse]
    );
    return result.rows[0].id;
  }

  static async findByAgentId(agentId, limit = null) {
    if (limit) {
      const result = await pool.query(
        `SELECT * FROM conversations
         WHERE agent_id = $1
         ORDER BY created_at ASC
         LIMIT $2`,
        [agentId, limit]
      );
      return result.rows;
    }
    const result = await pool.query(
      `SELECT * FROM conversations
       WHERE agent_id = $1
       ORDER BY created_at ASC`,
      [agentId]
    );
    return result.rows;
  }

  static async findByAgentIdAndDateRange(agentId, startDate, endDate) {
    const result = await pool.query(
      `SELECT * FROM conversations
       WHERE agent_id = $1
       AND DATE(created_at) >= DATE($2)
       AND DATE(created_at) <= DATE($3)
       ORDER BY created_at ASC`,
      [agentId, startDate, endDate]
    );
    return result.rows;
  }

  static async findBySessionId(sessionId) {
    const result = await pool.query(
      `SELECT * FROM conversations
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return result.rows;
  }

  static async findTodayConversations(agentId) {
    const result = await pool.query(
      `SELECT * FROM conversations
       WHERE agent_id = $1
       AND DATE(created_at) = CURRENT_DATE
       ORDER BY created_at ASC`,
      [agentId]
    );
    return result.rows;
  }

  static async deleteByAgentId(agentId) {
    const result = await pool.query(
      'DELETE FROM conversations WHERE agent_id = $1',
      [agentId]
    );
    return result;
  }
}

export default Conversation;
