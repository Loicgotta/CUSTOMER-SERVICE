import express from 'express';
import Logger from '../utils/logger.js';

const router = express.Router();

// Récupérer tous les logs
router.get('/', (req, res) => {
  try {
    const logs = Logger.getLogs();
    res.json({ logs });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Effacer les logs
router.delete('/', (req, res) => {
  try {
    Logger.clearLogs();
    res.json({ message: 'Logs effacés avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'effacement des logs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
