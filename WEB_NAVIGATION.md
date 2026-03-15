# 🌐 Navigation Web et Web Scraping

## Fonctionnalités

Votre chatbot peut maintenant :

1. ✅ **Visiter des sites web** que vous lui donnez
2. ✅ **Chercher des produits** sur des sites e-commerce
3. ✅ **Extraire des informations** depuis n'importe quelle page web
4. ✅ **Indexer des sites** dans sa base de connaissances (RAG)
5. ✅ **Retourner des liens cliquables** dans ses réponses

---

## 🎯 Utilisation dans le Chat

### 1. Visiter un site web

```
Utilisateur: "Va sur https://example.com"
Bot: ✅ J'ai visité **Example Domain**

     Il s'agit d'un domaine d'exemple utilisé dans la documentation...

     **Liens utiles:**
     1. [More information...](https://www.iana.org/domains/example)

     🔗 [Ouvrir le site](https://example.com)
```

### 2. Chercher un produit

```
Utilisateur: "Trouve des chaussures Nike sur amazon.fr"
Bot: ✅ J'ai trouvé 5 résultat(s) pour "chaussures Nike":

     **1. Nike Air Max 90**
     💰 89.99€
     🔗 [Voir le produit](https://amazon.fr/...)

     **2. Nike Revolution 6**
     💰 54.99€
     🔗 [Voir le produit](https://amazon.fr/...)

     Voulez-vous que j'ouvre un de ces produits?
```

### 3. Indexer un site dans le RAG

```
Utilisateur: "Indexe le site https://monsite.com/faq pour que tu puisses répondre aux questions"
Bot: ✅ Le contenu de https://monsite.com/faq a été indexé dans la base de connaissances

     Je peux maintenant répondre à vos questions sur le contenu de ce site!
```

---

## 🔧 API Endpoints

### POST `/api/web/scrape`

Scraper une URL et extraire son contenu.

**Requête:**
```json
{
  "url": "https://example.com"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "title": "Example Domain",
    "description": "Example domain for documentation",
    "content": "...",
    "links": [...],
    "images": [...],
    "wordCount": 150
  }
}
```

---

### POST `/api/web/search-product`

Rechercher un produit sur un site e-commerce.

**Requête:**
```json
{
  "siteUrl": "https://amazon.fr",
  "productName": "chaussures Nike"
}
```

**Réponse:**
```json
{
  "success": true,
  "query": "chaussures Nike",
  "products": [
    {
      "title": "Nike Air Max 90",
      "url": "https://amazon.fr/...",
      "price": "89.99€",
      "image": "https://..."
    }
  ],
  "totalFound": 5
}
```

---

### POST `/api/web/visit`

Visiter un site et obtenir un résumé.

**Requête:**
```json
{
  "url": "https://example.com"
}
```

**Réponse:**
```json
{
  "success": true,
  "url": "https://example.com",
  "title": "Example Domain",
  "summary": "Ce site est un domaine d'exemple...",
  "links": [...],
  "wordCount": 150
}
```

---

### POST `/api/web/index-for-agent`

Indexer un site web dans le RAG d'un agent.

**Requête:**
```json
{
  "agentId": 1,
  "url": "https://example.com/faq"
}
```

**Réponse:**
```json
{
  "success": true,
  "url": "https://example.com/faq",
  "title": "FAQ - Example",
  "wordCount": 500,
  "message": "Le contenu de https://example.com/faq a été indexé dans la base de connaissances"
}
```

---

### POST `/api/web/find-links`

Trouver des liens pertinents sur une page basés sur un mot-clé.

**Requête:**
```json
{
  "url": "https://example.com",
  "keyword": "contact"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "keyword": "contact",
    "relevantLinks": [
      {
        "url": "https://example.com/contact",
        "text": "Nous contacter"
      }
    ],
    "totalLinks": 10
  }
}
```

---

## 🎨 Widget - Liens cliquables

Le widget détecte automatiquement les liens markdown dans les réponses :

**Format markdown:**
```
[Texte du lien](https://example.com)
```

