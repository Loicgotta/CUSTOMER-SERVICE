import axios from 'axios';
import Agent from '../models/Agent.js';
import Conversation from '../models/Conversation.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class ReportService {
  static async generateDailySummary(agentId) {
    try {
      // Récupérer les conversations de la journée
      const todayConversations = Conversation.findTodayConversations(agentId);

      if (todayConversations.length === 0) {
        return null;
      }

      // Construire le texte des conversations
      let conversationsText = 'Conversations du jour:\n\n';
      todayConversations.forEach((conv, i) => {
        conversationsText += `Conversation ${i + 1}:\n`;
        conversationsText += `Client: ${conv.user_message}\n`;
        conversationsText += `Assistant: ${conv.bot_response}\n\n`;
      });

      // Utiliser OpenAI pour créer un résumé
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant qui crée des résumés concis et structurés des conversations de service client. Identifie les sujets principaux abordés, les problèmes récurrents et les tendances importantes.'
          },
          {
            role: 'user',
            content: `Crée un résumé structuré de ces conversations:\n\n${conversationsText}`
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Erreur lors de la génération du résumé:', error);
      throw error;
    }
  }

  static async sendDailyReport(agentId) {
    try {
      const agent = Agent.findById(agentId);
      if (!agent) {
        console.error(`Agent ${agentId} non trouvé`);
        return false;
      }

      // Générer le résumé
      const summary = await this.generateDailySummary(agentId);

      if (!summary) {
        console.log(`Aucune conversation aujourd'hui pour l'agent ${agentId}`);
        return false;
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

      // Envoyer au webhook
      const response = await axios.post(process.env.WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`Rapport quotidien envoyé pour l'agent ${agentId} à ${agent.email}`);
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du rapport:', error);
      return false;
    }
  }

  static async sendAllDailyReports() {
    try {
      const agents = Agent.findAll();
      const results = [];

      for (const agent of agents) {
        const result = await this.sendDailyReport(agent.id);
        results.push({ agentId: agent.id, success: result });
      }

      return results;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de tous les rapports:', error);
      throw error;
    }
  }
}

export default ReportService;
