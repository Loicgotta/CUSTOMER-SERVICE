# 🤖 Plateforme de Chatbots Service Client

Plateforme complète pour créer et gérer des chatbots de service client intelligents avec RAG (Retrieval Augmented Generation) et rapports quotidiens automatisés.

## ✨ Fonctionnalités

- **🎯 Création d'agents personnalisés** : Définissez le comportement de votre chatbot avec un prompt personnalisé
- **📚 Documentation RAG** : Indexation automatique de votre documentation pour des réponses précises
- **💬 Widget embeddable** : Intégrez facilement le chat sur votre site web
- **📊 Rapports quotidiens** : Recevez un résumé des conversations par email chaque jour à 18h
- **💾 Historique des conversations** : Toutes les interactions sont sauvegardées et analysées
- **🔒 Sessions persistantes** : Les utilisateurs peuvent reprendre leurs conversations

## 🏗️ Architecture

Le projet est organisé en 3 modules :

```
CUSTOMER-SERVICE/
├── backend/          # API Node.js + Express
│   ├── src/
│   │   ├── database/     # SQLite database
│   │   ├── models/       # Modèles de données
│   │   ├── routes/       # Routes API
│   │   ├── services/     # Services (RAG, Chat, Reports)
│   │   └── server.js     # Serveur principal
│   └── package.json
│
├── frontend/         # Interface web React
│   ├── src/
│   │   ├── App.jsx       # Composant principal
│   │   └── App.css       # Styles
│   └── package.json
│
└── widget/          # Widget embeddable
    ├── src/
    │   └── widget.js     # Code du widget
    └── package.json
```

## 🚀 Installation

### Prérequis

- Node.js 18+ et npm
- Une clé API OpenAI

### Étapes d'installation

1. **Cloner le projet**
```bash
cd CUSTOMER-SERVICE
```

2. **Installer les dépendances**
```bash
# Installer les dépendances du projet racine
npm install

# Installer les dépendances de chaque module
cd backend && npm install
cd ../frontend && npm install
cd ../widget && npm install
cd ..
```

3. **Configurer les variables d'environnement**

Le fichier `.env` est déjà configuré dans `backend/.env` avec :
- La clé API OpenAI
- L'URL du webhook pour les rapports
- Le port du serveur (3001)

4. **Créer le dossier data pour la base de données**
```bash
mkdir -p backend/data
```

5. **Compiler le widget**
```bash
cd widget
npm run build
cd ..
```

## ▶️ Démarrage

### Méthode 1 : Tout démarrer en même temps

```bash
npm run dev
```

Cette commande démarre le backend et le frontend simultanément.

### Méthode 2 : Démarrer séparément

**Terminal 1 - Backend** :
```bash
cd backend
npm run dev
```
Le serveur démarre sur http://localhost:3001

**Terminal 2 - Frontend** :
```bash
cd frontend
npm run dev
```
L'interface démarre sur http://localhost:3000

## 📖 Guide d'utilisation

### 1. Créer un agent

1. Ouvrez l'interface web : http://localhost:3000
2. Cliquez sur **"+ Créer un Agent"**
3. Remplissez le formulaire :
   - **Prompt** : Instructions pour le chatbot (ex: "Tu es un assistant service client pour une boutique en ligne...")
   - **Documentation** : Votre documentation produit, FAQ, etc. (sera indexée automatiquement)
   - **Email** : Adresse email pour recevoir les rapports quotidiens
4. Cliquez sur **"Créer l'Agent"**

### 2. Intégrer le widget sur votre site

Une fois l'agent créé, vous recevez un code d'intégration :

```html
<!-- Widget Chatbot -->
<script>
  window.chatbotConfig = {
    agentId: 1,
    apiUrl: 'http://localhost:3001'
  };
</script>
<script src="http://localhost:3001/widget.js"></script>
```

Copiez ce code et collez-le **juste avant la balise `</body>`** de votre site web.

### 3. Tester le widget

