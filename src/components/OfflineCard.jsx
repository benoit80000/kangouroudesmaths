import { useEffect, useRef, useState } from 'react';
import { allFigureUrls, countCachedFigures, downloadAllFigures, offlineSupported } from '../lib/offline.js';

export default function OfflineCard() {
  const [supported] = useState(offlineSupported);
  const [total] = useState(() => allFigureUrls().length);
  const [count, setCount] = useState(null);
  const [state, setState] = useState('idle'); // idle | loading | error
  const abortRef = useRef(null);

  useEffect(() => {
    if (!supported) return undefined;
    let alive = true;
    countCachedFigures().then((n) => alive && setCount(n));
    return () => {
      alive = false;
      abortRef.current?.abort();
    };
  }, [supported]);

  if (!supported || count === null) return null;
  const complete = count >= total;

  const start = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setState('loading');
    try {
      const { failed } = await downloadAllFigures(setCount, controller.signal);
      if (!controller.signal.aborted) setState(failed ? 'error' : 'idle');
    } catch {
      setState('error');
    }
  };

  return (
    <section className="card offline">
      <div className="row-between">
        <h2>Hors connexion</h2>
        <span className={`badge ${complete ? 'ok' : ''}`}>{complete ? 'Prêt' : `${Math.round((count / total) * 100)} %`}</span>
      </div>
      {complete ? (
        <p className="muted small">Tous les sujets sont sur cet appareil : l'appli fonctionne même sans Internet.</p>
      ) : (
        <>
          <p className="muted small">
            Les sujets déjà ouverts marchent sans Internet. Pour emporter les {total} exercices (environ 38 Mo), télécharge-les une fois.
          </p>
          {state === 'loading' ? (
            <div className="xp" role="progressbar" aria-label="Téléchargement des exercices" aria-valuenow={count} aria-valuemin={0} aria-valuemax={total}>
              <span style={{ width: `${(count / total) * 100}%` }} />
            </div>
          ) : (
            <button className="btn" onClick={start}>Télécharger tous les sujets</button>
          )}
          {state === 'loading' && <p className="muted small num">{count} / {total} exercices</p>}
          {state === 'error' && <p className="notice ko">Certains exercices n'ont pas pu être téléchargés. Vérifie la connexion et réessaie.</p>}
        </>
      )}
    </section>
  );
}
