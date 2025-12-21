import axios from 'axios';
import Agent from '../models/Agent.js';
import Conversation from '../models/Conversation.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import Logger from '../utils/logger.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class ReportService {
  static async generateSummary(agentId, limit = 100) {
    try {
      Logger.info(`Génération du rapport statistique pour l'agent ${agentId}`);

      // Récupérer toutes les conversations récentes (limité à 100 par défaut)
      const conversations = Conversation.findByAgentId(agentId, limit);

      if (conversations.length === 0) {
        Logger.warning(`Aucune conversation trouvée pour l'agent ${agentId}`);
        return null;
      }

      Logger.info(`${conversations.length} conversations trouvées pour l'agent ${agentId}`);

      // Construire le texte des conversations pour analyse
      let conversationsText = '';
      conversations.forEach((conv, i) => {
        conversationsText += `Message ${i + 1}:\nClient: ${conv.user_message}\nAssistant: ${conv.bot_response}\n\n`;
      });

      Logger.info('Analyse des conversations avec GPT-4 pour extraction de statistiques...');

      // Utiliser OpenAI pour extraire les statistiques
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Tu es un analyste de données qui extrait des statistiques précises des conversations de service client.
Tu dois retourner UNIQUEMENT un JSON valide avec ce format exact:
{
  "nombre_interactions": <nombre>,
  "sujets": [
    {"nom": "sujet1", "pourcentage": <nombre>},
    {"nom": "sujet2", "pourcentage": <nombre>}
  ],
  "sentiments": {
    "positifs": <pourcentage>,
    "negatifs": <pourcentage>,
    "neutres": <pourcentage>
  }
}

Règles:
- Les pourcentages des sujets doivent totaliser 100%
- Les pourcentages des sentiments doivent totaliser 100%
- Identifie entre 3 et 7 sujets principaux
- Analyse le sentiment de chaque message client (positif/négatif/neutre)
- Retourne UNIQUEMENT le JSON, sans texte avant ou après`
          },
          {
            role: 'user',
            content: `Analyse ces ${conversations.length} conversations et extrait les statistiques:\n\n${conversationsText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const statsText = response.choices[0].message.content.trim();
      Logger.info('Statistiques brutes reçues de GPT-4');

      // Parser le JSON
      let stats;
      try {
        // Nettoyer le texte (enlever les backticks markdown si présents)
        const cleanedText = statsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        stats = JSON.parse(cleanedText);
      } catch (parseError) {
        Logger.error('Erreur lors du parsing JSON des statistiques', parseError);
        Logger.info('Texte reçu:', statsText);
        throw new Error('Format de statistiques invalide reçu de GPT-4');
      }

      // Formater le rapport final
      const rapport = this.formatStatisticsReport(stats, conversations.length);

      Logger.success('Rapport statistique généré avec succès');
      return rapport;
    } catch (error) {
      Logger.error('Erreur lors de la génération du rapport statistique', error);
      throw error;
    }
  }

  static formatStatisticsReport(stats, totalConversations) {
    let rapport = `📊 RAPPORT STATISTIQUE\n\n`;
    rapport += `📈 Nombre d'interactions : ${stats.nombre_interactions || totalConversations}\n\n`;

    rapport += `📋 SUJETS ABORDÉS :\n`;
    stats.sujets.forEach((sujet, index) => {
      rapport += `${index + 1}. ${sujet.nom} : ${sujet.pourcentage}%\n`;
    });

    rapport += `\n😊 ANALYSE DES SENTIMENTS :\n`;
    rapport += `✅ Avis positifs : ${stats.sentiments.positifs}%\n`;
    rapport += `❌ Avis négatifs : ${stats.sentiments.negatifs}%\n`;
    rapport += `➖ Avis neutres : ${stats.sentiments.neutres}%\n`;

    return rapport;
  }

  static async sendReport(agentId) {
    try {
      Logger.info(`Préparation de l'envoi du rapport pour l'agent ${agentId}`);

      const agent = Agent.findById(agentId);
      if (!agent) {
        Logger.error(`Agent ${agentId} non trouvé`);
        return { success: false, error: 'Agent non trouvé' };
      }

      Logger.info(`Agent trouvé: ${agent.email}`);

      // Générer le résumé
      const summary = await this.generateSummary(agentId);

      if (!summary) {
        Logger.warning(`Aucune conversation à rapporter pour l'agent ${agentId}`);
        return { success: false, error: 'Aucune conversation à rapporter' };
      }

      // Préparer le payload pour le webhook
      const payload = [
        {
          headers: {
            'content-type': 'application/json'
          },
          params: {},
          query: {},
          body: {
            query: summary,
            ID: agentId.toString(),
            destinataire: agent.email
          },
          webhookUrl: process.env.WEBHOOK_URL,
          executionMode: 'production'
        }
      ];

      Logger.info(`Envoi du rapport au webhook: ${process.env.WEBHOOK_URL}`);
      Logger.debug('Payload webhook', payload);

      // Envoyer au webhook
      const response = await axios.post(process.env.WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 secondes de timeout
      });

      Logger.success(`Rapport envoyé avec succès pour l'agent ${agentId} à ${agent.email}`);
      Logger.debug('Réponse webhook', {
        status: response.status,
        data: response.data
      });

      return {
        success: true,
        email: agent.email,
        conversationCount: summary.split('Conversation').length - 1
      };
    } catch (error) {
      Logger.error(`Erreur lors de l'envoi du rapport pour l'agent ${agentId}`, error);
      return {
        success: false,
        error: error.message,
        details: error.response ? error.response.data : null
      };
    }
  }
}

export default ReportService;
