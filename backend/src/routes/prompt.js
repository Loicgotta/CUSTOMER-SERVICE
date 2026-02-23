import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/prompt/enhance — Améliorer un prompt d'agent
router.post('/enhance', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt manquant' });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en conception de chatbots de service client. Ton rôle est d'améliorer les prompts donnés par les utilisateurs pour créer des agents de service client plus performants.

Quand tu reçois un prompt, tu dois :
1. Conserver l'intention et le domaine d'activité de l'utilisateur
2. Rendre le ton plus professionnel et bienveillant
3. Ajouter des instructions précises sur la gestion des situations difficiles (clients mécontents, questions sans réponse, etc.)
4. Préciser la personnalité de l'agent (empathique, efficace, clair)
5. Ajouter des instructions pour orienter vers un humain si nécessaire
6. Conserver la langue du prompt original

Retourne UNIQUEMENT le prompt amélioré, sans explication ni commentaire autour.`
        },
        {
          role: 'user',
          content: `Améliore ce prompt d'agent de service client :\n\n${prompt}`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const enhanced = response.choices[0].message.content.trim();
    res.json({ enhanced });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'amélioration du prompt", details: error.message });
  }
});

export default router;
