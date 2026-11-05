// Téléchargement de toutes les figures pour utiliser l'appli sans connexion.
import { LEVELS } from '../data/levels.js';

export const FIGURES_CACHE = 'kangourou-figures';

export const allFigureUrls = () =>
  Object.values(LEVELS).flatMap((level) => level.questions.map((q) => new URL(q.image, window.location.href).href));

export const offlineSupported = () => 'serviceWorker' in navigator && 'caches' in window;

export async function countCachedFigures() {
  try {
    const cache = await caches.open(FIGURES_CACHE);
    const keys = await cache.keys();
    const wanted = new Set(allFigureUrls());
    return keys.filter((req) => wanted.has(req.url)).length;
  } catch {
    return 0;
  }
}

// Télécharge les figures manquantes (6 à la fois) et appelle onProgress(nombre en cache).
export async function downloadAllFigures(onProgress, signal) {
  const cache = await caches.open(FIGURES_CACHE);
  const urls = allFigureUrls();
  const cached = new Set((await cache.keys()).map((r) => r.url));
  let done = urls.filter((u) => cached.has(u)).length;
  onProgress(done);
  const queue = urls.filter((u) => !cached.has(u));
  let failed = 0;
  const worker = async () => {
    while (queue.length && !signal?.aborted) {
      const url = queue.shift();
      try {
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(String(res.status));
        await cache.put(url, res);
        done++;
        onProgress(done);
      } catch {
        if (signal?.aborted) return;
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { done, total: urls.length, failed };
}
