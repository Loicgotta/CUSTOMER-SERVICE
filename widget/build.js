import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const outDir = '../backend/public';

// Créer le dossier de sortie s'il n'existe pas
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Build du widget
esbuild.build({
  entryPoints: ['src/widget.js'],
  bundle: true,
  minify: true,
  outfile: path.join(outDir, 'widget.js'),
  format: 'iife'
}).then(() => {
  console.log('✅ Widget compilé avec succès dans backend/public/widget.js');
}).catch((error) => {
  console.error('❌ Erreur lors de la compilation:', error);
  process.exit(1);
});
