import { useMemo } from 'react';
import { computeScore, formatScore, MODE_SUFFIX } from '../lib/progress.js';
import Logo from './Logo.jsx';

const STATUS_LABEL = { correct: 'juste', incorrect: 'fausse', skipped: 'sans réponse', none: 'sans corrigé' };

export default function Results({ level, mode, profile, questions, questionIndices, answers, gamification, onReview, onHome }) {
  const { score, correct, incorrect, skipped, maxScore, statuses } = useMemo(
    () => computeScore(questions, answers),
    [questions, answers]
  );
  const latest = profile.history?.[0];
  const mistakes = statuses
    .map((s, i) => (s === 'incorrect' || s === 'skipped' ? questionIndices[i] : null))
    .filter((i) => i !== null);
  const percent = maxScore ? Math.round((score / maxScore) * 100) : null;
  const message =
    percent === null ? 'Épreuve terminée' :
    percent >= 80 ? 'Excellent travail !' :
    percent >= 50 ? 'Bien joué !' :
    'Continue, tu progresses !';

  return (
    <div className="screen">
      <header className="app-top">
        <div className="app-top-inner">
          <Logo />
          <div className="spacer" />
          <span className="muted small">{profile.name}</span>
        </div>
      </header>

      <main className="results">
        <section className="card results-card">
          <span className="label">{level.title}{MODE_SUFFIX[mode] ?? ''}</span>
          <h1>{message}</h1>

          <div className="score">
            <b className="num">{formatScore(score)}</b>
            <span>point{score > 1 ? 's' : ''} sur {maxScore}</span>
          </div>

          <div className="trio">
            <div className="t-ok"><b className="num">{correct}</b>juste{correct > 1 ? 's' : ''}</div>
            <div className="t-ko"><b className="num">{incorrect}</b>fausse{incorrect > 1 ? 's' : ''}</div>
            <div className="t-sk"><b className="num">{skipped}</b>sans réponse</div>
          </div>

          <div>
            <span className="label">Ta copie</span>
            <ol className="rgrid">
              {questions.map((q, i) => (
                <li key={i} className={`r-${statuses[i]}`} title={`Question ${q.id} : ${STATUS_LABEL[statuses[i]]}${answers[i] ? ` (tu as répondu ${answers[i]}${q.correct && answers[i] !== q.correct ? `, bonne réponse ${q.correct}` : ''})` : q.correct ? ` (bonne réponse ${q.correct})` : ''}`}>
                  <span className="r-id">{q.id}</span>
                  <span className="r-ans">{statuses[i] === 'correct' ? answers[i] : q.correct ?? '–'}</span>
                </li>
              ))}
            </ol>
            <p className="muted small">Sous chaque numéro : la bonne réponse.</p>
          </div>

          {latest?.xp !== undefined && (
            <div className="xpgain">
              <span>Récompense</span>
              <b>+{latest.xp} XP · niveau {gamification.level}</b>
            </div>
          )}

          <div className="results-actions">
            <button className="btn" onClick={onHome}>Retour à l'accueil</button>
            {mistakes.length > 0 && (
              <button className="btn primary" onClick={() => onReview(mistakes)}>
                Refaire mes {mistakes.length} question{mistakes.length > 1 ? 's' : ''} ratée{mistakes.length > 1 ? 's' : ''}
              </button>
            )}
          </div>

          <section className="corrige" aria-labelledby="corrige-title">
            <h2 id="corrige-title">Corrigé détaillé</h2>
            <p className="muted small">Ouvre une question pour revoir la figure et l'explication.</p>
            <ol className="corrige-list">
              {questions.map((q, i) => {
                const status = statuses[i];
                return (
                  <li key={i}>
                    <details className={`corrige-item c-${status}`}>
                      <summary>
                        <span className="c-num">{q.id}</span>
                        <span className="c-text">
                          {status === 'correct' && <>Juste : {answers[i]}</>}
                          {status === 'incorrect' && <>Tu as répondu {answers[i]}, la bonne réponse est {q.correct}</>}
                          {status === 'skipped' && <>Sans réponse : la bonne réponse est {q.correct}</>}
                          {status === 'none' && <>Pas de corrigé{answers[i] ? ` (tu as répondu ${answers[i]})` : ''}</>}
                        </span>
                        <span className="c-pts">
                          {status === 'correct' ? `+${q.points}` : status === 'incorrect' ? `−${formatScore(q.points / 4)}` : '0'}
                        </span>
                      </summary>
                      <div className="corrige-body">
                        <div className="figure-scroll">
                          <img className="corrige-img" src={q.image} alt={q.text ? `Exercice ${q.id} : ${q.text}` : `Exercice ${q.id}`} loading="lazy" />
                        </div>
                        {q.explanation ? <p>{q.explanation}</p> : <p className="muted">Pas encore d'explication pour cette question.</p>}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
          </section>
        </section>
      </main>
    </div>
  );
}
