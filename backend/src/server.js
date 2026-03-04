import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import agentsRouter from './routes/agents.js';
import chatRouter from './routes/chat.js';
import docsRouter from './routes/docs.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import promptRouter from './routes/prompt.js';
import ReportService from './services/reportService.js';
import Logger from './utils/logger.js';
import { authenticateToken, requireAdmin } from './middleware/auth.js';
import { initializeDatabase, pool } from './database/db.js';

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

// Configurer Express pour faire confiance au reverse proxy de Render (1 seul hop)
// Nécessaire pour que le rate limiter identifie correctement les utilisateurs via X-Forwarded-For
app.set('trust proxy', 1);

// Headers de sécurité HTTP
app.use(helmet({
  contentSecurityPolicy: false, // désactivé car le frontend React est servi par le même serveur
  crossOriginResourcePolicy: { policy: 'cross-origin' } // widget chargeable depuis n'importe quel domaine
}));

// CORS : Configuration granulaire pour sécurité + widget public
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

// Ajouter automatiquement l'URL Render si on est en production
if (process.env.NODE_ENV === 'production' && process.env.RENDER === 'true') {
  const renderUrl = 'https://customer-service-blqv.onrender.com';
  if (!allowedOrigins.includes(renderUrl)) {
    allowedOrigins.push(renderUrl);
  }
}

// CORS intelligent : restrictif pour endpoints sensibles, ouvert pour widget
app.use(cors((req, callback) => {
  const origin = req.headers.origin;

  // Routes publiques du widget : autoriser toutes les origines
  if (req.path.startsWith('/api/chat') || req.path === '/widget.js') {
    callback(null, { origin: true }); // Autoriser toutes origines
  }
  // Routes protégées : autoriser uniquement les origines whitelistées
  else {
    const isAllowed = !origin || allowedOrigins.includes(origin);
    callback(null, { origin: isAllowed });
  }
}));

// Rate limiting sur les routes d'authentification (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting global (protection DDoS légère)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Ajouter les headers CORS sur widget.js
app.use((req, res, next) => {
  if (req.path === '/widget.js') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
  next();
});

// Servir les fichiers statiques (incluant widget.js)
app.use(express.static('public'));

// Servir le frontend React (fichiers buildés)
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Routes API
app.use('/api/auth', authLimiter, authRouter); // Rate limitée (anti brute-force)
app.use('/api/agents', authenticateToken, agentsRouter); // Protégé
app.use('/api/chat', cors({ origin: '*' }), chatRouter); // Public (widget sur sites tiers)
app.use('/api/docs', authenticateToken, docsRouter); // Protégé
app.use('/api/admin', authenticateToken, requireAdmin, adminRouter); // Admin uniquement
app.use('/api/prompt', authenticateToken, promptRouter); // Amélioration de prompt

// Route pour envoyer manuellement un rapport (protégée)
app.post('/api/reports/send/:agentId', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, preferences } = req.body || {};
    Logger.info(`Requête rapport agent ${req.params.agentId} | User ID: ${req.user.userId} | Dates: ${startDate || 'toutes'} → ${endDate || 'toutes'}`);

    const result = await ReportService.sendReport(req.params.agentId, { startDate, endDate, preferences }, req.user.userId);

    if (result.success) {
      Logger.success(`Rapport envoyé avec succès pour l'agent ${req.params.agentId}`);
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

// Route pour récupérer les logs (admin uniquement)
app.get('/api/logs', authenticateToken, requireAdmin, (req, res) => {
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

// Route pour effacer les logs supprimée pour des raisons de sécurité
// Les logs d'audit ne doivent jamais être supprimables via l'API

// Catch-all pour servir le frontend React (doit être après toutes les routes API)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Initialiser la base de données puis démarrer le serveur
let server;
async function startServer() {
  try {
    await initializeDatabase();
    server = app.listen(PORT, () => {
      Logger.success(`Serveur démarré sur le port ${PORT}`);
      Logger.info(`📊 Dashboard: http://localhost:${PORT}`);
      Logger.info(`📧 Rapports disponibles via le bouton "Envoyer Rapport" dans l'interface`);
    });
  } catch (error) {
    console.error('❌ Impossible de démarrer le serveur:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown : fermer proprement les connexions pour éviter les requêtes perdues
function gracefulShutdown(signal) {
  console.log(`\n${signal} reçu. Arrêt propre en cours...`);
  if (server) {
    server.close(() => {
      console.log('Serveur HTTP fermé.');
      pool.end().then(() => {
        console.log('Pool PostgreSQL fermé.');
        process.exit(0);
      }).catch(() => {
        process.exit(1);
      });
    });
    // Forcer l'arrêt après 10s si le serveur ne se ferme pas
    setTimeout(() => {
      console.error('Arrêt forcé après timeout.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Capturer les erreurs non gérées pour éviter un crash silencieux
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  Logger.error('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  Logger.error('Uncaught Exception', error);
  gracefulShutdown('uncaughtException');
});

startServer();

export default app;