Le widget apparaît en bas à droite de votre page. Cliquez dessus pour ouvrir le chat et tester !

### 4. Rapports quotidiens

Chaque jour à 18h00, le système :
1. Génère automatiquement un résumé des conversations du jour
2. Envoie ce résumé à l'email configuré via le webhook n8n
3. Le rapport contient :
   - Les principaux sujets abordés
   - Les problèmes récurrents
   - Les tendances importantes

### 5. Envoi manuel d'un rapport

Pour tester l'envoi de rapport immédiatement :

```bash
curl -X POST http://localhost:3001/api/reports/send/1
```
(Remplacez `1` par l'ID de votre agent)

## 🔧 API Endpoints

### Agents

- **POST** `/api/agents` - Créer un agent
- **GET** `/api/agents` - Lister tous les agents
- **GET** `/api/agents/:id` - Récupérer un agent
- **PUT** `/api/agents/:id` - Mettre à jour un agent
- **DELETE** `/api/agents/:id` - Supprimer un agent

### Chat

- **POST** `/api/chat/message` - Envoyer un message
  ```json
  {
    "agentId": 1,
    "sessionId": "uuid-optional",
    "message": "Bonjour, j'ai une question"
  }
  ```

- **GET** `/api/chat/history/:sessionId` - Historique d'une session
- **GET** `/api/chat/agent/:agentId` - Toutes les conversations d'un agent

### Rapports

- **POST** `/api/reports/send/:agentId` - Envoyer manuellement un rapport

## 🤖 Comment fonctionne le RAG

1. **Indexation** : Quand vous ajoutez de la documentation, elle est :
   - Découpée en chunks de 500 mots
   - Convertie en embeddings avec OpenAI (text-embedding-3-small)
   - Stockée dans la base de données

2. **Recherche** : Quand un utilisateur pose une question :
   - La question est convertie en embedding
   - Les chunks les plus similaires sont retrouvés (similarité cosinus)
   - Les 3 meilleurs chunks sont ajoutés au contexte

3. **Réponse** : Le chatbot répond en utilisant :
   - Le prompt personnalisé
   - La documentation pertinente
   - L'historique de conversation
   - GPT-4 pour générer une réponse cohérente

## 📊 Structure de la base de données

- **agents** : Configuration des agents (prompt, email, documentation)
- **conversations** : Historique de toutes les conversations
- **embeddings** : Vecteurs d'embeddings de la documentation
- **daily_reports** : Rapports quotidiens générés

## 🎨 Personnalisation du widget

Le widget peut être personnalisé en modifiant `widget/src/widget.js` :

- Couleurs : Modifiez les gradients CSS
- Position : Changez `bottom` et `right` dans les styles
- Taille : Ajustez `width` et `height` de `#chatbot-window`
- Icône : Remplacez le SVG dans le bouton

Après modification, recompilez :
```bash
cd widget
npm run build
```

## 🔐 Sécurité

⚠️ **Important** : Cette version est pour le développement local.

Pour la production :
- Utilisez HTTPS
- Sécurisez votre clé API (variables d'environnement)
- Ajoutez de l'authentification
- Limitez les requêtes (rate limiting)
- Validez toutes les entrées utilisateur

## 🐛 Dépannage

### Le widget ne s'affiche pas

1. Vérifiez que le backend est démarré
2. Vérifiez que le widget est compilé : `ls backend/public/widget.js`
3. Vérifiez la console navigateur pour les erreurs CORS

### Les rapports ne s'envoient pas

1. Vérifiez l'URL du webhook dans `backend/.env`
2. Testez manuellement : `curl -X POST http://localhost:3001/api/reports/send/1`
3. Vérifiez les logs du serveur

### Erreur de base de données

1. Vérifiez que le dossier `backend/data` existe
2. Supprimez `backend/data/chatbot.db` et redémarrez le serveur

## 📝 Licence

MIT

## 🤝 Support

Pour toute question ou problème, créez une issue sur le repository.

---

Développé avec ❤️ pour améliorer le service client
