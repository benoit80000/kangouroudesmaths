import { useEffect, useRef, useState } from 'react';
import { LETTERS } from '../data/levels.js';
import { formatTime } from '../lib/progress.js';

function Figure({ question }) {
  const [zoomed, setZoomed] = useState(false);
  const closeRef = useRef(null);
  const alt = question.text ? `Exercice ${question.id} : ${question.text}` : `Exercice ${question.id}, énoncé et réponses A à E`;

  useEffect(() => {
    if (!zoomed) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setZoomed(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [zoomed]);

  return (
    <>
      <div className="figure-scroll">
        <button className="figure" onClick={() => setZoomed(true)} aria-label="Agrandir la figure">
          <img src={question.image} alt={alt} />
        </button>
      </div>
      <p className="figure-hint">Touche la figure pour l'agrandir</p>
      {zoomed && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Exercice ${question.id} agrandi`} onClick={() => setZoomed(false)}>
          <button ref={closeRef} className="btn lightbox-close" onClick={() => setZoomed(false)}>Fermer</button>
          <div className="lightbox-scroll">
            <img src={question.image} alt={alt} onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </>
  );
}

function groupByPoints(questions) {
  const groups = [];
  questions.forEach((q, index) => {
    const last = groups[groups.length - 1];
    if (last && last.points === q.points) last.items.push({ q, index });
    else groups.push({ points: q.points, items: [{ q, index }] });
  });
  return groups;
}

export default function Exam({
  level, mode, questions, currentQuestion, answers, showExplanation, timeLeft,
  onSelect, onValidate, onGoTo, onFinish, onQuit,
}) {
  const [confirmFinish, setConfirmFinish] = useState(false);
  const question = questions[currentQuestion];
  const answer = answers[currentQuestion];
  const isLast = currentQuestion === questions.length - 1;
  const hasCorrection = Boolean(question.correct);
  const unanswered = questions.length - Object.keys(answers).length;
  const lowTime = timeLeft < 300;

  useEffect(() => setConfirmFinish(false), [currentQuestion]);
  useEffect(() => {
    if (!confirmFinish) return undefined;
    const t = setTimeout(() => setConfirmFinish(false), 5000);
    return () => clearTimeout(t);
  }, [confirmFinish]);

  const next = () => (isLast ? onFinish() : onGoTo(currentQuestion + 1));

  // Raccourcis : A à E pour répondre, Entrée pour valider / continuer, flèches pour naviguer.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, [role="dialog"]')) return;
      const key = e.key.toUpperCase();
      if (LETTERS.includes(key) && !showExplanation) {
        onSelect(key);
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        if (showExplanation) next();
        else if (answer) onValidate();
      } else if (e.key === 'ArrowRight' && !isLast) {
        onGoTo(currentQuestion + 1);
      } else if (e.key === 'ArrowLeft' && currentQuestion > 0) {
        onGoTo(currentQuestion - 1);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const answerClass = (letter) => {
    const classes = ['ans'];
    if (showExplanation && hasCorrection) {
      if (letter === question.correct) classes.push('right');
      else if (letter === answer) classes.push('wrong');
    } else if (letter === answer) classes.push('sel');
    return classes.join(' ');
  };

  const correctNow = hasCorrection && answer === question.correct;

  return (
    <div className="screen exam-screen">
      <header className="exam-top">
        <div className="exam-top-inner">
          <div className="qpos">
            Question {currentQuestion + 1}
            <small> sur {questions.length} · {level.title}{mode === 'review' ? ' · révision' : ''}</small>
          </div>
          <div className="ticks" aria-hidden="true">
            {questions.map((q, i) => (
              <i
                key={i}
                className={`${i === currentQuestion ? 'c' : answers[i] ? 'a' : ''} ${i > 0 && questions[i - 1].points !== q.points ? 'gap' : ''}`}
              />
            ))}
          </div>
          <div className={`timer ${lowTime ? 'low' : ''}`} role="timer" aria-label={`Temps restant ${formatTime(timeLeft)}`}>
            {formatTime(timeLeft)}
          </div>
          <button className="link-btn" onClick={onQuit}>Pause</button>
        </div>
      </header>

      <main className="exam">
        <section className="qcard" aria-label={`Question ${question.id}`}>
          <div className="qhead">
            <span className="qnum">Exercice {question.id}</span>
            <span className="pts">{question.points} points</span>
          </div>

          <Figure key={question.image} question={question} />

          <div className="answer-panel">
            <div className="answers" role="radiogroup" aria-label="Ta réponse">
              {LETTERS.map((letter) => (
                <button
                  key={letter}
                  role="radio"
                  aria-checked={answer === letter}
                  className={answerClass(letter)}
                  disabled={showExplanation}
                  onClick={() => onSelect(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>

            {showExplanation && (
              <div className={`feedback ${hasCorrection ? (correctNow ? 'ok' : 'ko') : ''}`} role="status">
                {hasCorrection ? (
                  <>
                    <strong>
                      {correctNow
                        ? `Bravo ! +${question.points} points`
                        : `Pas tout à fait : la bonne réponse est ${question.correct}.`}
                    </strong>
                    {question.explanation && <p>{question.explanation}</p>}
                  </>
                ) : (
                  <strong>Réponse enregistrée. Pas de corrigé pour cet exercice.</strong>
                )}
              </div>
            )}

            <div className="exam-actions">
              <button className="btn" onClick={() => onGoTo(currentQuestion - 1)} disabled={currentQuestion === 0} aria-label="Question précédente">
                ← <span className="wide-only">Précédente</span>
              </button>
              <div className="actions-right">
              {showExplanation ? (
                <button className="btn primary grow" onClick={next}>
                  {isLast ? 'Voir mes résultats' : 'Question suivante →'}
                </button>
              ) : (
                <>
                  <button className="btn" onClick={next}>{isLast ? 'Terminer' : 'Passer'}</button>
                  <button className="btn primary grow" onClick={onValidate} disabled={!answer}>Valider</button>
                </>
              )}
              </div>
            </div>
          </div>
        </section>

        <aside className="card map" aria-label="Toutes les questions">
          {groupByPoints(questions).map((group, gi) => (
            <div className="map-group" key={gi}>
              <div className="label row-between">
                <span>Questions {group.items[0].q.id}{group.items.length > 1 ? ` à ${group.items[group.items.length - 1].q.id}` : ''}</span>
                <span>{group.points} pts</span>
              </div>
              <div className="dots">
                {group.items.map(({ q, index }) => (
                  <button
                    key={index}
                    className={`dot ${index === currentQuestion ? 'cur' : answers[index] ? 'a' : ''}`}
                    onClick={() => onGoTo(index)}
                    aria-label={`Question ${q.id}${answers[index] ? `, réponse ${answers[index]}` : ', sans réponse'}`}
                    aria-current={index === currentQuestion ? 'step' : undefined}
                  >
                    {q.id}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="legend">
            <span><i className="lg-a" />répondue</span>
            <span><i className="lg-c" />en cours</span>
            <span><i />à faire</span>
          </div>
          <button
            className={`btn hand-in ${confirmFinish ? 'armed' : ''}`}
            onClick={() => (confirmFinish || unanswered === 0 ? onFinish() : setConfirmFinish(true))}
          >
            {confirmFinish
              ? `Confirmer : ${unanswered} question${unanswered > 1 ? 's' : ''} sans réponse`
              : 'Rendre ma copie'}
          </button>
          <p className="kbd-hint">Clavier : touches A à E pour répondre, Entrée pour valider, flèches pour changer de question.</p>
        </aside>
      </main>
    </div>
  );
}
