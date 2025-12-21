import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import dotenv from 'dotenv';
import agentsRouter from './routes/agents.js';
import chatRouter from './routes/chat.js';
import ReportService from './services/reportService.js';
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
    const result = await ReportService.sendDailyReport(req.params.agentId);
    res.json({ success: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Planifier l'envoi des rapports quotidiens à 18h00 chaque jour
cron.schedule('0 18 * * *', async () => {
  console.log('Envoi des rapports quotidiens...');
  try {
    const results = await ReportService.sendAllDailyReports();
    console.log('Rapports envoyés:', results);
  } catch (error) {
    console.error('Erreur lors de l\'envoi des rapports:', error);
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`⏰ Rapports quotidiens planifiés à 18h00`);
});

export default app;
