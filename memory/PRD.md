# IronFlow — Programmes personnalisés multi-séances

## Objectif
Application mobile React Native (Expo) tout-en-un pour l'entraînement :
- **Programmes 30 jours pré-encodés** + **création de programmes personnalisés** avec plusieurs séances par jour.
- **Onglet Programme dédié** pour visualiser sa progression et les jours à venir.
- Import IA d'un plan (Gemini 3 Flash).
- Séances chronométrées avec 4 modes (REPS / TIME / AMRAP / EMOM), voix française, calories personnalisées.
- Évolution corporelle (mesures + photos compressées + comparateur avant/après).
- Records personnels + calculateur de %.

## Onglets (5)
1. **Accueil** — Hero, stats, carte du jour multi-séances si programme actif.
2. **Programme** (nouveau) — Hero du programme actif + progress bar + planning 7 jours à venir avec toutes les séances tappables directement.
3. **Plans** — Plans manuels et importés (les plans générés par programmes sont cachés).
4. **Historique** — Séances passées + stats.
5. **Progrès** — Mesures + Records + Comparateur.

## Programmes

### Programmes inclus (bundle read-only)
- 💪 **Full Body 30 jours** — débutant (25 séances + 5 repos).
- 🔥 **HIIT Fat Burn 30 jours** — intermédiaire (20 séances : Tabata, EMOM, AMRAP, cardio).
- 🏋️ **Prise de masse 30 jours** — avancé, split PPL+Bras (24 séances).

### Programmes personnalisés
- Créés via `/custom-program/new` : titre, objectif, description, niveau, emoji parmi 9, couleur parmi 8, durée +/- (1 → 60 jours).
- Chaque jour est configurable : **REPOS** ou **SÉANCE** avec 1..N sessions.
- Chaque session a un **label** (Matin/Cardio/Muscu…), un **titre**, et une liste d'exercices éditables (nom × séries × reps).
- Persistance dans AsyncStorage (`@ironflow/customPrograms`).
- Éditable / supprimable via bouton crayon sur la page détail.

### Multi-séances par jour
- Exemple : Jour 1 = "Matin: Cardio 30 min" + "Soir: Muscu Push". Les deux apparaissent dans l'onglet Programme et sur la carte Accueil du jour, chacune avec son propre bouton **C'EST PARTI**.
- Chaque session est cochée indépendamment (`completedSessions: [{dayIndex, sessionIndex}]`).
- Le jour est considéré "fait" quand toutes ses sessions sont complétées.

## Storage keys
- `@ironflow/plans`, `/sessions`, `/profile`, `/measurements`, `/prs`, `/activeProgram`, `/customPrograms`.

## Migration
- `ActiveProgram.completedDayIndexes` → `completedSessions[{dayIndex, sessionIndex}]` via `normalizeActive`. Anciennes séances restent visibles.

## Stack
- Frontend : Expo SDK 54, expo-router, react-native-svg, react-native-gifted-charts, react-native-view-shot, expo-sharing, expo-image-picker, expo-image-manipulator, expo-speech, expo-haptics, expo-linear-gradient.
- Backend : FastAPI + emergentintegrations (Gemini 3 Flash).

## Endpoints
- `GET /api/health`
- `POST /api/parse-plan`

## Formules
- Calories : `kcal = MET × poids × heures`.
- 1RM : Epley `w × (1 + reps/30)`.
- IMC : `poids_kg / taille_m²`.

## Prochaines évolutions
- Import IA multi-sessions par jour (photo d'un planning hebdo).
- Templates de programme (Push/Pull/Legs 3j/sem, 4x4 muscu, etc.).
- Comparaison de programmes suivis dans le temps.
- Notifications quotidiennes (nécessite un build).
