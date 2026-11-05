// Logique de progression : score, XP, révision espacée et sauvegarde locale.
// Le format de sauvegarde est identique à la version précédente (même clé),
// pour que les profils et l'historique existants soient conservés.

export const STORAGE_KEY = 'kangourou_app_state_v1';
export const REVIEW_STEPS_DAYS = [1, 3, 7];
const DAY_MS = 24 * 60 * 60 * 1000;

export const newProfile = (name) => ({ name, history: [], reviewItems: {} });
export const DEFAULT_PROFILES = { p1: newProfile('Enfant 1') };

// ---------- Validation des données (sauvegarde locale et fichiers importés) ----------
// Toute donnée relue est reconstruite champ par champ : type, bornes et format vérifiés.
// Cela évite qu'un fichier abîmé ou malveillant fasse planter l'appli de façon durable,
// ou injecte des clés spéciales (__proto__, constructor…) dans les objets internes.

const MAX_PROFILES = 20;
const MAX_HISTORY = 100;
const MAX_QUESTIONS = 24;
const MAX_POINTS = 96; // 8×3 + 8×4 + 8×5
const LETTER_SET = new Set(['A', 'B', 'C', 'D', 'E']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const LEVEL_RE = /^E\d{4}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isSafeKey = (k) => typeof k === 'string' && !FORBIDDEN_KEYS.has(k);
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const num = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null);

export const isValidProfileId = (id) => isSafeKey(id) && ID_RE.test(id);
export const isValidLevelKey = (key) => typeof key === 'string' && LEVEL_RE.test(key);

function sanitizeName(name) {
  if (typeof name !== 'string') return 'Enfant';
  // Retire les caractères de contrôle ; le prénom est toujours affiché comme texte brut.
  const clean = name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24);
  return clean || 'Enfant';
}

function sanitizeHistoryEntry(h) {
  if (!isPlainObject(h) || typeof h.date !== 'string' || !isValidLevelKey(h.level)) return null;
  const time = Date.parse(h.date);
  if (Number.isNaN(time)) return null;
  const entry = {
    date: new Date(time).toISOString(),
    level: h.level,
    questions: isInt(h.questions, 0, MAX_QUESTIONS) ? h.questions : 0,
    mode: h.mode === 'review' ? 'review' : 'standard',
    score: num(h.score, 0, MAX_POINTS) ?? 0,
    maxScore: num(h.maxScore, 0, MAX_POINTS) ?? 0,
    correct: isInt(h.correct, 0, MAX_QUESTIONS) ? h.correct : 0,
    incorrect: isInt(h.incorrect, 0, MAX_QUESTIONS) ? h.incorrect : 0,
    skipped: isInt(h.skipped, 0, MAX_QUESTIONS) ? h.skipped : 0,
  };
  const xp = num(h.xp, 0, 10000);
  if (xp !== null) entry.xp = xp;
  return entry;
}

function sanitizeReviewItems(items) {
  const out = {};
  if (!isPlainObject(items)) return out;
  for (const item of Object.values(items)) {
    if (!isPlainObject(item) || !isValidLevelKey(item.level) || !isInt(item.questionIndex, 0, MAX_QUESTIONS - 1)) continue;
    const dueAt = num(item.dueAt, 0, 8.64e15);
    if (dueAt === null) continue;
    out[`${item.level}:${item.questionIndex}`] = {
      level: item.level,
      questionIndex: item.questionIndex,
      stage: isInt(item.stage, 0, REVIEW_STEPS_DAYS.length - 1) ? item.stage : 0,
      dueAt,
      updatedAt: num(item.updatedAt, 0, 8.64e15) ?? 0,
    };
  }
  return out;
}

export function sanitizeProfiles(raw) {
  const profiles = {};
  if (!isPlainObject(raw)) return profiles;
  for (const [id, p] of Object.entries(raw)) {
    if (Object.keys(profiles).length >= MAX_PROFILES) break;
    if (!isValidProfileId(id) || !isPlainObject(p)) continue;
    profiles[id] = {
      name: sanitizeName(p.name),
      history: (Array.isArray(p.history) ? p.history : [])
        .map(sanitizeHistoryEntry)
        .filter(Boolean)
        .slice(0, MAX_HISTORY),
      reviewItems: sanitizeReviewItems(p.reviewItems),
    };
  }
  return profiles;
}

function sanitizeAnswers(answers) {
  const out = {};
  if (!isPlainObject(answers)) return out;
  for (const [k, v] of Object.entries(answers)) {
    const index = Number(k);
    if (isInt(index, 0, MAX_QUESTIONS - 1) && LETTER_SET.has(v)) out[index] = v;
  }
  return out;
}

