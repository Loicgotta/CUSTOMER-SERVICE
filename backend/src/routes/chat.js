import express from 'express';
import rateLimit from 'express-rate-limit';
import ChatService from '../services/chatService.js';
import Conversation from '../models/Conversation.js';
import pool from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting : 20 messages par minute par IP (anti-spam / anti-cout OpenAI)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Trop de messages envoyes. Attendez une minute avant de reessayer.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting strict pour l'historique (anti enumeration de sessionIds)
const historyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Maximum 10 requetes par minute
  message: { error: 'Trop de requetes. Veuillez patienter.' },
  standardHeaders: true,
  legacyHeaders: false
});

const MAX_MESSAGE_LENGTH = 2000;

// Envoyer un message au chatbot
router.post('/message', chatLimiter, async (req, res) => {
  try {
    const { agentId, sessionId, message } = req.body;

    if (!agentId || !message) {
      return res.status(400).json({ error: 'agentId et message sont requis' });
    }

    const trimmed = String(message).trim();
    if (trimmed.length === 0) {
      return res.status(400).json({ error: 'Le message ne peut pas etre vide' });
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message trop long (max ${MAX_MESSAGE_LENGTH} caracteres)` });
    }

    // Generer un sessionId si non fourni
    const actualSessionId = sessionId || uuidv4();

    // Traiter le message (version nettoyee)
    const response = await ChatService.processMessage(agentId, actualSessionId, trimmed);

    res.json({
      sessionId: actualSessionId,
      response
    });
  } catch (error) {
    // erreur interne, pas de stack exposee au client
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Recuperer l'historique d'une session (rate limited pour securite)
router.get('/history/:sessionId', historyLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Validation basique du format UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return res.status(400).json({ error: 'Format de session invalide' });
    }

    const conversations = await Conversation.findBySessionId(sessionId);

    // Ne pas reveler si la session existe ou non (anti-enumeration)
    res.json(conversations || []);
  } catch (error) {
    // erreur interne
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Recuperer toutes les conversations d'un agent (protege : proprietaire uniquement)
router.get('/agent/:agentId', authenticateToken, async (req, res) => {
  try {
    const agentId = req.params.agentId;

    // Verifier que l'agent appartient a l'utilisateur connecte
    const agentResult = await pool.query('SELECT user_id FROM agents WHERE id = $1', [agentId]);
    const agent = agentResult.rows[0];
    if (!agent) {
      return res.status(404).json({ error: 'Agent introuvable' });
    }
    if (agent.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Acces refuse' });
    }

    const conversations = await Conversation.findByAgentId(agentId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
