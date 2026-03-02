import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware d'authentification avec verification d'inactivite
export const authenticateToken = async (req, res, next) => {
  // Recuperer le token depuis le header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Acces non autorise. Token manquant.' });
  }

  try {
    // Verifier et decoder le token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verifier que l'utilisateur existe toujours
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouve.' });
    }

    // Verifier l'inactivite (7 jours = 604800000 ms)
    const lastActivity = await User.getLastActivity(decoded.userId);
    if (lastActivity) {
      const lastActivityDate = new Date(lastActivity);
      const now = new Date();
      const inactiveDays = (now - lastActivityDate) / (1000 * 60 * 60 * 24);

      if (inactiveDays > 7) {
        return res.status(401).json({
          error: 'Session expiree pour inactivite. Veuillez vous reconnecter.',
          reason: 'inactivity'
        });
      }
    }

    // Mettre a jour la derniere activite
    await User.updateActivity(decoded.userId);

    // Ajouter les infos utilisateur a la requete
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: user.name
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expire. Veuillez vous reconnecter.' });
    }
    return res.status(403).json({ error: 'Token invalide.' });
  }
};

// Middleware pour verifier les privileges admin
export const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouve.' });
    }

    if (!user.is_admin) {
      return res.status(403).json({ error: 'Acces refuse. Privileges administrateur requis.' });
    }

    // Ajouter le flag admin a req.user
    req.user.isAdmin = true;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erreur lors de la verification des privileges admin.' });
  }
};

// Fonction pour generer un token
export const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' } // Le token expire apres 7 jours
  );
};

export { JWT_SECRET };
