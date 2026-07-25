# IronFlow — Suivi d'entraînement, mesures & records

## Objectif
Application mobile React Native (Expo) tout-en-un pour l'entraînement : import IA d'un plan (Gemini 3 Flash), suivi des séances (musculation, WOD/TIME, AMRAP), calories personnalisées, évolution corporelle (mesures + photos) et records personnels avec calculateur de pourcentages 1RM.

## Fonctionnalités
### 1. Profil utilisateur
- Sexe, poids, taille, âge — stocké local.
- Calcul automatique de l'IMC + catégorie de corpulence.
- Le poids utilisateur affine le calcul des calories brûlées (formule MET × masse × durée).

### 2. Plans & séances
- 3 modes d'exercice par plan :
  - `REPS` — séries × répétitions classique.
  - `TIME` — chronométré (ex. 5 min de burpees).
  - `AMRAP` — timer fixe avec compteur de tours (+/-).
- Import IA depuis photo (Gemini 3 Flash Vision).
- Création manuelle avec segmented control REPS / TIME / AMRAP.
- Timer plein écran (cercle SVG animé) : orange = repos, vert = effort, jaune = AMRAP. Retour haptique triple à la fin.

### 3. Résumé de séance + partage image
- Page /session/[id] : hero gradient avec durée, calories, séries, effort actif vs pause, détail par exercice.
- **Bouton PARTAGER MA SÉANCE** : utilise `react-native-view-shot` pour capturer la carte hero (avec branding IRONFLOW) et `expo-sharing.shareAsync()` pour partager comme **image PNG**. Fallback texte si l'appareil ne supporte pas.
- Idéal pour l'acquisition organique (Instagram/Stories).

### 4. Progression corporelle
- Onglet Progrès → Mesures.
- Saisie : date, poids (kg), tour de taille (cm), tour de cuisse (cm), tour de poitrine (cm), notes.
- **Photo de comparaison** : caméra ou galerie, stockée en base64 local.
- **Graphiques multi-métriques** : chips au-dessus du graphique pour switcher entre Poids / Taille / Poitrine / Cuisse. Chaque graphique affiche un chip de delta (▲/▼ + valeur) en tête.
- **Comparateur avant / après** : dès ≥ 2 mesures avec photo, un bouton ouvre `/compare` — photos côte à côte, sélecteur de photos avant / après (bottom sheet grid), bouton swap, delta card avec évolution de chaque métrique (vert = amélioration, rouge = régression, selon la logique "poids/taille bas = mieux, poitrine/cuisse haut = mieux").

### 5. Records personnels + calculateur %
- Onglet Progrès → Records.
- Saisir : nom d'exercice, poids max, répétitions.
- **1RM estimé automatiquement** avec la formule d'Epley : `1RM = w × (1 + reps/30)`.
- Bottom sheet **Calculateur de pourcentage** : chips 50 / 60 / 70 / 80 / 90 / 100 %, ou saisie manuelle → affiche le poids à charger pour le % du 1RM.

## Stack
- Frontend : Expo SDK 54, expo-router file-based, react-native-svg, react-native-gifted-charts, react-native-view-shot, expo-sharing, expo-image-picker, expo-haptics, expo-linear-gradient.
- Backend : FastAPI + emergentintegrations (Gemini 3 Flash) — endpoints `/api/health` et `/api/parse-plan`.
- Stockage : 100 % local via AsyncStorage (@ironflow/plans, /sessions, /profile, /measurements, /prs).

## Endpoints
- `GET /api/health` — statut + config LLM.
- `POST /api/parse-plan` — body `{ image_base64 }` → plan structuré avec modes reps/time/amrap.

## Formules
- **Calories** : `kcal = MET × poids × heures` avec MET = 5 (musculation) / 8 (HIIT) / 9 (cardio) / 7 (mixte).
- **1RM** : Epley `w × (1 + reps/30)`.
- **IMC** : `poids_kg / (taille_m)²`.

## Design
Dark energetic gym theme, Ember Orange #FF3D00, grille 8pt, cercles timer 240 pt, cards radius 12.

## Prochaines évolutions
- Assistant vocal (créer une séance rapide).
- Import PDF multi-pages.
- Comparateur photo côte à côte (avant/après).
- Suivi mensuel avec objectifs.
- Notifications de rappel (nécessite un build).
