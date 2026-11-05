# Kangourou des Mathématiques — entraînement

Application d'entraînement au jeu-concours Kangourou des Mathématiques, sujets E (CE2, CM1, CM2) de 2004 à 2025 :
épreuves chronométrées, correction immédiate, profils enfants, révision espacée des erreurs (J+1, J+3, J+7), XP et badges.

## Développer

```bash
npm install
npm run dev      # serveur local avec rechargement
npm run build    # version de production dans dist/
npm run preview  # tester la version de production
```

## Organisation

- `src/data/sujetE.js` : corrigés officiels (une lettre par question), énoncés et explications vérifiées.
- `src/data/levels.js` : construction des sujets (barème 3/4/5 points, chemins des figures).
- `src/lib/progress.js` : score, XP, badges, révision espacée, sauvegarde locale.
- `src/components/` : écrans Accueil, Épreuve et Résultats.
- `public/exercises/<année>/qNN.png` : figures des exercices.
- `pdf/` : sujets et corrigés d'origine.

La progression est enregistrée dans le navigateur (clé `kangourou_app_state_v1`, format compatible avec l'ancienne version).
Depuis le menu du profil, « Enregistrer » télécharge toute la progression dans un fichier JSON et « Restaurer… »
le réimporte (sur le même appareil ou un autre) en fusionnant sans doublon : les profils de même prénom sont réunis.
L'appli demande aussi au navigateur un stockage persistant, pour éviter qu'il efface les données de lui-même.

## Mise en ligne

Le site est déployé par Vercel à chaque push (production sur `main`, prévisualisation sur les autres branches).
`vercel.json` fixe la configuration : `npm run build`, dossier publié `dist/`.

## Sécurité

- Aucune ressource externe : polices hébergées avec le site, aucun service tiers, aucune donnée envoyée sur Internet.
- En-têtes de sécurité (`vercel.json`) : politique CSP stricte, protection contre l'intégration dans une autre page,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Toute donnée relue (sauvegarde du navigateur ou fichier importé) est validée champ par champ dans
  `src/lib/progress.js` : types, bornes, clés spéciales refusées, taille d'import limitée à 1 Mo.
- `npm audit` : 0 vulnérabilité.

