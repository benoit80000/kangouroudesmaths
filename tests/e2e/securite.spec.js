import { test, expect } from '@playwright/test';
import { seed, watchErrors, STORAGE_KEY } from './helpers.js';

test('en-têtes de sécurité présents', async ({ request }) => {
  const res = await request.get('./');
  const csp = res.headers()['content-security-policy'];
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
  expect(res.headers()['x-frame-options']).toBe('DENY');
});

test('sauvegarde corrompue ou piégée : l’appli reste stable', async ({ page }) => {
  const errors = watchErrors(page);
  await seed(page, '{"gameState":"results","resultSaved":true,"selectedLevel":"toString","currentProfileId":"constructor","answers":{"0":{"x":1},"__proto__":{"polluted":1},"99":"A"},"currentQuestion":"<img src=x onerror=alert(1)>","timeLeft":"abc","activeQuestionIndices":[0,"1",{"a":1},-5,999],"profiles":{"__proto__":{"name":"evil","history":[]},"constructor":{"name":"x"},"p1":{"name":"<img src=x onerror=window.pwned=1>","history":[{"date":"2026-01-01","level":"__proto__","score":{"a":1}},{"date":"2026-01-02","level":"E2025","questions":24,"score":{"toFixed":1},"maxScore":"96","correct":"5","xp":1e99},{"date":"pas une date","level":"E2025"}],"reviewItems":{"__proto__":{"level":"E2025","questionIndex":1,"dueAt":0},"x":{"level":"E2025","questionIndex":2,"dueAt":0,"stage":99},"y":{"level":"E2025","questionIndex":500,"dueAt":0}}}}}');
  await page.goto('./');
  await expect(page.locator('.results-card')).toBeVisible();
  await page.getByRole('button', { name: "Retour à l'accueil" }).click();
  await expect(page.locator('.greeting')).toContainText('<img');
  expect(await page.evaluate(() => 'polluted' in {} || 'pwned' in window)).toBe(false);
  await expect(page.locator('.hist li')).toHaveCount(1);
  errors.expectNone();
});

test('imports piégés refusés ou neutralisés', async ({ page }) => {
  const errors = watchErrors(page);
  // Fichiers passés en mémoire (un chemin avec accents est ignoré par Chromium).
  const file = (name, content) => ({ name, mimeType: 'application/json', buffer: Buffer.from(content) });
  await page.goto('./');
  await page.locator('.profile-pill').click();
  const input = page.locator('#import-file');
  const notice = page.locator('.notice');

  await input.setInputFiles(file('proto.json', '{"profiles":{"__proto__":{"name":"evil"},"constructor":{"name":"evil2"}}}'));
  await expect(notice).toContainText('aucun profil');
  await input.setInputFiles(file('gros.json', '{"profiles":{"p1":{"name":"' + 'a'.repeat(1_200_000) + '"}}}'));
  await expect(notice).toContainText('trop volumineux');
  await input.setInputFiles(file('types.json', '{"profiles":{"p1":{"name":{"a":1},"history":[{"date":"2026-02-02","level":"E2024","questions":24,"score":"NaN","maxScore":{"x":1}}],"reviewItems":[]}}}'));
  await expect(notice).toContainText('1 épreuve récupérée');
  await input.setInputFiles(file('nombreux.json', JSON.stringify({ profiles: Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, { name: `Enfant ${i}` }])) })));
  await expect(notice).toContainText('profils ajoutés');
  const count = await page.evaluate((k) => Object.keys(JSON.parse(localStorage.getItem(k)).profiles).length, STORAGE_KEY);
  expect(count).toBe(20);
  await page.reload();
  await expect(page.locator('.greeting')).toBeVisible();
  errors.expectNone();
});
