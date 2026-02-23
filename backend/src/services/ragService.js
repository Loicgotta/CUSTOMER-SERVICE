import OpenAI from 'openai';
import Embedding from '../models/Embedding.js';
import Logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class RAGService {
  // Découper la documentation en chunks avec overlap
  static chunkText(text, chunkSize = 300, overlap = 75) {
    const words = text.split(/\s+/);
    const chunks = [];

    // Calculer le pas (step) en tenant compte de l'overlap
    const step = chunkSize - overlap;

    for (let i = 0; i < words.length; i += step) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
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

  // Indexer la documentation d'un agent (accepte un array de documents)
  static async indexDocumentation(agentId, documents) {
    try {
      // documents = [{ name: string, content: string }] ou string (legacy)
      const docsArray = Array.isArray(documents)
        ? documents
        : [{ name: 'Documentation', content: documents }];

      // Supprimer les anciens embeddings
      Embedding.deleteByAgentId(agentId);

      let totalChunks = 0;

      // Indexer chaque document séparément
      for (const doc of docsArray) {
        if (!doc.content || doc.content.trim().length === 0) continue;

        // Découper le document
        const chunks = this.chunkText(doc.content);

        // Créer des embeddings pour chaque chunk avec le nom du document
        for (const chunk of chunks) {
          const embedding = await this.createEmbedding(chunk);
          Embedding.create({
            agentId,
            chunkText: chunk,
            embedding,
            documentName: doc.name || 'Documentation'
          });
        }

        totalChunks += chunks.length;
        Logger.info(`Document "${doc.name}" indexé: ${chunks.length} chunks`);
      }

      Logger.success(`Documentation indexée pour l'agent ${agentId}: ${totalChunks} chunks total (${docsArray.length} documents)`);
      return totalChunks;
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

  // Rechercher les chunks les plus pertinents (avec filtre optionnel par document)
  static async searchRelevantChunks(agentId, query, topK = 3, documentName = null) {
    try {
      // Créer l'embedding de la requête
      const queryEmbedding = await this.createEmbedding(query);

      // Récupérer les embeddings de l'agent (filtrés par document si spécifié)
      const embeddings = Embedding.findByAgentId(agentId, documentName);

      if (embeddings.length === 0) {
        return [];
      }

      // Calculer les similarités
      const similarities = embeddings.map(emb => ({
        chunkText: emb.chunk_text,
        documentName: emb.document_name,
        similarity: this.cosineSimilarity(queryEmbedding, emb.embedding)
      }));

      // Trier par similarité et prendre les top K
      similarities.sort((a, b) => b.similarity - a.similarity);
      const results = similarities.slice(0, topK);

      if (documentName) {
        Logger.info(`Recherche RAG filtrée par document "${documentName}": ${results.length} chunks trouvés`);
      }

      return results.map(s => ({ text: s.chunkText, source: s.documentName }));
    } catch (error) {
      Logger.error('Erreur lors de la recherche', error);
      return [];
    }
  }
}

export default RAGService;
