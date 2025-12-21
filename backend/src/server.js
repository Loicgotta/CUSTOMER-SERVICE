import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import agentsRouter from './routes/agents.js';
import chatRouter from './routes/chat.js';
import ReportService from './services/reportService.js';
import Logger from './utils/logger.js';
import './database/db.js'; // Initialiser la DB

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir les fichiers statiques (widget)
app.use(express.static('public'));

// Routes
app.use('/api/agents', agentsRouter);
app.use('/api/chat', chatRouter);

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API Chatbot Platform - Running' });
});

// Route pour envoyer manuellement un rapport
app.post('/api/reports/send/:agentId', async (req, res) => {
  try {
    Logger.info(`Requête d'envoi de rapport pour l'agent ${req.params.agentId}`);
    const result = await ReportService.sendReport(req.params.agentId);

    if (result.success) {
      Logger.success(`Rapport envoyé avec succès à ${result.email}`);
      res.json(result);
    } else {
      Logger.warning(`Échec de l'envoi du rapport: ${result.error}`);
      res.status(400).json(result);
    }
  } catch (error) {
    Logger.error('Erreur lors du traitement de la requête de rapport', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  Logger.success(`Serveur démarré sur le port ${PORT}`);
  Logger.info(`📊 Dashboard: http://localhost:${PORT}`);
  Logger.info(`📧 Rapports disponibles via le bouton "Envoyer Rapport" dans l'interface`);
});

export default app;
