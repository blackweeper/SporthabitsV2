import { ExerciseRecord } from "@/src/utils/exercise-records";
import { normalize } from "@/src/utils/exercise-library-merge";

/**
 * Résout un `ExerciseRecord` à partir d'un simple nom d'exercice (pas d'id)
 * — le cas de tout écran qui ne connaît que le nom saisi/affiché (séance
 * active, lignes de plan/programme...). Match par `nameFr`/`nameEn`/`aliases`,
 * insensible à la casse/aux espaces. Logique reprise telle quelle de
 * `app/exercise-detail/[name].tsx` (seule source avant cette extraction),
 * pour que tout appelant qui n'a qu'un nom résolve un exercice de la même
 * façon que la fiche.
 */
export function matchExerciseRecord(
  name: string,
  records: ExerciseRecord[],
): ExerciseRecord | undefined {
  const key = name.toLowerCase().trim();
  return records.find(
    (r) =>
      r.nameFr.toLowerCase().trim() === key ||
      r.nameEn?.toLowerCase().trim() === key ||
      (r.aliases ?? []).some((a) => a.toLowerCase().trim() === key),
  );
}

const STOPWORDS = new Set(["de", "du", "des", "avec", "a", "au", "aux", "le", "la", "les", "et", "en", "sur"]);

/** Tokenise en mots normalisés (accents retirés, ponctuation retirée,
 * singulier naïf par retrait d'un "s" final) en filtrant les mots-outils —
 * base commune du matching "contenant" ci-dessous. */
function meaningfulTokens(s: string): string[] {
  return normalize(s)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .filter((w) => !STOPWORDS.has(w));
}

/** Un nom "contient" l'autre si tous les mots du plus court se retrouvent,
 * tels quels, parmi les mots du plus long — jamais une similarité de
 * caractères brute (le piège documenté ailleurs dans ce repo : "Étirement du
 * cou" matche "Étirement du coureur" à 0.94 en similarité de bigrammes tout
 * en étant un exercice différent — un match mot-à-mot exact ne tombe pas
 * dans ce piège car "cou" ≠ "coureur"). Exige au moins 2 mots côté le plus
 * court pour éviter qu'un seul mot générique ("squat", "curl"...) ne matche
 * n'importe quelle variante. */
function wordsContain(shortTokens: string[], longTokens: string[]): boolean {
  if (shortTokens.length < 2) return false;
  const longSet = new Set(longTokens);
  return shortTokens.every((w) => longSet.has(w));
}

function looseNameMatches(key: string, candidate: string): boolean {
  const keyTokens = meaningfulTokens(key);
  const candidateTokens = meaningfulTokens(candidate);
  if (keyTokens.length <= candidateTokens.length) return wordsContain(keyTokens, candidateTokens);
  return wordsContain(candidateTokens, keyTokens);
}

/**
 * Variante tolérante de `matchExerciseRecord` — réservée à la résolution
 * d'illustration (vignettes/montages composites), jamais à une liaison de
 * données (`exerciseRecordId`) ni à un calcul qui doit rester précis
 * (`needsLink`, "exercices similaires"...). But : éviter l'emoji de repli
 * quand un exercice au nom légèrement différent ("Double unders" vs "Double
 * Under (corde à sauter, double passage)") a déjà une vraie photo — au prix
 * d'un "premier candidat plausible" plutôt que d'une garantie de justesse
 * (comportement demandé explicitement plutôt qu'un vrai risque non maîtrisé
 * : le matching par mots-entiers, contrairement à la similarité de
 * caractères, ne confond pas deux exercices aux noms proches mais
 * distincts). Retombe sur `matchExerciseRecord` (match exact) en premier —
 * ce tiers-2 n'intervient qu'en son absence. */
export function matchExerciseRecordLoose(
  name: string,
  records: ExerciseRecord[],
): ExerciseRecord | undefined {
  const exact = matchExerciseRecord(name, records);
  if (exact) return exact;

  const key = name.toLowerCase().trim();
  if (!key) return undefined;
  return records.find(
    (r) =>
      looseNameMatches(key, r.nameFr) ||
      (r.nameEn && looseNameMatches(key, r.nameEn)) ||
      (r.aliases ?? []).some((a) => looseNameMatches(key, a)),
  );
}
