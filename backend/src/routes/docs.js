import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import { createRequire } from 'module';
import Logger from '../utils/logger.js';

// pdf-parse ne supporte pas l'import ESM natif
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');

// Le module pdf-parse peut s'utiliser directement ou via PDFParse
// On va tester les deux approches
Logger.info(`📄 [INIT] Type de pdfParseModule: ${typeof pdfParseModule}`);
Logger.info(`📄 [INIT] Keys de pdfParseModule: ${Object.keys(pdfParseModule).join(', ')}`);

const router = express.Router();

// Limite : 10 Mo par fichier
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/extract', upload.single('file'), async (req, res) => {
  Logger.info('📄 [DOCS] Début extraction de document');

  try {
    if (!req.file) {
      Logger.error('📄 [DOCS] Aucun fichier reçu');
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    const { buffer, originalname, size } = req.file;
    Logger.info(`📄 [DOCS] Fichier reçu: ${originalname} (${(size / 1024).toFixed(2)} KB)`);

    const ext = originalname.split('.').pop().toLowerCase();
    Logger.info(`📄 [DOCS] Extension détectée: .${ext}`);

    let text = '';

    switch (ext) {
      case 'pdf': {
        Logger.info('📄 [DOCS] Début extraction PDF...');

        let data;
        let success = false;

        // Approche 1: Utiliser le module directement comme fonction
        if (!success && typeof pdfParseModule === 'function') {
          try {
            Logger.info('📄 [DOCS] Tentative 1: pdfParseModule(buffer)');
            data = await pdfParseModule(buffer);
            success = true;
            Logger.success('📄 [DOCS] Approche 1 réussie !');
          } catch (e) {
            Logger.warning(`📄 [DOCS] Approche 1 échouée: ${e.message}`);
          }
        }

        // Approche 2: Utiliser PDFParse si disponible
        if (!success && pdfParseModule.PDFParse) {
          try {
            Logger.info('📄 [DOCS] Tentative 2: new pdfParseModule.PDFParse()');
            const parser = new pdfParseModule.PDFParse();
            data = await parser.parse(buffer);
            success = true;
            Logger.success('📄 [DOCS] Approche 2 réussie !');
          } catch (e) {
            Logger.warning(`📄 [DOCS] Approche 2 échouée: ${e.message}`);
          }
        }

        // Approche 3: Utiliser PDFParse comme fonction statique
        if (!success && pdfParseModule.PDFParse && typeof pdfParseModule.PDFParse === 'function') {
          try {
            Logger.info('📄 [DOCS] Tentative 3: pdfParseModule.PDFParse(buffer)');
            data = await pdfParseModule.PDFParse(buffer);
            success = true;
            Logger.success('📄 [DOCS] Approche 3 réussie !');
          } catch (e) {
            Logger.warning(`📄 [DOCS] Approche 3 échouée: ${e.message}`);
          }
        }

        // Approche 4: Chercher une méthode parse
        if (!success && pdfParseModule.parse && typeof pdfParseModule.parse === 'function') {
          try {
            Logger.info('📄 [DOCS] Tentative 4: pdfParseModule.parse(buffer)');
            data = await pdfParseModule.parse(buffer);
            success = true;
            Logger.success('📄 [DOCS] Approche 4 réussie !');
          } catch (e) {
            Logger.warning(`📄 [DOCS] Approche 4 échouée: ${e.message}`);
          }
        }

        if (!success) {
          Logger.error('📄 [DOCS] Toutes les approches ont échoué');
          throw new Error('Impossible d\'extraire le PDF avec aucune des méthodes disponibles');
        }

        text = data.text;
        Logger.success(`📄 [DOCS] PDF extrait: ${text.length} caractères`);
        break;
      }
      case 'docx': {
        Logger.info('📄 [DOCS] Début extraction DOCX...');
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        Logger.success(`📄 [DOCS] DOCX extrait: ${text.length} caractères`);
        break;
      }
      case 'xlsx':
      case 'xls': {
        Logger.info('📄 [DOCS] Début extraction XLSX...');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        text = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          return `--- Feuille : ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`;
        }).join('\n\n');
        Logger.success(`📄 [DOCS] XLSX extrait: ${text.length} caractères`);
        break;
      }
      default:
        Logger.error(`📄 [DOCS] Format non supporté: .${ext}`);
        return res.status(400).json({ error: `Format .${ext} non supporté` });
    }

    if (!text || text.trim().length === 0) {
      Logger.error('📄 [DOCS] Aucun texte extrait du document');
      return res.status(400).json({ error: 'Aucun texte extrait du fichier' });
    }

    Logger.success(`📄 [DOCS] Extraction réussie: ${text.trim().length} caractères`);
    res.json({ text: text.trim() });
  } catch (error) {
    Logger.error('📄 [DOCS] Erreur extraction texte', error);
    res.status(500).json({ error: "Erreur lors de l'extraction du texte", details: error.message });
  }
});

export default router;
