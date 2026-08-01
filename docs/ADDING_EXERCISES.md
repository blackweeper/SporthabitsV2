# Ajouter des exercices à la bibliothèque IronFlow

Référence officielle pour créer de nouveaux exercices "officiels" IronFlow (au
même titre que les ~1348 déjà dans la bibliothèque) et les rendre
immédiatement utilisables dans toute l'application : Bibliothèque, Découvrir,
recherche, filtres, programmes, statistiques.

Ce document décrit le modèle de données réel (`ExerciseRecord` /
`ExerciseEnrichment`, `frontend/src/utils/exercise-records.ts`) — pas une
proposition, le schéma effectivement utilisé par l'app aujourd'hui.

> Ceci concerne les exercices **officiels** (catalogue partagé, distribué via
> `gh-pages`). Un utilisateur peut aussi créer un exercice **personnel**
> directement dans l'app (bouton "Créer" dans la Bibliothèque) — ce chemin ne
> nécessite aucune des étapes ci-dessous, il écrit un `ExerciseRecord` avec
> `source: "custom"` localement. Ce document couvre l'ajout d'un exercice au
> catalogue partagé (`source: "system"`), destiné à tous les utilisateurs.

---

## 1. Où vivent les données

- **Source de vérité** : `exercise-library/versions/vN/exercises.json` (racine
  du dépôt, N = version courante — v3 au moment de la rédaction). Un tableau
  JSON d'objets `ExerciseRecord`.
- **Publication** : ce fichier est distribué via la branche `gh-pages` du
  dépôt (hébergement statique GitHub Pages), jamais commité sur `main`. L'app
  le télécharge à la demande (voir `frontend/src/hooks/useLibraryUpdate.ts`)
  et le fusionne dans le stockage local de l'utilisateur (`AsyncStorage`,
  clé `@ironflow/exerciseRecords`).
- **Médias** : `exercise-library/media/{ironflow,workoutx,gymgifsdb}/{id}.{webp,gif}`,
  publiés sur la même branche `gh-pages`, résolus **uniquement par `id`** — un
  exercice n'a jamais besoin de référencer son propre média dans le JSON (voir
  §7).

---

## 2. Format JSON — structure complète

Un exercice est un objet `ExerciseRecord`. Voici la structure complète, tous
champs confondus (obligatoires ET optionnels — le détail champ par champ suit
en §3/§4) :

```jsonc
{
  "id": "sys_squat_gobelet",
  "source": "system",
  "nameFr": "Squat gobelet",
  "nameEn": "Goblet Squat",
  "category": "musculation",

  "primaryMuscle": "quads",
  "secondaryMuscles": ["glutes", "hamstrings"],
  "equipment": "dumbbell",

  "description": "Squat tenu avec une charge contre la poitrine...",
  "musclesWorkedNote": "Sollicite fortement les quadriceps...",
  "instructions": ["Tiens un haltère verticalement contre ta poitrine...", "..."],
  "tips": ["Garde les coudes à l'intérieur des genoux."],
  "commonMistakes": ["Dos arrondi en bas du mouvement."],
  "difficulty": "beginner",

  "movementPattern": "squat",
  "parentExerciseId": null,
  "variantLabel": null,
  "aliases": ["Goblet squat", "Squat haltère"],

  "exerciseTier": "official_core",
  "collections": ["home_gym", "beginner_journey"],

  "favoritedAt": null,
  "createdAt": "2026-08-01T10:00:00.000Z",
  "updatedAt": "2026-08-01T10:00:00.000Z",
  "raw": null,

  "media": null,

  "enrichment": {
    "translations": {
      "fr": {
        "description": "...",
        "rationale": "...",
        "warmupSuggestion": "...",
        "instructions": ["..."],
        "executionTips": ["..."],
        "breathingTips": "...",
        "precautions": "...",
        "mistakeCorrections": [
          { "mistake": "Dos arrondi", "correction": "Garde le buste droit, regard vers l'avant." }
        ]
      }
    },
    "verifiedPrimaryMuscle": "quads",
    "verifiedSecondaryMuscles": ["glutes", "hamstrings"],
    "stabilizerMuscles": ["abs", "lower_back"],
    "exerciseType": "compound",
    "tags": ["debutant_friendly", "unilateral_ok"],
    "difficulty": "beginner",
    "technicalLevel": "low",
    "levelGuidance": {
      "beginner": { "note": "Excellent premier mouvement de squat.", "prerequisites": [] }
    },
    "muscleActivation": {
      "primary": ["quads"],
      "secondary": ["glutes", "hamstrings"],
      "activationScore": { "quads": 80, "glutes": 55, "hamstrings": 40 }
    },
    "equipmentLevel": "basic",
    "trainingGoals": ["strength", "hypertrophy"],
    "fatigueLevel": "medium",
    "restTimeByGoal": { "strength": "2-3 min", "hypertrophy": "60-90s" },
    "alternativeEquipment": ["Kettlebell", "Sac lesté"],
    "disciplines": ["musculation"],
    "movementPatterns": ["squat"],
    "progressionExercises": [{ "name": "Squat avant à la barre" }],
    "regressionExercises": [{ "name": "Squat au poids du corps" }],
    "coachNotes": {
      "execution": ["Garde le poids sur les talons."],
      "programming": ["Idéal en échauffement ou en accessoire."],
      "safety": ["Ne pas laisser les genoux rentrer vers l'intérieur."]
    },
    "verifiedBy": "human",
    "reviewStatus": "validated",
    "templateVersion": 3,
    "updatedAt": "2026-08-01T10:00:00.000Z"
  }
}
```

