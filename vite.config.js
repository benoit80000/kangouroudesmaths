import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Génère sw.js avec la liste des fichiers de l'appli à garder pour le hors connexion.
// (Les figures des exercices sont gardées au fur et à mesure, ou toutes d'un coup
// depuis l'accueil.)
function serviceWorker() {
  return {
    name: 'kangourou-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const precache = [
        './',
        './index.html',
        './favicon.svg',
        './manifest.webmanifest',
        './icons/icon-192.png',
        './icons/icon-512.png',
        ...assets.filter((f) => f !== 'index.html' && !f.endsWith('.woff')).map((f) => `./${f}`),
      ];
      const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12);
      const source = readFileSync(new URL('./sw.template.js', import.meta.url), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// base relative : le site fonctionne à la racine d'un domaine comme dans un sous-dossier.
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
});
