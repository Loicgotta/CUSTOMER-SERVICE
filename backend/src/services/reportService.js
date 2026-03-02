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
  static async generateSummary(agentId, { startDate, endDate, preferences } = {}) {
    try {
      Logger.info(`Generation du rapport pour l'agent ${agentId} | Dates: ${startDate || 'toutes'} -> ${endDate || 'toutes'}`);

      // Recuperer les conversations selon le filtre de dates
      let conversations;
      if (startDate && endDate) {
        conversations = await Conversation.findByAgentIdAndDateRange(agentId, startDate, endDate);
      } else {
        conversations = await Conversation.findByAgentId(agentId);
      }

      if (conversations.length === 0) {
        Logger.warning(`Aucune conversation trouvee pour l'agent ${agentId}`);
        return null;
      }

      Logger.info(`${conversations.length} conversations trouvees pour l'agent ${agentId}`);

      // Construire le texte des conversations avec les dates
      let conversationsText = '';
      conversations.forEach((conv, i) => {
        const date = new Date(conv.created_at).toLocaleString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        conversationsText += `--- Conversation #${i + 1} | ${date} | Session: ${conv.session_id} ---\nClient: ${conv.user_message}\nAssistant: ${conv.bot_response}\n\n`;
      });

      // Determiner la periode pour le rapport
      const firstDate = new Date(conversations[0].created_at).toLocaleDateString('fr-FR');
      const lastDate = new Date(conversations[conversations.length - 1].created_at).toLocaleDateString('fr-FR');

      Logger.info('Analyse avec GPT-4.1...');

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: `Tu es un analyste expert en service client. Tu dois produire un rapport detaille et clair pour un responsable du service client qui n'a aucune visibilite sur les conversations quotidiennes.

${preferences ? `SUJET DU RAPPORT : "${preferences}"

Ce rapport doit traiter EXCLUSIVEMENT de ce sujet. Ignore les conversations qui ne sont pas liees a ce sujet. Toutes les sections (resume, sujets, problemes, tendances, recommandations) doivent porter UNIQUEMENT sur ce sujet specifique.` : `Ce rapport doit etre une analyse GENERALE couvrant tous les aspects des conversations.`}

Tu dois retourner UNIQUEMENT un JSON valide avec ce format exact:
{
  "resume_executif": "Un paragraphe de 3-4 phrases qui donne immediatement une vue claire de la situation${preferences ? ' concernant ' + preferences : ''}. Commence par l'essentiel : est-ce que les clients sont satisfaits ? Y a-t-il des problemes ? Qu'est-ce qui se passe en gros ?",
  "nombre_interactions": <nombre${preferences ? ' de conversations liees au sujet' : ' total'}>,
  "nombre_sessions_uniques": <nombre de session_id differents>,
  "sujets": [
    {"nom": "sujet", "pourcentage": <nombre>, "description": "En 1 phrase : de quoi s'agit concretement ces conversations"}
  ],
  "sentiments": {
    "positifs": <pourcentage>,
    "negatifs": <pourcentage>,
    "neutres": <pourcentage>,
    "detail": "Explication claire : quels clients ont exprime un avis et en quoi"
  },
  "problemes_recurrents": [
    {"probleme": "Description du probleme", "frequence": <nombre de fois que ca apparait>, "exemple": "Une vraie phrase du client qui illustre le probleme"}
  ],
  "tendances": [
    "Tendance observee sur la periode, basee uniquement sur ce qui se passe vraiment dans les conversations"
  ],
  "recommandations": [
    "Action concrete et actionnable que le responsable pourrait prendre, basee sur les donnees"
  ]
}

REGLES STRICTES :
- NE PAS inventer ou extrapoler. Tout doit etre base sur ce qui se passe reellement dans les conversations
${preferences ? `- SUJET EXCLUSIF : Analyse UNIQUEMENT les conversations liees a "${preferences}". Si aucune conversation ne traite de ce sujet, retourne nombre_interactions: 0 et des tableaux vides.` : ''}
- Les pourcentages des sujets doivent totaliser 100%
- Les pourcentages des sentiments doivent totaliser 100% (ou tous a 0 si aucun avis exprime)
- Si un client ne donne aucun avis, ne pas en inventer
- Les "exemples" dans problemes_recurrents doivent etre des vraies phrases des conversations
- Les recommandations doivent etre pratiques et realistes
- Le resume executif doit etre lisible en 10 secondes par quelqu'un qui n'a pas vu les conversations
- Retourne UNIQUEMENT le JSON, sans texte avant ou apres`
          },
          {
            role: 'user',
            content: `Analyse ces ${conversations.length} conversations du service client et produis le rapport detaille${preferences ? ` sur le sujet : "${preferences}"` : ''}.

Conversations :

${conversationsText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const statsText = response.choices[0].message.content.trim();
      Logger.info('Rapport brut recu de GPT-4.1');

      // Parser le JSON
      let stats;
      try {
        const cleanedText = statsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        stats = JSON.parse(cleanedText);
      } catch (parseError) {
        Logger.error('Erreur lors du parsing JSON', parseError);
        throw new Error('Format de rapport invalide recu de GPT-4.1');
      }

      // Formater le rapport final
      const rapport = this.formatReport(stats, firstDate, lastDate);

      Logger.success('Rapport genere avec succes');
      return rapport;
    } catch (error) {
      Logger.error('Erreur lors de la generation du rapport', error);
      throw error;
    }
  }

  static formatReport(stats, firstDate, lastDate) {
    let r = '';
    r += `RAPPORT SERVICE CLIENT\n`;
    r += `Periode : du ${firstDate} au ${lastDate}\n`;
    r += `Genere le : ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
    r += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    r += `RESUME EXECUTIF\n`;
    r += `${stats.resume_executif}\n\n`;
    r += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    r += `STATISTIQUES\n`;
    r += `• Interactions totales : ${stats.nombre_interactions}\n`;
    r += `• Sessions uniques (clients) : ${stats.nombre_sessions_uniques || 'N/A'}\n\n`;

    r += `Sujets principaux :\n`;
    stats.sujets.forEach((s, i) => {
      r += `  ${i + 1}. ${s.nom} (${s.pourcentage}%) — ${s.description}\n`;
    });

    r += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    r += `ANALYSE DES SENTIMENTS\n`;
    r += `  Positifs : ${stats.sentiments.positifs}%\n`;
    r += `  Negatifs : ${stats.sentiments.negatifs}%\n`;
    r += `  Neutres  : ${stats.sentiments.neutres}%\n`;
    r += `  ${stats.sentiments.detail}\n\n`;
    r += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (stats.problemes_recurrents && stats.problemes_recurrents.length > 0) {
      r += `PROBLEMES RECURRENTS\n`;
      stats.problemes_recurrents.forEach((p, i) => {
        r += `  ${i + 1}. ${p.probleme} (${p.frequence}x)\n`;
        r += `     "${p.exemple}"\n`;
      });
      r += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    if (stats.tendances && stats.tendances.length > 0) {
      r += `TENDANCES\n`;
      stats.tendances.forEach((t, i) => {
        r += `  ${i + 1}. ${t}\n`;
      });
      r += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    if (stats.recommandations && stats.recommandations.length > 0) {
      r += `RECOMMANDATIONS\n`;
      stats.recommandations.forEach((rec, i) => {
        r += `  ${i + 1}. ${rec}\n`;
      });
    }

    return r;
  }

  static async sendReport(agentId, { startDate, endDate, preferences } = {}, userId = null) {
    try {
      Logger.info(`Preparation de l'envoi du rapport pour l'agent ${agentId}`);

      const agent = await Agent.findById(agentId, userId);
      if (!agent) {
        Logger.error(`Agent ${agentId} non trouve ou non autorise pour l'utilisateur ${userId}`);
        return { success: false, error: 'Agent non trouve ou non autorise' };
      }

      Logger.info(`Agent trouve: ID ${agentId}`);

      // Generer le resume avec les filtres
      const summary = await this.generateSummary(agentId, { startDate, endDate, preferences });

      if (!summary) {
        Logger.warning(`Aucune conversation a rapporter pour l'agent ${agentId}`);
        return { success: false, error: 'Aucune conversation trouvee pour cette periode' };
      }

      // Preparer le payload pour le webhook
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

      Logger.success(`Rapport envoye avec succes pour l'agent ${agentId}`);
      Logger.debug('Reponse webhook', {
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
