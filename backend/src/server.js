import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import agentsRouter from './routes/agents.js';
import chatRouter from './routes/chat.js';
import ReportService from './services/reportService.js';
import Logger from './utils/logger.js';
import './database/db.js'; // Initialiser la DB

dotenv.config();

// Vérifier les variables d'environnement requises
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERREUR: OPENAI_API_KEY manquante dans les variables d\'environnement');
  console.error('⚠️  L\'application va démarrer mais les fonctionnalités IA ne fonctionneront pas');
  console.error('💡 Ajoutez OPENAI_API_KEY dans votre fichier .env ou dans les variables d\'environnement Render');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir les fichiers statiques (widget)
app.use(express.static('public'));

// Servir le frontend React (fichiers buildés)
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Routes API
app.use('/api/agents', agentsRouter);
app.use('/api/chat', chatRouter);

// Route pour envoyer manuellement un rapport
app.post('/api/reports/send/:agentId', async (req, res) => {
  try {
    const { startDate, endDate, preferences } = req.body || {};
    Logger.info(`Requête rapport agent ${req.params.agentId} | Dates: ${startDate || 'toutes'} → ${endDate || 'toutes'} | Prefs: ${preferences || 'aucune'}`);

    const result = await ReportService.sendReport(req.params.agentId, { startDate, endDate, preferences });

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

// Route pour récupérer les logs
app.get('/api/logs', (req, res) => {
  try {
    const logs = Logger.getLogs();
    res.json({
      count: logs.length,
      logs: logs
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des logs' });
  }
});

// Route pour effacer les logs
app.delete('/api/logs', (req, res) => {
  try {
    Logger.clearLogs();
    Logger.info('Logs effacés depuis le dashboard');
    res.json({ message: 'Logs effacés avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'effacement des logs' });
  }
});

// Catch-all pour servir le frontend React (doit être après toutes les routes API)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
  Logger.success(`Serveur démarré sur le port ${PORT}`);
  Logger.info(`📊 Dashboard: http://localhost:${PORT}`);
  Logger.info(`📧 Rapports disponibles via le bouton "Envoyer Rapport" dans l'interface`);
});

export default app;