export function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!isPlainObject(saved)) return null;
    const profiles = sanitizeProfiles(saved.profiles);
    const indices = Array.isArray(saved.activeQuestionIndices)
      ? [...new Set(saved.activeQuestionIndices.filter((i) => isInt(i, 0, MAX_QUESTIONS - 1)))]
      : null;
    return {
      gameState: saved.gameState === 'results' ? 'results' : saved.gameState === 'playing' ? 'playing' : 'welcome',
      selectedLevel: isValidLevelKey(saved.selectedLevel) ? saved.selectedLevel : null,
      sessionLength: saved.sessionLength === 10 ? 10 : 24,
      sessionMode: saved.sessionMode === 'review' ? 'review' : 'standard',
      activeQuestionIndices: indices && indices.length ? indices : null,
      currentQuestion: isInt(saved.currentQuestion, 0, MAX_QUESTIONS - 1) ? saved.currentQuestion : 0,
      answers: sanitizeAnswers(saved.answers),
      showExplanation: saved.showExplanation === true,
      timeLeft: isInt(saved.timeLeft, 0, 60 * 60) ? saved.timeLeft : null,
      profiles: Object.keys(profiles).length ? profiles : null,
      currentProfileId: isValidProfileId(saved.currentProfileId) ? saved.currentProfileId : null,
      resultSaved: saved.resultSaved === true,
    };
  } catch {
    return null;
  }
}

export function saveState(snapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // stockage indisponible (navigation privée…) : l'appli fonctionne sans sauvegarde
  }
}

export function clearSavedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Bonne réponse : + points ; mauvaise : − 1/4 des points ; sans réponse : 0.
export function computeScore(questions, answers) {
  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  let notCorrected = 0;
  let maxScore = 0;
  const statuses = questions.map((q, index) => {
    if (!q.correct) {
      notCorrected++;
      return 'none';
    }
    maxScore += q.points;
    const answer = answers[index];
    if (!answer) {
      skipped++;
      return 'skipped';
    }
    if (answer === q.correct) {
      score += q.points;
      correct++;
      return 'correct';
    }
    score -= q.points * 0.25;
    incorrect++;
    return 'incorrect';
  });
  return { score: Math.max(0, score), correct, incorrect, skipped, notCorrected, maxScore, statuses };
}

export function getSessionXp(entry) {
  const correct = entry?.correct || 0;
  const incorrect = entry?.incorrect || 0;
  const answered = correct + incorrect;
  const total = entry?.questions || 0;
  const completionBonus = answered === total ? 20 : 0;
  const perfectBonus = incorrect === 0 && answered > 0 ? 30 : 0;
  return Math.max(0, correct * 10 - incorrect * 2 + completionBonus + perfectBonus);
}

