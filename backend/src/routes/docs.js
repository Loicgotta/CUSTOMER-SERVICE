import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import { createRequire } from 'module';

// pdf-parse ne supporte pas l'import ESM natif
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const pdfParse = pdfParseModule.default || pdfParseModule;

const router = express.Router();

// Limite : 10 Mo par fichier
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    const { buffer, originalname } = req.file;
    const ext = originalname.split('.').pop().toLowerCase();
    let text = '';

    switch (ext) {
      case 'pdf': {
        const data = await pdfParse(buffer);
        text = data.text;
        break;
      }
      case 'docx': {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        break;
      }
      case 'xlsx':
      case 'xls': {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        text = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          return `--- Feuille : ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`;
        }).join('\n\n');
        break;
      }
      default:
        return res.status(400).json({ error: `Format .${ext} non supporté` });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Aucun texte extrait du fichier' });
    }

    res.json({ text: text.trim() });
  } catch (error) {
    console.error('Erreur extraction texte:', error);
    res.status(500).json({ error: "Erreur lors de l'extraction du texte", details: error.message });
  }
});

export default router;
