import { ANSWER_KEYS, QUESTION_TEXTS, EXPLANATIONS } from './sujetE.js';

export const LETTERS = ['A', 'B', 'C', 'D', 'E'];
export const QUESTIONS_PER_SUBJECT = 24;
export const SUBJECT_DURATION_MIN = 50;

// Barème officiel : 3 points (1 à 8), 4 points (9 à 16), 5 points (17 à 24).
export const pointsFor = (id) => (id <= 8 ? 3 : id <= 16 ? 4 : 5);

const BASE = import.meta.env.BASE_URL;

function buildSubject(year) {
  return {
    key: `E${year}`,
    year: Number(year),
    title: `Sujet E ${year}`,
    duration: SUBJECT_DURATION_MIN,
    questions: Array.from({ length: QUESTIONS_PER_SUBJECT }, (_, index) => {
      const id = index + 1;
      return {
        id,
        points: pointsFor(id),
        image: `${BASE}exercises/${year}/q${String(id).padStart(2, '0')}.png`,
        text: QUESTION_TEXTS[year]?.[id] ?? null,
        correct: ANSWER_KEYS[year]?.[index] ?? null,
        explanation: EXPLANATIONS[year]?.[id] ?? null,
      };
    }),
  };
}

const years = Object.keys(ANSWER_KEYS).sort((a, b) => Number(b) - Number(a));

// Les clés (« E2025 ») sont identiques à celles de l'ancienne version, pour garder l'historique.
export const LEVELS = Object.fromEntries(years.map((year) => [`E${year}`, buildSubject(year)]));
export const LEVEL_KEYS = years.map((year) => `E${year}`);
export const DEFAULT_LEVEL = LEVEL_KEYS[0];

export const getLevel = (key) => (Object.hasOwn(LEVELS, key) ? LEVELS[key] : LEVELS[DEFAULT_LEVEL]);
