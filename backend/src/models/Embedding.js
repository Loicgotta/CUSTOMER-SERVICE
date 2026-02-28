import pool from '../database/db.js';

class Embedding {
  static async create({ agentId, chunkText, embedding, documentName }) {
    const result = await pool.query(
      `INSERT INTO embeddings (agent_id, chunk_text, embedding, document_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [agentId, chunkText, JSON.stringify(embedding), documentName || 'Documentation']
    );
    return result.rows[0].id;
  }

  static async findByAgentId(agentId, documentName = null) {
    let result;
    if (documentName) {
      result = await pool.query(
        `SELECT * FROM embeddings
         WHERE agent_id = $1 AND document_name = $2`,
        [agentId, documentName]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM embeddings
         WHERE agent_id = $1`,
        [agentId]
      );
    }
    return result.rows.map(row => ({
      ...row,
      embedding: JSON.parse(row.embedding)
    }));
  }

  static async deleteByAgentId(agentId) {
    const result = await pool.query(
      'DELETE FROM embeddings WHERE agent_id = $1',
      [agentId]
    );
    return result;
  }

  static async getDocumentNames(agentId) {
    const result = await pool.query(
      `SELECT DISTINCT document_name FROM embeddings
       WHERE agent_id = $1
       ORDER BY document_name`,
      [agentId]
    );
    return result.rows.map(row => row.document_name);
  }
}

export default Embedding;
