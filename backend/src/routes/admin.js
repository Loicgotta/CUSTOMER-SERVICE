import express from 'express';
import db from '../database/db.js';
import User from '../models/User.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

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

// DELETE /api/admin/users/:id — Supprimer un utilisateur
router.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Vérifier que l'utilisateur existe
    const user = User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Empêcher la suppression du compte admin connecté
    if (userId === req.user.userId) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer votre propre compte admin.' });
    }

    // Empêcher la suppression d'un autre compte admin
    if (user.is_admin) {
      return res.status(403).json({ error: 'Impossible de supprimer un autre compte administrateur.' });
    }

    // Supprimer l'utilisateur (CASCADE supprimera automatiquement agents → conversations + embeddings)
    User.delete(userId);

    res.json({
      message: 'Utilisateur et toutes ses données supprimés avec succès',
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
