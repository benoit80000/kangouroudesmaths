import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

// Génère sw.js avec la liste des fichiers de l'appli à garder pour le hors connexion.
// Le build produit deux versions (moderne et de secours pour les anciens navigateurs) :
// on réunit les fichiers des deux avant d'écrire sw.js.
// (Les figures des exercices sont gardées au fur et à mesure, ou toutes d'un coup
// depuis l'accueil.)
function serviceWorker() {
  const files = new Set();
  let outDir = 'dist';
  return {
    name: 'kangourou-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      for (const f of Object.keys(bundle)) if (!f.endsWith('.map') && !f.endsWith('.woff') && f !== 'index.html') files.add(f);
    },
    closeBundle() {
      const precache = [
        './',
        './index.html',
        './boot.js',
        './favicon.svg',
        './manifest.webmanifest',
        './icons/icon-192.png',
        './icons/icon-512.png',
        ...[...files].sort().map((f) => `./${f}`),
      ];
      const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12);
      const source = readFileSync(new URL('./sw.template.js', import.meta.url), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
      writeFileSync(path.join(outDir, 'sw.js'), source);
    },
  };
}

// base relative : le site fonctionne à la racine d'un domaine comme dans un sous-dossier.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // Anciennes tablettes et anciens navigateurs Android : version de secours compilée en ES5
    // avec les compléments (polyfills) nécessaires, et compléments pour la version moderne.
    legacy({
      targets: ['defaults', 'chrome >= 49', 'android >= 5', 'firefox >= 52', 'safari >= 10', 'ios >= 10'],
      // Seules fonctions récentes utilisées par l'appli et absentes de Chrome 64 à 92.
      modernPolyfills: ['es.object.from-entries', 'es.object.has-own', 'es.array.flat', 'es.array.flat-map', 'es.global-this'],
    }),
    serviceWorker(),
  ],
});
