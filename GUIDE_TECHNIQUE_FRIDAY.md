# Guide Technique — Integration Customer Service dans Friday

> Document destine a l'equipe technique pour comprendre l'architecture du module Customer Service et l'integrer dans la plateforme Friday.

---

## Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture du projet](#2-architecture-du-projet)
3. [Schema de la base de donnees](#3-schema-de-la-base-de-donnees)
4. [Backend — Structure detaillee](#4-backend--structure-detaillee)
5. [Services metier (coeur de l'IA)](#5-services-metier-coeur-de-lia)
6. [API Endpoints — Reference complete](#6-api-endpoints--reference-complete)
7. [Widget embeddable](#7-widget-embeddable)
8. [Frontend Dashboard](#8-frontend-dashboard)
9. [Securite et middleware](#9-securite-et-middleware)
10. [Integration dans Friday](#10-integration-dans-friday)
11. [Variables d'environnement](#11-variables-denvironnement)
12. [Commandes de demarrage](#12-commandes-de-demarrage)

---

## 1. Vue d'ensemble

Le module Customer Service est une plateforme de chatbots IA pour le service client. Chaque utilisateur Friday peut creer des **agents** (chatbots) qui :

- Repondent aux clients via un **widget embeddable** sur n'importe quel site
- Utilisent du **RAG** (Retrieval-Augmented Generation) pour repondre a partir de la documentation uploadee
- Generent des **rapports intelligents** envoyes par email via webhook n8n
- Sont geres via un **dashboard React**

**Stack technique :**

| Couche       | Technologie                    |
|--------------|-------------------------------|
| API          | Node.js + Express             |
| Base         | PostgreSQL                     |
| IA           | OpenAI GPT-4.1                |
| Embeddings   | OpenAI text-embedding-3-small |
| Frontend     | React 18 + Vite               |
| Widget       | Vanilla JS (IIFE, ~10KB)      |
| Auth         | JWT + bcryptjs                 |
| Rapports     | Webhook n8n                    |

---

## 2. Architecture du projet

```
CUSTOMER-SERVICE/
├── package.json                  # Workspace racine (npm workspaces)
│
├── backend/
│   ├── .env                      # Config environnement
│   ├── public/
│   │   └── widget.js             # Widget compile (servi en statique)
│   └── src/
│       ├── server.js             # Point d'entree Express
│       ├── database/
│       │   └── db.js             # Connexion PostgreSQL + init schema
│       ├── models/
│       │   ├── Agent.js          # CRUD agents
│       │   ├── User.js           # CRUD utilisateurs + hash passwords
│       │   ├── Conversation.js   # Historique des conversations
│       │   └── Embedding.js      # Stockage des vecteurs RAG
│       ├── routes/
│       │   ├── auth.js           # Register, login, logout, RGPD
│       │   ├── agents.js         # Gestion des agents
│       │   ├── chat.js           # Endpoint public (widget)
│       │   ├── docs.js           # Upload et extraction de documents
│       │   ├── admin.js          # Panel admin
│       │   └── prompt.js         # Amelioration de prompt via IA
│       ├── services/
│       │   ├── chatService.js    # Pipeline de traitement des messages
│       │   ├── ragService.js     # Indexation + recherche semantique
│       │   └── reportService.js  # Generation de rapports + webhook
│       ├── middleware/
│       │   └── auth.js           # Verification JWT + admin check
│       └── utils/
│           └── logger.js         # Logging centralise (buffer memoire)
│
├── frontend/
│   └── src/
│       ├── App.jsx               # Dashboard principal
│       ├── Login.jsx             # Authentification
│       └── Admin.jsx             # Panel admin
│
└── widget/
    ├── build.js                  # Script de build esbuild
    └── src/
        └── widget.js             # Source du widget chat
```

---

## 3. Schema de la base de donnees

```sql
-- Utilisateurs de la plateforme
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_admin BOOLEAN DEFAULT FALSE
);

-- Agents (chatbots) — lies a un utilisateur
CREATE TABLE agents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT DEFAULT NULL,
  prompt TEXT NOT NULL,              -- Instructions systeme de l'agent
  documentation TEXT,                 -- Documentation brute (legacy)
  email TEXT NOT NULL,                -- Email pour recevoir les rapports
  widget_color TEXT DEFAULT '#667eea',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historique des conversations
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  session_id TEXT NOT NULL,           -- UUID identifiant une session visiteur
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vecteurs d'embeddings pour le RAG
CREATE TABLE embeddings (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  chunk_text TEXT NOT NULL,           -- Morceau de documentation
  embedding TEXT NOT NULL,            -- Vecteur serialise en JSON
  document_name TEXT DEFAULT 'Documentation',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rapports quotidiens
CREATE TABLE daily_reports (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  report_date DATE NOT NULL,
  report_content TEXT NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configuration systeme (stocke JWT_SECRET, etc.)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Relations :**
- `users` 1→N `agents` (CASCADE on delete)
- `agents` 1→N `conversations`
- `agents` 1→N `embeddings`
- `agents` 1→N `daily_reports`

> **Note pour Friday :** Les tables sont creees automatiquement au demarrage via `db.js`. Pas besoin de migration manuelle. Si Friday utilise deja PostgreSQL, ces tables peuvent coexister dans la meme base ou dans un schema dedie.

---

## 4. Backend — Structure detaillee

### 4.1 Point d'entree (`server.js`)

Le serveur Express configure :
1. **Helmet** — Headers de securite HTTP
2. **CORS granulaire** — Restrictif pour les routes protegees, ouvert pour `/api/chat` et `/widget.js`
3. **Rate limiting** — Anti brute-force sur `/api/auth`, anti-spam sur `/api/chat`, global anti-DDoS
4. **Routes** — Chaque domaine a son routeur dedie
5. **Frontend React** — Servi en statique depuis `frontend/dist/`

### 4.2 Models (couche donnees)

Chaque model est une classe statique avec des methodes async qui utilisent `pg.Pool` :

| Model             | Methodes principales                                                         |
|-------------------|-----------------------------------------------------------------------------|
| `Agent`           | `create()`, `findById(id, userId?)`, `findAll(userId?)`, `update()`, `delete()` |
| `User`            | `create()`, `findByEmail()`, `verifyPassword()`, `updateActivity()`, `delete()` |
| `Conversation`    | `create()`, `findBySessionId()`, `findByAgentId()`, `findByAgentIdAndDateRange()` |
| `Embedding`       | `create()`, `findByAgentId(id, docName?)`, `deleteByAgentId()`, `getDocumentNames()` |

> **Pattern utilise :** Pas d'ORM (pas de Prisma/Sequelize). Requetes SQL parametrees directes via `pg`. Simple, performant, pas de magie.

---

## 5. Services metier (coeur de l'IA)

### 5.1 ChatService — Pipeline de traitement des messages

Fichier : `backend/src/services/chatService.js`

```
Message utilisateur
       │
       ▼
┌─────────────────────┐
│  Charger l'agent    │  Agent.findById(agentId)
│  (prompt + config)  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Detecter document  │  GPT verifie si le message mentionne
│  mentionne          │  un document specifique
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Recherche RAG      │  RAGService.searchRelevantChunks()
│  (top 5 chunks)     │  Similarite cosinus sur les embeddings
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Charger historique  │  Conversation.findBySessionId()
│  (50 derniers msg)   │  Contexte de la conversation
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Construire prompt  │  agent.prompt + chunks RAG + historique
│  systeme complet    │  + regles de securite anti-injection
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Appel GPT-4.1      │  temperature: 0.7, max_tokens: 500
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Sauvegarder        │  Conversation.create()
│  + Retourner        │
└─────────────────────┘
```

### 5.2 RAGService — Indexation et recherche semantique

Fichier : `backend/src/services/ragService.js`

**Indexation (`indexDocumentation`)** :
1. Decoupe le texte en **chunks de 300 mots** avec **overlap de 75 mots**
2. Genere un embedding par chunk via `text-embedding-3-small`
3. Stocke le vecteur + texte en base (table `embeddings`)

**Recherche (`searchRelevantChunks`)** :
1. Genere l'embedding de la question utilisateur
2. Calcule la **similarite cosinus** avec tous les embeddings de l'agent
3. Retourne les **top K** chunks les plus pertinents (defaut: 3-5)

> **Note :** Les embeddings sont stockes comme des strings JSON dans PostgreSQL. Pas besoin de pgvector. La similarite cosinus est calculee en JS. Cela fonctionne bien jusqu'a ~10K chunks. Pour une echelle superieure, migrer vers pgvector.

### 5.3 ReportService — Rapports intelligents

Fichier : `backend/src/services/reportService.js`

1. Recupere les conversations (filtrables par date, max 500)
2. Envoie a GPT-4.1 avec un schema JSON precis
3. GPT retourne : resume executif, statistiques, sujets, sentiments, problemes recurrents, tendances, recommandations
4. Formate le rapport en texte lisible
5. Envoie au **webhook n8n** qui gere l'envoi email

**Payload webhook :**
```json
[{
  "body": {
    "query": "<rapport formate>",
    "ID": "42",
    "destinataire": "manager@entreprise.com"
  },
  "webhookUrl": "https://n8n.example.com/webhook/mail-rapport"
}]
```

---

## 6. API Endpoints — Reference complete

### 6.1 Authentification (`/api/auth`) — Rate limited 10/15min

| Methode | Route              | Auth | Description                        |
|---------|--------------------|------|------------------------------------|
| POST    | `/register`        | Non  | Inscription (email, password, name)|
| POST    | `/login`           | Non  | Connexion → retourne JWT           |
| GET     | `/me`              | Oui  | Info utilisateur courant           |
| POST    | `/logout`          | Non  | Deconnexion (client-side)          |
| DELETE  | `/account`         | Oui  | Suppression compte (RGPD)         |
| GET     | `/export`          | Oui  | Export donnees (RGPD)             |

### 6.2 Agents (`/api/agents`) — Protege JWT

| Methode | Route              | Description                                    |
|---------|--------------------|------------------------------------------------|
| POST    | `/`                | Creer un agent (prompt, documentation, email)  |
| GET     | `/`                | Lister ses agents                              |
| GET     | `/:id`             | Details d'un agent                             |
| GET     | `/:id/documents`   | Lister les documents indexes d'un agent        |
| PUT     | `/:id`             | Modifier un agent                              |
| DELETE  | `/:id`             | Supprimer un agent + donnees associees         |

### 6.3 Chat (`/api/chat`) — Public (widget)

| Methode | Route                   | Rate Limit   | Description                      |
|---------|-------------------------|-------------|----------------------------------|
| POST    | `/message`              | 20/min      | Envoyer un message au chatbot    |
| GET     | `/history/:sessionId`   | 10/min      | Historique d'une session         |
| GET     | `/agent/:agentId`       | JWT requis  | Toutes les conversations d'un agent |

**Corps de `/message` :**
```json
{
  "agentId": 1,
  "sessionId": "uuid-optionnel",
  "message": "Bonjour, j'ai un probleme..."
}
```

**Reponse :**
```json
{
  "sessionId": "generated-or-provided-uuid",
  "response": "Bonjour ! Comment puis-je vous aider ?"
}
```

### 6.4 Documents (`/api/docs`) — Protege JWT

| Methode | Route       | Description                                |
|---------|-------------|--------------------------------------------|
| POST    | `/extract`  | Upload + extraction de texte (PDF, DOCX, XLSX, TXT, CSV, JSON) |

### 6.5 Rapports (`/api/reports`) — Protege JWT

| Methode | Route              | Description                                     |
|---------|--------------------|-------------------------------------------------|
| POST    | `/send/:agentId`   | Generer et envoyer un rapport par email         |

**Corps optionnel :**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-03-08",
  "preferences": "problemes de livraison"
}
```

### 6.6 Admin (`/api/admin`) — JWT + Admin requis

| Methode | Route              | Description                       |
|---------|--------------------|-----------------------------------|
| GET     | `/users`           | Lister tous les utilisateurs      |
| GET     | `/stats`           | Statistiques globales             |
| DELETE  | `/users/:id`       | Supprimer un utilisateur          |

---

## 7. Widget embeddable

### 7.1 Fonctionnement

Le widget est un fichier JS autonome (~10KB) en IIFE (Immediately Invoked Function Expression). Zero dependance. Il cree son propre HTML/CSS et communique avec l'API via `fetch`.

### 7.2 Integration sur un site tiers

```html
<script>
  window.chatbotConfig = {
    agentId: 42,                           // ID de l'agent dans la base
    apiUrl: 'https://votre-domaine.com',   // URL du backend
    widgetColor: '#667eea'                 // Couleur du widget (optionnel)
  };
</script>
<script src="https://votre-domaine.com/widget.js"></script>
```

### 7.3 Build du widget

```bash
cd widget && npm run build
```

Utilise **esbuild** pour minifier `widget/src/widget.js` → `backend/public/widget.js`.

### 7.4 Comportement

- Bouton flottant en bas a droite
- Fenetre de chat avec header, zone de messages, input
- **Effet typewriter** sur les reponses du bot (5ms/caractere)
- Auto-resize du textarea
- Sessions identifiees par UUID genere cote client
- Mobile responsive (breakpoint 480px)

---

## 8. Frontend Dashboard

Le dashboard React (`frontend/src/App.jsx`) permet :

- **Gestion des agents** : creer, modifier, supprimer des chatbots
- **Upload de documentation** : coller du texte ou uploader des fichiers (PDF, DOCX, XLSX)
- **Test du chat** : tester l'agent directement dans le dashboard
- **Rapports** : generer et envoyer des rapports avec filtres (dates, sujet)
- **Code widget** : copier le snippet d'integration
- **Panel admin** : gestion des utilisateurs (si admin)

---

## 9. Securite et middleware

### 9.1 Authentification JWT

- Token genere au login avec expiration **7 jours**
- Middleware `authenticateToken` verifie le token + l'existence de l'utilisateur + timeout d'inactivite (7 jours)
- Middleware `requireAdmin` verifie le flag `is_admin`

### 9.2 Protections

| Protection           | Implementation                                          |
|---------------------|--------------------------------------------------------|
| Injection SQL       | Requetes parametrees (`$1, $2, ...`) partout            |
| Brute force         | Rate limiting sur `/api/auth` (10 tentatives/15min)     |
| Spam chat           | Rate limiting sur `/api/chat` (20 messages/min)         |
| DDoS leger          | Rate limiting global (200 requetes/min)                 |
| XSS                 | Helmet.js headers                                       |
| CORS                | Restrictif pour routes protegees, ouvert pour widget    |
| Enumeration sessions| Rate limiting + validation UUID sur historique          |
| Injection de prompt | Instructions de securite injectees dans le prompt systeme|
| RGPD                | Endpoints d'export et suppression de donnees            |

---

## 10. Integration dans Friday

### 10.1 Ce que Friday a deja

Friday dispose d'une plateforme d'agents existante avec :
- Des agents presents dans la plateforme
- Une base de donnees organisee
- Un systeme d'authentification

### 10.2 Strategie d'integration

#### Option A : Module autonome (recommande pour commencer)

Deployer le Customer Service comme un **microservice separe** qui partage la base PostgreSQL de Friday :

1. **Base de donnees** : Creer les tables `agents`, `conversations`, `embeddings`, `daily_reports` dans la base Friday (ou dans un schema dedie `CREATE SCHEMA customer_service`)
2. **Lien utilisateurs** : Remplacer la table `users` locale par une reference aux utilisateurs Friday (`user_id` dans la table `agents` pointe vers la table users de Friday)
3. **Auth** : Remplacer le middleware JWT local par le systeme d'auth de Friday (le middleware dans `backend/src/middleware/auth.js` est facilement remplacable)
4. **Widget** : Le widget reste identique, il communique uniquement via `POST /api/chat/message`

```
Friday Platform
├── Auth existante ──────────────────┐
├── Agents existants                 │
├── Base de donnees ─────────────┐   │
│                                │   │
│   Customer Service Module      │   │
│   ├── /api/chat   (public)  ◄──┤   │
│   ├── /api/agents (protege) ◄──┤───┘
│   ├── /api/docs   (protege) ◄──┤───┘
│   └── /api/reports (protege)◄──┤───┘
│                                │
│   Tables ajoutees :            │
│   ├── agents (user_id → Friday users)
│   ├── conversations            │
│   ├── embeddings               │
│   └── daily_reports            │
└────────────────────────────────┘
```

#### Option B : Integration profonde

Fusionner les routes et services directement dans le backend Friday :

1. **Copier les services** : `chatService.js`, `ragService.js`, `reportService.js` dans le repertoire services de Friday
2. **Copier les models** : `Agent.js`, `Conversation.js`, `Embedding.js` (adapter les imports du pool PostgreSQL)
3. **Monter les routes** : Ajouter les routeurs dans le serveur Express de Friday
4. **Widget** : Servir `widget.js` depuis le dossier static de Friday

### 10.3 Points de connexion avec Friday

#### Lier les agents Customer Service aux agents Friday

Si Friday a deja un concept d'agents, ajouter une colonne :

```sql
ALTER TABLE agents ADD COLUMN friday_agent_id INTEGER REFERENCES friday_agents(id);
```

Cela permet de lier un chatbot Customer Service a un agent Friday existant.

#### API minimale a exposer

Pour que le widget fonctionne, **un seul endpoint est necessaire** :

```
POST /api/chat/message
Body: { agentId, sessionId, message }
Response: { sessionId, response }
```

Tout le reste (dashboard, rapports, admin) peut etre integre progressivement.

### 10.4 Modifications necessaires

| Fichier                     | Modification                                              |
|-----------------------------|----------------------------------------------------------|
| `middleware/auth.js`        | Remplacer par le systeme d'auth Friday                    |
| `database/db.js`            | Utiliser le pool PostgreSQL de Friday                     |
| `models/User.js`            | Supprimer (utiliser le modele User de Friday)             |
| `models/Agent.js`           | Adapter `user_id` pour pointer vers les users Friday      |
| `server.js`                 | Monter les routes dans le serveur Friday existant         |
| `services/reportService.js` | Adapter l'URL du webhook si Friday a son propre systeme email |

### 10.5 Migration des donnees existantes

Si des agents et conversations existent deja, les migrer avec :

```sql
-- Exporter les agents existants
INSERT INTO customer_service.agents (user_id, name, prompt, documentation, email, widget_color)
SELECT friday_user_id, name, prompt, documentation, email, '#667eea'
FROM existing_agents;
```

### 10.6 Dependances npm a ajouter dans Friday

```json
{
  "openai": "^4.x",
  "express-rate-limit": "^7.x",
  "multer": "^1.x",
  "pdf-parse": "^1.x",
  "mammoth": "^1.x",
  "xlsx": "^0.18.x",
  "uuid": "^9.x"
}
```

(Les dependances `express`, `pg`, `bcryptjs`, `helmet`, `cors` sont probablement deja dans Friday.)

---

## 11. Variables d'environnement

```bash
# OBLIGATOIRE — Connexion PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database

# OBLIGATOIRE — Cle API OpenAI (pour le chat + RAG + rapports)
OPENAI_API_KEY=sk-proj-...

# Port du serveur (defaut: 3001)
PORT=3001

# Webhook pour l'envoi des rapports par email
WEBHOOK_URL=https://n8n.example.com/webhook/mail-rapport

# Compte admin (cree automatiquement au demarrage)
ADMIN_EMAIL=admin@friday.com
ADMIN_PASSWORD=MotDePasseSecurise!

# JWT Secret (genere automatiquement si absent, stocke en base)
# JWT_SECRET=...

# Origins autorisees pour CORS (separees par des virgules)
ALLOWED_ORIGINS=https://friday.com,https://app.friday.com
```

---

## 12. Commandes de demarrage

```bash
# Installation complete
npm run install-all

# Developpement (backend + frontend en parallele)
npm run dev

# Build production (backend + frontend + widget)
npm run build

# Demarrage production
npm start

# Build du widget uniquement
cd widget && npm run build

# Creer le compte admin manuellement
cd backend && node src/scripts/createAdmin.js
```

---

## Recap pour ton associe

**Pour integrer rapidement dans Friday :**

1. Ajouter les 4 tables SQL dans la base Friday (section 3)
2. Copier `services/` et `models/` (sauf User.js) dans le backend Friday
3. Monter les routes `/api/chat` et `/api/agents` dans le serveur Express
4. Adapter `middleware/auth.js` pour utiliser l'auth Friday
5. Servir `widget.js` en statique
6. Ajouter `OPENAI_API_KEY` aux variables d'environnement
7. Tester avec le widget sur une page HTML de test

**L'endpoint critique est `POST /api/chat/message`** — c'est le seul dont le widget a besoin pour fonctionner. Tout le reste peut etre integre au fur et a mesure.
