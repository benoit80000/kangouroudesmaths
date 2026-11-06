import { test, expect } from '@playwright/test';
import { seed, watchErrors, startExam, STORAGE_KEY } from './helpers.js';

test('reprise d’une épreuve de l’ancienne version', async ({ page }) => {
  const errors = watchErrors(page);
  await seed(page, {
    gameState: 'playing', selectedLevel: 'E2023', currentQuestion: 3, answers: { 0: 'D', 1: 'A', 2: 'C' },
    showExplanation: false, timeLeft: 1800, timerActive: true, sessionLength: 24, sessionMode: 'standard',
    activeQuestionIndices: Array.from({ length: 24 }, (_, i) => i),
    profiles: { p1: { name: 'Léa', history: [{ date: new Date().toISOString(), level: 'E2025', questions: 24, mode: 'standard', score: 86.25, maxScore: 96, correct: 20, incorrect: 3, skipped: 1, xp: 194 }], reviewItems: {} } },
    currentProfileId: 'p1', resultSaved: false,
  });
  await page.goto('./');
  await expect(page.locator('.greeting')).toContainText('Léa');
  await expect(page.locator('.resume')).toContainText('question 4 sur 24');
  await expect(page.locator('.years')).toContainText('86,25/96');
  await expect(page.locator('.hist li').first()).toContainText(/Sujet 2025\s*aujourd'hui/);
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await expect(page.locator('.qpos')).toContainText('Question 4');
  await expect(page.locator('.dot.a')).toHaveCount(3);
  errors.expectNone();
});

test('entraînement : clavier, correction et explication, score avec pénalité', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./');
  await startExam(page, '2024', 'Rapide');
  await expect(page.locator('.qpos')).toContainText('sur 10');
  await expect(page.getByRole('button', { name: 'Valider' })).toBeDisabled();
  await page.keyboard.press('d'); // 2024 q1 : D
  await expect(page.locator('.ans.sel')).toHaveText('D');
  await page.keyboard.press('Enter');
  await expect(page.locator('.feedback')).toContainText('Bravo');
  await expect(page.locator('.feedback')).toContainText('9 petits carrés');
  await page.keyboard.press('Enter');
  await page.locator('.ans', { hasText: 'A' }).click(); // q2 : D
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.locator('.feedback')).toContainText('la bonne réponse est D');
  await expect(page.locator('.ans.right')).toHaveText('D');
  await expect(page.locator('.ans.wrong')).toHaveText('A');
  await page.getByRole('button', { name: 'Question suivante →' }).click();
  await page.locator('.figure').click();
  await expect(page.locator('.lightbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.lightbox')).toBeHidden();
  await page.locator('.hand-in').click();
  await expect(page.locator('.hand-in')).toContainText('Confirmer : 8');
  await page.locator('.hand-in').click();
  await expect(page.locator('.score')).toContainText('2,25'); // 3 − 0,75
  await page.getByRole('button', { name: /Refaire mes 9 questions/ }).click();
  await expect(page.locator('.qpos')).toContainText('sur 9');
  await expect(page.locator('.qpos')).toContainText('révision');
  await page.getByRole('button', { name: 'Pause' }).click();
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
  expect(saved.profiles.p1.history).toHaveLength(1);
  expect(saved.profiles.p1.reviewItems['E2024:1']).toBeTruthy();
  await page.reload();
  await expect(page.locator('.resume')).toBeVisible();
  errors.expectNone();
});

test('concours blanc : pas de correction avant la fin, corrigé détaillé', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./');
  await startExam(page, '2018', 'Concours blanc');
  await expect(page.locator('.qpos')).toContainText('concours blanc');
  await expect(page.getByRole('button', { name: 'Valider' })).toHaveCount(0);
  await expect(page.locator('.actions-right')).toContainText('Passer');
  await page.keyboard.press('b'); // 2018 q1 : B
  await expect(page.locator('.actions-right')).toContainText('Question suivante');
  await page.keyboard.press('Enter');
  await expect(page.locator('.qpos')).toContainText('Question 2');
  await expect(page.locator('.feedback')).toHaveCount(0);
  await page.locator('.dot', { hasText: /^24$/ }).click();
  await page.locator('.actions-right .btn').click();
  await page.locator('.actions-right .btn').click();
  await expect(page.locator('.results-card > .label')).toContainText('concours blanc');
  await expect(page.locator('.score')).toContainText('3');
  const first = page.locator('.corrige-item').first();
  await first.locator('summary').click();
  await expect(first).toContainText('20 + 18 = 38');
  await expect(page.locator('.corrige-item').nth(1)).toContainText('la bonne réponse est D');
  await page.getByRole('button', { name: "Retour à l'accueil" }).click();
  await expect(page.locator('.hist li').first()).toContainText('concours blanc');
  await expect(page.locator('.year', { hasText: '2018' })).toContainText('3/96');
  errors.expectNone();
});

test('brouillon : dessiner, annuler, un brouillon par question', async ({ page }) => {
  await page.goto('./');
  await startExam(page, '2019', 'Concours blanc');
  await page.getByRole('button', { name: '✎ Brouillon' }).click();
  const box = await page.locator('.scratch.on').boundingBox();
  for (const [x1, y1, x2, y2] of [[50, 40, 200, 120], [300, 40, 400, 100]]) {
    await page.mouse.move(box.x + x1, box.y + y1);
    await page.mouse.down();
    await page.mouse.move(box.x + x2, box.y + y2, { steps: 6 });
    await page.mouse.up();
  }
  const painted = await page.locator('.scratch').evaluate((c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
    return n;
  });
  expect(painted).toBeGreaterThan(200);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await page.getByRole('button', { name: '✎ Brouillon' }).click();
  await expect(page.locator('.scratch')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.scratch')).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.scratch')).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await expect(page.locator('.scratch')).toBeVisible();
});

test.describe('téléphone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('pas de débordement, réponses sous le pouce', async ({ page }) => {
    await page.goto('./');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.locator('.profile-pill').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.keyboard.press('Escape');
    await startExam(page, '2025');
    await page.locator('.ans', { hasText: 'C' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const panel = await page.locator('.answer-panel').boundingBox();
    expect(panel.y + panel.height).toBeLessThanOrEqual(845);
  });
});
