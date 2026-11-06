import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

// Simule un ancien navigateur (par ex. tablette Android avec un vieux Chrome/WebView) :
// fonctions JavaScript récentes absentes.
const removeModernApis = () => {
  delete Object.hasOwn;
  delete Object.fromEntries;
  delete Array.prototype.flat;
  delete Array.prototype.flatMap;
  delete Array.prototype.at;
  delete String.prototype.replaceAll;
};

async function playOneQuestion(page) {
  await expect(page.locator('.greeting')).toBeVisible();
  await page.locator('.year', { hasText: '2018' }).click();
  await page.locator('.seg button', { hasText: 'Entraînement' }).click();
  await page.getByRole('button', { name: 'Commencer 2018' }).click();
  await page.keyboard.press('b');
  await page.keyboard.press('Enter');
  await expect(page.locator('.feedback')).toContainText('20 + 18 = 38');
}

test('démarre sans les fonctions JavaScript récentes', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(removeModernApis);
  await page.goto('./');
  await playOneQuestion(page);
  errors.expectNone();
});

test('la version de secours (ES5) fonctionne seule', async ({ page, request }) => {
  const errors = watchErrors(page);
  // Page qui ne charge que les scripts « nomodule », comme un navigateur sans modules ES.
  const html = (await (await request.get('./')).text())
    .replace(/<script type="module"[^>]*>[\s\S]*?<\/script>\s*/g, '')
    .replace(/ nomodule/g, '');
  await page.route('**/ancien-navigateur.html', (route) => route.fulfill({ contentType: 'text/html', body: html }));
  await page.addInitScript(removeModernApis);
  await page.goto('./ancien-navigateur.html');
  await playOneQuestion(page);
  expect(await page.evaluate(() => typeof window.System)).toBe('object');
  errors.expectNone();
});

test("si l'appli ne démarre pas, un message remplace l'écran blanc", async ({ page }) => {
  test.slow();
  await page.route(/\/assets\/.*\.js$/, (route) => route.abort());
  await page.goto('./');
  await expect(page.locator('.boot-error')).toContainText("L'appli n'a pas pu démarrer", { timeout: 20_000 });
  await expect(page.locator('.boot-error pre')).toContainText('Mozilla');
});
