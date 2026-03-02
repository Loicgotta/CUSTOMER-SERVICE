import express from 'express';
import pool from '../database/db.js';
import User from '../models/User.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/admin/users — Tous les utilisateurs avec leurs agents
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const usersResult = await pool.query(`
      SELECT
        u.id, u.email, u.name, u.created_at, u.last_activity, u.is_admin,
        COUNT(a.id) as agent_count
      FROM users u
      LEFT JOIN agents a ON a.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    // Pour chaque utilisateur, recuperer ses agents
    const usersWithAgents = [];
    for (const user of usersResult.rows) {
      const agentsResult = await pool.query(`
        SELECT id, prompt, email, widget_color, created_at,
          (SELECT COUNT(*) FROM conversations c WHERE c.agent_id = agents.id) as conversation_count,
          (SELECT COUNT(*) FROM embeddings e WHERE e.agent_id = agents.id) as embedding_count
        FROM agents
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [user.id]);

      usersWithAgents.push({ ...user, agents: agentsResult.rows });
    }

    res.json({ users: usersWithAgents });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// GET /api/admin/stats — Statistiques globales
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [users, agents, conversations, embeddings] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users WHERE is_admin = FALSE'),
      pool.query('SELECT COUNT(*) as count FROM agents'),
      pool.query('SELECT COUNT(*) as count FROM conversations'),
      pool.query('SELECT COUNT(*) as count FROM embeddings'),
    ]);

    const stats = {
      users: parseInt(users.rows[0].count),
      agents: parseInt(agents.rows[0].count),
      conversations: parseInt(conversations.rows[0].count),
      embeddings: parseInt(embeddings.rows[0].count),
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// DELETE /api/admin/users/:id — Supprimer un utilisateur
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Verifier que l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouve' });
    }

    // Empecher la suppression du compte admin connecte
    if (userId === req.user.userId) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer votre propre compte admin.' });
    }

    // Empecher la suppression d'un autre compte admin
    if (user.is_admin) {
      return res.status(403).json({ error: 'Impossible de supprimer un autre compte administrateur.' });
    }

    // Supprimer l'utilisateur (CASCADE)
    await User.delete(userId);

    res.json({
      message: 'Utilisateur et toutes ses donnees supprimes avec succes',
      deletedUser: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'utilisateur' });
  }
});

export default router;
