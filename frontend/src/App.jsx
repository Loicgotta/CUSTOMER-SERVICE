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
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Charger les agents au démarrage
  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await axios.get('/api/agents');
      setAgents(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des agents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/agents', formData);
      setFormData({ prompt: '', documentation: '', email: '' });
      setShowForm(false);
      loadAgents();
      alert('Agent créé avec succès!');
    } catch (error) {
      console.error('Erreur lors de la création de l\'agent:', error);
      alert('Erreur lors de la création de l\'agent');
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
    return `<!-- Widget Chatbot -->
<script>
  window.chatbotConfig = {
    agentId: ${agentId},
    apiUrl: 'http://localhost:3001'
  };
</script>
<script src="http://localhost:3001/widget.js"></script>`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Code copié dans le presse-papier!');
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
        </div>

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
                <small>Vous recevrez un résumé quotidien des conversations à 18h</small>
              </div>

              <button type="submit" className="btn btn-success">
                Créer l'Agent
              </button>
            </form>
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
