import OpenAI from 'openai';
import Agent from '../models/Agent.js';
import Conversation from '../models/Conversation.js';
import RAGService from './ragService.js';
import Logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class ChatService {
  static async processMessage(agentId, sessionId, userMessage) {
    try {
      // Récupérer l'agent
      const agent = Agent.findById(agentId);
      if (!agent) {
        throw new Error('Agent non trouvé');
      }

      // Récupérer les chunks pertinents de la documentation
      const relevantChunks = await RAGService.searchRelevantChunks(agentId, userMessage);

      // Récupérer l'historique de conversation de la session
      const conversationHistory = Conversation.findBySessionId(sessionId);

      // Construire le contexte avec la documentation
      let context = agent.prompt + '\n\n';

      if (relevantChunks.length > 0) {
        context += 'Documentation pertinente:\n';
        relevantChunks.forEach((chunk, i) => {
          context += `${i + 1}. ${chunk}\n\n`;
        });
      }

      context += `\n\nInstructions de suivi:
- Après avoir aidé un client et résolu son problème, demande-lui: "Est-ce que je peux faire autre chose pour vous?"
- Si le client répond que tout est résolu (oui, c'est tout, non merci, etc.), demande-lui: "Comment avez-vous trouvé l'expérience?" pour collecter son feedback.`;

      // Construire les messages pour OpenAI
      const messages = [
        {
          role: 'system',
          content: context
        }
      ];

      // Ajouter l'historique (limité aux 10 derniers messages)
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach(conv => {
        messages.push({
          role: 'user',
          content: conv.user_message
        });
        messages.push({
          role: 'assistant',
          content: conv.bot_response
        });
      });

      // Ajouter le message actuel
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Appeler OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      });

      const botResponse = response.choices[0].message.content;

      // Sauvegarder la conversation
      Conversation.create({
        agentId,
        sessionId,
        userMessage,
        botResponse
      });

      Logger.info(`Message traité avec succès - Agent: ${agentId}, Session: ${sessionId}`);
      return botResponse;
    } catch (error) {
      Logger.error(`Erreur lors du traitement du message - Agent: ${agentId}, Session: ${sessionId}`, error);
      throw error;
    }
  }
}

export default ChatService;
