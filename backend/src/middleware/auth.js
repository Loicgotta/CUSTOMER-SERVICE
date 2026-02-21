import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware d'authentification avec vérification d'inactivité
export const authenticateToken = (req, res, next) => {
  // Récupérer le token depuis le header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Accès non autorisé. Token manquant.' });
  }

  try {
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Vérifier que l'utilisateur existe toujours
    const user = User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé.' });
    }

    // Vérifier l'inactivité (7 jours = 604800000 ms)
    const lastActivity = User.getLastActivity(decoded.userId);
    if (lastActivity) {
      const lastActivityDate = new Date(lastActivity);
      const now = new Date();
      const inactiveDays = (now - lastActivityDate) / (1000 * 60 * 60 * 24);

      if (inactiveDays > 7) {
        return res.status(401).json({
          error: 'Session expirée pour inactivité. Veuillez vous reconnecter.',
          reason: 'inactivity'
        });
      }
    }

    // Mettre à jour la dernière activité
    User.updateActivity(decoded.userId);

    // Ajouter les infos utilisateur à la requête
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: user.name
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré. Veuillez vous reconnecter.' });
    }
    return res.status(403).json({ error: 'Token invalide.' });
  }
};

// Middleware pour vérifier les privilèges admin
export const requireAdmin = (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = User.findById(userId);

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé.' });
    }

    if (!user.is_admin) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges administrateur requis.' });
    }

    // Ajouter le flag admin à req.user
    req.user.isAdmin = true;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erreur lors de la vérification des privilèges admin.' });
  }
};

// Fonction pour générer un token
export const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' } // Le token expire après 7 jours
  );
};

export { JWT_SECRET };
