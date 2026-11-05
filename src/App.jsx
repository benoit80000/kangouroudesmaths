import { useCallback, useEffect, useMemo, useState } from 'react';
import { LEVELS, LEVEL_KEYS, DEFAULT_LEVEL, getLevel } from './data/levels.js';
import {
  DEFAULT_PROFILES,
  newProfile,
  loadSavedState,
  saveState,
  clearSavedState,
  computeScore,
  getSessionXp,
  getGamification,
  dueReviewItems,
  updateReviewItems,
  buildExport,
  exportFileName,
  mergeProfiles,
  requestPersistentStorage,
} from './lib/progress.js';
import Home from './components/Home.jsx';
import Exam from './components/Exam.jsx';
import Results from './components/Results.jsx';

const saved = loadSavedState();

const initial = {
  // Une épreuve en cours au moment de fermer la page est proposée en reprise depuis l'accueil.
  gameState: saved?.gameState === 'results' && saved?.resultSaved ? 'results' : 'welcome',
  selectedLevel: LEVELS[saved?.selectedLevel] ? saved.selectedLevel : DEFAULT_LEVEL,
  sessionLength: saved?.sessionLength === 10 ? 10 : 24,
  sessionMode: saved?.sessionMode === 'review' ? 'review' : 'standard',
  activeQuestionIndices: Array.isArray(saved?.activeQuestionIndices) ? saved.activeQuestionIndices : null,
  currentQuestion: saved?.currentQuestion ?? 0,
  answers: saved?.answers ?? {},
  showExplanation: Boolean(saved?.showExplanation),
  timeLeft: typeof saved?.timeLeft === 'number' ? saved.timeLeft : null,
  profiles: saved?.profiles ?? DEFAULT_PROFILES,
  currentProfileId: saved?.currentProfileId ?? 'p1',
  resultSaved: Boolean(saved?.resultSaved),
};

