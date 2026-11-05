import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  computeScore,
  getSessionXp,
  getGamification,
  bestScoresByLevel,
  dueReviewItems,
  updateReviewItems,
  sanitizeProfiles,
  loadSavedState,
  parseImport,
  mergeProfiles,
  formatDate,
  formatScore,
  formatTime,
  MAX_IMPORT_BYTES,
} from '../../src/lib/progress.js';

const DAY = 24 * 60 * 60 * 1000;
const q = (id, correct, points = 3) => ({ id, correct, points });

describe('computeScore', () => {
  test('bonne réponse +points, mauvaise −¼, sans réponse 0', () => {
    const questions = [q(1, 'A', 3), q(2, 'B', 4), q(3, 'C', 5)];
    const r = computeScore(questions, { 0: 'A', 1: 'C' });
    assert.equal(r.score, 3 - 1);
    assert.deepEqual([r.correct, r.incorrect, r.skipped, r.maxScore], [1, 1, 1, 12]);
    assert.deepEqual(r.statuses, ['correct', 'incorrect', 'skipped']);
  });
  test('le score ne descend jamais sous 0', () => {
    assert.equal(computeScore([q(1, 'A', 5)], { 0: 'B' }).score, 0);
  });
  test('questions sans corrigé ignorées', () => {
    const r = computeScore([q(1, null)], { 0: 'A' });
    assert.equal(r.notCorrected, 1);
    assert.equal(r.maxScore, 0);
    assert.deepEqual(r.statuses, ['none']);
  });
});

describe('XP et badges', () => {
  test('XP : 10 par bonne réponse, −2 par erreur, bonus de fin et sans faute', () => {
    assert.equal(getSessionXp({ questions: 2, correct: 2, incorrect: 0 }), 20 + 20 + 30);
    assert.equal(getSessionXp({ questions: 3, correct: 1, incorrect: 1 }), 10 - 2);
    assert.equal(getSessionXp({ questions: 1, correct: 0, incorrect: 1 }), 18);
  });
  test('niveau, série et mission du jour', () => {
    const now = Date.now();
    const history = [0, 1, 2].map((d) => ({ date: new Date(now - d * DAY).toISOString(), correct: 5, incorrect: 0, questions: 5, xp: 150 }));
    const g = getGamification({ history });
    assert.equal(g.totalXp, 450);
    assert.equal(g.level, 2);
    assert.equal(g.streakDays, 3);
    assert.equal(g.answeredToday, 5);
    assert.ok(g.badges.includes('Série 3 jours'));
  });
  test('meilleur score par année : épreuves complètes, hors révision', () => {
    const best = bestScoresByLevel({
      history: [
        { level: 'E2020', questions: 24, mode: 'standard', score: 40, maxScore: 96 },
        { level: 'E2020', questions: 24, mode: 'exam', score: 55, maxScore: 96 },
        { level: 'E2020', questions: 3, mode: 'review', score: 90, maxScore: 96 },
        { level: 'E2021', questions: 10, mode: 'standard', score: 30, maxScore: 32 },
      ],
    });
    assert.deepEqual(best, { E2020: { score: 55, maxScore: 96 } });
  });
});

describe('révision espacée', () => {
  const questions = [q(1, 'A'), q(2, 'B')];
  test('une erreur crée une carte due à J+1', () => {
    const now = 1_000_000;
    const items = updateReviewItems({}, { levelKey: 'E2020', questions, questionIndices: [0, 1], answers: { 0: 'C' }, now });
    assert.deepEqual(Object.keys(items), ['E2020:0']);
    assert.equal(items['E2020:0'].dueAt, now + DAY);
  });
  test('bonnes réponses : J+3, puis J+7, puis carte retirée', () => {
    let items = { 'E2020:0': { level: 'E2020', questionIndex: 0, stage: 0, dueAt: 0, updatedAt: 0 } };
    const run = (now) => updateReviewItems(items, { levelKey: 'E2020', questions, questionIndices: [0, 1], answers: { 0: 'A' }, now });
    items = run(10);
    assert.equal(items['E2020:0'].stage, 1);
    assert.equal(items['E2020:0'].dueAt, 10 + 3 * DAY);
    items = run(20);
    assert.equal(items['E2020:0'].dueAt, 20 + 7 * DAY);
    items = run(30);
    assert.equal(items['E2020:0'], undefined);
  });
  test('cartes dues triées par échéance', () => {
    const due = dueReviewItems({ reviewItems: { a: { dueAt: 5 }, b: { dueAt: 2 }, c: { dueAt: 99 } } }, 10);
    assert.deepEqual(due.map((i) => i.dueAt), [2, 5]);
  });
});

