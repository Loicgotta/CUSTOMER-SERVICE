import axios from 'axios';
import * as cheerio from 'cheerio';
import Logger from '../utils/logger.js';

class WebScrapingService {
  // Visiter une URL et extraire le contenu principal
  static async scrapeUrl(url) {
    try {
      Logger.info(`Scraping URL: ${url}`);

      // Fetch la page
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Supprimer les scripts, styles, etc.
      $('script, style, noscript, iframe').remove();

      // Extraire le titre
      const title = $('title').text().trim() || $('h1').first().text().trim();

      // Extraire la description meta
      const description = $('meta[name="description"]').attr('content') || '';

      // Extraire le contenu principal
      let mainContent = '';

      // Essayer de trouver le contenu principal (priorité aux balises sémantiques)
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.main-content',
        '#main-content',
        '.content',
        '#content',
        'body'
      ];

      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          mainContent = element.text();
          break;
        }
      }

      // Nettoyer le texte (supprimer espaces multiples, lignes vides, etc.)
      mainContent = mainContent
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      // Extraire tous les liens
      const links = [];
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        if (href && text) {
          // Convertir les liens relatifs en absolus
          const absoluteUrl = new URL(href, url).href;
          links.push({ url: absoluteUrl, text });
        }
      });

      // Extraire les images
      const images = [];
      $('img[src]').each((i, elem) => {
        const src = $(elem).attr('src');
        const alt = $(elem).attr('alt') || '';
        if (src) {
          const absoluteUrl = new URL(src, url).href;
          images.push({ url: absoluteUrl, alt });
        }
      });

      Logger.success(`Scraping réussi: ${title}`);

      return {
        url,
        title,
        description,
        content: mainContent,
        links: links.slice(0, 50), // Limiter à 50 liens
        images: images.slice(0, 20), // Limiter à 20 images
        wordCount: mainContent.split(/\s+/).length
      };
    } catch (error) {
      Logger.error(`Erreur lors du scraping de ${url}`, error);
      throw new Error(`Impossible de scraper l'URL: ${error.message}`);
    }
  }

  // Rechercher un produit sur un site e-commerce
  static async searchProduct(siteUrl, productName) {
    try {
      Logger.info(`Recherche de "${productName}" sur ${siteUrl}`);

      // Construire l'URL de recherche (patterns communs)
      let searchUrl;
      const encodedQuery = encodeURIComponent(productName);

      // Détecter le type de site et construire l'URL appropriée
      if (siteUrl.includes('amazon')) {
        searchUrl = `${siteUrl}/s?k=${encodedQuery}`;
      } else if (siteUrl.includes('ebay')) {
        searchUrl = `${siteUrl}/sch/i.html?_nkw=${encodedQuery}`;
      } else if (siteUrl.includes('cdiscount')) {
        searchUrl = `${siteUrl}/search/10/${encodedQuery}.html`;
      } else if (siteUrl.includes('fnac')) {
        searchUrl = `${siteUrl}/SearchResult/ResultList.aspx?Search=${encodedQuery}`;
      } else {
        // Pattern générique
        searchUrl = `${siteUrl}/search?q=${encodedQuery}`;
      }

      // Scraper la page de résultats
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);

      // Extraire les produits (patterns communs)
      const products = [];

      // Sélecteurs communs pour les produits
      const productSelectors = [
        '.product',
        '.item',
        '[data-component-type="s-search-result"]', // Amazon
        '.s-item', // eBay
        'article',
        '.product-item',
        '.product-card'
      ];

      let foundProducts = false;
      for (const selector of productSelectors) {
        const items = $(selector);
        if (items.length > 0) {
          items.slice(0, 10).each((i, elem) => {
            const $elem = $(elem);

            // Trouver le titre
            const titleSelectors = ['h2', 'h3', '.product-title', '.title', 'a'];
            let title = '';
            for (const titleSel of titleSelectors) {
              title = $elem.find(titleSel).first().text().trim();
              if (title) break;
            }

            // Trouver le lien
            const link = $elem.find('a[href]').first().attr('href');

            // Trouver le prix
            const priceSelectors = ['.price', '.product-price', '[data-price]', '.a-price'];
            let price = '';
            for (const priceSel of priceSelectors) {
              price = $elem.find(priceSel).first().text().trim();
              if (price) break;
            }

            // Trouver l'image
            const image = $elem.find('img').first().attr('src');

            if (title && link) {
              const absoluteUrl = new URL(link, searchUrl).href;
              products.push({
                title,
                url: absoluteUrl,
                price: price || 'Prix non disponible',
                image: image ? new URL(image, searchUrl).href : null
              });
              foundProducts = true;
            }
          });

          if (foundProducts) break;
        }
      }

      Logger.success(`${products.length} produits trouvés pour "${productName}"`);

      return {
        query: productName,
        searchUrl,
        products,
        found: products.length > 0
      };
    } catch (error) {
      Logger.error(`Erreur lors de la recherche de produit`, error);
      throw new Error(`Impossible de rechercher le produit: ${error.message}`);
    }
  }

  // Extraire les liens pertinents d'une page basés sur un mot-clé
  static async findRelevantLinks(url, keyword) {
    try {
      const scraped = await this.scrapeUrl(url);

      // Filtrer les liens pertinents
      const relevantLinks = scraped.links.filter(link =>
        link.text.toLowerCase().includes(keyword.toLowerCase()) ||
        link.url.toLowerCase().includes(keyword.toLowerCase())
      );

      return {
        url,
        keyword,
        relevantLinks: relevantLinks.slice(0, 10),
        totalLinks: scraped.links.length
      };
    } catch (error) {
      Logger.error(`Erreur lors de la recherche de liens`, error);
      throw error;
    }
  }

  // Valider et nettoyer une URL
  static validateUrl(urlString) {
    try {
      const url = new URL(urlString);
      // Vérifier que c'est HTTP ou HTTPS
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Seuls les protocoles HTTP et HTTPS sont supportés');
      }
      return url.href;
    } catch (error) {
      throw new Error('URL invalide');
    }
  }

  // Extraire le nom de domaine d'une URL
  static getDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return null;
    }
  }

  // Convertir le contenu scrappé en format adapté au RAG
  static formatForRAG(scrapedData) {
    const { title, description, content, url } = scrapedData;

    return {
      name: title || this.getDomain(url),
      content: `Source: ${url}\n\nTitre: ${title}\n\n${description ? description + '\n\n' : ''}${content}`,
      metadata: {
        url,
        scrapedAt: new Date().toISOString(),
        wordCount: scrapedData.wordCount
      }
    };
  }
}

export default WebScrapingService;
