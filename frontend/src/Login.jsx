import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister
        ? { email: formData.email, password: formData.password, name: formData.name }
        : { email: formData.email, password: formData.password };

      const response = await axios.post(endpoint, payload);

      // Stocker le token dans localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Configurer axios pour inclure le token dans tous les futurs appels
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      // Notifier le composant parent que la connexion a réussi
      onLoginSuccess(response.data.user);
    } catch (err) {
      console.error('Erreur d\'authentification:', err);
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setFormData({ email: '', password: '', name: '' });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🤖 Plateforme Chatbot</h1>
          <h2>{isRegister ? 'Créer un compte' : 'Connexion'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className="form-group">
              <label>Nom complet *</label>
              <input
                type="text"
                required
                placeholder="Jean Dupont"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              required
              placeholder="votre@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Mot de passe *</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              minLength="6"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={loading}
            />
            {isRegister && (
              <small>Au moins 6 caractères</small>
            )}
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
            {loading ? 'Chargement...' : (isRegister ? 'Créer mon compte' : 'Se connecter')}
          </button>
        </form>

        <div className="login-toggle">
          {isRegister ? (
            <p>
              Vous avez déjà un compte ?{' '}
              <button type="button" onClick={toggleMode} className="link-button">
                Se connecter
              </button>
            </p>
          ) : (
            <p>
              Pas encore de compte ?{' '}
              <button type="button" onClick={toggleMode} className="link-button">
                Créer un compte
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
