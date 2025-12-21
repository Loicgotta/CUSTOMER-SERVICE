# Guide d'Intégration - Plateforme Chatbot Service Client

## 📋 Vue d'ensemble

Ce guide explique comment intégrer le système de chatbot actuel dans n'importe quelle interface utilisateur. Le backend est déjà développé et fournit toutes les API nécessaires pour gérer des agents, des conversations, des rapports et des logs.

## 🏗️ Architecture

### Backend
- **Framework**: Express.js (Node.js)
- **Base de données**: SQLite avec better-sqlite3
- **IA**: OpenAI GPT-4o avec système RAG (Retrieval Augmented Generation)
- **Port par défaut**: 3001

### Fonctionnalités principales
1. Gestion des agents (création, modification, suppression)
2. Système RAG pour indexation de documentation
3. Chat en temps réel avec contexte
4. Génération de rapports statistiques
5. Système de logs complet
6. Widget embeddable pour sites web

---

## 🚀 Démarrage du Backend

### Installation
```bash
cd backend
npm install
```

### Configuration (.env)
Créez un fichier `.env` avec:
```env
OPENAI_API_KEY=votre_clé_api_openai
PORT=3001
WEBHOOK_URL=https://n8n.srv793731.hstgr.cloud/webhook/mail-rapport
```

### Lancement
```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3001`

---

## 📡 API Endpoints

### 1. Gestion des Agents

#### Créer un agent
```http
POST /api/agents
Content-Type: application/json

{
  "email": "agent@example.com",
  "prompt": "Tu es un assistant service client qui aide...",
  "documentation": "Guide complet du produit:\n1. Installation...\n2. Configuration..."
}
```

**Réponse**:
```json
{
  "id": 1,
  "email": "agent@example.com",
  "prompt": "Tu es un assistant...",
  "documentation": "Guide complet...",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

#### Récupérer tous les agents
```http
GET /api/agents
```

**Réponse**:
```json
[
  {
    "id": 1,
    "email": "agent1@example.com",
    "prompt": "...",
    "documentation": "...",
    "created_at": "..."
  },
  {
    "id": 2,
    "email": "agent2@example.com",
    ...
  }
]
```

#### Récupérer un agent spécifique
```http
GET /api/agents/:id
```

#### Mettre à jour un agent
```http
PUT /api/agents/:id
Content-Type: application/json

{
  "email": "nouveau@example.com",
  "prompt": "Nouveau prompt...",
  "documentation": "Nouvelle documentation..."
}
```

#### Supprimer un agent
```http
DELETE /api/agents/:id
```

---

### 2. Chat / Conversations

#### Envoyer un message
```http
POST /api/chat
Content-Type: application/json