---

## 3. Champs obligatoires

| Champ | Type | Notes |
|---|---|---|
| `id` | `string` | Unique dans tout le catalogue. Convention : `sys_{nom_normalisé}` pour un exercice officiel créé à la main (ex. `sys_squat_gobelet`). Ne réutilise jamais un id existant. |
| `source` | `"system"` | Toujours `"system"` pour un exercice officiel ajouté via ce document (`"workoutx"` est réservé à l'import automatique, `"custom"` aux exercices personnels créés dans l'app). |
| `nameFr` | `string` | Nom affiché partout dans l'app. C'est le nom principal de recherche/matching — voir §8. |
| `category` | `ExerciseRecordCategory` | Une des 6 valeurs — voir §5. Détermine l'onglet Catégorie dans la Bibliothèque. |
| `createdAt` | `string` (ISO 8601) | Date de création. |

Si `enrichment` est présent, deux sous-champs y sont obligatoires :

| Champ | Type | Notes |
|---|---|---|
| `enrichment.translations` | `object` | Peut être `{}` si vide, mais la clé doit exister. |
| `enrichment.templateVersion` | `number` | `3` au moment de la rédaction (bump uniquement si le template éditorial change). |
| `enrichment.updatedAt` | `string` (ISO 8601) | Date de dernière édition du contenu éditorial. |

