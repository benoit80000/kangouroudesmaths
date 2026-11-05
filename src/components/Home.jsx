import { useMemo } from 'react';
import { LEVELS } from '../data/levels.js';
import { bestScoresByLevel, formatDate, formatScore, formatTime } from '../lib/progress.js';
import Logo from './Logo.jsx';
import ProfileMenu from './ProfileMenu.jsx';

const FORMATS = [
  { id: 'full', title: 'Concours', detail: '24 questions · 50 min' },
  { id: 'quick', title: 'Rapide', detail: '10 questions · 21 min' },
  { id: 'review', title: 'Révision', detail: null },
];

export default function Home(props) {
  const {
    levelKeys, selectedLevel, onSelectLevel, format, onFormat, dueForLevel, onStart,
    paused, onResume, onAbandon, profile, gamification,
  } = props;
  const best = useMemo(() => bestScoresByLevel(profile), [profile]);
  const selectedYear = LEVELS[selectedLevel].year;
  const reviewEmpty = format === 'review' && dueForLevel === 0;
  const history = (profile.history || []).slice(0, 5);
  const xpPercent = (gamification.xpIntoLevel / gamification.xpPerLevel) * 100;

  return (
    <div className="screen">
      <header className="app-top">
        <div className="app-top-inner">
          <Logo />
          <div className="spacer" />
          {gamification.streakDays > 0 && (
            <span className="badge streak">Série {gamification.streakDays} jour{gamification.streakDays > 1 ? 's' : ''}</span>
          )}
          <ProfileMenu
            profiles={props.profiles}
            currentProfileId={props.currentProfileId}
            profile={profile}
            level={gamification.level}
            onSwitch={props.onSwitchProfile}
            onAdd={props.onAddProfile}
            onRename={props.onRenameProfile}
            onResetAll={props.onResetAll}
            onExport={props.onExport}
            onImport={props.onImport}
          />
        </div>
      </header>

      <main className="home">
        <div className="home-main">
          <h1 className="greeting">Bonjour {profile.name} !</h1>

          {paused && (
            <section className="card resume" aria-label="Épreuve en cours">
              <div className="resume-text">
                <span className="label">{paused.mode === 'review' ? 'Révision en cours' : 'Épreuve en cours'}</span>
                <h2>{paused.title} · question {paused.position} sur {paused.total}</h2>
                <span className="muted small">
                  {formatTime(paused.timeLeft)} restantes · {paused.answered} réponse{paused.answered > 1 ? 's' : ''} donnée{paused.answered > 1 ? 's' : ''}
                </span>
              </div>
              <div className="resume-actions">
                <button className="btn ghost" onClick={onAbandon}>Abandonner</button>
                <button className="btn primary" onClick={onResume}>Reprendre</button>
              </div>
            </section>
          )}

          <section className="card" aria-labelledby="new-exam">
            <h2 id="new-exam">Nouvelle épreuve</h2>

            <div className="field">
              <span className="label" id="years-label">Année · Sujet E (CE2, CM1, CM2)</span>
              <div className="years" role="radiogroup" aria-labelledby="years-label">
                {levelKeys.map((key) => {
                  const b = best[key];
                  const on = key === selectedLevel;
                  return (
                    <button
                      key={key}
                      role="radio"
                      aria-checked={on}
                      className={`year ${on ? 'sel' : ''} ${b ? 'done' : ''}`}
                      onClick={() => onSelectLevel(key)}
                    >
                      {LEVELS[key].year}
                      <small>{b ? `${formatScore(b.score)}/${b.maxScore}` : 'à faire'}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <span className="label" id="format-label">Format</span>
              <div className="seg" role="radiogroup" aria-labelledby="format-label">
                {FORMATS.map((f) => (
                  <button key={f.id} role="radio" aria-checked={format === f.id} className={format === f.id ? 'on' : ''} onClick={() => onFormat(f.id)}>
                    <b>{f.title}</b>
                    <small>
                      {f.detail ??
                        (dueForLevel > 0
                          ? `${dueForLevel} erreur${dueForLevel > 1 ? 's' : ''} à revoir`
                          : 'rien à revoir')}
                    </small>
                  </button>
                ))}
              </div>
              {reviewEmpty && (
                <p className="hint">
                  Aucune erreur à revoir aujourd'hui pour {selectedYear}. Les erreurs reviennent à J+1, puis J+3, puis J+7.
                </p>
              )}
            </div>

            <div className="start-row">
              <span className="muted small">Bonne réponse : 3 à 5 points · erreur : −¼ des points · sans réponse : 0</span>
              <button className="btn primary big" onClick={onStart} disabled={reviewEmpty}>
                {format === 'review' ? `Réviser ${selectedYear}` : `Commencer ${selectedYear}`}
              </button>
            </div>
          </section>
        </div>

        <aside className="home-side">
          <section className="card">
            <div className="row-between">
              <h2>Niveau {gamification.level}</h2>
              <span className="muted small num">{gamification.xpIntoLevel} / {gamification.xpPerLevel} XP</span>
            </div>
            <div className="xp" role="progressbar" aria-label="Progression vers le niveau suivant" aria-valuenow={Math.round(xpPercent)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${xpPercent}%` }} />
            </div>
            <dl className="kv">
              <dt>Mission du jour</dt>
              <dd>{Math.min(gamification.answeredToday, 10)} / 10 questions</dd>
              <dt>Score moyen</dt>
              <dd>{gamification.avgPercent === null ? '–' : `${Math.round(gamification.avgPercent)} %`}</dd>
              <dt>Épreuves terminées</dt>
              <dd>{gamification.sessions}</dd>
            </dl>
            {gamification.badges.length > 0 ? (
              <div className="badges">
                {gamification.badges.map((b) => <span key={b} className="badge">{b}</span>)}
              </div>
            ) : (
              <p className="muted small">Termine une première épreuve pour gagner ton premier badge.</p>
            )}
          </section>

          <section className="card">
            <h2>Dernières épreuves</h2>
            {history.length ? (
              <ul className="hist">
                {history.map((h, i) => (
                  <li key={i}>
                    <span className="hist-what">
                      <span>
                        Sujet {LEVELS[h.level]?.year ?? h.level}
                        {h.mode === 'review' ? ' · révision' : h.questions !== 24 ? ` · ${h.questions} questions` : ''}
                      </span>
                      <span className="hist-date">{formatDate(h.date)}</span>
                    </span>
                    <b className="num">{h.maxScore ? `${formatScore(h.score)} / ${h.maxScore}` : '–'}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Aucune épreuve pour l'instant. Tes scores s'afficheront ici.</p>
            )}
          </section>

          <section className="card">
            <h2>Barème</h2>
            <table className="bareme">
              <tbody>
                <tr><td>Questions 1 à 8</td><td>3 pts</td></tr>
                <tr><td>Questions 9 à 16</td><td>4 pts</td></tr>
                <tr><td>Questions 17 à 24</td><td>5 pts</td></tr>
                <tr><td>Mauvaise réponse</td><td>−¼</td></tr>
                <tr><td>Sans réponse</td><td>0</td></tr>
              </tbody>
            </table>
          </section>
        </aside>
      </main>
    </div>
  );
}
