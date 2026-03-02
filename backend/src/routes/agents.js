import Logger from '../utils/logger.js';
import express from 'express';
import Agent from '../models/Agent.js';
import RAGService from '../services/ragService.js';
import Embedding from '../models/Embedding.js';
import Conversation from '../models/Conversation.js';

const router = express.Router();

// Creer un nouvel agent
router.post('/', async (req, res) => {
  Logger.info('[AGENT] Debut creation d\'agent');

  try {
    const { name, prompt, documentation, documents, email, color } = req.body;
    Logger.info(`[AGENT] User ID: ${req.user.userId}`);
    Logger.info(`[AGENT] Nom: ${name || 'Non defini'}`);
    Logger.info(`[AGENT] Prompt length: ${prompt?.length || 0} caracteres`);
    Logger.info(`[AGENT] Documents: ${documents ? documents.length : 0}`);
    Logger.info(`[AGENT] Couleur: ${color || '#667eea'}`);

    if (!prompt || !email) {
      Logger.info('[AGENT] Prompt ou email manquant');
      return res.status(400).json({ error: 'Prompt et email sont requis' });
    }

    // Creer l'agent lie a l'utilisateur connecte
    Logger.info('[AGENT] Creation de l\'agent dans la DB...');
    const agentId = await Agent.create({
      userId: req.user.userId,
      name,
      prompt,
      documentation: '',
      email,
      color
    });
    Logger.info(`[AGENT] Agent cree avec ID: ${agentId}`);

    // Indexer la documentation si elle existe (nouveau format ou legacy)
    const docsToIndex = documents || (documentation ? [{ name: 'Documentation', content: documentation }] : null);

    if (docsToIndex && docsToIndex.length > 0) {
      Logger.info(`[AGENT] Indexation de ${docsToIndex.length} document(s)...`);
      docsToIndex.forEach((doc, i) => {
        Logger.info(`[AGENT]   Doc ${i + 1}: ${doc.name} (${doc.content?.length || 0} caracteres)`);
      });

      try {
        await RAGService.indexDocumentation(agentId, docsToIndex);
        Logger.info('[AGENT] Indexation terminee avec succes');
      } catch (ragError) {
        Logger.error('[AGENT] Erreur lors de l\'indexation RAG:', ragError);
        Logger.error('[AGENT] Stack:', ragError.stack);
        // L'agent est cree mais la documentation n'est pas indexee
        return res.status(201).json({
          id: agentId,
          message: 'Agent cree mais erreur lors de l\'indexation de la documentation',
          warning: ragError.message,
          agent: await Agent.findById(agentId, req.user.userId)
        });
      }
    } else {
      Logger.info('[AGENT] Aucun document a indexer');
    }

    Logger.info('[AGENT] Agent cree avec succes !');
    res.status(201).json({
      id: agentId,
      message: 'Agent cree avec succes',
      agent: await Agent.findById(agentId, req.user.userId)
    });
  } catch (error) {
    Logger.error('[AGENT] Erreur lors de la creation de l\'agent:', error);
    Logger.error('[AGENT] Stack:', error.stack);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Recuperer tous les agents de l'utilisateur connecte
router.get('/', async (req, res) => {
  try {
    const agents = await Agent.findAll(req.user.userId);
    res.json(agents);
  } catch (error) {
    Logger.error('Erreur lors de la recuperation des agents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Recuperer un agent par ID (seulement si appartient a l'utilisateur)
router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id, req.user.userId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouve ou non autorise' });
    }
    res.json(agent);
  } catch (error) {
    Logger.error('Erreur lors de la recuperation de l\'agent:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Recuperer la liste des documents d'un agent (seulement si appartient a l'utilisateur)
router.get('/:id/documents', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id, req.user.userId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouve ou non autorise' });
    }
    const documentNames = await Embedding.getDocumentNames(req.params.id);
    res.json({ documents: documentNames });
  } catch (error) {
    Logger.error('Erreur lors de la recuperation des documents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre a jour un agent (seulement si appartient a l'utilisateur)
router.put('/:id', async (req, res) => {
  try {
    const { name, prompt, documentation, documents, email, color } = req.body;
    const agentId = req.params.id;

    const agent = await Agent.findById(agentId, req.user.userId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouve ou non autorise' });
    }

    await Agent.update(agentId, {
      name: name !== undefined ? name : agent.name,
      prompt: prompt || agent.prompt,
      documentation: '', // On ne stocke plus la doc en DB
      email: email || agent.email,
      color: color || agent.widget_color
    }, req.user.userId);

    // Re-indexer la documentation si des documents sont fournis
    const docsToIndex = documents || (documentation ? [{ name: 'Documentation', content: documentation }] : null);

    if (docsToIndex && docsToIndex.length > 0) {
      try {
        await RAGService.indexDocumentation(agentId, docsToIndex);
      } catch (ragError) {
        Logger.error('Erreur lors de la re-indexation RAG:', ragError);
        return res.status(200).json({
          message: 'Agent mis a jour mais erreur lors de l\'indexation',
          warning: ragError.message,
          agent: await Agent.findById(agentId, req.user.userId)
        });
      }
    }

    res.json({
      message: 'Agent mis a jour',
      agent: await Agent.findById(agentId, req.user.userId)
    });
  } catch (error) {
    Logger.error('Erreur lors de la mise a jour de l\'agent:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un agent (seulement si appartient a l'utilisateur)
router.delete('/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id, req.user.userId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouve ou non autorise' });
    }

    // Supprimer les embeddings associes
    await Embedding.deleteByAgentId(req.params.id);

    // Supprimer les conversations associees
    await Conversation.deleteByAgentId(req.params.id);

    // Supprimer l'agent
    await Agent.delete(req.params.id, req.user.userId);

    res.json({ message: 'Agent supprime avec toutes ses donnees' });
  } catch (error) {
    Logger.error('Erreur lors de la suppression de l\'agent:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
