import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import Logger from '../utils/logger.js';

// pdf-parse ne supporte pas l'import ESM natif - on utilise require
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const router = express.Router();

// Limite : 10 Mo par fichier, stockage sur disque (pas en RAM)
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => {
      cb(null, `upload-${Date.now()}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/extract', upload.single('file'), async (req, res) => {
  Logger.info('📄 [DOCS] Début extraction de document');

  try {
    if (!req.file) {
      Logger.error('📄 [DOCS] Aucun fichier reçu');
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    const { path: filePath, originalname, size } = req.file;
    const buffer = fs.readFileSync(filePath);
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
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        // Convertir chaque feuille en CSV (compatible avec ancien format)
        text = workbook.worksheets.map(sheet => {
          const rows = [];
          sheet.eachRow((row, rowNumber) => {
            // Convertir la row en array de valeurs avec gestion des types Excel
            const values = row.values.slice(1).map(cellValue => {
              // Gestion des valeurs nulles/undefined
              if (cellValue === null || cellValue === undefined) return '';

              // Gestion des objets Excel complexes
              if (typeof cellValue === 'object') {
                // Formule : extraire le résultat calculé
                if (cellValue.formula !== undefined) {
                  return String(cellValue.result ?? '');
                }
                // Date : convertir en format ISO lisible
                if (cellValue instanceof Date) {
                  return cellValue.toISOString().split('T')[0];
                }
                // Rich text : extraire le texte simple
                if (cellValue.richText) {
                  return cellValue.richText.map(t => t.text).join('');
                }
                // Autres objets : conversion sûre
                return String(cellValue.text || cellValue.value || '');
              }

              // Conversion en string + échappement CSV
              let str = String(cellValue);
              // Échapper si contient virgule, guillemet ou retour à la ligne
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                str = '"' + str.replace(/"/g, '""') + '"';
              }
              return str;
            });

            rows.push(values.join(','));
          });
          return `--- Feuille : ${sheet.name} ---\n${rows.join('\n')}`;
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
  } finally {
    // Nettoyer le fichier temporaire du disque
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

export default router;
