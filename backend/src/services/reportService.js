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
      Logger.info(`Génération du rapport pour l'agent ${agentId}`);

      // Récupérer toutes les conversations récentes (limité à 100 par défaut)
      const conversations = Conversation.findByAgentId(agentId, limit);

      if (conversations.length === 0) {
        Logger.warning(`Aucune conversation trouvée pour l'agent ${agentId}`);
        return null;
      }

      Logger.info(`${conversations.length} conversations trouvées pour l'agent ${agentId}`);

      // Construire le texte des conversations
      let conversationsText = `Rapport des conversations (${conversations.length} messages):\n\n`;
      conversations.forEach((conv, i) => {
        conversationsText += `Conversation ${i + 1} (${new Date(conv.created_at).toLocaleString()}):\n`;
        conversationsText += `Client: ${conv.user_message}\n`;
        conversationsText += `Assistant: ${conv.bot_response}\n\n`;
      });

      Logger.info('Génération du résumé avec GPT-4...');

      // Utiliser OpenAI pour créer un résumé
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant qui crée des résumés concis et structurés des conversations de service client. Identifie les sujets principaux abordés, les problèmes récurrents et les tendances importantes. Fournis des statistiques et des insights utiles.'
          },
          {
            role: 'user',
            content: `Crée un résumé structuré de ces conversations:\n\n${conversationsText}`
          }
        ],
        temperature: 0.5,
        max_tokens: 1500
      });

      Logger.success('Résumé généré avec succès');
      return response.choices[0].message.content;
    } catch (error) {
      Logger.error('Erreur lors de la génération du résumé', error);
      throw error;
    }
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
