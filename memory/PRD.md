# IronFlow — Suivi d'entraînement & temps de pause

## Objectif
Application mobile React Native (Expo) qui permet d'importer un plan sportif depuis une photo (IA Gemini 3 Flash) et de suivre les séances : chronomètre, séries/répétitions/poids, temps de pause, exercices chronométrés (style WOD), AMRAP, calories estimées, partage.

## Fonctionnalités
### Plans & exercices
- **3 modes d'exercice** par exercice au sein d'un plan :
  - `REPS` — classique séries × répétitions + poids + repos entre les séries.
  - `TIME` — chaque série est un timer (ex : 5 min de burpees, style WOD).
  - `AMRAP` — timer fixe + compteur de tours pendant l'effort.
- **Import IA** (photo/galerie) : Gemini 3 Flash reconnaît reps/time/amrap et duration_seconds.
- **Création/édition manuelle** avec segmented control de mode.

### Séance active
- Chronomètre global + progress bar par séries complétées.
- Chips exercices navigables (marquage vert pour les exercices terminés).
- Overlay bottom-sheet plein écran avec cercle SVG animé pour :
  - Repos (orange) après une série reps completée.
  - Effort (vert) pour les exercices TIME — chaîne automatiquement le repos.
  - AMRAP (jaune) avec compteur +/- de tours.
- Contrôles +15s / -15s / TERMINER · retour haptique triple à la fin.

### Résumé & partage
- Page /session/[id] : hero gradient avec durée, calories estimées (MET × 70kg × durée), séries, effort actif vs pause.
- Détail par exercice (pills séries pour reps ; format N×durée pour time ; tours×durée pour amrap).
- Bouton **PARTAGER MA SÉANCE** : `Share.share()` natif avec récap textuel formaté et hashtag.

### Historique & stats
- Liste des séances tappables (→ détail).
- KPIs : total séances, calories brûlées, minutes totales, durée moyenne.
- Graphique barres 7 derniers jours (react-native-gifted-charts).

## Stockage
- 100 % local via AsyncStorage — aucune donnée sortante hors de l'appel /api/parse-plan.

## Stack
- Frontend : Expo SDK 54, expo-router file-based, react-native-svg (cercle timer), react-native-gifted-charts, expo-image-picker, expo-haptics, expo-linear-gradient.
- Backend : FastAPI + emergentintegrations (Gemini 3 Flash) — endpoints `/api/health` et `/api/parse-plan`.
- Design : dark energetic gym theme (Ember Orange #FF3D00), grille 8pt, radius 12.

## Endpoints
- `GET /api/health` — statut + config LLM.
- `POST /api/parse-plan` — body `{ image_base64 }` → `{ title, exercises: [{ name, mode, sets, reps, weight, rest_seconds, duration_seconds, notes }] }`.

## Calories — méthode
`kcal = MET × 70kg × durée_heures` avec MET = 5 (musculation) / 8 (HIIT) / 9 (cardio) / 7 (mixte). Précision indiquée à l'utilisateur : ±20 %.

## Prochaines évolutions
- Assistant vocal ("crée un HIIT 20 min").
- Import PDF multi-pages.
- Partage image (générer une carte visuelle avec vue capturée).
- Profil utilisateur (poids réel pour calories précises).
- Sauvegarde cloud optionnelle.
