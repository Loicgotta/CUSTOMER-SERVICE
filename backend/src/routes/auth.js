import express from 'express';
import User from '../models/User.js';
import pool from '../database/db.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register - Inscription d'un nouvel utilisateur
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, mot de passe et nom sont requis' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Format d\'email invalide' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caracteres' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Le nom doit contenir au moins 2 caracteres' });
    }

    // Anti-enumeration : meme message si l'email existe deja
    const existingUser = await User.findByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Impossible de creer ce compte. Verifiez les informations saisies.' });
    }

    // Creer l'utilisateur
    const userId = await User.create({ email: email.toLowerCase(), password, name: name.trim() });

    // Mettre a jour last_activity a la creation
    await User.updateActivity(userId);

    // Generer un token
    const token = generateToken(userId, email.toLowerCase());

    // Recuperer l'utilisateur cree (sans le mot de passe)
    const user = await User.findById(userId);

    res.status(201).json({
      message: 'Inscription reussie',
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
  }
});

// POST /api/auth/login - Connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Trouver l'utilisateur
    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Verifier le mot de passe
    const isValidPassword = User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Mettre a jour last_activity a la connexion
    await User.updateActivity(user.id);

    // Generer un token
    const token = generateToken(user.id, user.email);

    // Retourner l'utilisateur sans le mot de passe
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      message: 'Connexion reussie',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
});

// GET /api/auth/me - Recuperer les informations de l'utilisateur connecte
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouve' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/logout - Deconnexion (cote client, suppression du token)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Deconnexion reussie' });
});

// DELETE /api/auth/account - Droit a l'oubli (RGPD Art. 17)
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Verifier que l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouve' });
    }

    // Empecher la suppression du compte admin
    if (user.is_admin) {
      return res.status(403).json({ error: 'Le compte administrateur ne peut pas etre supprime via cette route.' });
    }

    // Supprimer toutes les donnees liees
    await User.delete(userId);

    res.json({ message: 'Compte et donnees associees supprimes definitivement.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du compte' });
  }
});

// GET /api/auth/export - Export des donnees personnelles (RGPD Art. 20)
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouve' });
    }

    // Recuperer tous les agents de l'utilisateur
    const agentsResult = await pool.query(
      'SELECT id, email, prompt, documentation, widget_color, created_at FROM agents WHERE user_id = $1',
      [userId]
    );

    // Recuperer les conversations pour chaque agent
    const agentsWithConversations = [];
    for (const agent of agentsResult.rows) {
      const convsResult = await pool.query(
        'SELECT session_id, user_message, bot_response, created_at FROM conversations WHERE agent_id = $1 ORDER BY created_at ASC',
        [agent.id]
      );
      agentsWithConversations.push({ ...agent, conversations: convsResult.rows });
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      },
      agents: agentsWithConversations
    };

    res.setHeader('Content-Disposition', 'attachment; filename="mes-donnees.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors de l\'export des donnees' });
  }
});

export default router;