export default function App() {
  const [gameState, setGameState] = useState(initial.gameState);
  const [selectedLevel, setSelectedLevel] = useState(initial.selectedLevel);
  const [sessionLength, setSessionLength] = useState(initial.sessionLength);
  const [sessionMode, setSessionMode] = useState(initial.sessionMode);
  const [activeQuestionIndices, setActiveQuestionIndices] = useState(initial.activeQuestionIndices);
  const [currentQuestion, setCurrentQuestion] = useState(initial.currentQuestion);
  const [answers, setAnswers] = useState(initial.answers);
  const [showExplanation, setShowExplanation] = useState(initial.showExplanation);
  const [timeLeft, setTimeLeft] = useState(initial.timeLeft);
  const [profiles, setProfiles] = useState(initial.profiles);
  const [currentProfileId, setCurrentProfileId] = useState(
    initial.profiles[initial.currentProfileId] ? initial.currentProfileId : Object.keys(initial.profiles)[0]
  );
  const [resultSaved, setResultSaved] = useState(initial.resultSaved);

  const level = getLevel(selectedLevel);
  const profile = profiles[currentProfileId] ?? Object.values(profiles)[0];
  const gamification = useMemo(() => getGamification(profile), [profile]);

  const questionIndices = useMemo(() => {
    const valid = (activeQuestionIndices || []).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < level.questions.length
    );
    return valid.length ? valid : level.questions.map((_, i) => i);
  }, [activeQuestionIndices, level]);
  const questions = useMemo(() => questionIndices.map((i) => level.questions[i]), [questionIndices, level]);

  const playing = gameState === 'playing';
  const pausedSession =
    !playing && !resultSaved && Array.isArray(activeQuestionIndices) && activeQuestionIndices.length > 0 && timeLeft > 0;

  // Sauvegarde locale (même format que la version précédente).
  useEffect(() => {
    saveState({
      gameState,
      selectedLevel,
      currentQuestion,
      answers,
      showExplanation,
      timeLeft,
      timerActive: playing,
      sessionLength,
      sessionMode,
      activeQuestionIndices,
      profiles,
      currentProfileId,
      resultSaved,
    });
  }, [gameState, selectedLevel, currentQuestion, answers, showExplanation, timeLeft, playing, sessionLength, sessionMode, activeQuestionIndices, profiles, currentProfileId, resultSaved]);

  useEffect(() => {
    requestPersistentStorage();
  }, []);

  // Chronomètre : tourne uniquement pendant l'épreuve.
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [playing]);

  const finish = useCallback(() => {
    if (!resultSaved) {
      const { score, correct, incorrect, skipped, maxScore } = computeScore(questions, answers);
      const entry = {
        date: new Date().toISOString(),
        level: selectedLevel,
        questions: questions.length,
        mode: sessionMode,
        score: Number(score.toFixed(2)),
        maxScore,
        correct,
        incorrect,
        skipped,
        xp: getSessionXp({ questions: questions.length, correct, incorrect }),
      };
      setProfiles((prev) => {
        const p = prev[currentProfileId] ?? newProfile('Enfant');
        return {
          ...prev,
          [currentProfileId]: {
            ...p,
            history: [entry, ...(p.history || [])].slice(0, 100),
            reviewItems: updateReviewItems(p.reviewItems, { levelKey: selectedLevel, questions, questionIndices, answers }),
          },
        };
      });
      setResultSaved(true);
    }
    setShowExplanation(false);
    setGameState('results');
  }, [resultSaved, questions, answers, selectedLevel, sessionMode, currentProfileId, questionIndices]);

  useEffect(() => {
    if (playing && timeLeft === 0) finish();
  }, [playing, timeLeft, finish]);

  const dueForLevel = useMemo(
    () => dueReviewItems(profile).filter((item) => item.level === selectedLevel),
    [profile, selectedLevel]
  );

  const startSession = ({ indices, mode, levelKey = selectedLevel }) => {
    const subject = getLevel(levelKey);
    const minutes = Math.max(10, Math.round((subject.duration * Math.max(1, indices.length)) / subject.questions.length));
    setSelectedLevel(levelKey);
    setSessionMode(mode);
    setActiveQuestionIndices(indices);
    setCurrentQuestion(0);
    setAnswers({});
    setShowExplanation(false);
    setTimeLeft(minutes * 60);
    setResultSaved(false);
    setGameState('playing');
  };

  const startNew = () => {
    const all = level.questions.map((_, i) => i);
    if (sessionMode === 'review') {
      const due = [...new Set(dueForLevel.map((item) => item.questionIndex))].sort((a, b) => a - b);
      if (due.length) return startSession({ indices: due, mode: 'review' });
    }
    return startSession({ indices: all.slice(0, sessionLength), mode: 'standard' });
  };

  const reviewMistakes = (indices) => startSession({ indices, mode: 'review' });

  const abandonSession = () => {
    setActiveQuestionIndices(null);
    setAnswers({});
    setCurrentQuestion(0);
    setShowExplanation(false);
    setTimeLeft(null);
    setResultSaved(false);
  };

  const switchProfile = (id) => {
    setCurrentProfileId(id);
    abandonSession();
    setGameState('welcome');
  };

  const addProfile = () => {
    const id = `p${Date.now()}`;
    setProfiles((prev) => ({ ...prev, [id]: newProfile(`Enfant ${Object.keys(prev).length + 1}`) }));
    switchProfile(id);
  };

  const renameProfile = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProfiles((prev) => ({ ...prev, [currentProfileId]: { ...prev[currentProfileId], name: trimmed } }));
  };

  const resetAll = () => {
    clearSavedState();
    abandonSession();
    setProfiles(DEFAULT_PROFILES);
    setCurrentProfileId('p1');
    setSessionMode('standard');
    setSessionLength(24);
    setGameState('welcome');
  };

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(buildExport(profiles), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importProgress = (imported) => {
    const result = mergeProfiles(profiles, imported);
    setProfiles(result.profiles);
    return result;
  };

  const chooseFormat = (format) => {
    if (format === 'review') setSessionMode('review');
    else {
      setSessionMode('standard');
      setSessionLength(format === 'quick' ? 10 : 24);
    }
  };

  if (playing) {
    return (
      <Exam
        level={level}
        mode={sessionMode}
        questions={questions}
        currentQuestion={currentQuestion}
        answers={answers}
        showExplanation={showExplanation}
        timeLeft={timeLeft}
        onSelect={(letter) => setAnswers((prev) => ({ ...prev, [currentQuestion]: letter }))}
        onValidate={() => setShowExplanation(true)}
        onGoTo={(index) => {
          setCurrentQuestion(Math.max(0, Math.min(questions.length - 1, index)));
          setShowExplanation(false);
        }}
        onFinish={finish}
        onQuit={() => setGameState('welcome')}
      />
    );
  }

  if (gameState === 'results') {
    return (
      <Results
        level={level}
        mode={sessionMode}
        profile={profile}
        questions={questions}
        questionIndices={questionIndices}
        answers={answers}
        gamification={gamification}
        onReview={reviewMistakes}
        onHome={() => {
          abandonSession();
          setGameState('welcome');
        }}
      />
    );
  }

  return (
    <Home
      levelKeys={LEVEL_KEYS}
      selectedLevel={selectedLevel}
      onSelectLevel={setSelectedLevel}
      format={sessionMode === 'review' ? 'review' : sessionLength === 10 ? 'quick' : 'full'}
      onFormat={chooseFormat}
      dueForLevel={dueForLevel.length}
      onStart={startNew}
      paused={
        pausedSession
          ? {
              title: level.title,
              position: currentQuestion + 1,
              total: questions.length,
              answered: Object.keys(answers).length,
              timeLeft,
              mode: sessionMode,
            }
          : null
      }
      onResume={() => setGameState('playing')}
      onAbandon={abandonSession}
      profiles={profiles}
      currentProfileId={currentProfileId}
      profile={profile}
      gamification={gamification}
      onSwitchProfile={switchProfile}
      onAddProfile={addProfile}
      onRenameProfile={renameProfile}
      onResetAll={resetAll}
      onExport={exportProgress}
      onImport={importProgress}
    />
  );
}
