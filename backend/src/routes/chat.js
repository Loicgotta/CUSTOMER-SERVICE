import express from 'express';
import ChatService from '../services/chatService.js';
import Conversation from '../models/Conversation.js';
import { v4 as uuidv4 } from 'uuid';

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
    console.error('Erreur lors du traitement du message:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// Récupérer l'historique d'une session
router.get('/history/:sessionId', (req, res) => {
  try {
    const conversations = Conversation.findBySessionId(req.params.sessionId);
    res.json(conversations);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer toutes les conversations d'un agent
router.get('/agent/:agentId', (req, res) => {
  try {
    const conversations = Conversation.findByAgentId(req.params.agentId);
    res.json(conversations);
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
