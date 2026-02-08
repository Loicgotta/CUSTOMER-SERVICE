import express from 'express';
import Agent from '../models/Agent.js';
import RAGService from '../services/ragService.js';
import Embedding from '../models/Embedding.js';

const router = express.Router();

// Créer un nouvel agent
router.post('/', async (req, res) => {
  try {
    const { prompt, documentation, documents, email, color } = req.body;

    if (!prompt || !email) {
      return res.status(400).json({ error: 'Prompt et email sont requis' });
    }

    // Créer l'agent lié à l'utilisateur connecté
    const agentId = Agent.create({
      userId: req.user.userId,
      prompt,
      documentation: '',
      email,
      color
    });

    // Indexer la documentation si elle existe (nouveau format ou legacy)
    const docsToIndex = documents || (documentation ? [{ name: 'Documentation', content: documentation }] : null);

    if (docsToIndex && docsToIndex.length > 0) {
      try {
        await RAGService.indexDocumentation(agentId, docsToIndex);
      } catch (ragError) {
        console.error('Erreur lors de l\'indexation RAG:', ragError);
        // L'agent est créé mais la documentation n'est pas indexée
        return res.status(201).json({
          id: agentId,
          message: 'Agent créé mais erreur lors de l\'indexation de la documentation',
          warning: ragError.message,
          agent: Agent.findById(agentId, req.user.userId)
        });
      }
    }

    res.status(201).json({
      id: agentId,
      message: 'Agent créé avec succès',
      agent: Agent.findById(agentId, req.user.userId)
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'agent:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Récupérer tous les agents de l'utilisateur connecté
router.get('/', (req, res) => {
  try {
    const agents = Agent.findAll(req.user.userId);
    res.json(agents);
  } catch (error) {
    console.error('Erreur lors de la récupération des agents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer un agent par ID (seulement si appartient à l'utilisateur)
router.get('/:id', (req, res) => {
  try {
    const agent = Agent.findById(req.params.id, req.user.userId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé ou non autorisé' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'agent:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer la liste des documents d'un agent (seulement si appartient à l'utilisateur)
router.get('/:id/documents', (req, res) => {
  try {
    const agent = Agent.findById(req.params.id, req.user.userId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé ou non autorisé' });
    }
    const documentNames = Embedding.getDocumentNames(req.params.id);
    res.json({ documents: documentNames });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un agent (seulement si appartient à l'utilisateur)
router.put('/:id', async (req, res) => {
  try {
    const { prompt, documentation, documents, email, color } = req.body;
    const agentId = req.params.id;

    const agent = Agent.findById(agentId, req.user.userId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé ou non autorisé' });
    }

    Agent.update(agentId, {
      prompt: prompt || agent.prompt,
      documentation: '', // On ne stocke plus la doc en DB
      email: email || agent.email,
      color: color || agent.widget_color
    }, req.user.userId);

    // Ré-indexer la documentation si des documents sont fournis
    const docsToIndex = documents || (documentation ? [{ name: 'Documentation', content: documentation }] : null);

    if (docsToIndex && docsToIndex.length > 0) {
      try {
        await RAGService.indexDocumentation(agentId, docsToIndex);
      } catch (ragError) {
        console.error('Erreur lors de la ré-indexation RAG:', ragError);
        return res.status(200).json({
          message: 'Agent mis à jour mais erreur lors de l\'indexation',
          warning: ragError.message,
          agent: Agent.findById(agentId, req.user.userId)
        });
      }
    }

    res.json({
      message: 'Agent mis à jour',
      agent: Agent.findById(agentId, req.user.userId)
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'agent:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

// Supprimer un agent (seulement si appartient à l'utilisateur)
router.delete('/:id', (req, res) => {
  try {
    const agent = Agent.findById(req.params.id, req.user.userId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé ou non autorisé' });
    }

    Agent.delete(req.params.id, req.user.userId);
    res.json({ message: 'Agent supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'agent:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