describe('validation des données', () => {
  test('clés spéciales refusées, sans pollution de prototype', () => {
    const raw = JSON.parse('{"__proto__":{"name":"x"},"constructor":{"name":"y"},"p1":{"name":"Léa"}}');
    const profiles = sanitizeProfiles(raw);
    assert.deepEqual(Object.keys(profiles), ['p1']);
    assert.equal({}.name, undefined);
    assert.equal(Object.getPrototypeOf(profiles), Object.prototype);
  });
  test('valeurs de mauvais type neutralisées', () => {
    const profiles = sanitizeProfiles({
      p1: {
        name: { a: 1 },
        history: [
          { date: '2026-01-02', level: 'E2025', questions: 24, score: { x: 1 }, maxScore: '96', correct: 1e9, xp: 1e99 },
          { date: 'pas une date', level: 'E2025' },
          { date: '2026-01-01', level: '__proto__' },
        ],
        reviewItems: { x: { level: 'E2025', questionIndex: 2, dueAt: 0, stage: 99 }, y: { level: 'E2025', questionIndex: 500, dueAt: 0 } },
      },
    });
    const p = profiles.p1;
    assert.equal(p.name, 'Enfant');
    assert.equal(p.history.length, 1);
    assert.deepEqual([p.history[0].score, p.history[0].maxScore, p.history[0].correct, p.history[0].xp], [0, 0, 0, undefined]);
    assert.deepEqual(Object.keys(p.reviewItems), ['E2025:2']);
    assert.equal(p.reviewItems['E2025:2'].stage, 0);
  });
  test('prénom : caractères de contrôle retirés, 24 caractères au plus', () => {
    const p = sanitizeProfiles({ p1: { name: '  Léa\u0000\u0007' + 'x'.repeat(40) } }).p1;
    assert.equal(p.name.length, 24);
    assert.ok(p.name.startsWith('Léa'));
  });
  test('20 profils et 100 épreuves au plus', () => {
    const many = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${i}`, { name: `E${i}` }]));
    assert.equal(Object.keys(sanitizeProfiles(many)).length, 20);
    const history = Array.from({ length: 150 }, () => ({ date: '2026-01-01', level: 'E2020' }));
    assert.equal(sanitizeProfiles({ p1: { history } }).p1.history.length, 100);
  });
});

describe('sauvegarde du navigateur', () => {
  let store;
  beforeEach(() => {
    store = {};
    globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
  });
  test("relit le format de l'ancienne version", () => {
    store[STORAGE_KEY] = JSON.stringify({
      gameState: 'playing', selectedLevel: 'E2023', currentQuestion: 3, answers: { 0: 'D', 1: 'A' }, timeLeft: 1800,
      sessionLength: 24, sessionMode: 'standard', activeQuestionIndices: [0, 1, 2],
      profiles: { p1: { name: 'Léa', history: [], reviewItems: {} } }, currentProfileId: 'p1', resultSaved: false,
    });
    const s = loadSavedState();
    assert.equal(s.selectedLevel, 'E2023');
    assert.equal(s.currentQuestion, 3);
    assert.deepEqual(s.answers, { 0: 'D', 1: 'A' });
    assert.equal(s.profiles.p1.name, 'Léa');
  });
  test('sauvegarde corrompue : valeurs remplacées par des valeurs sûres', () => {
    store[STORAGE_KEY] = '{"selectedLevel":"toString","currentProfileId":"constructor","answers":{"0":{"x":1},"99":"A","2":"F"},"currentQuestion":"<b>","timeLeft":"abc","activeQuestionIndices":[0,"1",-5,999],"sessionMode":"hack"}';
    const s = loadSavedState();
    assert.deepEqual([s.selectedLevel, s.currentProfileId, s.currentQuestion, s.timeLeft, s.sessionMode], [null, null, 0, null, 'standard']);
    assert.deepEqual(s.answers, {});
    assert.deepEqual(s.activeQuestionIndices, [0]);
  });
  test('JSON illisible : aucune sauvegarde', () => {
    store[STORAGE_KEY] = '{oups';
    assert.equal(loadSavedState(), null);
  });
});

describe('export / import', () => {
  test('fichiers invalides refusés avec un message clair', () => {
    assert.throws(() => parseImport('pas du json'), /illisible/);
    assert.throws(() => parseImport('[1,2]'), /aucun profil/);
    assert.throws(() => parseImport('{"profiles":{"__proto__":{"name":"x"}}}'), /aucun profil/);
    assert.throws(() => parseImport('x'.repeat(MAX_IMPORT_BYTES + 1)), /volumineux/);
  });
  test('fusion par identifiant ou prénom, sans doublon', () => {
    const current = { x9: { name: 'léa', history: [{ date: '2026-11-03T10:00:00.000Z', level: 'E2024', mode: 'standard', questions: 24 }], reviewItems: {} } };
    const imported = parseImport(JSON.stringify({
      profiles: {
        p1: { name: 'Léa', history: [{ date: '2026-11-01T10:00:00.000Z', level: 'E2025', mode: 'standard', questions: 24 }], reviewItems: { a: { level: 'E2025', questionIndex: 3, dueAt: 1, updatedAt: 5 } } },
        p2: { name: 'Tom', history: [] },
      },
    }));
    const first = mergeProfiles(current, imported);
    assert.equal(first.addedSessions, 1);
    assert.equal(first.addedProfiles, 1);
    assert.equal(first.profiles.x9.history.length, 2);
    assert.ok(first.profiles.x9.reviewItems['E2025:3']);
    assert.ok(first.profiles.x9.history[0].date > first.profiles.x9.history[1].date);
    const second = mergeProfiles(first.profiles, imported);
    assert.equal(second.addedSessions, 0);
    assert.equal(second.addedProfiles, 0);
  });
});

describe('formats', () => {
  test("dates : aujourd'hui, hier, sinon date complète avec l'année", () => {
    const now = new Date(2026, 10, 5, 12);
    assert.equal(formatDate(new Date(2026, 10, 5, 8).toISOString(), now), "aujourd'hui");
    assert.equal(formatDate(new Date(2026, 10, 4, 23).toISOString(), now), 'hier');
    assert.match(formatDate(new Date(2015, 2, 19).toISOString(), now), /2015/);
    assert.equal(formatDate('nimporte', now), '–');
  });
  test('scores et chrono', () => {
    assert.equal(formatScore(42), '42');
    assert.equal(formatScore(42.5), '42,5');
    assert.equal(formatScore(86.25), '86,25');
    assert.equal(formatTime(125), '2:05');
    assert.equal(formatTime(-3), '0:00');
  });
});
