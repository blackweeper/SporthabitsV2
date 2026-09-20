# IronFlow (SporthabitsV2)

Application mobile de suivi sportif : programmes multi-séances, séances chronométrées, bibliothèque d'exercices, santé, progression. Détail produit dans [`memory/PRD.md`](memory/PRD.md).

## Structure

| Dossier | Contenu |
| --- | --- |
| `frontend/` | App Expo SDK 54 / React Native / expo-router (web + iOS + Android) |
| `backend/` | API FastAPI + MongoDB : import Apple Santé (`/api/health-import`) et analyse IA de PDF (`/api/pdf-import`). Voir `backend/README.md` |
| `exercise-library/` | Bibliothèque maître des exercices (données versionnées + médias, Git LFS). Voir son `README.md` |
| `docs/` | Documentation (`ADDING_EXERCISES.md`) |

## Prérequis (Windows)

```powershell
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
winget install Git.Git          # inclut Git LFS
npm install -g yarn@1.22.22
```

Git LFS : lancer `git lfs install` une fois, puis `git lfs pull` pour récupérer les médias de `exercise-library/`.

## Frontend

```powershell
cd frontend
yarn install --frozen-lockfile
yarn start        # ou : yarn web / yarn android / yarn ios
npx tsc --noEmit  # vérification de types
yarn lint
```

Le projet utilise **Yarn** (`yarn.lock`). L'URL du backend n'est pas dans une variable d'environnement : elle se saisit dans l'app (écrans de réglages santé / import PDF).

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env         # puis renseigner les valeurs
.\.venv\Scripts\python.exe -m pytest tests -q
.\.venv\Scripts\python.exe -m uvicorn server:app --reload
```

- **MongoDB** est requis pour lancer le serveur (création des index au démarrage) : `MONGO_URL` en local ou chaîne MongoDB Atlas. Les tests n'en ont pas besoin (`mongomock`).
- **IA (import PDF)** : `AI_PROVIDER=groq` avec `GROQ_API_KEY`, ou `nvidia` avec `NVIDIA_API_KEY`. Voir `backend/AI_PDF_IMPORT_README.md`.
- Les fichiers `.env` ne sont jamais versionnés.