Tout le reste est optionnel — un exercice avec seulement les 5 champs
obligatoires est **parfaitement valide** (voir l'exemple minimal, §6.2) : les
sections dépendantes s'affichent simplement masquées tant que leurs champs
sont vides, jamais de bloc "à remplir" visible dans l'app.

---

## 4. Champs optionnels — par groupe

### Identification
- `nameEn` (`string | null`) — nom anglais brut (jamais réécrit par l'enrichment).

### Classification
- `primaryMuscle` (`ExerciseMuscleGroup | null`) — voir §5. Pilote le filtre muscle et les stats.
- `secondaryMuscles` (`ExerciseMuscleGroup[] | null`)
- `equipment` (`ExerciseEquipment | null`) — voir §5. Pilote le filtre équipement.
- `movementPattern` (`MovementPattern | null`) — voir §5. Réservé aux futures stats d'équilibre de programme (push/pull/squat...).
- `parentExerciseId` / `variantLabel` (`string | null`) — pour grouper une variante sous un exercice parent (ex. "Développé couché incliné" → parent "Développé couché", `variantLabel: "Incliné"`). Aucune UI n'exploite encore ce lien, mais le renseigner ne coûte rien et évite une future migration.
- `aliases` (`string[] | null`) — **le champ le plus important pour la compatibilité recherche/import**, voir §8.

### Contenu pédagogique brut (WorkoutX-style, non éditorial)
- `description`, `musclesWorkedNote`, `instructions` (`string[]`), `tips` (`string[]`), `commonMistakes` (`string[]`), `difficulty` (`ExerciseDifficulty | null`, voir §5).

### Médias
- `media` — **laisser à `null`**. Champ vestigial, jamais lu par l'app (voir §7) ; le garder à `null` évite toute confusion.

### Curation / visibilité
- `exerciseTier` (`ExerciseTier | null`) — voir §5 et §9. Contrôle l'apparition dans Bibliothèque vs Découvrir.
- `collections` (`FutureCollection[] | null`) — voir §5. Appartenance aux futures Collections téléchargeables.

### Divers
- `favoritedAt`, `updatedAt`, `raw` — laisser à `null` pour un exercice créé à la main (`raw` est réservé aux imports automatiques, pour debug/traçabilité).

### `enrichment` (bloc pédagogique complet, tout optionnel sauf `translations`/`templateVersion`/`updatedAt`)
Voir la liste complète en §2 — chaque champ est indépendant, aucun n'est requis pour que les autres fonctionnent. Points notables :
- `enrichment.translations.fr.*` a **toujours priorité d'affichage** sur le champ brut équivalent (`description`, `instructions`...) quand les deux existent — c'est la version "voix IronFlow", jamais une simple traduction.
- `verifiedBy` — mets `"human"` pour un exercice rempli à la main. **Une fois `"human"` ou `"coach"`, aucun script d'enrichissement automatique ne retouchera plus jamais ce champ, quel que soit `templateVersion`** — règle absolue du pipeline.

---

## 5. Valeurs d'énumération autorisées

Toute valeur hors de ces listes casse silencieusement les filtres/labels concernés (l'app affichera un badge vide ou l'exercice n'apparaîtra dans aucun filtre) — ne jamais inventer une valeur.

**`category`** (`ExerciseRecordCategory`) : `musculation` · `cardio` · `mobility` · `stretching` · `plyometric` · `sport`

**`primaryMuscle` / `secondaryMuscles`** (`ExerciseMuscleGroup`) : `chest` · `back` · `shoulders` · `biceps` · `triceps` · `forearms` · `abs` · `quads` · `hamstrings` · `glutes` · `calves` · `traps` · `lower_back` · `full_body`

**`equipment`** (`ExerciseEquipment`) : `barbell` · `dumbbell` · `kettlebell` · `machine` · `bodyweight` · `resistance_band` · `jump_rope` · `rowing_machine` · `assault_bike` · `ski_erg` · `treadmill` · `other`

**`difficulty`** (`ExerciseDifficulty`) : `beginner` · `intermediate` · `advanced`

**`movementPattern`** (`MovementPattern`) : `push` · `pull` · `squat` · `hinge` · `carry` · `rotation` · `core` · `locomotion`

**`exerciseTier`** (`ExerciseTier`) : `essential` · `official_core` · `collection_only` · `deprecated` — voir §9 pour le comportement de chaque valeur (et de l'absence de valeur).

**`collections`** (`FutureCollection[]`) : `hyrox` · `crossfit` · `bodybuilding` · `home_gym` · `mobility_longevity` · `beginner_journey` · `running_performance`

**`enrichment.trainingGoals` / `restTimeByGoal` (clés)** (`TrainingGoal`) : `strength` · `hypertrophy` · `endurance` · `conditioning` · `mobility` · `rehabilitation` · `hyrox` · `crossfit` · `running` · `power` · `stability`

**`enrichment.disciplines`** (`Discipline`) : `musculation` · `hyrox` · `crossfit` · `halterophilie` · `mobilite` · `etirements` · `running` · `strongman` · `street_workout` · `kettlebell` · `powerlifting`

---

## 6. Exemples

### 6.1 Exemple complet (rempli à fond)

Voir le bloc JSON du §2 — c'est un exemple réel et valide, directement copiable comme point de départ.

### 6.2 Exemple minimal fonctionnel

```json
{
  "id": "sys_fentes_marchees",
  "source": "system",
  "nameFr": "Fentes marchées",
  "category": "musculation",
  "createdAt": "2026-08-01T10:00:00.000Z"
}
```

Cet exercice est **immédiatement fonctionnel** : il apparaît dans la
Bibliothèque (onglet Musculation), est cherchable par son nom, ajoutable à un
programme. Il n'a simplement pas de filtre muscle/équipement actif, pas de
fiche pédagogique enrichie (sections masquées proprement), et pas d'image
tant qu'un fichier média portant son `id` n'existe pas (repli emoji — voir §7).

---

## 7. Ajouter les médias (image, GIF)

Le résolveur média (`frontend/src/hooks/useExerciseMedia.ts`) fonctionne
**uniquement par `id`**, jamais par un champ du JSON — il n'y a donc **rien à
référencer dans l'objet `ExerciseRecord`** (`media` reste `null`).

Priorité de résolution (premier fichier trouvé qui gagne) :

| Rôle | Ordre | Chemin |
|---|---|---|
| Image statique | 1 | `exercise-library/media/ironflow/{id}.webp` |
| Image statique | 2 | `exercise-library/media/gymgifsdb/{id}.webp` |
| GIF démonstration | 1 | `exercise-library/media/gymgifsdb/{id}.gif` |
| GIF démonstration | 2 | `exercise-library/media/workoutx/{id}.gif` |

**Pour ajouter une image à `sys_squat_gobelet`** : déposer un fichier
`squat_gobelet.webp` (format WebP, fond transparent recommandé, ~800×800)
sous `exercise-library/media/ironflow/sys_squat_gobelet.webp` — c'est tout.
Aucun exercice avec un média manquant ne casse quoi que ce soit : l'app
retombe proprement sur un repli emoji (dernier recours, jamais une icône cassée).

---

## 8. Recherche, aliases, matching automatique

`aliases` alimente **trois mécanismes distincts**, tous basés sur une
comparaison exacte insensible à la casse/aux accents (jamais de fuzzy
automatique) :

1. **Recherche dans la Bibliothèque** — taper un alias retrouve l'exercice.
2. **Import de programme** (`frontend/src/utils/exercise-matching.ts`) — un
   programme importé (texte collé) dont une ligne correspond exactement à
   `nameFr`, `nameEn` ou un `aliases` est lié automatiquement, sans
   intervention manuelle.
3. **Ajout automatique à "Ma bibliothèque"** (`program-library-sync.ts`) —
   même résolution, pour qu'un exercice utilisé dans un programme rejoigne la
   bibliothèque personnelle sans action de l'utilisateur.

**Bonne pratique** : renseigner systématiquement les variantes de nom
plausibles qu'un utilisateur pourrait taper/coller (abréviations, anglicisme,
ancienne orthographe) — chaque alias manqué est un exercice qui finira dans le
rapport "sans correspondance" (`app/exercise-library-settings.tsx`) au lieu
d'être lié automatiquement.

---

## 9. Règles de visibilité — Bibliothèque vs Découvrir

`exerciseTier` contrôle où l'exercice apparaît par défaut :

| Valeur | Bibliothèque ("Ma bibliothèque") | Découvrir |
|---|---|---|
| `essential` | ✅ toujours, mis en avant | — |
| `official_core` | ✅ toujours | — |
| `collection_only` | ❌ (sauf ajout explicite par l'utilisateur) | ✅ |
| `deprecated` | ❌ jamais, nulle part | ❌ |
| *(absent/`null`)* | ✅ toujours (traité comme `official_core`) | — |

Pour un exercice officiel destiné à un usage courant immédiat, laisser
`exerciseTier` **absent** ou le mettre à `official_core` (visible tout de
suite). Réserver `collection_only` aux exercices destinés à enrichir une
future Collection téléchargeable sans encombrer la bibliothèque par défaut.

---

## 10. Checklist de compatibilité complète

| Pour apparaître dans... | Champs requis |
|---|---|
| Bibliothèque (liste principale) | `id`, `source`, `nameFr`, `category`, `createdAt` (minimum) |
| Onglet Catégorie correct | `category` |
| Filtre Muscle | `primaryMuscle` (et/ou `secondaryMuscles`) |
| Filtre Équipement | `equipment` |
| Badge difficulté | `difficulty` |
| Recherche par synonyme/abréviation | `aliases` |
| Auto-lien à l'import de programme | `nameFr`/`nameEn`/`aliases` exacts |
| Auto-ajout à "Ma bibliothèque" à l'usage | résolution par nom/alias réussie (voir §8) |
| Image / GIF | fichier média nommé `{id}.webp`/`.gif` déposé au bon endroit (§7) — **aucun champ JSON** |
| Fiche pédagogique complète (17 sections) | bloc `enrichment` rempli (voir §2/§4) |
| Filtres avancés objectif/discipline | `enrichment.trainingGoals` / `enrichment.disciplines` |
| Visible par défaut (pas seulement dans Découvrir) | `exerciseTier` absent ou `essential`/`official_core` |
| Appartenance à une future Collection | `collections` |

---

## 11. Bonnes pratiques

- **Ne jamais inventer une valeur d'énumération** — toujours piocher dans les listes du §5. Une valeur hors-liste ne lève aucune erreur visible (TypeScript ne valide pas un JSON externe) mais casse silencieusement le filtre concerné.
- **Toujours un `id` unique et stable** — ne jamais le renommer après coup (des historiques de séance/PR peuvent déjà y faire référence une fois l'exercice utilisé).
- **`nameFr` propre et sans artefact** — pas de casse incohérente, pas de résidu de source externe (ex. "SQUAT (machine)" → préférer "Squat à la machine").
- **Multiplier les `aliases` plausibles** plutôt que d'en manquer un — le coût est nul, le gain (recherche + auto-liaison) est direct.
- **Écrire le contenu éditorial (`enrichment.translations.fr.*`) dans une voix IronFlow reconnaissable** — jamais une reformulation générique/traduction plate. C'est la même exigence que pour le contenu généré automatiquement (voir `frontend/scripts/lib/enrichment-shared.ts`).
- **Ne jamais remplir les 3 niveaux de `levelGuidance` par principe** — uniquement quand un niveau a vraiment quelque chose à dire.
- **Toujours documenter la correction, jamais juste l'erreur** dans `mistakeCorrections`.
- **Laisser `exerciseTier` à `official_core` par défaut** pour un nouvel exercice officiel destiné à un usage immédiat ; réserver `collection_only` aux ajouts de contenu pour de futures Collections.
- **Ne jamais toucher aux champs bruts (`description`, `instructions`...) depuis l'enrichment** — l'enrichment est strictement additif, dans `enrichment.*`, jamais une réécriture des champs WorkoutX/bruts.

---

## 12. Procédure d'intégration réelle

1. **Éditer** `exercise-library/versions/vN/exercises.json` (N = version courante) : ajouter le nouvel objet au tableau, en s'assurant que l'`id` est unique.
2. **Ajouter les médias** correspondants sous `exercise-library/media/ironflow/` (§7), si disponibles.
3. **Valider le JSON** — un simple `JSON.parse` (ou `node -e "JSON.parse(require('fs').readFileSync('exercises.json'))"`) suffit à détecter une erreur de syntaxe avant publication.
4. **Cutter une nouvelle version** via le pipeline existant (`frontend/scripts/generate-library-version.ts` → `commit-library-version.ts` → `publish-library-to-app.ts`) — ne jamais publier `exercises.json` directement sans passer par ce pipeline, qui régénère aussi `media-manifest.json` et le `manifest.json` public.
5. **Republier sur `gh-pages`** — action publique, à faire consciemment (voir la procédure dans `exercise-library/README.md`).
6. **Vérifier dans l'app** : Profil → Bibliothèque d'exercices → Vérifier les mises à jour → Mettre à jour, puis chercher le nouvel exercice dans la Bibliothèque.

Pour un lot de plusieurs exercices à la fois, réutiliser le patron déjà
existant `frontend/scripts/import-manual-enrichment.ts` (validation stricte
par entrée, `--dry-run` par défaut, jamais d'écrasement d'une valeur déjà
remplie) plutôt que d'éditer `exercises.json` à la main un par un.
