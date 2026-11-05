// Logique de progression : score, XP, révision espacée et sauvegarde locale.
// Le format de sauvegarde est identique à la version précédente (même clé),
// pour que les profils et l'historique existants soient conservés.

export const STORAGE_KEY = 'kangourou_app_state_v1';
export const REVIEW_STEPS_DAYS = [1, 3, 7];
const DAY_MS = 24 * 60 * 60 * 1000;

export const newProfile = (name) => ({ name, history: [], reviewItems: {} });
export const DEFAULT_PROFILES = { p1: newProfile('Enfant 1') };

export function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return null;
    if (saved.profiles && typeof saved.profiles === 'object') {
      saved.profiles = Object.fromEntries(
        Object.entries(saved.profiles).map(([id, profile]) => [
          id,
          {
            name: profile?.name || 'Enfant',
            history: Array.isArray(profile?.history) ? profile.history : [],
            reviewItems:
              profile?.reviewItems && typeof profile.reviewItems === 'object' ? profile.reviewItems : {},
          },
        ])
      );
      if (Object.keys(saved.profiles).length === 0) delete saved.profiles;
    }
    return saved;
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

export const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '–' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};