**Rendu dans le widget:**
Un lien cliquable stylisé qui s'ouvre dans un nouvel onglet.

---

## 🤖 Détection automatique

Le chatbot détecte automatiquement les intentions suivantes :

1. **"va sur [url]"** → Visite le site
2. **"trouve [produit] sur [site]"** → Recherche le produit
3. **"cherche [info] sur [site]"** → Visite et indexe temporairement

### Exemples de commandes :

```
✅ "Va sur google.com"
✅ "Visite https://example.com"
✅ "Trouve des chaussures sur nike.com"
✅ "Cherche les horaires sur le site de la mairie"
✅ "Indexe le site https://docs.example.com"
```

---

## 🔒 Sécurité

- ✅ Seules les URLs HTTPS et HTTP sont autorisées
- ✅ Les liens s'ouvrent avec `rel="noopener noreferrer"`
- ✅ Protection contre l'injection HTML
- ✅ Authentification requise pour les endpoints API
- ✅ Rate limiting sur toutes les routes

---

## 📝 Sites e-commerce supportés

Le système reconnaît automatiquement les patterns de recherche pour :

- Amazon (.fr, .com, etc.)
- eBay
- Cdiscount
- Fnac
- Sites génériques avec `/search?q=`

---

## 🚀 Cas d'usage

### 1. Support client avec recherche produit

```
Client: "Je cherche la référence X123 sur votre site"
Bot: *visite le site, trouve le produit*
     🔗 [Voir le produit X123](https://votresite.com/produit/X123)
```

### 2. Documentation dynamique

```
Client: "Où puis-je trouver la documentation sur l'API ?"
Bot: *cherche dans le site de docs*
     🔗 [Documentation API](https://docs.votresite.com/api)
```

### 3. Comparaison de prix

```
Client: "Compare le prix du produit X sur Amazon et Cdiscount"
Bot: *recherche sur les deux sites*
     **Amazon:** 89.99€ 🔗 [Voir](...)
     **Cdiscount:** 79.99€ 🔗 [Voir](...)
```

---

## 🔧 Configuration avancée

### Personnaliser les sélecteurs de produits

Modifiez `webScrapingService.js` pour ajouter des sélecteurs spécifiques à vos sites :

```javascript
const productSelectors = [
  '.votre-classe-produit',
  // ...
];
```

### Ajuster le résumé GPT

Modifiez `webNavigationService.js` pour personnaliser les prompts :

```javascript
static async summarizeContent(content, title) {
  // Personnalisez le prompt GPT ici
}
```

---

## 📊 Monitoring

Tous les scraping et navigations sont loggés :

```
Logger.info(`Scraping URL: ${url}`);
Logger.success(`${products.length} produits trouvés`);
```

Consultez les logs dans le dashboard admin : `/api/logs`

---

## 🐛 Dépannage

### "Impossible de scraper l'URL"

- Vérifiez que le site est accessible (pas de protection anti-bot)
- Certains sites nécessitent du JavaScript (utilisez Puppeteer si besoin)
- Vérifiez les CORS du site distant

### "Aucun produit trouvé"

- Le site utilise peut-être des sélecteurs CSS différents
- Ajoutez des sélecteurs personnalisés dans `webScrapingService.js`
- Le site charge peut-être les produits en JavaScript

### Les liens ne s'affichent pas

- Vérifiez que le format markdown est correct : `[texte](url)`
- Reconstruisez le widget : `cd widget && node build.js`

---

## 💡 Idées d'amélioration futures

- [ ] Support de Puppeteer pour sites JavaScript
- [ ] Cache des pages scrappées
- [ ] Rafraîchissement automatique des sites indexés
- [ ] Screenshots de pages
- [ ] Extraction de tableaux et données structurées
- [ ] Support de plus de sites e-commerce

---

## 📚 Ressources

- **Services:**
  - `backend/src/services/webScrapingService.js`
  - `backend/src/services/webNavigationService.js`
- **Routes:** `backend/src/routes/web.js`
- **Widget:** `widget/src/widget.js`
- **Documentation:** Ce fichier !

---

**Bon scraping ! 🌐**
