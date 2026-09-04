# IronFlow AI - Import PDF via NVIDIA

Import automatique de programmes d'entraînement depuis des PDF via l'IA NVIDIA.

## Architecture

```text
PDF
 ↓
Extraction texte (pdfplumber + pypdf)
 ↓
NVIDIA NIM IA (analyse stricte, pas d'invention)
 ↓
Programme structuré (JSON validé Pydantic)
 ↓
exercise-matching.ts EXISTANT (côté frontend)
 ↓
ExerciseLinkModal + review utilisateur
 ↓
Validation humaine
 ↓
saveCustomProgram()
```

**Règle d'or :** ANALYZE ≠ IMPORT  
L'analyse ne modifie **JAMAIS** les programmes réels.  
L'import ne se fait **QU'APRÈS** validation humaine explicite.

---

## Backend

### Endpoints FastAPI

**POST `/api/pdf-import/upload`**
- Upload un PDF
- Extrait le texte (ou détecte OCR requis)
- Crée un draft en statut `pending`
- Retourne : `draft_id`, `page_count`, `total_chars`, `needs_ocr`

**POST `/api/pdf-import/analyze`**
- Lance l'analyse IA sur un draft `pending`
- Change le statut à `processing` puis `completed`
- Retourne : analyse structurée (`ProgramAnalysis`)

**GET `/api/pdf-import/draft/{draft_id}`**
- Récupère un draft avec son analyse

**POST `/api/pdf-import/validate`**
- Valide un draft `completed`
- **SEUL endpoint qui crée un programme réel**
- Applique les corrections utilisateur
- Appelle `saveCustomProgram()`
- Change le statut à `validated`

---

### Structure du code

```
backend/
├── ai/
│   ├── service.py              # AIService (point d'entrée)
│   ├── providers/
│   │   ├── base.py             # AIProvider abstraction
│   │   └── nvidia.py           # NVIDIAProvider
│   ├── schemas/
│   │   └── pdf_program.py      # Pydantic schemas
│   └── prompts/
│       └── pdf_program.py      # Prompts système + utilisateur
├── pdf/
│   └── extraction.py           # extract_pdf_text()
├── drafts_store.py             # CRUD drafts MongoDB
├── routers/
│   └── pdf_import.py           # Endpoints FastAPI
└── tests/
    └── test_pdf_import.py      # Tests unitaires

```

---

## Configuration

### Variables d'environnement

**`.env` (local, jamais committé) :**
```env
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=ironflow

# NVIDIA NIM
NVIDIA_API_KEY=nvapi-xxxxx
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NVIDIA_TIMEOUT=120
```

**Production (Render) :**
- Configurer `NVIDIA_API_KEY` dans les variables d'environnement Render
- Ne **PAS** déployer le fichier `.env`

---

## Modèle NVIDIA

**Modèle actuel (31 août 2026) :**
- `nvidia/nemotron-3.5-lightning-30b-a3b`
- 30B paramètres, rapide (~5-10s)
- Contexte : 4096 tokens output
- Format : OpenAI-compatible

**Modèles Llama 3.x (meta/, nvidia/) ont atteint leur fin de vie le 26/08/2026.**

Pour trouver des modèles disponibles :
```bash
cd backend
python find_available_model.py
```

---

## Tests

### Test rapide de l'API NVIDIA
```bash
cd backend
python test_nvidia_api.py
```

Résultat attendu :
```
✅ Réponse reçue : 4
✅ JSON valide parsé : Example Program
RÉSULTAT : 2/2 tests réussis
```

### Tests unitaires complets
```bash
cd backend
pytest tests/test_pdf_import.py -v
```

---

## Règles de l'IA

**L'IA doit STRICTEMENT :**

1. ✅ Lire le PDF sans inventer
2. ✅ Si une info n'est pas dans le PDF → `null`
3. ❌ Ne **JAMAIS** améliorer le programme
4. ❌ Ne **JAMAIS** corriger le programme
5. ❌ Ne **JAMAIS** compléter les informations manquantes
6. ❌ Ne **JAMAIS** inventer des séries, répétitions, charges

**Exemple :**

PDF :
```
Back Squat
4 x 8
```

Résultat attendu :
```json
{
  "exercise": "Back Squat",
  "sets": 4,
  "reps": "8",
  "weight": null
}
```

**PAS** :
```json
{
  "sets": 5,
  "reps": 8,
  "weight": "80kg"
}
```

