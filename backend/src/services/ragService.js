import OpenAI from 'openai';
import Embedding from '../models/Embedding.js';
import Logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class RAGService {
  // Découper la documentation en chunks
  static chunkText(text, chunkSize = 500) {
    const words = text.split(/\s+/);
    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push(chunk);
    }

    return chunks;
  }

  // Créer un embedding pour un texte
  static async createEmbedding(text) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      Logger.error('Erreur lors de la création de l\'embedding', error);
      throw error;
    }
  }

  // Indexer la documentation d'un agent
  static async indexDocumentation(agentId, documentation) {
    try {
      // Supprimer les anciens embeddings
      Embedding.deleteByAgentId(agentId);

      // Découper la documentation
      const chunks = this.chunkText(documentation);

      // Créer des embeddings pour chaque chunk
      for (const chunk of chunks) {
        const embedding = await this.createEmbedding(chunk);
        Embedding.create({
          agentId,
          chunkText: chunk,
          embedding
        });
      }

      Logger.success(`Documentation indexée pour l'agent ${agentId}: ${chunks.length} chunks`);
      return chunks.length;
    } catch (error) {
      Logger.error('Erreur lors de l\'indexation', error);
      throw error;
    }
  }

  // Calculer la similarité cosinus entre deux vecteurs
  static cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Rechercher les chunks les plus pertinents
  static async searchRelevantChunks(agentId, query, topK = 3) {
    try {
      // Créer l'embedding de la requête
      const queryEmbedding = await this.createEmbedding(query);

      // Récupérer tous les embeddings de l'agent
      const embeddings = Embedding.findByAgentId(agentId);

      if (embeddings.length === 0) {
        return [];
      }

      // Calculer les similarités
      const similarities = embeddings.map(emb => ({
        chunkText: emb.chunk_text,
        similarity: this.cosineSimilarity(queryEmbedding, emb.embedding)
      }));

      // Trier par similarité et prendre les top K
      similarities.sort((a, b) => b.similarity - a.similarity);
      return similarities.slice(0, topK).map(s => s.chunkText);
    } catch (error) {
      Logger.error('Erreur lors de la recherche', error);
      return [];
    }
  }
}

export default RAGService;
