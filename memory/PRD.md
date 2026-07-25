# IronFlow — Programme, entraînement, mesures & records

## Objectif
Application mobile React Native (Expo) tout-en-un pour l'entraînement :
- **Programmes 30 jours** pré-encodés à suivre jour par jour.
- Import IA d'un plan (Gemini 3 Flash).
- Séances chronométrées avec 4 modes (REPS / TIME / AMRAP / EMOM), voix française, calories personnalisées.
- Évolution corporelle (mesures + photos compressées + comparateur avant/après).
- Records personnels + calculateur de %.

## Fonctionnalités

### 1. Profil utilisateur
- Sexe, poids, taille, âge — stocké local.
- IMC calculé, poids utilisé pour affiner les calories.

### 2. Programmes 30 jours pré-encodés
- **3 programmes bundle inclus** dans l'app (aucune donnée serveur requise) :
  - **Full Body 30 jours** — débutant, remise en forme (25 séances + 5 repos).
  - **HIIT Fat Burn 30 jours** — intermédiaire, perte de graisse (20 séances + 10 repos).
  - **Prise de masse 30 jours** — avancé, musculation lourde split PPL+bras (24 séances + 6 repos).
- Page `/programs` (modal) + détail `/program/[id]` avec planning des 30 jours, hero, description.
- Un seul programme actif à la fois. Bouton "COMMENCER" enregistre `startedAt`.
- Page **Home** affiche automatiquement la carte "PROGRAMME EN COURS · Jour X/30" avec la séance du jour et un bouton "C'EST PARTI".
- Détection auto du jour actif (basé sur la date de début). Repos affiché avec icône 😴.
- Séance terminée → jour marqué avec ✓ vert dans la liste + compteur "N séances terminées".

### 3. Plans & séances
- **4 modes d'exercice** : REPS / TIME / AMRAP / EMOM.
- Import IA depuis photo (Gemini 3 Flash Vision) reconnaissant les 4 modes.
- Timer plein écran avec cercle SVG animé et **countdown vocal (expo-speech)** : « C'est parti ! » au démarrage, « 10 secondes » à 10 s de la fin, comptage 3-2-1.
- Enchaînement automatique des rounds EMOM sans repos.

### 4. Résumé + partage image
- Page /session/[id] : hero gradient, durée, calories, séries, effort actif vs pause, détail par exercice.
- **Bouton PARTAGER** : capture PNG via `react-native-view-shot` + `expo-sharing.shareAsync()`.

### 5. Progression corporelle
- Onglet Progrès → Mesures : date, poids, tour de taille, cuisse, poitrine + photo.
- **Photo compressée** auto via `expo-image-manipulator` (900 px + JPEG 60 %).
- **Graphiques multi-métriques** : chips pour switcher entre Poids / Taille / Poitrine / Cuisse.
- **Comparateur avant / après** : photos côte à côte, delta card colorée.

### 6. Records & 1RM
- Onglet Progrès → Records : nom, poids max, reps → **1RM auto (Epley)**.
- Bottom sheet **Calculateur de %** avec presets 50/60/70/80/90/100 %.

## Stack
- Frontend : Expo SDK 54, expo-router, react-native-svg, react-native-gifted-charts, react-native-view-shot, expo-sharing, expo-image-picker, expo-image-manipulator, expo-speech, expo-haptics, expo-linear-gradient.
- Backend : FastAPI + emergentintegrations (Gemini 3 Flash).
- Stockage : 100 % local via AsyncStorage.

## Storage keys
- `@ironflow/plans`, `/sessions`, `/profile`, `/measurements`, `/prs`, `/activeProgram`.

## Endpoints backend
- `GET /api/health`.
- `POST /api/parse-plan`.

## Formules
- Calories : `kcal = MET × poids × heures` (MET 5/8/9/7).
- 1RM : Epley `w × (1 + reps/30)`.
- IMC : `poids_kg / (taille_m)²`.

## Prochaines évolutions
- Programmes personnalisés créés par l'utilisateur.
- Rappels quotidiens de séance (nécessite un build).
- Slider "before/after" interactif dans le comparateur.
- Choix de la voix TTS.
