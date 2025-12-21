import db from '../database/db.js';

class Embedding {
  static create({ agentId, chunkText, embedding }) {
    const stmt = db.prepare(`
      INSERT INTO embeddings (agent_id, chunk_text, embedding)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(agentId, chunkText, JSON.stringify(embedding));
    return result.lastInsertRowid;
  }

  static findByAgentId(agentId) {
    const stmt = db.prepare(`
      SELECT * FROM embeddings
      WHERE agent_id = ?
    `);
    const results = stmt.all(agentId);
    return results.map(row => ({
      ...row,
      embedding: JSON.parse(row.embedding)
    }));
  }

  static deleteByAgentId(agentId) {
    const stmt = db.prepare('DELETE FROM embeddings WHERE agent_id = ?');
    return stmt.run(agentId);
  }
}

export default Embedding;
