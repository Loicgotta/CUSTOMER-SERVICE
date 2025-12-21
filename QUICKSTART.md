# 🚀 Guide de Démarrage Rapide

## Installation (5 minutes)

### Option 1 : Script automatique (Recommandé)

```bash
./install.sh
```

### Option 2 : Manuel

```bash
# 1. Installer les dépendances
npm install
cd backend && npm install
cd ../frontend && npm install
cd ../widget && npm install
cd ..

# 2. Créer le dossier data
mkdir -p backend/data

# 3. Compiler le widget
cd widget && npm run build && cd ..
```

## Démarrage

```bash
npm run dev
```

Cela démarre :
- **Backend** sur http://localhost:3001
- **Frontend** sur http://localhost:3000

## Utilisation en 3 étapes

### 1️⃣ Créer un agent

1. Ouvrez http://localhost:3000
2. Cliquez sur **"+ Créer un Agent"**
3. Remplissez :
   - **Prompt** : "Tu es un assistant service client pour [votre entreprise]. Tu dois..."
   - **Documentation** : Collez votre FAQ, documentation produit, etc.
   - **Email** : votre@email.com
4. Cliquez **"Créer l'Agent"**

### 2️⃣ Intégrer le widget

Copiez le code généré et collez-le dans votre site web avant `</body>` :

```html
<script>
  window.chatbotConfig = {
    agentId: 1,
    apiUrl: 'http://localhost:3001'
  };
</script>
<script src="http://localhost:3001/widget.js"></script>
```

### 3️⃣ Tester

Ouvrez votre site web, cliquez sur le bouton de chat en bas à droite, et discutez !

## Exemple de page de test

Créez un fichier `test.html` :

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Chatbot</title>
</head>
<body>
  <h1>Ma Page de Test</h1>
  <p>Le chatbot devrait apparaître en bas à droite</p>

  <!-- Widget Chatbot -->
  <script>
    window.chatbotConfig = {
      agentId: 1,
      apiUrl: 'http://localhost:3001'
    };
  </script>
  <script src="http://localhost:3001/widget.js"></script>
</body>
</html>
```

Ouvrez ce fichier dans votre navigateur et testez le chatbot !

## Envoi de rapports

Les rapports sont envoyés à la demande via un bouton dans l'interface.

**Pour envoyer un rapport :**

1. **Via l'interface** (recommandé) :
   - Ouvrez http://localhost:3000
   - Cliquez sur **"📧 Envoyer Rapport"** pour l'agent souhaité
   - Le rapport est généré et envoyé immédiatement à l'email configuré

2. **Via l'API** :
```bash
curl -X POST http://localhost:3001/api/reports/send/1
```

Le rapport contient un résumé intelligent de toutes les conversations récentes et sera envoyé via le webhook n8n.

## Configuration du webhook

Le webhook est déjà configuré dans `backend/.env` :

```
WEBHOOK_URL=https://n8n.srv793731.hstgr.cloud/webhook/a35df421-2774-4b32-ae32-23f0a83479a8
```

Format du rapport envoyé :

```json
[{
  "headers": {
    "content-type": "application/json"
  },
  "params": {},
  "query": {},
  "body": {
    "query": "Résumé des conversations du jour...",
    "ID": "1",
    "destinataire": "votre@email.com"
  },
  "webhookUrl": "https://n8n.srv793731.hstgr.cloud/webhook/...",
  "executionMode": "production"
}]
```

## Prochaines étapes

- Personnalisez le prompt de votre agent
- Ajoutez plus de documentation pour améliorer les réponses
- Intégrez le widget sur votre site de production
- Configurez les rapports pour votre équipe

## Besoin d'aide ?

Consultez le fichier `README.md` pour la documentation complète.

---

**Bon chatbot! 🤖**
