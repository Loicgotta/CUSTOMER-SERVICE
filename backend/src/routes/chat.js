import express from 'express';
import ChatService from '../services/chatService.js';
import Conversation from '../models/Conversation.js';
import db from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Envoyer un message au chatbot
router.post('/message', async (req, res) => {
  try {
    const { agentId, sessionId, message } = req.body;

    if (!agentId || !message) {
      return res.status(400).json({ error: 'agentId et message sont requis' });
    }

    // Générer un sessionId si non fourni
    const actualSessionId = sessionId || uuidv4();

    // Traiter le message
    const response = await ChatService.processMessage(agentId, actualSessionId, message);

    res.json({
      sessionId: actualSessionId,
      response
    });
  } catch (error) {
    // erreur interne, pas de stack exposée au client
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer l'historique d'une session
router.get('/history/:sessionId', (req, res) => {
  try {
    const conversations = Conversation.findBySessionId(req.params.sessionId);
    res.json(conversations);
  } catch (error) {
    // erreur interne
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer toutes les conversations d'un agent (protégé : propriétaire uniquement)
router.get('/agent/:agentId', authenticateToken, (req, res) => {
  try {
    const agentId = req.params.agentId;

    // Vérifier que l'agent appartient à l'utilisateur connecté
    const agent = db.prepare('SELECT user_id FROM agents WHERE id = ?').get(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent introuvable' });
    }
    if (agent.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const conversations = Conversation.findByAgentId(agentId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
