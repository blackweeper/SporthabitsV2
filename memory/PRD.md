# IronFlow — Suivi d'entraînement & temps de pause

## Objectif
Application mobile React Native (Expo) qui permet d'importer un plan sportif depuis une photo (analysée par IA Gemini 3 Flash) et de suivre les séances : chronomètre, séries/répétitions/poids, temps de pause avec compte à rebours et retour haptique, historique et statistiques hebdomadaires.

## Fonctionnalités MVP
- **Import IA d'un plan** (photo/galerie → extraction automatique title + exercises via Gemini 3 Flash Vision).
- **Création manuelle** de plan (type: musculation / hiit / cardio / mixte, exercices, séries, reps, repos, poids).
- **Séance active** : navigation par exercice (chips), cases à cocher pour chaque série, ouverture automatique du minuteur de pause à la validation d'une série (compte à rebours SVG circulaire, +15s / -15s / skip, feedback haptique).
- **Historique** : liste des séances (durée / temps de pause / nb d'exercices).
- **Stats** : totaux (séances, minutes, moyenne, repos cumulés) + graphique barres 7 derniers jours.
- **Stockage 100% local** via AsyncStorage (pas d'auth, pas de backend user).

## Stack
- Frontend: Expo SDK 54, expo-router file-based, react-native-gifted-charts, react-native-svg, expo-image-picker, expo-haptics, expo-linear-gradient.
- Backend: FastAPI + emergentintegrations (Gemini 3 Flash) — endpoints `/api/health` et `/api/parse-plan`.
- Design: dark energetic gym theme (accent Ember Orange #FF3D00), grille 8pt, radius 12.

## Endpoints
- `GET /api/health` — statut + config LLM.
- `POST /api/parse-plan` — body `{ image_base64 }` → `{ title, exercises: [{ name, sets, reps, weight, rest_seconds, notes }] }`.

## Prochaines évolutions possibles
- Assistant vocal ("crée un HIIT 20 min").
- Import PDF multi-pages.
- Export/partage de séance.
- Notifications rappels de séance.
- Rétention plusieurs profils / synchronisation cloud optionnelle.
