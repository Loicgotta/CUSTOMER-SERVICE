import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Login from './Login';
import Admin from './Admin';
import './App.css';

const WIDGET_COLORS = [
  { name: 'Violet (par défaut)', value: '#667eea' },
  { name: 'Noir', value: '#2d3748' },
  { name: 'Vert', value: '#48bb78' },
  { name: 'Beige', value: '#d4a574' },
  { name: 'Bleu', value: '#4299e1' },
  { name: 'Rouge', value: '#e53e3e' },
  { name: 'Marron', value: '#7b5a3c' },
  { name: 'Orange', value: '#ed8936' },
  { name: 'Orange sombre', value: '#c05621' },
  { name: 'Jaune clair', value: '#f6e05e' },
  { name: 'Jaune foncé', value: '#d69e2e' }
];

function App() {
  // Authentification
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [agents, setAgents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    prompt: '',
    email: '',
    color: '#667eea'
  });
  const [documents, setDocuments] = useState([]);
  const [manualDocText, setManualDocText] = useState('');
  const [manualDocName, setManualDocName] = useState('');
  const [sendingReport, setSendingReport] = useState(null);
  const [notification, setNotification] = useState(null);
  const [docExtracting, setDocExtracting] = useState(false);

  // Modal rapport
  const [reportModalAgent, setReportModalAgent] = useState(null);
  const [reportOptions, setReportOptions] = useState({
    dateRange: 'all',
    startDate: '',
    endDate: '',
    preferences: ''
  });

  // Admin
  const [showAdmin, setShowAdmin] = useState(false);

  // Amélioration prompt
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);

  // Chat de test
  const [testingAgent, setTestingAgent] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Auto-resize du textarea du chat
  const autoResizeChatInput = () => {
    const textarea = chatInputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  // Auto-dismiss notification après 5 secondes
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      // Configurer axios pour envoyer le token dans toutes les requêtes
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(userData));
      setAuthChecked(true);
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Charger les agents une fois authentifié
  useEffect(() => {
    if (user) {
      loadAgents();
    }
  }, [user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleEnhancePrompt = async () => {
    if (!formData.prompt.trim()) {
      setNotification({ type: 'warning', message: 'Écrivez un prompt avant de l\'améliorer' });
      return;
    }
    setEnhancingPrompt(true);
    try {
      const response = await axios.post('/api/prompt/enhance', { prompt: formData.prompt });
      setFormData(prev => ({ ...prev, prompt: response.data.enhanced }));
      setNotification({ type: 'success', message: 'Prompt amélioré avec succès !' });
    } catch (error) {
      setNotification({ type: 'error', message: 'Erreur lors de l\'amélioration du prompt' });
    } finally {
      setEnhancingPrompt(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setAgents([]);
    setNotification({ type: 'success', message: 'Déconnexion réussie' });
  };

  const loadAgents = async () => {
    try {
      const response = await axios.get('/api/agents');
      setAgents(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des agents:', error);
      // Si erreur 401, déconnecter l'utilisateur
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ajouter la documentation manuelle si présente
      const allDocs = [...documents];
      if (manualDocText.trim()) {
        const docName = manualDocName.trim() || 'Documentation';
        allDocs.push({ name: docName, content: manualDocText.trim() });
      }

      const payload = { ...formData, documents: allDocs };
      let response;

      if (editingAgent) {
        // Mode édition - PUT
        response = await axios.put(`/api/agents/${editingAgent}`, payload);
      } else {
        // Mode création - POST
        response = await axios.post('/api/agents', payload);
      }

      setFormData({ name: '', prompt: '', email: '', color: '#667eea' });
      setDocuments([]);
      setManualDocText('');
      setManualDocName('');
      setEditingAgent(null);
      setShowForm(false);
      loadAgents();

      if (response.data.warning) {
        setNotification({
          type: 'warning',
          message: `Agent créé avec avertissement: ${response.data.warning}`
        });
      } else {
        setNotification({ type: 'success', message: editingAgent ? 'Agent modifié avec succès!' : 'Agent créé avec succès!' });
      }
    } catch (error) {
      console.error(editingAgent ? 'Erreur lors de la modification de l\'agent:' : 'Erreur lors de la création de l\'agent:', error);
      const errorMsg = error.response?.data?.details || error.message || (editingAgent ? 'Erreur lors de la modification' : 'Erreur lors de la création');
      setNotification({ type: 'error', message: `Erreur: ${errorMsg}` });
    }
  };

  const handleEditAgent = async (agent) => {
    try {
      // Charger les documents existants
      const docsResponse = await axios.get(`/api/agents/${agent.id}/documents`);
      const existingDocs = docsResponse.data.documents.map(name => ({ name, content: '', existing: true }));

      setFormData({
        name: agent.name || '',
        prompt: agent.prompt,
        email: agent.email,
        color: agent.widget_color || '#667eea'
      });
      setDocuments(existingDocs);
      setManualDocText('');
      setManualDocName('');
      setEditingAgent(agent.id);
      setShowForm(true);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'agent:', error);
      setNotification({ type: 'error', message: 'Erreur lors du chargement de l\'agent' });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    // Vérifier si un document avec ce nom existe déjà
    if (documents.some(d => d.name === file.name)) {
      setNotification({ type: 'warning', message: `Le document "${file.name}" est déjà ajouté` });
      return;
    }

    // En mode édition, supprimer les documents existants (ils seront remplacés au submit)
    const nonExistingDocs = documents.filter(d => !d.existing);

    const ext = file.name.split('.').pop().toLowerCase();
    const textFormats = ['txt', 'md', 'csv', 'json'];

    if (textFormats.includes(ext)) {
      // Formats texte : lecture directe en navigateur
      const reader = new FileReader();
      reader.onload = (event) => {
        setDocuments(prev => [...nonExistingDocs, { name: file.name, content: event.target.result }]);
      };
      reader.onerror = () => {
        setNotification({ type: 'error', message: 'Erreur lors de la lecture du fichier' });
      };
      reader.readAsText(file);
    } else {
      // PDF / DOCX / XLSX : extraction server-side
      setDocExtracting(true);
      try {
        const payload = new FormData();
        payload.append('file', file);
        const response = await axios.post('/api/docs/extract', payload);
        setDocuments(prev => [...nonExistingDocs, { name: file.name, content: response.data.text }]);
      } catch (error) {
        const errorMsg = error.response?.data?.error || error.message;
        setNotification({ type: 'error', message: `Extraction échouée : ${errorMsg}` });
      } finally {
        setDocExtracting(false);
      }
    }
  };

  const handleRemoveDocument = (docName) => {
    setDocuments(prev => prev.filter(d => d.name !== docName));
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAgent(null);
    setFormData({ prompt: '', email: '', color: '#667eea' });
    setDocuments([]);
    setManualDocText('');
    setManualDocName('');
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

  const generateWidgetCode = (agentId, widgetColor) => {
    const baseUrl = window.location.origin;
    return `<!-- Widget Chatbot -->
<script>
  window.chatbotConfig = {
    agentId: ${agentId},
    apiUrl: '${baseUrl}',
    widgetColor: '${widgetColor || '#667eea'}'
  };
</script>
<script src="${baseUrl}/widget.js"></script>`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setNotification({ type: 'success', message: 'Code copié dans le presse-papier!' });
  };

  // Auto-scroll vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const openTestChat = (agent) => {
    setTestingAgent(agent);
    setChatMessages([{ role: 'bot', content: `Bonjour ! Je suis l'agent #${agent.id}. Comment puis-je vous aider aujourd'hui ?` }]);
    setChatInput('');
  };

  const closeTestChat = () => {
    setTestingAgent(null);
    setChatMessages([]);
    setChatInput('');
  };

  const sendTestMessage = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatInput('');
    // Réinitialiser la hauteur du textarea
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
    }

    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setChatLoading(true);

    try {
      const response = await axios.post('/api/chat/message', {
        agentId: testingAgent.id,
        sessionId: chatSessionId,
        message
      });
      setChatMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
    } catch (error) {
      const errorMsg = error.response?.data?.details || error.message || 'Erreur lors de la communication';
      setChatMessages(prev => [...prev, { role: 'bot', content: `Erreur : ${errorMsg}`, isError: true }]);
    } finally {
      setChatLoading(false);
    }
  };

  const openReportModal = (agentId) => {
    setReportModalAgent(agentId);
    setReportOptions({ dateRange: 'all', startDate: '', endDate: '', preferences: '' });
  };

  const submitReport = async () => {
    setSendingReport(reportModalAgent);
    try {
      const body = {};
      if (reportOptions.dateRange === 'custom') {
        body.startDate = reportOptions.startDate;
        body.endDate = reportOptions.endDate;
      }
      if (reportOptions.preferences.trim()) {
        body.preferences = reportOptions.preferences.trim();
      }

      const response = await axios.post(`/api/reports/send/${reportModalAgent}`, body);

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
      setReportModalAgent(null);
    }
  };

  // --- Vue Chat de Test ---
  if (testingAgent) {
    return (
      <div className="app">
        <div className="chat-page">
          <div className="chat-page-header">
            <button className="chat-back-btn" onClick={closeTestChat}>← Retour</button>
            <div className="chat-page-title">
              <h2>Test {testingAgent.name || `Agent #${testingAgent.id}`}</h2>
              <span className="chat-page-email">{testingAgent.email}</span>
            </div>
          </div>

          <div className="chat-messages">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg-${msg.role}${msg.isError ? ' chat-msg-error' : ''}`}>
                <div className="chat-msg-bubble">
                  {msg.content.split('\n').map((line, j, arr) => (
                    <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-msg chat-msg-bot">
                <div className="chat-msg-bubble chat-msg-loading">
                  <span className="chat-dot"></span>
                  <span className="chat-dot"></span>
                  <span className="chat-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              ref={chatInputRef}
              className="chat-input"
              placeholder="Tapez votre message... (Shift+Enter pour sauter une ligne)"
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                autoResizeChatInput();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendTestMessage();
                }
              }}
              disabled={chatLoading}
              autoFocus
              rows={1}
            />
            <button
              className="chat-send-btn"
              onClick={sendTestMessage}
              disabled={chatLoading || !chatInput.trim()}
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Afficher Login si non authentifié ---
  if (!authChecked) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // --- Vue Dashboard ---
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>🤖 Plateforme de Chatbots Service Client</h1>
            <p>Créez et gérez vos agents de service client intelligents</p>
          </div>
          <div className="header-user">
            <span className="user-name">👤 {user.name}</span>
            {user.is_admin && (
              <button
                className="btn btn-sm"
                style={{ background: '#e53e3e', color: 'white' }}
                onClick={() => setShowAdmin(!showAdmin)}
              >
                🛡️ Admin
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {showAdmin && user.is_admin ? (
        <Admin onBack={() => setShowAdmin(false)} />
      ) : (
      <div className="container">
        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={() => showForm ? handleCancelForm() : setShowForm(true)}
          >
            {showForm ? 'Annuler' : '+ Créer un Agent'}
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
            <h2>{editingAgent ? `Modifier l'agent #${editingAgent}` : 'Nouvel Agent'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom de l'agent (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Support Client, Assistant FAQ, Agent Commercial..."
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>Prompt du Chatbot *</label>
                  <button
                    type="button"
                    onClick={handleEnhancePrompt}
                    disabled={enhancingPrompt}
                    style={{
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.4rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: enhancingPrompt ? 'not-allowed' : 'pointer',
                      opacity: enhancingPrompt ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    {enhancingPrompt ? '⏳ Amélioration...' : '✨ Améliorer le prompt'}
                  </button>
                </div>
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
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="doc-file-input"
                    accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx"
                    className="file-input-hidden"
                    onChange={handleFileUpload}
                    disabled={docExtracting}
                  />
                  <label htmlFor="doc-file-input" className={`file-upload-btn${docExtracting ? ' file-upload-btn-loading' : ''}`}>
                    {docExtracting ? '⏳ Extraction...' : '📁 Choisir un fichier'}
                  </label>
                </div>
                <small>Formats supportés : .txt, .md, .csv, .json, .pdf, .docx, .xlsx (max 10 Mo)</small>

                {documents.length > 0 && (
                  <div className="documents-list">
                    <strong>{documents.length} document{documents.length > 1 ? 's' : ''} {editingAgent ? '(existants + nouveaux)' : 'chargé' + (documents.length > 1 ? 's' : '')} :</strong>
                    {documents.map((doc, i) => (
                      <div key={i} className={`document-item${doc.existing ? ' document-item-existing' : ''}`}>
                        <span className="document-name">
                          {doc.existing ? '📦' : '📄'} {doc.name}
                          {doc.existing && <span className="document-badge">existant</span>}
                        </span>
                        <button
                          type="button"
                          className="document-remove-btn"
                          onClick={() => handleRemoveDocument(doc.name)}
                          title={doc.existing ? "Supprimer ce document (sera supprimé à l'enregistrement)" : "Supprimer ce document"}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="or-divider">ou saisissez directement</div>
                <input
                  type="text"
                  placeholder="Nom du document (optionnel, ex: FAQ, Guide utilisateur...)"
                  value={manualDocName}
                  onChange={(e) => setManualDocName(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <textarea
                  rows="6"
                  placeholder="Collez ici votre documentation produit, FAQ, etc. Elle sera indexée et utilisée par l'agent pour répondre aux questions."
                  value={manualDocText}
                  onChange={(e) => setManualDocText(e.target.value)}
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

              <div className="form-group">
                <label>Couleur du widget</label>
                <div className="color-picker">
                  {WIDGET_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      className={`color-swatch${formData.color === c.value ? ' selected' : ''}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                      onClick={() => setFormData({ ...formData, color: c.value })}
                    />
                  ))}
                </div>
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
                <h3><span className="agent-color-dot" style={{ backgroundColor: agent.widget_color || '#667eea' }}></span>{agent.name || `Agent #${agent.id}`}</h3>
                <div className="agent-header-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEditAgent(agent)}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(agent.id)}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
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
                  className="btn btn-test btn-sm"
                  onClick={() => openTestChat(agent)}
                >
                  💬 Tester le Chatbot
                </button>
                <button
                  className="btn btn-report btn-sm"
                  onClick={() => openReportModal(agent.id)}
                >
                  📧 Envoyer Rapport
                </button>
              </div>

              <div className="widget-section">
                <h4>Code du Widget</h4>
                <div className="code-box">
                  <pre>{generateWidgetCode(agent.id, agent.widget_color)}</pre>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyToClipboard(generateWidgetCode(agent.id, agent.widget_color))}
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

        {reportModalAgent && (
          <div className="modal-overlay" onClick={() => setReportModalAgent(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📧 Rapport — {agents.find(a => a.id === reportModalAgent)?.name || `Agent #${reportModalAgent}`}</h2>
                <button className="modal-close" onClick={() => setReportModalAgent(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Période du rapport</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="dateRange"
                        value="all"
                        checked={reportOptions.dateRange === 'all'}
                        onChange={() => setReportOptions({ ...reportOptions, dateRange: 'all' })}
                      />
                      Toutes les discussions
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="dateRange"
                        value="custom"
                        checked={reportOptions.dateRange === 'custom'}
                        onChange={() => setReportOptions({ ...reportOptions, dateRange: 'custom' })}
                      />
                      Entre deux dates
                    </label>
                  </div>
                </div>

                {reportOptions.dateRange === 'custom' && (
                  <div className="date-range-inputs">
                    <div className="form-group">
                      <label>Date de début *</label>
                      <input
                        type="date"
                        value={reportOptions.startDate}
                        onChange={(e) => setReportOptions({ ...reportOptions, startDate: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Date de fin *</label>
                      <input
                        type="date"
                        value={reportOptions.endDate}
                        onChange={(e) => setReportOptions({ ...reportOptions, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Sujet du rapport (optionnel)</label>
                  <textarea
                    rows="3"
                    placeholder="Ex: Problèmes techniques, Réclamations, Délais de livraison...
Si vide : analyse générale de toutes les conversations.
Si rempli : rapport UNIQUEMENT sur ce sujet spécifique."
                    value={reportOptions.preferences}
                    onChange={(e) => setReportOptions({ ...reportOptions, preferences: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setReportModalAgent(null)}>
                  Annuler
                </button>
                <button
                  className="btn btn-report btn-sm"
                  onClick={submitReport}
                  disabled={sendingReport === reportModalAgent || (reportOptions.dateRange === 'custom' && (!reportOptions.startDate || !reportOptions.endDate))}
                >
                  {sendingReport === reportModalAgent ? '📨 Envoi en cours...' : '📧 Envoyer le Rapport'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export default App;
