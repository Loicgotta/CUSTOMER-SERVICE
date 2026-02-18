import express from 'express';
import db from '../database/db.js';

const router = express.Router();

// Middleware : vérifier que l'utilisateur est admin
export const requireAdmin = (req, res, next) => {
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.userId);
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Accès refusé. Droits administrateur requis.' });
  }
  next();
};

// GET /api/admin/users — Tous les utilisateurs avec leurs agents
router.get('/users', requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT
        u.id, u.email, u.name, u.created_at, u.last_activity, u.is_admin,
        COUNT(a.id) as agent_count
      FROM users u
      LEFT JOIN agents a ON a.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    // Pour chaque utilisateur, récupérer ses agents
    const usersWithAgents = users.map(user => {
      const agents = db.prepare(`
        SELECT id, prompt, email, widget_color, created_at,
          (SELECT COUNT(*) FROM conversations c WHERE c.agent_id = agents.id) as conversation_count,
          (SELECT COUNT(*) FROM embeddings e WHERE e.agent_id = agents.id) as embedding_count
        FROM agents
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(user.id);

      return { ...user, agents };
    });

    res.json({ users: usersWithAgents });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// GET /api/admin/stats — Statistiques globales
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').get().count,
      agents: db.prepare('SELECT COUNT(*) as count FROM agents').get().count,
      conversations: db.prepare('SELECT COUNT(*) as count FROM conversations').get().count,
      embeddings: db.prepare('SELECT COUNT(*) as count FROM embeddings').get().count,
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

export default router;
