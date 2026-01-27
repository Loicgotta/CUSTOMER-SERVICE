import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [agents, setAgents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    prompt: '',
    documentation: '',
    email: ''
  });
  const [sendingReport, setSendingReport] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [notification, setNotification] = useState(null);

  // Auto-dismiss notification après 5 secondes
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Charger les agents au démarrage
  useEffect(() => {
    loadAgents();
    loadLogs();

    // Rafraîchir les logs toutes les 3 secondes
    const logsInterval = setInterval(() => {
      if (showLogs) {
        loadLogs();
      }
    }, 3000);

    return () => clearInterval(logsInterval);
  }, [showLogs]);

  const loadAgents = async () => {
    try {
      const response = await axios.get('/api/agents');
      setAgents(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des agents:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await axios.get('/api/logs');
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error);
    }
  };

  const clearLogs = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir effacer tous les logs?')) {
      try {
        await axios.delete('/api/logs');
        setLogs([]);
        setNotification({ type: 'success', message: 'Logs effacés avec succès' });
      } catch (error) {
        console.error('Erreur lors de l\'effacement des logs:', error);
        setNotification({ type: 'error', message: 'Erreur lors de l\'effacement des logs' });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/agents', formData);
      setFormData({ prompt: '', documentation: '', email: '' });
      setShowForm(false);
      loadAgents();

      if (response.data.warning) {
        setNotification({
          type: 'warning',
          message: `Agent créé avec avertissement: ${response.data.warning}`
        });
      } else {
        setNotification({ type: 'success', message: 'Agent créé avec succès!' });
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'agent:', error);
      const errorMsg = error.response?.data?.details || error.message || 'Erreur lors de la création de l\'agent';
      setNotification({ type: 'error', message: `Erreur: ${errorMsg}` });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet agent?')) {
      try {
        await axios.delete(`/api/agents/${id}`);
        loadAgents();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const generateWidgetCode = (agentId) => {
    const baseUrl = window.location.origin;
    return `<!-- Widget Chatbot -->
<script>
  window.chatbotConfig = {
    agentId: ${agentId},
    apiUrl: '${baseUrl}'
  };
</script>
<script src="${baseUrl}/widget.js"></script>`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setNotification({ type: 'success', message: 'Code copié dans le presse-papier!' });
  };

  const handleSendReport = async (agentId) => {
    setSendingReport(agentId);
    try {
      const response = await axios.post(`/api/reports/send/${agentId}`);

      if (response.data.success) {
        setNotification({
          type: 'success',
          message: `Rapport envoyé avec succès à ${response.data.email} (${response.data.conversationCount || 'N/A'} conversations)`
        });
      } else {
        setNotification({
          type: 'error',
          message: response.data.error || 'Erreur lors de l\'envoi'
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du rapport:', error);
      const errorMsg = error.response?.data?.error || error.message;
      setNotification({ type: 'error', message: `Erreur: ${errorMsg}` });
    } finally {
      setSendingReport(null);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🤖 Plateforme de Chatbots Service Client</h1>
        <p>Créez et gérez vos agents de service client intelligents</p>
      </header>

      <div className="container">
        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Annuler' : '+ Créer un Agent'}
          </button>
          <button
            className="btn btn-logs"
            onClick={() => setShowLogs(!showLogs)}
          >
            {showLogs ? '📊 Masquer Logs' : '📊 Voir Logs Serveur'}
          </button>
        </div>

        {notification && (
          <div className={`notification notification-${notification.type}`}>
            <div className="notification-content">
              <span className="notification-icon">
                {notification.type === 'success' && '✅'}
                {notification.type === 'error' && '❌'}
                {notification.type === 'warning' && '⚠️'}
              </span>
              <span className="notification-message">{notification.message}</span>
              <button
                className="notification-close"
                onClick={() => setNotification(null)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="form-card">
            <h2>Nouvel Agent</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Prompt du Chatbot *</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Ex: Tu es un assistant service client pour notre entreprise. Tu dois être poli et professionnel..."
                  value={formData.prompt}
                  onChange={(e) =>
                    setFormData({ ...formData, prompt: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Documentation (optionnel)</label>
                <textarea
                  rows="6"
                  placeholder="Collez ici votre documentation produit, FAQ, etc. Elle sera indexée et utilisée par l'agent pour répondre aux questions."
                  value={formData.documentation}
                  onChange={(e) =>
                    setFormData({ ...formData, documentation: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email pour les rapports *</label>
                <input
                  type="email"
                  required
                  placeholder="exemple@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
                <small>Cliquez sur "Envoyer Rapport" pour recevoir un résumé des conversations</small>
              </div>

              <button type="submit" className="btn btn-success">
                Créer l'Agent
              </button>
            </form>
          </div>
        )}

        {showLogs && (
          <div className="logs-container">
            <div className="logs-header">
              <h2>📊 Logs Serveur (Actualisation automatique toutes les 3s)</h2>
              <div className="logs-actions">
                <button className="btn btn-sm btn-secondary" onClick={loadLogs}>
                  🔄 Rafraîchir
                </button>
                <button className="btn btn-sm btn-danger" onClick={clearLogs}>
                  🗑️ Effacer
                </button>
              </div>
            </div>

            <div className="logs-content">
              {logs.length === 0 ? (
                <div className="logs-empty">
                  <p>Aucun log disponible</p>
                </div>
              ) : (
                <div className="logs-list">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`log-entry log-${log.level}`}
                    >
                      <div className="log-header-entry">
                        <span className={`log-level log-level-${log.level}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="log-timestamp">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="log-message">{log.message}</div>
                      {log.error && (
                        <div className="log-error">
                          <pre>{log.fullLog}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="agents-grid">
          {agents.map((agent) => (
            <div key={agent.id} className="agent-card">
              <div className="agent-header">
                <h3>Agent #{agent.id}</h3>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(agent.id)}
                >
                  Supprimer
                </button>
              </div>

              <div className="agent-info">
                <p><strong>Email:</strong> {agent.email}</p>
                <p><strong>Créé le:</strong> {new Date(agent.created_at).toLocaleDateString()}</p>
                <div className="prompt-preview">
                  <strong>Prompt:</strong>
                  <p>{agent.prompt.substring(0, 100)}...</p>
                </div>
              </div>

              <div className="report-section">
                <button
                  className="btn btn-report btn-sm"
                  onClick={() => handleSendReport(agent.id)}
                  disabled={sendingReport === agent.id}
                >
                  {sendingReport === agent.id ? '📨 Envoi en cours...' : '📧 Envoyer Rapport'}
                </button>
              </div>

              <div className="widget-section">
                <h4>Code du Widget</h4>
                <div className="code-box">
                  <pre>{generateWidgetCode(agent.id)}</pre>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyToClipboard(generateWidgetCode(agent.id))}
                >
                  📋 Copier le Code
                </button>
              </div>
            </div>
          ))}
        </div>

        {agents.length === 0 && !showForm && (
          <div className="empty-state">
            <h2>Aucun agent créé</h2>
            <p>Créez votre premier agent de service client pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
