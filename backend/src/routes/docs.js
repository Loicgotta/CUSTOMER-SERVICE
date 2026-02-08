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
  console.log('📄 [DOCS] Début extraction de document');

  try {
    if (!req.file) {
      console.log('❌ [DOCS] Aucun fichier reçu');
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    const { buffer, originalname, size } = req.file;
    console.log(`📄 [DOCS] Fichier reçu: ${originalname} (${(size / 1024).toFixed(2)} KB)`);

    const ext = originalname.split('.').pop().toLowerCase();
    console.log(`📄 [DOCS] Extension détectée: .${ext}`);

    let text = '';

    switch (ext) {
      case 'pdf': {
        console.log('📄 [DOCS] Début extraction PDF...');
        console.log(`📄 [DOCS] Type de pdfParse: ${typeof pdfParse}`);
        const data = await pdfParse(buffer);
        text = data.text;
        console.log(`📄 [DOCS] PDF extrait: ${text.length} caractères`);
        break;
      }
      case 'docx': {
        console.log('📄 [DOCS] Début extraction DOCX...');
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        console.log(`📄 [DOCS] DOCX extrait: ${text.length} caractères`);
        break;
      }
      case 'xlsx':
      case 'xls': {
        console.log('📄 [DOCS] Début extraction XLSX...');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        text = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          return `--- Feuille : ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`;
        }).join('\n\n');
        console.log(`📄 [DOCS] XLSX extrait: ${text.length} caractères`);
        break;
      }
      default:
        console.log(`❌ [DOCS] Format non supporté: .${ext}`);
        return res.status(400).json({ error: `Format .${ext} non supporté` });
    }

    if (!text || text.trim().length === 0) {
      console.log('❌ [DOCS] Aucun texte extrait du document');
      return res.status(400).json({ error: 'Aucun texte extrait du fichier' });
    }

    console.log(`✅ [DOCS] Extraction réussie: ${text.trim().length} caractères`);
    res.json({ text: text.trim() });
  } catch (error) {
    console.error('❌ [DOCS] Erreur extraction texte:', error);
    console.error('❌ [DOCS] Stack:', error.stack);
    res.status(500).json({ error: "Erreur lors de l'extraction du texte", details: error.message });
  }
});

export default router;
