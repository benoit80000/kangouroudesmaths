import { test, expect } from '@playwright/test';
import { startExam, imageLoaded } from './helpers.js';

test('l’appli et les sujets fonctionnent sans connexion', async ({ page, context }) => {
  test.slow();
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  expect(await page.evaluate(() => fetch('manifest.webmanifest').then((r) => r.json()).then((m) => m.short_name))).toBe('Kangourou');

  await startExam(page, '2025', 'Entraînement');
  expect(await imageLoaded(page, '.figure img')).toBe(true);
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Abandonner' }).click();

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.greeting')).toBeVisible();
  await startExam(page, '2025');
  expect(await imageLoaded(page, '.figure img')).toBe(true);
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Abandonner' }).click();
  await context.setOffline(false);

  await page.getByRole('button', { name: 'Télécharger tous les sujets' }).click();
  await expect(page.locator('.offline .badge.ok')).toHaveText('Prêt', { timeout: 60_000 });
  await context.setOffline(true);
  await page.reload();
  await startExam(page, '2009');
  await page.locator('.dot', { hasText: /^17$/ }).click();
  expect(await imageLoaded(page, '.figure img')).toBe(true);
});
