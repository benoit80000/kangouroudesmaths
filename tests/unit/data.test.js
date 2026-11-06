import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ANSWER_KEYS, EXPLANATIONS, QUESTION_TEXTS } from '../../src/data/sujetE.js';
import { LEVELS, LEVEL_KEYS, pointsFor } from '../../src/data/levels.js';

test('chaque corrigé a 24 lettres de A à E', () => {
  for (const [year, key] of Object.entries(ANSWER_KEYS)) assert.match(key, /^[A-E]{24}$/, `corrigé ${year}`);
});

test('22 sujets, du plus récent au plus ancien', () => {
  assert.equal(LEVEL_KEYS.length, 22);
  assert.equal(LEVEL_KEYS[0], 'E2025');
  assert.equal(LEVEL_KEYS.at(-1), 'E2004');
});

test('barème 3 / 4 / 5 points, total 96', () => {
  assert.deepEqual([pointsFor(1), pointsFor(8), pointsFor(9), pointsFor(16), pointsFor(17), pointsFor(24)], [3, 3, 4, 4, 5, 5]);
  for (const level of Object.values(LEVELS)) assert.equal(level.questions.reduce((s, q) => s + q.points, 0), 96);
});

test('explications et énoncés rattachés à des questions qui existent', () => {
  for (const source of [EXPLANATIONS, QUESTION_TEXTS]) {
    for (const [year, items] of Object.entries(source)) {
      assert.ok(ANSWER_KEYS[year], `année ${year}`);
      for (const [id, text] of Object.entries(items)) {
        assert.ok(Number(id) >= 1 && Number(id) <= 24, `${year} q${id}`);
        assert.ok(typeof text === 'string' && text.trim().length > 3, `${year} q${id} vide`);
      }
    }
  }
});

test('2018, 2019, 2020 et 2024 entièrement expliqués', () => {
  for (const year of ['2018', '2019', '2020', '2024']) assert.equal(Object.keys(EXPLANATIONS[year]).length, 24, year);
});

test('une figure existe pour chacun des 528 exercices', () => {
  const missing = Object.values(LEVELS)
    .flatMap((level) => level.questions.map((q) => q.image))
    .filter((src) => !existsSync(new URL(`../../public/${src.replace(/^\.\//, '')}`, import.meta.url)));
  assert.deepEqual(missing, []);
});
