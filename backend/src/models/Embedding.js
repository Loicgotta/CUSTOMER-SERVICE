import db from '../database/db.js';

class Embedding {
  static create({ agentId, chunkText, embedding, documentName }) {
    const stmt = db.prepare(`
      INSERT INTO embeddings (agent_id, chunk_text, embedding, document_name)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(agentId, chunkText, JSON.stringify(embedding), documentName || 'Documentation');
    return result.lastInsertRowid;
  }

  static findByAgentId(agentId, documentName = null) {
    let stmt;
    let results;
    if (documentName) {
      stmt = db.prepare(`
        SELECT * FROM embeddings
        WHERE agent_id = ? AND document_name = ?
      `);
      results = stmt.all(agentId, documentName);
    } else {
      stmt = db.prepare(`
        SELECT * FROM embeddings
        WHERE agent_id = ?
      `);
      results = stmt.all(agentId);
    }
    return results.map(row => ({
      ...row,
      embedding: JSON.parse(row.embedding)
    }));
  }

  static deleteByAgentId(agentId) {
    const stmt = db.prepare('DELETE FROM embeddings WHERE agent_id = ?');
    return stmt.run(agentId);
  }

  static getDocumentNames(agentId) {
    const stmt = db.prepare(`
      SELECT DISTINCT document_name FROM embeddings
      WHERE agent_id = ?
      ORDER BY document_name
    `);
    return stmt.all(agentId).map(row => row.document_name);
  }
}

export default Embedding;