{
  "agentId": 1,
  "sessionId": "unique-session-id-123",
  "message": "Comment installer le produit?"
}
```

**Réponse**:
```json
{
  "response": "Pour installer le produit, suivez ces étapes:\n1. Téléchargez...\n2. Installez..."
}
```

**Notes importantes**:
- Le `sessionId` doit être unique par conversation/utilisateur
- Générez-le côté frontend (ex: UUID v4)
- Le système maintient l'historique par session
- Le RAG récupère automatiquement la documentation pertinente

#### Récupérer l'historique d'une session
```http
GET /api/conversations/:sessionId
```

**Réponse**:
```json
[
  {
    "id": 1,
    "agent_id": 1,
    "session_id": "unique-session-id-123",
    "user_message": "Comment installer?",
    "bot_response": "Pour installer...",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 3. Rapports Statistiques

#### Envoyer un rapport par email
```http
POST /api/reports/send/:agentId
```

**Réponse**:
```json
{
  "success": true,
  "email": "agent@example.com",
  "conversationCount": 42
}
```

**Format du rapport** (envoyé par webhook n8n):
- 📊 Nombre d'interactions
- 📋 Sujets abordés avec pourcentages
- 😊 Analyse des sentiments (positif/négatif/neutre)

**Caractéristiques**:
- Analyse factuelle sans extrapolation
- Ne compte que les sujets explicitement discutés
- Indique clairement quand aucun avis n'est exprimé
- Utilise GPT-4o pour l'analyse

---

### 4. Logs Système

#### Récupérer les logs
```http
GET /api/logs
```

**Réponse**:
```json
[
  {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "level": "error",
    "message": "Erreur lors du traitement",
    "error": {
      "message": "API timeout",
      "stack": "Error: API timeout\n    at...",
      "statusCode": 500
    }
  },
  {
    "timestamp": "2024-01-15T10:29:00.000Z",
    "level": "success",
    "message": "Rapport envoyé avec succès"
  }
]
```

#### Effacer les logs
```http
DELETE /api/logs
```

**Notes**:
- Les logs sont stockés en mémoire (100 derniers)
- Auto-refresh recommandé toutes les 3 secondes
- Affiche les erreurs complètes avec stack traces

---

### 5. Widget Embeddable

Le widget est disponible dans `/widget/widget.js` et peut être intégré sur n'importe quel site.

#### Intégration sur un site web
```html
<!-- Sur le site du client -->
<script src="http://localhost:3001/widget.js"></script>
<script>
  ChatWidget.init({
    agentId: 1,
    apiUrl: 'http://localhost:3001'
  });
</script>
```

Le widget crée automatiquement:
- Une bulle de chat en bas à droite
- Une fenêtre de conversation
- Un sessionId unique par utilisateur
- Un historique de conversation persistant

---

## 🎨 Implémentation de l'Interface Utilisateur

### Composants recommandés

#### 1. Liste des Agents
Afficher tous les agents avec leurs informations:

```javascript
// Exemple de chargement des agents
async function loadAgents() {
  const response = await fetch('http://localhost:3001/api/agents');
  const agents = await response.json();

  // Afficher dans votre interface
  agents.forEach(agent => {
    // Créer une carte pour chaque agent
    // Afficher: email, ID, boutons d'action
  });
}
```

**Boutons recommandés par agent**:
- ✏️ Modifier
- 🗑️ Supprimer
- 📧 Envoyer Rapport
- 💬 Tester le Chat

#### 2. Formulaire de Création/Modification d'Agent

**Champs requis**:
- Email (type: email)
- Prompt système (textarea, large)
- Documentation (textarea, très large pour contenu RAG)

**Exemple de création**:
```javascript
async function createAgent(email, prompt, documentation) {
  const response = await fetch('http://localhost:3001/api/agents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      prompt,
      documentation
    })
  });

  const newAgent = await response.json();
  return newAgent;
}
```

#### 3. Interface de Chat de Test

Pour tester un agent en temps réel:

```javascript
// Générer un sessionId unique
const sessionId = crypto.randomUUID();

async function sendMessage(agentId, message) {
  const response = await fetch('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      agentId,
      sessionId,
      message
    })
  });

  const data = await response.json();
  return data.response;
}

// Affichage des messages
function displayMessage(sender, text) {
  // sender: 'user' ou 'bot'
  // text: contenu du message
  // Ajouter à votre interface de chat
}
```

#### 4. Affichage des Logs

Avec auto-refresh:

```javascript
let logsVisible = false;

async function loadLogs() {
  const response = await fetch('http://localhost:3001/api/logs');
  const logs = await response.json();

  // Afficher les logs dans votre interface
  displayLogs(logs);
}

// Auto-refresh toutes les 3 secondes
setInterval(() => {
  if (logsVisible) {
    loadLogs();
  }
}, 3000);

// Bouton pour effacer les logs
async function clearLogs() {
  await fetch('http://localhost:3001/api/logs', {
    method: 'DELETE'
  });
  loadLogs();
}
```

**Affichage recommandé**:
- Timestamp formaté
- Badge de couleur selon le niveau (error=rouge, success=vert, info=bleu, warning=orange)
- Message principal
- Détails de l'erreur si présents (stack trace dans un bloc expandable)

#### 5. Bouton d'Envoi de Rapport

```javascript
async function sendReport(agentId) {
  const response = await fetch(`http://localhost:3001/api/reports/send/${agentId}`, {
    method: 'POST'
  });

  const result = await response.json();

  if (result.success) {
    // Afficher: "Rapport envoyé à {email}"
    showSuccessMessage(`Rapport envoyé à ${result.email}`);
  } else {
    // Afficher l'erreur
    showErrorMessage(result.error);
  }
}
```

---

## 🎯 Fonctionnalités Clés à Implémenter

### Dashboard Principal
1. **Liste des agents**
   - Carte par agent avec ID, email
   - Boutons: Modifier, Supprimer, Envoyer Rapport

2. **Bouton "Créer un Agent"**
   - Ouvre un formulaire/modal
   - Champs: email, prompt, documentation

3. **Section Logs** (optionnel, collapsible)
   - Toggle pour afficher/masquer
   - Auto-refresh toutes les 3 secondes
   - Bouton "Effacer les logs"

### Page de Test de Chat (optionnel)
- Sélection de l'agent
- Zone de conversation
- Input pour envoyer des messages
- Affichage de l'historique

---

## 📊 Flux de Données

### Création d'un Agent avec RAG
```
1. Utilisateur remplit le formulaire
   ↓
2. Frontend → POST /api/agents
   ↓
3. Backend crée l'agent dans SQLite
   ↓
4. Backend indexe la documentation avec OpenAI embeddings
   ↓
