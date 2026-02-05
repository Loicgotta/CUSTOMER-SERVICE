import express from 'express';
import Agent from '../models/Agent.js';
import RAGService from '../services/ragService.js';

const router = express.Router();

// Créer un nouvel agent
router.post('/', async (req, res) => {
  try {
    const { prompt, documentation, email, color } = req.body;

    if (!prompt || !email) {
      return res.status(400).json({ error: 'Prompt et email sont requis' });
    }

    // Créer l'agent
    const agentId = Agent.create({ prompt, documentation: documentation || '', email, color });

    // Indexer la documentation si elle existe
    if (documentation) {
      try {
        await RAGService.indexDocumentation(agentId, documentation);
      } catch (ragError) {
        console.error('Erreur lors de l\'indexation RAG:', ragError);
        // L'agent est créé mais la documentation n'est pas indexée
        return res.status(201).json({
          id: agentId,
          message: 'Agent créé mais erreur lors de l\'indexation de la documentation',
          warning: ragError.message,
          agent: Agent.findById(agentId)
        });
      }
    }

    res.status(201).json({
      id: agentId,
      message: 'Agent créé avec succès',
      agent: Agent.findById(agentId)
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

// Récupérer tous les agents
router.get('/', (req, res) => {
  try {
    const agents = Agent.findAll();
    res.json(agents);
  } catch (error) {
    console.error('Erreur lors de la récupération des agents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer un agent par ID
router.get('/:id', (req, res) => {
  try {
    const agent = Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'agent:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un agent
router.put('/:id', async (req, res) => {
  try {
    const { prompt, documentation, email, color } = req.body;
    const agentId = req.params.id;

    const agent = Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé' });
    }

    Agent.update(agentId, {
      prompt: prompt || agent.prompt,
      documentation: documentation !== undefined ? documentation : agent.documentation,
      email: email || agent.email,
      color: color || agent.widget_color
    });

    // Ré-indexer la documentation si elle a changé
    if (documentation !== undefined) {
      try {
        await RAGService.indexDocumentation(agentId, documentation);
      } catch (ragError) {
        console.error('Erreur lors de la ré-indexation RAG:', ragError);
        return res.status(200).json({
          message: 'Agent mis à jour mais erreur lors de l\'indexation',
          warning: ragError.message,
          agent: Agent.findById(agentId)
        });
      }
    }

    res.json({
      message: 'Agent mis à jour',
      agent: Agent.findById(agentId)
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'agent:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

// Supprimer un agent
router.delete('/:id', (req, res) => {
  try {
    const agent = Agent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent non trouvé' });
    }

    Agent.delete(req.params.id);
    res.json({ message: 'Agent supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'agent:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