const dayKey = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function getGamification(profile) {
  const history = Array.isArray(profile?.history) ? profile.history : [];
  const totalXp = history.reduce((sum, h) => sum + (h?.xp ?? getSessionXp(h)), 0);
  const xpPerLevel = 300;
  const level = Math.floor(totalXp / xpPerLevel) + 1;
  const xpIntoLevel = totalXp % xpPerLevel;

  // Série : nombre de jours consécutifs (jusqu'à aujourd'hui) avec au moins une épreuve.
  const days = new Set(history.map((h) => dayKey(h?.date)).filter(Boolean));
  let streakDays = 0;
  const cursor = new Date();
  while (days.has(dayKey(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const today = dayKey(new Date());
  const answeredToday = history
    .filter((h) => dayKey(h?.date) === today)
    .reduce((sum, h) => sum + (h.correct || 0) + (h.incorrect || 0), 0);

  const totalCorrect = history.reduce((sum, h) => sum + (h?.correct || 0), 0);
  const perfectRuns = history.filter((h) => (h?.incorrect || 0) === 0 && (h?.correct || 0) > 0).length;
  const scored = history.filter((h) => (h.maxScore || 0) > 0);
  const avgPercent = scored.length
    ? scored.reduce((sum, h) => sum + (h.score / h.maxScore) * 100, 0) / scored.length
    : null;

  const badges = [];
  if (history.length >= 1) badges.push('Premier pas');
  if (history.length >= 10) badges.push('Régulier');
  if (totalCorrect >= 100) badges.push('Centurion');
  if (perfectRuns >= 3) badges.push('Sans faute');
  if (streakDays >= 3) badges.push('Série 3 jours');
  if (level >= 5) badges.push('Niveau 5');

  return { totalXp, level, xpIntoLevel, xpPerLevel, streakDays, answeredToday, avgPercent, badges, sessions: history.length };
}

// Meilleur score obtenu sur une épreuve complète de chaque année.
export function bestScoresByLevel(profile) {
  const best = {};
  for (const h of profile?.history || []) {
    if (h.mode === 'review' || h.questions !== 24 || !h.maxScore) continue;
    if (!best[h.level] || h.score > best[h.level].score) best[h.level] = { score: h.score, maxScore: h.maxScore };
  }
  return best;
}

export function dueReviewItems(profile, now = Date.now()) {
  return Object.values(profile?.reviewItems || {})
    .filter((item) => item && typeof item.dueAt === 'number' && item.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);
}

// Erreur : revue à J+1. Bonne réponse sur une carte existante : J+3, puis J+7, puis retirée.
export function updateReviewItems(reviewItems, { levelKey, questions, questionIndices, answers, now = Date.now() }) {
  const next = { ...(reviewItems || {}) };
  questions.forEach((q, displayIndex) => {
    if (!q?.correct) return;
    const answer = answers[displayIndex];
    if (!answer) return;
    const originalIndex = questionIndices[displayIndex] ?? displayIndex;
    const key = `${levelKey}:${originalIndex}`;
    const existing = next[key];
    if (answer !== q.correct) {
      next[key] = { level: levelKey, questionIndex: originalIndex, stage: 0, dueAt: now + REVIEW_STEPS_DAYS[0] * DAY_MS, updatedAt: now };
    } else if (existing) {
      const stage = (existing.stage ?? 0) + 1;
      if (stage >= REVIEW_STEPS_DAYS.length) delete next[key];
      else next[key] = { ...existing, stage, dueAt: now + REVIEW_STEPS_DAYS[stage] * DAY_MS, updatedAt: now };
    }
  });
  return next;
}

export const formatTime = (seconds) => {
  const s = Math.max(0, seconds || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const formatScore = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '').replace('.', ','));

// Date d'une épreuve : « aujourd'hui », « hier », sinon la date complète avec l'année (« 3 nov. 2026 »).
export const formatDate = (iso, now = new Date()) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ---------- Sauvegarde dans un fichier (export / import) ----------

const EXPORT_APP_ID = 'kangourou-des-maths';

export function buildExport(profiles) {
  return {
    app: EXPORT_APP_ID,
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles,
  };
}

export function exportFileName(date = new Date()) {
  const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `kangourou-progression-${d}.json`;
}

// Accepte un fichier exporté par l'appli, ou une sauvegarde brute du navigateur (ancien format).
export const MAX_IMPORT_BYTES = 1024 * 1024;

export function parseImport(text) {
  if (typeof text !== 'string' || text.length > MAX_IMPORT_BYTES) {
    throw new Error('Ce fichier est trop volumineux pour être une sauvegarde Kangourou.');
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde Kangourou (format illisible).");
  }
  const profiles = sanitizeProfiles(data?.profiles);
  if (Object.keys(profiles).length === 0) throw new Error('Ce fichier ne contient aucun profil Kangourou.');
  return profiles;
}

const historyKey = (h) => `${h.date}|${h.level}|${h.mode}|${h.questions}`;

// Fusionne sans rien perdre : historiques réunis (sans doublons), carte de révision la plus récente gardée.
export function mergeProfiles(current, imported) {
  const merged = { ...current };
  let addedSessions = 0;
  let addedProfiles = 0;
  for (const [id, incoming] of Object.entries(imported)) {
    // Un profil de même identifiant, ou à défaut de même prénom, est considéré comme le même enfant.
    const targetId =
      (merged[id] && id) ||
      Object.keys(merged).find((k) => merged[k].name.toLowerCase() === incoming.name.toLowerCase());
    if (!targetId) {
      if (Object.keys(merged).length >= MAX_PROFILES) continue;
      merged[id] = incoming;
      addedProfiles++;
      addedSessions += incoming.history.length;
      continue;
    }
    const existing = merged[targetId];
    const seen = new Set(existing.history.map(historyKey));
    const newEntries = incoming.history.filter((h) => !seen.has(historyKey(h)));
    addedSessions += newEntries.length;
    const reviewItems = { ...existing.reviewItems };
    for (const [key, item] of Object.entries(incoming.reviewItems)) {
      if (!reviewItems[key] || (item?.updatedAt ?? 0) > (reviewItems[key]?.updatedAt ?? 0)) reviewItems[key] = item;
    }
    merged[targetId] = {
      ...existing,
      history: [...existing.history, ...newEntries]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, MAX_HISTORY),
      reviewItems,
    };
  }
  return { profiles: merged, addedSessions, addedProfiles };
}

// Demande au navigateur de ne pas effacer les données de lui-même (ex. Safari après 7 jours sans visite).
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    // non pris en charge : sans conséquence
  }
}
