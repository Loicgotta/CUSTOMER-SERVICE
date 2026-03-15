import express from 'express';
import WebScrapingService from '../services/webScrapingService.js';
import WebNavigationService from '../services/webNavigationService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Scraper une URL
router.post('/scrape', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }

    // Valider l'URL
    const validUrl = WebScrapingService.validateUrl(url);

    // Scraper
    const result = await WebScrapingService.scrapeUrl(validUrl);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Rechercher un produit sur un site
router.post('/search-product', authenticateToken, async (req, res) => {
  try {
    const { siteUrl, productName } = req.body;

    if (!siteUrl || !productName) {
      return res.status(400).json({ error: 'siteUrl et productName requis' });
    }

    const result = await WebNavigationService.searchProductOnSite(siteUrl, productName);

    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Visiter un site et obtenir un résumé
router.post('/visit', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }

    const result = await WebNavigationService.visitSite(url);

    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Indexer un site web dans le RAG d'un agent
router.post('/index-for-agent', authenticateToken, async (req, res) => {
  try {
    const { agentId, url } = req.body;

    if (!agentId || !url) {
      return res.status(400).json({ error: 'agentId et url requis' });
    }

    const result = await WebNavigationService.indexWebsiteForAgent(agentId, url);

    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Trouver des liens pertinents sur une page
router.post('/find-links', authenticateToken, async (req, res) => {
  try {
    const { url, keyword } = req.body;

    if (!url || !keyword) {
      return res.status(400).json({ error: 'url et keyword requis' });
    }

    const result = await WebScrapingService.findRelevantLinks(url, keyword);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