---

## Sécurité

**Clé NVIDIA :**

✅ **Backend :**
- Clé dans `.env` (jamais committée)
- `.env` dans `.gitignore`
- Clé jamais loggée
- Clé jamais dans les réponses API
- Erreurs masquées côté frontend

❌ **Frontend :**
- Clé **JAMAIS** exposée au frontend
- Clé **JAMAIS** dans le bundle
- Clé **JAMAIS** dans AsyncStorage
- Clé **JAMAIS** dans les logs frontend
- Frontend appelle uniquement `/api/pdf-import/*`

**Vérification après implémentation :**
```bash
grep -r "nvapi-" frontend/ exercise-library/ --exclude-dir=node_modules
# Doit retourner : aucun résultat
```

---

## Workflow

### Statuts d'un draft

```
pending      → draft créé, en attente d'analyse
processing   → analyse IA en cours
completed    → analyse terminée, review requise
failed       → erreur analyse
validated    → validé par l'utilisateur, import effectué
```

### Pipeline complet

```text
1. Upload PDF
   POST /api/pdf-import/upload
   → statut: pending

2. Analyser
   POST /api/pdf-import/analyze
   → statut: processing → completed

3. Review (frontend)
   GET /api/pdf-import/draft/{id}
   → afficher programme + correspondances exercices
   → corrections utilisateur via ExerciseLinkModal

4. Valider (après review humaine)
   POST /api/pdf-import/validate
   → statut: validated
   → saveCustomProgram() appelé
   → programme créé
```

---

## Frontend (TODO)

**À implémenter :**

1. **Composant d'import PDF**
   - Uploader PDF
   - Afficher extraction (pages, mots, needs_ocr)
   - Lancer analyse

2. **Matching des exercices**
   - Pour chaque exercice analysé :
   - Appeler `exercise-matching.ts` EXISTANT
   - Afficher confiance (✓ haute, ⚠️ moyenne, ❓ faible)

3. **Review avec corrections**
   - Réutiliser `ExerciseLinkModal` EXISTANT
   - Permettre corrections manuelles
   - Bouton [Valider le programme]

4. **Validation finale**
   - POST `/api/pdf-import/validate` avec corrections
   - Redirection vers le programme créé

---

## Commandes utiles

**Lancer le backend :**
```bash
cd backend
uvicorn server:app --reload --port 8000
```

**Tester NVIDIA :**
```bash
cd backend
python test_nvidia_api.py
```

**Trouver des modèles disponibles :**
```bash
cd backend
python find_available_model.py
```

**Vérifier que le serveur compile :**
```bash
cd backend
python -c "import server; print('OK')"
```

**Lancer les tests :**
```bash
cd backend
pytest tests/test_pdf_import.py -v
```

---

## Troubleshooting

**Erreur : "Model reached end of life"**
- Le modèle configuré n'est plus disponible
- Solution : `python find_available_model.py` puis mettre à jour `NVIDIA_MODEL` dans `.env`

**Erreur : "NVIDIA_API_KEY manquante"**
- Solution : copier `.env.example` vers `.env` et configurer la clé

**Erreur : "PDF needs OCR"**
- Le PDF est scanné/image
- Solution : ajouter Tesseract OCR (non implémenté pour l'instant)

**Erreur : "JSON invalide de l'IA"**
- L'IA a retourné du texte au lieu de JSON pur
- Solution : statut `failed`, l'utilisateur doit réessayer
- Vérifier le prompt système si ça se répète

---

## Limitations actuelles

1. **OCR non implémenté** : PDFs scannés détectés mais pas traités
2. **Frontend non implémenté** : seul le backend est prêt
3. **Matching non intégré** : `exercise-matching.ts` existe mais pas appelé depuis le backend
4. **saveCustomProgram() non appelé** : validation marque juste le draft, n'importe pas encore

---

## Next steps

1. ✅ Backend complet
2. ⚠️ Frontend : composant d'import PDF
3. ⚠️ Frontend : matching avec `exercise-matching.ts`
4. ⚠️ Frontend : review avec `ExerciseLinkModal`
5. ⚠️ Backend : appel `saveCustomProgram()` dans `/validate`
6. ⚠️ Tests : tests d'intégration complets
7. ⚠️ OCR : Tesseract pour PDFs scannés (optionnel)

---

## License

Propriétaire - IronFlow