5. Chunks stockés dans la table embeddings
   ↓
6. Agent prêt à recevoir des messages
```

### Traitement d'un Message Chat
```
1. Utilisateur envoie un message
   ↓
2. Frontend → POST /api/chat {agentId, sessionId, message}
   ↓
3. Backend récupère l'agent et son prompt
   ↓
4. RAG recherche les chunks pertinents (cosine similarity)
   ↓
5. Contexte construit: prompt + documentation pertinente + historique
   ↓
6. Envoi à GPT-4o
   ↓
7. Réponse générée
   ↓
8. Conversation sauvegardée dans SQLite
   ↓
9. Instructions de feedback appliquées:
   - Après aide: "Est-ce que je peux faire autre chose?"
   - Si résolu: "Comment avez-vous trouvé l'expérience?"
   ↓
10. Réponse retournée au frontend
```

### Génération de Rapport
```
1. Clic sur "Envoyer Rapport"
   ↓
2. Frontend → POST /api/reports/send/:agentId
   ↓
3. Backend récupère les 100 dernières conversations
   ↓
4. GPT-4o analyse et génère des statistiques JSON
   ↓
5. Rapport formaté en texte
   ↓
6. Envoi via webhook n8n
   ↓
7. Email envoyé à l'agent
```

---

## 🔧 Structures de Données

### Agent
```typescript
interface Agent {
  id: number;
  email: string;
  prompt: string;
  documentation: string;
  created_at: string;
}
```

### Conversation
```typescript
interface Conversation {
  id: number;
  agent_id: number;
  session_id: string;
  user_message: string;
  bot_response: string;
  created_at: string;
}
```

### Log
```typescript
interface Log {
  timestamp: string;
  level: 'error' | 'success' | 'info' | 'warning';
  message: string;
  error?: {
    message: string;
    stack: string;
    statusCode?: number;
    response?: any;
  };
}
```

### Rapport Statistique (format généré)
```typescript
interface ReportStats {
  nombre_interactions: number;
  sujets: Array<{
    nom: string;
    pourcentage: number;
  }>;
  sentiments: {
    positifs: number;
    negatifs: number;
    neutres: number;
  };
}
```

---

## 🎨 Recommandations UI/UX

### Design
- **Style moderne**: Utilisez des cartes (cards) pour les agents
- **Couleurs**:
  - Success: Vert (#4CAF50)
  - Error: Rouge (#F44336)
  - Info: Bleu (#2196F3)
  - Warning: Orange (#FF9800)
- **Icônes**: Utilisez une librairie d'icônes (Font Awesome, Material Icons, etc.)

### Layout
```
┌─────────────────────────────────────────┐
│  Titre: Plateforme Chatbot              │
│  [Créer un Agent]    [Toggle Logs]      │
├─────────────────────────────────────────┤
│                                          │
│  Agent #1                 Agent #2       │
│  ┌──────────────┐        ┌──────────┐   │
│  │ ID: 1        │        │ ID: 2    │   │
│  │ Email: ...   │        │ Email: ..│   │
│  │              │        │          │   │
│  │ [Modifier]   │        │ [Modifier]   │
│  │ [Supprimer]  │        │ [Supprimer]  │
│  │ [Rapport]    │        │ [Rapport]    │
│  └──────────────┘        └──────────┘   │
│                                          │
├─────────────────────────────────────────┤
│  📋 LOGS (collapsible)                   │
│  [Effacer les logs]                      │
│                                          │
│  • [10:30:15] SUCCESS: Rapport envoyé   │
│  • [10:28:42] ERROR: API timeout        │
│    └─ Stack trace...                     │
└─────────────────────────────────────────┘
```

### Interactions
- **Confirmation** pour les actions destructives (supprimer)
- **Notifications** (toast/snackbar) pour les succès/erreurs
- **Loading states** pendant les requêtes API
- **Validation** des formulaires avant envoi

---

## 🔒 Sécurité

### CORS
Le backend a CORS activé. Pour production, configurez les origines autorisées:

```javascript
// Dans backend/src/server.js
app.use(cors({
  origin: ['https://votre-domaine.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

### Validation
- Validez toujours les entrées côté frontend
- Le backend valide également les données
- Ne jamais exposer la clé API OpenAI côté frontend

### Rate Limiting (à implémenter si besoin)
```javascript
// Exemple avec express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite par IP
});

app.use('/api/', limiter);
```

---

## 📱 Responsive Design

Recommandations pour mobile:
- Liste d'agents en colonne unique sur mobile
- Formulaires full-width
- Boutons suffisamment grands (min 44x44px)
- Chat interface optimisée pour touch

---

## 🧪 Tests

### Test manuel des endpoints
Utilisez Postman, Insomnia ou curl:

```bash
# Créer un agent
curl -X POST http://localhost:3001/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "prompt": "Tu es un assistant...",
    "documentation": "Guide produit..."
  }'

# Envoyer un message
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": 1,
    "sessionId": "test-session-123",
    "message": "Bonjour"
  }'
```

---

## 🚦 Checklist d'Intégration

- [ ] Backend démarré et accessible
- [ ] Variables d'environnement configurées (.env)
- [ ] Connexion API testée (GET /api/agents)
- [ ] Interface pour lister les agents
- [ ] Formulaire de création d'agent
- [ ] Formulaire de modification d'agent
- [ ] Fonction de suppression d'agent
- [ ] Bouton d'envoi de rapport par agent
- [ ] Interface de chat de test (optionnel)
- [ ] Affichage des logs avec auto-refresh
- [ ] Gestion des erreurs et loading states
- [ ] Notifications utilisateur (success/error)
- [ ] Design responsive
- [ ] Test complet du flux utilisateur

---

## 💡 Exemples de Frameworks Frontend

Ce backend est compatible avec n'importe quel framework:

### React
```jsx
import { useState, useEffect } from 'react';

function AgentList() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/agents')
      .then(res => res.json())
      .then(data => setAgents(data));
  }, []);

  return (
    <div>
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
```

### Vue.js
```vue
<template>
  <div>
    <AgentCard
      v-for="agent in agents"
      :key="agent.id"
      :agent="agent"
    />
  </div>
</template>

<script>
export default {
  data() {
    return { agents: [] };
  },
  async mounted() {
    const response = await fetch('http://localhost:3001/api/agents');
    this.agents = await response.json();
  }
}
</script>
```

### Vanilla JavaScript
```javascript
async function loadAgents() {
  const response = await fetch('http://localhost:3001/api/agents');
  const agents = await response.json();

  const container = document.getElementById('agents-container');
  container.innerHTML = agents.map(agent => `
    <div class="agent-card">
      <h3>Agent #${agent.id}</h3>
      <p>${agent.email}</p>
      <button onclick="editAgent(${agent.id})">Modifier</button>
      <button onclick="deleteAgent(${agent.id})">Supprimer</button>
      <button onclick="sendReport(${agent.id})">Rapport</button>
    </div>
  `).join('');
}
```

---

## 📞 Support et Documentation Technique

### Structure du Projet
```
CUSTOMER-SERVICE/
├── backend/
│   ├── src/
│   │   ├── models/          # Agent, Conversation, Embedding
│   │   ├── services/        # Chat, RAG, Report
│   │   ├── utils/           # Logger
│   │   └── server.js        # Point d'entrée
│   ├── database/
│   │   └── chatbot.db       # SQLite database
│   └── .env                 # Configuration (local only)
├── frontend/                # Interface React de référence
├── widget/                  # Widget embeddable
└── GUIDE_INTEGRATION.md     # Ce fichier
```

### Modèle GPT-4o
Le système utilise **GPT-4o** pour:
- Génération de réponses chat
- Analyse statistique des conversations
- Extraction de sujets et sentiments

### Système RAG
- **Embeddings**: text-embedding-3-small (OpenAI)
- **Chunks**: 500 tokens par chunk
- **Recherche**: Cosine similarity (top 3 chunks)
- **Contexte**: Automatiquement injecté dans chaque réponse

### Limites et Quotas
- **Conversations**: Historique limité aux 10 derniers messages par session
- **Rapports**: Analyse des 100 dernières conversations
- **Logs**: Stockage des 100 derniers logs
- **Tokens GPT**: max_tokens=500 pour chat, 1000 pour rapports

---

## 🎓 Bonnes Pratiques

1. **SessionId**: Générez toujours un UUID unique par conversation
2. **Error Handling**: Enveloppez tous les appels API dans try/catch
3. **Loading States**: Affichez des spinners pendant les requêtes
4. **Feedback Utilisateur**: Utilisez des notifications pour chaque action
5. **Validation**: Validez les champs avant d'envoyer au backend
6. **Documentation**: Encouragez les utilisateurs à fournir une documentation riche pour le RAG
7. **Prompts**: Guidez les utilisateurs à écrire des prompts clairs et spécifiques

---

## 📈 Évolutions Futures Possibles

- Authentification utilisateur (JWT)
- Gestion multi-tenant
- Analytics et métriques avancées
- Export de conversations en CSV/PDF
- A/B testing de prompts
- Intégration avec d'autres LLM
- Support multilingue
- Templates de prompts pré-configurés

---

**Version du guide**: 1.0
**Dernière mise à jour**: 2024
**Backend compatible**: v1.0+
