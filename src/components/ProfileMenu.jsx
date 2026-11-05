import { useEffect, useRef, useState } from 'react';
import { parseImport, MAX_IMPORT_BYTES } from '../lib/progress.js';

export default function ProfileMenu({ profiles, currentProfileId, profile, level, onSwitch, onAdd, onRename, onResetAll, onExport, onImport }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState(null);
  const ref = useRef(null);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Ce fichier est trop volumineux pour être une sauvegarde Kangourou.');
      const imported = parseImport(await file.text());
      const { addedSessions, addedProfiles } = onImport(imported);
      const parts = [];
      if (addedProfiles) parts.push(`${addedProfiles} profil${addedProfiles > 1 ? 's' : ''} ajouté${addedProfiles > 1 ? 's' : ''}`);
      parts.push(addedSessions ? `${addedSessions} épreuve${addedSessions > 1 ? 's' : ''} récupérée${addedSessions > 1 ? 's' : ''}` : 'aucune nouvelle épreuve');
      setNotice({ ok: true, text: `Progression restaurée : ${parts.join(', ')}.` });
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  useEffect(() => setName(profile.name), [profile.name]);

  useEffect(() => {
    if (!open) {
      setConfirmReset(false);
      setNotice(null);
      return undefined;
    }
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div className="profile-menu" ref={ref}>
      <button className="profile-pill" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <span className="avatar" aria-hidden="true">{profile.name.trim().charAt(0).toUpperCase() || '?'}</span>
        <span className="profile-name">{profile.name}</span>
        <span className="lvl">niveau {level}</span>
        <span aria-hidden="true" className="caret">▾</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="label">Changer de profil</div>
          <div className="menu-list">
            {Object.entries(profiles).map(([id, p]) => (
              <button
                key={id}
                role="menuitemradio"
                aria-checked={id === currentProfileId}
                className={`menu-item ${id === currentProfileId ? 'on' : ''}`}
                onClick={() => {
                  onSwitch(id);
                  setOpen(false);
                }}
              >
                <span className="avatar small" aria-hidden="true">{p.name.trim().charAt(0).toUpperCase() || '?'}</span>
                {p.name}
              </button>
            ))}
            <button className="menu-item add" onClick={onAdd}>+ Ajouter un profil</button>
          </div>
          <form
            className="rename"
            onSubmit={(e) => {
              e.preventDefault();
              onRename(name);
            }}
          >
            <label className="label" htmlFor="profile-name">Prénom du profil</label>
            <div className="rename-row">
              <input id="profile-name" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
              <button className="btn" type="submit" disabled={!name.trim() || name.trim() === profile.name}>Renommer</button>
            </div>
          </form>
          <div className="backup">
            <span className="label">Sauvegarde</span>
            <p className="backup-text">
              La progression est gardée dans ce navigateur. Pour la conserver en lieu sûr ou la passer sur un autre appareil, enregistre-la dans un fichier.
            </p>
            <div className="backup-row">
              <button className="btn" onClick={onExport}>Enregistrer</button>
              <button className="btn" onClick={() => fileRef.current?.click()}>Restaurer…</button>
              <input
                ref={fileRef}
                id="import-file"
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
            {notice && <p className={`notice ${notice.ok ? 'ok' : 'ko'}`} role="status">{notice.text}</p>}
          </div>
          <button
            className={`menu-danger ${confirmReset ? 'armed' : ''}`}
            onClick={() => {
              if (confirmReset) {
                onResetAll();
                setOpen(false);
              } else setConfirmReset(true);
            }}
          >
            {confirmReset ? 'Confirmer : tout effacer (profils et historique)' : 'Effacer toute la progression…'}
          </button>
        </div>
      )}
    </div>
  );
}
