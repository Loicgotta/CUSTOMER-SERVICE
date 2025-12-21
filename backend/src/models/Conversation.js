import db from '../database/db.js';

class Conversation {
  static create({ agentId, sessionId, userMessage, botResponse }) {
    const stmt = db.prepare(`
      INSERT INTO conversations (agent_id, session_id, user_message, bot_response)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(agentId, sessionId, userMessage, botResponse);
    return result.lastInsertRowid;
  }

  static findByAgentId(agentId, limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM conversations
      WHERE agent_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(agentId, limit);
  }

  static findBySessionId(sessionId) {
    const stmt = db.prepare(`
      SELECT * FROM conversations
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(sessionId);
  }

  static findTodayConversations(agentId) {
    const stmt = db.prepare(`
      SELECT * FROM conversations
      WHERE agent_id = ?
      AND DATE(created_at) = DATE('now')
      ORDER BY created_at ASC
    `);
    return stmt.all(agentId);
  }

  static deleteByAgentId(agentId) {
    const stmt = db.prepare('DELETE FROM conversations WHERE agent_id = ?');
    return stmt.run(agentId);
  }
}

export default Conversation;
