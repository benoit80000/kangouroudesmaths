import { expect } from '@playwright/test';

export const STORAGE_KEY = 'kangourou_app_state_v1';

// Pose une sauvegarde dans le navigateur avant le premier chargement de la page.
export async function seed(page, state) {
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    [STORAGE_KEY, state]
  );
}

// Échoue si la page lève une erreur ou si la console signale une erreur (dont une violation CSP).
export function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return { expectNone: () => expect(errors).toEqual([]) };
}

export async function startExam(page, year, format) {
  await page.locator('.year', { hasText: year }).click();
  if (format) await page.locator('.seg button', { hasText: format }).click();
  await page.getByRole('button', { name: new RegExp(`^(Commencer|Réviser) ${year}$`) }).click();
  await expect(page.locator('.qcard')).toBeVisible();
}

export const imageLoaded = (page, selector) =>
  page.locator(selector).evaluate(
    (img) => new Promise((r) => (img.complete ? r(img.naturalWidth > 0) : ((img.onload = () => r(true)), (img.onerror = () => r(false)))))
  );
