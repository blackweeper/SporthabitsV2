import { ExerciseRecord } from "@/src/utils/exercise-records";
import { normalize, similarity, FUZZY_MATCH_THRESHOLD } from "@/src/utils/exercise-library-merge";

/**
 * Moteur de liaison exercice importé -> `ExerciseRecord` de la bibliothèque.
 * Cascade exact -> alias -> fuzzy (jamais auto-appliqué) -> aucun match,
 * réutilisant `normalize`/`similarity` déjà éprouvés par
 * `exercise-library-merge.ts` (curation/réimport WorkoutX) plutôt que de
 * réimplémenter une nouvelle notion de similarité.
 *
 * Principe directeur : seul un match exact ou par alias déclenche une
 * liaison automatique (`exerciseRecordId` renseigné). Le fuzzy ne fait
 * jamais que suggérer — un exercice comme "Étirement du cou" peut matcher
 * "Étirement du coureur" à 0.94 de similarité tout en étant un exercice
 * différent ; seul un humain doit confirmer ce genre de cas via l'écran
 * de revue.
 */

export type MatchStatus = "exact" | "alias" | "fuzzy" | "none";

export type MatchSuggestion = { id: string; name: string; score: number };

export type MatchResult = {
  rawName: string;
  status: MatchStatus;
  /** Renseigné uniquement pour "exact"/"alias" — jamais pour "fuzzy"/"none". */
  exerciseRecordId: string | null;
  /** 1 pour exact/alias, score de similarité (0-1) pour fuzzy, 0 pour none. */
  confidence: number;
  /** Candidats fuzzy triés par score décroissant — vide sauf status "fuzzy". */
  suggestions: MatchSuggestion[];
};

type IndexEntry = { record: ExerciseRecord; via: "name" | "alias" };

export type ExerciseIndex = {
  byNormalizedName: Map<string, IndexEntry>;
  records: ExerciseRecord[];
};

const MAX_SUGGESTIONS = 3;

/**
 * Index précalculé une fois par version de bibliothèque — transforme le
 * lookup exact/alias en O(1) au lieu d'un `.find()` linéaire sur toute la
 * bibliothèque pour chaque nom importé. Un nom canonique (nameFr/nameEn)
 * prime toujours sur un alias en cas de collision : un alias ne remplace
 * jamais une entrée déjà indexée.
 */
export function buildExerciseIndex(records: ExerciseRecord[]): ExerciseIndex {
  const byNormalizedName = new Map<string, IndexEntry>();

  const put = (name: string | null | undefined, record: ExerciseRecord, via: "name" | "alias") => {
    if (!name) return;
    const key = normalize(name);
    if (!key) return;
    if (via === "alias" && byNormalizedName.has(key)) return; // le nom canonique prime
    if (via === "name" && byNormalizedName.get(key)?.via === "name") return; // 1er nom canonique gagne
    byNormalizedName.set(key, { record, via });
  };

  for (const r of records) {
    put(r.nameFr, r, "name");
    put(r.nameEn, r, "name");
    for (const alias of r.aliases ?? []) put(alias, r, "alias");
  }

  return { byNormalizedName, records };
}

/**
 * Résout un seul nom brut. Le fuzzy ne tourne QUE sur les échecs de
 * l'exact/alias, pour ne jamais comparer chaque nom importé aux ~1300+
 * exercices de la bibliothèque quand un lookup O(1) suffit déjà.
 */
export function matchExercise(rawName: string, index: ExerciseIndex): MatchResult {
  const key = normalize(rawName);
  const hit = key ? index.byNormalizedName.get(key) : undefined;

  if (hit) {
    return {
      rawName,
      status: hit.via === "alias" ? "alias" : "exact",
      exerciseRecordId: hit.record.id,
      confidence: 1,
      suggestions: [],
    };
  }

  const suggestions = index.records
    .map((r) => ({ id: r.id, name: r.nameFr, score: similarity(rawName, r.nameFr) }))
    .filter((s) => s.score >= FUZZY_MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS);

  if (suggestions.length > 0) {
    return { rawName, status: "fuzzy", exerciseRecordId: null, confidence: suggestions[0].score, suggestions };
  }

  return { rawName, status: "none", exerciseRecordId: null, confidence: 0, suggestions: [] };
}

/** Point d'entrée batch pour un programme fraîchement importé — construit
 * l'index une seule fois puis résout chaque nom brut contre lui. */
export function matchImportedExercises(rawNames: string[], records: ExerciseRecord[]): MatchResult[] {
  const index = buildExerciseIndex(records);
  return rawNames.map((name) => matchExercise(name, index));
}

export type MatchScoreBand = { label: string; color: "success" | "warning" | "info" | "neutral" };

/** Qualifie un score de similarité (0-1) pour l'affichage — utilisé par
 * l'écran de revue et le modal de recherche pour que le pourcentage brut
 * s'accompagne toujours d'un repère visuel (couleur + libellé), plutôt que
 * de laisser l'utilisateur interpréter seul un "72%". */
export function matchScoreBand(score: number): MatchScoreBand {
  if (score >= 0.85) return { label: "Très proche", color: "success" };
  if (score >= 0.7) return { label: "Proche", color: "warning" };
  if (score >= 0.5) return { label: "Possible", color: "info" };
  return { label: "Texte proche", color: "neutral" };
}

/** Appelée quand l'utilisateur confirme une résolution manuelle/fuzzy dans
 * l'écran de revue — c'est ce qui rend le système auto-apprenant : le même
 * texte importé matchera automatiquement en "alias" au prochain import.
 * N'écrase jamais un alias déjà présent (idempotent), et ne fait rien si
 * `rawName` est déjà le nom canonique (aucun alias nécessaire). */
export function learnAlias(record: ExerciseRecord, rawName: string): ExerciseRecord {
  const key = normalize(rawName);
  if (!key || key === normalize(record.nameFr) || key === normalize(record.nameEn ?? "")) return record;
  const already = (record.aliases ?? []).some((a) => normalize(a) === key);
  if (already) return record;
  return { ...record, aliases: [...(record.aliases ?? []), rawName] };
}
