import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { seed, watchErrors, STORAGE_KEY } from './helpers.js';

const lea = (id, name, history, reviewItems = {}) => ({ profiles: { [id]: { name, history, reviewItems } }, currentProfileId: id, selectedLevel: 'E2025', sessionLength: 24 });

test('enregistrer puis restaurer sur un autre appareil, sans doublon', async ({ browser }, testInfo) => {
  const device1 = await browser.newPage();
  await seed(device1, lea('p1', 'Léa', [{ date: '2026-11-01T10:00:00.000Z', level: 'E2025', questions: 24, mode: 'standard', score: 80, maxScore: 96, correct: 20, incorrect: 2, skipped: 2, xp: 216 }], { 'E2025:3': { level: 'E2025', questionIndex: 3, stage: 0, dueAt: 1, updatedAt: 5 } }));
  await device1.goto('./');
  await device1.locator('.profile-pill').click();
  const [download] = await Promise.all([device1.waitForEvent('download'), device1.getByRole('button', { name: 'Enregistrer' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^kangourou-progression-\d{4}-\d\d-\d\d\.json$/);
  const file = testInfo.outputPath('sauvegarde.json');
  await download.saveAs(file);
  expect(JSON.parse(readFileSync(file, 'utf8')).app).toBe('kangourou-des-maths');

  const device2 = await browser.newPage();
  const errors = watchErrors(device2);
  await seed(device2, { ...lea('x9', 'léa', [{ date: '2026-11-03T10:00:00.000Z', level: 'E2024', questions: 24, mode: 'standard', score: 50, maxScore: 96, correct: 12, incorrect: 6, skipped: 6 }]), profiles: { x9: { name: 'léa', history: [{ date: '2026-11-03T10:00:00.000Z', level: 'E2024', questions: 24, mode: 'standard', score: 50, maxScore: 96, correct: 12, incorrect: 6, skipped: 6 }], reviewItems: {} }, t1: { name: 'Tom', history: [], reviewItems: {} } } });
  await device2.goto('./');
  await device2.locator('.profile-pill').click();
  await device2.locator('#import-file').setInputFiles(file);
  await expect(device2.locator('.notice')).toHaveText('Progression restaurée : 1 épreuve récupérée.');
  await device2.locator('#import-file').setInputFiles(file);
  await expect(device2.locator('.notice')).toHaveText('Progression restaurée : aucune nouvelle épreuve.');
  const profiles = await device2.evaluate((k) => JSON.parse(localStorage.getItem(k)).profiles, STORAGE_KEY);
  expect(Object.keys(profiles).sort()).toEqual(['t1', 'x9']);
  expect(profiles.x9.history).toHaveLength(2);
  expect(profiles.x9.reviewItems['E2025:3']).toBeTruthy();

  await device2.locator('#import-file').setInputFiles({ name: 'mauvais.json', mimeType: 'application/json', buffer: Buffer.from('{"foo":1}') });
  await expect(device2.locator('.notice.ko')).toContainText('aucun profil');
  errors.expectNone();
});

test('profils : ajouter et renommer', async ({ page }) => {
  await page.goto('./');
  await page.locator('.profile-pill').click();
  await page.getByRole('button', { name: '+ Ajouter un profil' }).click();
  await expect(page.locator('.greeting')).toContainText('Enfant 2');
  // Le menu reste ouvert pour pouvoir renommer le nouveau profil tout de suite.
  await page.locator('#profile-name').fill('Tom');
  await page.getByRole('button', { name: 'Renommer' }).click();
  await expect(page.locator('.greeting')).toContainText('Tom');
});
