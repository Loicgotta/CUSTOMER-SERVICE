import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import { createRequire } from 'module';
import Logger from '../utils/logger.js';

// pdf-parse ne supporte pas l'import ESM natif - on utilise require
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

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
        const data = await pdfParse(buffer);
        text = data.text;
        Logger.success(`📄 [DOCS] PDF extrait: ${text.length} caractères, ${data.numpages} page(s)`);
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
