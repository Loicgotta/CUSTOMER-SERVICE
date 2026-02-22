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
import db from './database/db.js'; // Initialiser la DB et importer l'instance

dotenv.config();

// Vérifier les variables d'environnement requises
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERREUR: OPENAI_API_KEY manquante dans les variables d\'environnement');
  console.error('⚠️  L\'application va démarrer mais les fonctionnalités IA ne fonctionneront pas');
  console.error('💡 Ajoutez OPENAI_API_KEY dans votre fichier .env ou dans les variables d\'environnement Render');
}

// Note: JWT_SECRET n'est plus requis ici car il est généré automatiquement
// et stocké dans la base de données (voir database/db.js)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Configurer Express pour faire confiance au reverse proxy de Render
// Nécessaire pour que le rate limiter identifie correctement les utilisateurs via X-Forwarded-For
app.set('trust proxy', true);

// Headers de sécurité HTTP
app.use(helmet({
  contentSecurityPolicy: false, // désactivé car le frontend React est servi par le même serveur
  crossOriginResourcePolicy: { policy: 'cross-origin' } // widget chargeable depuis n'importe quel domaine
}));

// CORS : autoriser les origines configurées + domaine Render en production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

// Ajouter automatiquement l'URL Render si on est en production
if (process.env.NODE_ENV === 'production' && process.env.RENDER === 'true') {
  // Render met à disposition l'URL via le service name
  // Format: https://<service-name>.onrender.com
  const renderUrl = 'https://customer-service-blqv.onrender.com';
  if (!allowedOrigins.includes(renderUrl)) {
    allowedOrigins.push(renderUrl);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (widget intégré, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Log pour debug en production
    Logger.warning(`CORS bloqué pour origin: ${origin}`);
    callback(new Error('CORS non autorisé'));
  },
  credentials: true
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

// Servir les fichiers widget avec headers cross-origin explicites
app.use('/widget.js', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('public'));

// Servir les autres fichiers statiques
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

// Route pour effacer les logs (admin uniquement)
app.delete('/api/logs', authenticateToken, requireAdmin, (req, res) => {
  try {
    Logger.clearLogs();
    Logger.info('Logs effacés par un administrateur');
    res.json({ message: 'Logs effacés avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'effacement des logs' });
  }
});

// 🔍 DEBUG ENDPOINT - À supprimer après diagnostic
app.get('/api/debug/status', (req, res) => {
  try {
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const adminUser = db.prepare('SELECT id, email, name, is_admin, created_at FROM users WHERE email = ?').get('Chenrigtta@gmail.com');
    const allUsers = db.prepare('SELECT id, email, name, is_admin, created_at FROM users').all();

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      jwt_secret_configured: !!process.env.JWT_SECRET,
      database: {
        users_count: usersCount.count,
        admin_exists: !!adminUser,
        admin_details: adminUser || 'Not found',
        all_users: allUsers
      },
      environment: {
        node_env: process.env.NODE_ENV,
        render: process.env.RENDER === 'true',
        database_path: process.env.DATABASE_PATH || 'default (./backend/data/chatbot.db)'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: error.stack
    });
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
