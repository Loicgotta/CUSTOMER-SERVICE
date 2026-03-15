import OpenAI from 'openai';
import WebScrapingService from './webScrapingService.js';
import RAGService from './ragService.js';
import Logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class WebNavigationService {
  // Détecter si le message demande une navigation web
  static async detectWebNavigationIntent(userMessage) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [{
          role: 'system',
          content: `Tu es un détecteur d'intentions de navigation web.

Détecte si l'utilisateur demande:
1. D'aller sur un site web spécifique (ex: "va sur google.com", "visite amazon.fr")
2. De chercher un produit sur un site (ex: "trouve des chaussures sur nike.com")
3. De chercher une information sur un site (ex: "cherche les horaires sur le site")

Retourne un JSON avec cette structure:
{
  "intent": "visit_site" | "search_product" | "search_info" | "none",
  "url": "l'URL complète si mentionnée (ajoute https:// si absent)",
  "query": "le produit ou l'info recherchée",
  "confidence": 0-1
}

Si aucune intention web n'est détectée, retourne: {"intent": "none", "confidence": 0}`
        }, {
          role: 'user',
          content: userMessage
        }],
        temperature: 0,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      Logger.info('Intention web détectée:', result);

      return result;
    } catch (error) {
      Logger.error('Erreur détection intention web', error);
      return { intent: 'none', confidence: 0 };
    }
  }

  // Visiter un site et retourner un résumé
  static async visitSite(url) {
    try {
      // Valider l'URL
      const validUrl = WebScrapingService.validateUrl(url);

      // Scraper le site
      const scraped = await WebScrapingService.scrapeUrl(validUrl);

      // Créer un résumé avec GPT
      const summary = await this.summarizeContent(scraped.content, scraped.title);

      return {
        success: true,
        url: validUrl,
        title: scraped.title,
        summary,
        links: scraped.links.slice(0, 5), // Top 5 liens
        wordCount: scraped.wordCount
      };
    } catch (error) {
      Logger.error(`Erreur visite site ${url}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Chercher un produit sur un site e-commerce
  static async searchProductOnSite(siteUrl, productName) {
    try {
      // Valider l'URL
      const validUrl = WebScrapingService.validateUrl(siteUrl);

      // Rechercher le produit
      const searchResults = await WebScrapingService.searchProduct(validUrl, productName);

      if (!searchResults.found || searchResults.products.length === 0) {
        return {
          success: false,
          message: `Aucun produit trouvé pour "${productName}" sur ${WebScrapingService.getDomain(validUrl)}`
        };
      }

      // Retourner les meilleurs résultats
      return {
        success: true,
        query: productName,
        siteUrl: validUrl,
        products: searchResults.products.slice(0, 5),
        totalFound: searchResults.products.length
      };
    } catch (error) {
      Logger.error(`Erreur recherche produit`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Résumer le contenu d'une page avec GPT
  static async summarizeContent(content, title) {
    try {
      // Limiter le contenu pour ne pas dépasser les tokens
      const truncatedContent = content.slice(0, 3000);

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [{
          role: 'system',
          content: 'Tu es un assistant qui résume le contenu de pages web de manière concise et informative. Résume en 2-3 phrases maximum.'
        }, {
          role: 'user',
          content: `Titre: ${title}\n\nContenu:\n${truncatedContent}\n\nRésume cette page web:`
        }],
        temperature: 0.5,
        max_tokens: 150
      });

      return response.choices[0].message.content;
    } catch (error) {
      Logger.error('Erreur résumé contenu', error);
      return 'Résumé non disponible';
    }
  }

  // Indexer un site web dans le RAG d'un agent
  static async indexWebsiteForAgent(agentId, url) {
    try {
      Logger.info(`Indexation du site ${url} pour l'agent ${agentId}`);

      // Scraper le site
      const scraped = await WebScrapingService.scrapeUrl(url);

      // Formater pour le RAG
      const ragDocument = WebScrapingService.formatForRAG(scraped);

      // Indexer dans le RAG
      await RAGService.indexDocumentation(agentId, [ragDocument]);

      Logger.success(`Site ${url} indexé avec succès`);

      return {
        success: true,
        url,
        title: scraped.title,
        wordCount: scraped.wordCount,
        message: `Le contenu de ${url} a été indexé dans la base de connaissances`
      };
    } catch (error) {
      Logger.error(`Erreur indexation site ${url}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Formater la réponse pour le chatbot avec URLs cliquables
  static formatResponseWithUrls(navigationResult, userMessage) {
    if (!navigationResult.success) {
      return `❌ Je n'ai pas pu accéder au site: ${navigationResult.error || navigationResult.message}`;
    }

    let response = '';

    // Cas: Visite simple d'un site
    if (navigationResult.title && navigationResult.summary) {
      response += `✅ J'ai visité **${navigationResult.title}**\n\n`;
      response += `${navigationResult.summary}\n\n`;

      if (navigationResult.links && navigationResult.links.length > 0) {
        response += `**Liens utiles:**\n`;
        navigationResult.links.forEach((link, i) => {
          response += `${i + 1}. [${link.text}](${link.url})\n`;
        });
        response += '\n';
      }

      response += `🔗 [Ouvrir le site](${navigationResult.url})`;
    }

    // Cas: Recherche de produit
    if (navigationResult.products && navigationResult.products.length > 0) {
      response += `✅ J'ai trouvé ${navigationResult.totalFound} résultat(s) pour "${navigationResult.query}":\n\n`;

      navigationResult.products.forEach((product, i) => {
        response += `**${i + 1}. ${product.title}**\n`;
        response += `💰 ${product.price}\n`;
        response += `🔗 [Voir le produit](${product.url})\n\n`;
      });

      response += `Voulez-vous que j'ouvre un de ces produits?`;
    }

    // Cas: Indexation
    if (navigationResult.message && navigationResult.message.includes('indexé')) {
      response += `✅ ${navigationResult.message}\n\n`;
      response += `Je peux maintenant répondre à vos questions sur le contenu de ce site!`;
    }

    return response;
  }

  // Traiter une demande de navigation web
  static async processWebNavigationRequest(userMessage, agentId = null) {
    try {
      // Détecter l'intention
      const intent = await this.detectWebNavigationIntent(userMessage);

      if (intent.intent === 'none' || intent.confidence < 0.5) {
        return null; // Pas de navigation web demandée
      }

      let result;

      switch (intent.intent) {
        case 'visit_site':
          result = await this.visitSite(intent.url);
          break;

        case 'search_product':
          result = await this.searchProductOnSite(intent.url, intent.query);
          break;

        case 'search_info':
          // Visiter le site et chercher l'info
          result = await this.visitSite(intent.url);
          if (result.success && agentId) {
            // Optionnel: indexer temporairement pour mieux répondre
            await this.indexWebsiteForAgent(agentId, intent.url);
          }
          break;

        default:
          return null;
      }

      // Formater la réponse
      const formattedResponse = this.formatResponseWithUrls(result, userMessage);

      return {
        handled: true,
        response: formattedResponse,
        navigationResult: result
      };
    } catch (error) {
      Logger.error('Erreur traitement navigation web', error);
      return null;
    }
  }
}

export default WebNavigationService;
