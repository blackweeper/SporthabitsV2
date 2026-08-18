# Bibliothèque maître IronFlow

Source de vérité versionnée pour les exercices IronFlow (données + médias). L'application ne lit **jamais** ce dossier directement ni l'API WorkoutX au runtime — elle ne fait qu'un `fetch()` vers l'hébergement statique de cette bibliothèque (GitHub Pages, branche `gh-pages` — voir §4), totalement indépendant du build/déploiement de l'app elle-même : publier une nouvelle version d'exercices ne nécessite jamais de reconstruire ou redéployer l'application.

## Structure

```
exercise-library/
├── current.json          pointeur { version, path } vers la version officielle courante
├── media/                pool partagé de médias (GIF/images), un fichier par exercice, jamais dupliqué par version
└── versions/
    └── vN/
        ├── manifest.json        { version, generatedAt, count, exercisesUrl }
        ├── exercises.json       ExerciseRecord[] complet de cette version
        ├── media-manifest.json  sha256 + taille de chaque média référencé (garde-fou avant publication)
        └── changes.json         rapport de migration (MigrationReport) vs la version précédente
```

`media/` est un **pool partagé** : la plupart des exercices ne changent pas de média d'une mise à jour WorkoutX à l'autre, donc chaque fichier n'existe qu'une fois (nommé `<ExerciseRecord.id>.gif`), référencé par autant de versions que nécessaire — le poids total ne grossit jamais avec le nombre de versions.

## Git LFS

Les fichiers sous `media/**` sont déclarés en Git LFS (`.gitattributes`) — utile pour la **sauvegarde** (§1/§2 ci-dessous, accès peu fréquent). Avant le premier commit qui touche des médias sur une machine :
```bash
git lfs install
```
Sans `git lfs install`, git committera les fichiers normalement (fonctionne quand même pour un petit volume).

⚠️ **La branche `gh-pages` (hébergement public, §4) n'utilise PAS LFS** : GitHub Pages ne sait pas servir le contenu réel des fichiers LFS (seulement leur pointeur texte), et le quota gratuit LFS (1 Go/mois de bande passante) serait épuisé en quelques déploiements avec ~230 Mo de médias. Les fichiers y sont donc commités en clair, sur une branche dédiée séparée de l'historique de sauvegarde.

---

## 1. Sauvegarde locale

Ce dossier **est** le backup complet (données + médias + historique des versions). Il n'y a rien d'autre à faire que de s'assurer qu'il existe, à jour, sur au moins une machine :
```bash
git pull
git lfs pull   # si LFS activé — récupère le contenu réel des médias, pas juste les pointeurs
```

## 2. Restauration complète (nouvelle machine, ou après un incident)

```bash
git clone <url-du-dépôt>
cd SporthabitsV2/exercise-library
git lfs pull   # si LFS activé
```
`current.json` + `versions/` + `media/` sont alors identiques à ce qui a été poussé sur GitHub — aucune étape supplémentaire.

## 3. Générer une nouvelle version (import WorkoutX)

Depuis `frontend/` :
```bash
# 1-3. Récupère WorkoutX, nettoie/normalise, télécharge les médias en local (staging)
WORKOUTX_API_KEY=xxx node scripts/import-workoutx.ts --limit=20   # commencer petit, puis relancer sans --limit pour tout importer
# --lang=fr : demande en plus la traduction française réelle de WorkoutX (nameFr/descriptionFr/instructionsFr) —
#   gratuit, confirmé fiable par un test réel. Fait deux passes (anglais pour la classification, français pour le
#   texte) et fusionne — ne jamais utiliser lang=fr seul, ça traduit aussi category/equipment/target et casse le
#   mapping vers nos enums internes.

# 4-6. Compare à la bibliothèque officielle courante, produit un rapport de changements
node scripts/generate-library-version.ts

# → Relire scripts/output/next-version/changes.json avant de continuer.
#   Rien n'est encore modifié dans exercise-library/ à ce stade.

# 7. Une fois satisfait du rapport : fige la nouvelle version officiellement
node scripts/commit-library-version.ts

# 8. Pousser la sauvegarde sur GitHub
cd ../exercise-library
git add .
git commit -m "Bibliothèque v<N> — <résumé du changement>"
git push
```

## 4. Publier une version vers l'application (GitHub Pages)

Depuis `frontend/` :
```bash
node scripts/publish-library-to-app.ts   # vérifie l'intégrité des médias et écrit exercise-library/manifest.json (pointeur public)
```

Puis, depuis la racine du repo, pousser le contenu de `exercise-library/` (tel quel — `manifest.json`, `versions/`, `media/`) vers la branche `gh-pages`, **sans LFS** :
```bash
git branch -f gh-pages-staging main    # ou toute branche de départ, peu importe — seul le contenu compte
git checkout --orphan gh-pages-tmp
git rm -rf . > /dev/null 2>&1 || true
cp -r exercise-library/* .
rm -f .gitattributes                    # ne pas hériter des règles LFS sur cette branche
git add manifest.json versions media
git commit -m "Bibliothèque v<N> — publication GitHub Pages"
git push origin gh-pages-tmp:gh-pages --force
git checkout main
git branch -D gh-pages-tmp
```
(Ce sont les commandes exactes utilisées lors de la mise en place initiale — un futur script pourra les automatiser si les publications deviennent fréquentes.)

La première fois : dans les réglages GitHub du repo (**Settings → Pages**), choisir "Deploy from a branch" → branche `gh-pages`, dossier `/ (root)`, puis renseigner l'URL obtenue (`https://<user>.github.io/<repo>/manifest.json`) dans `EXERCISE_LIBRARY_MANIFEST_URL` (`frontend/src/utils/exercise-library-source-config.ts`).

## 5. Enrichissement local gratuit (Ollama)

Ajoute la couche de coaching IronFlow (conseils, erreurs fréquentes détaillées, objectifs d'entraînement, activation musculaire, variantes...) que WorkoutX ne fournit dans aucune langue — via un modèle tournant en local, gratuitement. Le nom/description/instructions français viennent déjà de WorkoutX (§3, `--lang=fr`) ; Ollama élabore dessus plutôt que de traduire depuis zéro.

**Installation (une fois)** :
1. Télécharger et installer Ollama : https://ollama.com/download
2. Récupérer un modèle : `ollama pull mistral` (recommandé — labo français, bonne qualité de rédaction française, tient en 8 Go de VRAM en Q4). Alternative à tester si besoin : `ollama pull qwen3:8b`.
3. Démarrer le service si besoin : `ollama serve` (souvent déjà lancé automatiquement par l'installeur).

**Test sur un petit échantillon avant tout run complet** (depuis `frontend/`) :
```bash
node scripts/enrich-library-content-ollama.ts --dry-run --ids=wx_0001,wx_0002 --model=mistral
```
Rien n'est écrit sur disque en `--dry-run` — les fiches générées sont juste imprimées, avec le temps réel par exercice.

**Run réel** (une fois la qualité validée) :
```bash
node scripts/enrich-library-content-ollama.ts --priority=popularity --batch-size=10
```
`--priority=popularity` traite d'abord les exercices les plus populaires (`raw.popularityRank` de WorkoutX), puis les mouvements fondamentaux (squat, deadlift, développé couché, tractions...), puis le reste. Écriture incrémentale après chaque lot — interrompre (Ctrl+C) ne perd que le lot en cours, relancer la même commande reprend automatiquement (exercices déjà complets = 0 appel). Une fois un lot traité, republier via §4.
