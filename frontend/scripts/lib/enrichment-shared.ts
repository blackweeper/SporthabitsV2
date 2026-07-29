/**
 * Phase B5/Ollama — provider-agnostic pieces of the enrichment pipeline:
 * the fixed prompt/schema, completeness checks, quality scoring, and the
 * merge logic that never overwrites an already-filled field. Shared by
 * `enrich-library-content.ts` (Claude API) and
 * `enrich-library-content-ollama.ts` (local Ollama) so the two providers
 * stay behaviourally identical outside of how they actually call a model.
 *
 * See `ExerciseEnrichment` in src/utils/exercise-records.ts for the field
 * list, the display-priority rule, and the `verifiedBy` protection rule.
 */

import { EXERCISE_MUSCLE_GROUPS } from "../../src/utils/exercise-muscle-groups";
import { MOVEMENT_PATTERNS } from "../../src/utils/exercise-movement-pattern";
import { EXERCISE_DIFFICULTIES } from "../../src/utils/exercise-difficulty";
import type { ExerciseRecord, ExerciseEnrichment, ExerciseLocaleContent } from "../../src/utils/exercise-records";

export const TEMPLATE_VERSION = 1;

export const MUSCLE_GROUP_VALUES = EXERCISE_MUSCLE_GROUPS.map((g) => g.key);
export const MOVEMENT_PATTERN_VALUES = MOVEMENT_PATTERNS;
export const DIFFICULTY_VALUES = EXERCISE_DIFFICULTIES;
export const EXERCISE_TYPE_VALUES = [
  "compound",
  "isolation",
  "cardio",
  "mobility",
  "stretch",
  "plyometric",
  "olympic",
] as const;
export const TECHNICAL_LEVEL_VALUES = ["low", "medium", "high"] as const;
export const EQUIPMENT_LEVEL_VALUES = ["none", "basic", "gym"] as const;
export const TRAINING_GOAL_VALUES = [
  "strength",
  "hypertrophy",
  "endurance",
  "conditioning",
  "mobility",
  "rehabilitation",
  "hyrox",
  "crossfit",
  "running",
  "power",
  "stability",
] as const;

export type GeneratedFiche = {
  name: string;
  description: string;
  instructions: string[];
  executionTips: string[];
  commonMistakes: string[];
  breathingTips: string | null;
  precautions: string | null;
  verifiedPrimaryMuscle: string;
  verifiedSecondaryMuscles: string[];
  exerciseType: string;
  tags: string[];
  difficulty: string;
  technicalLevel: string;
  muscleActivation: { primary: string[]; secondary: string[]; activationScore: Record<string, number> };
  equipmentLevel: string;
  trainingGoals: string[];
  movementPatterns: string[];
  progressionExercises: { name: string }[];
  regressionExercises: { name: string }[];
  coachNotes: { execution: string[]; programming: string[]; safety: string[] };
};

/** Raw JSON Schema for one generated fiche — wrapped into an Anthropic tool
 * definition by the Claude script, passed as-is to Ollama's `format` field
 * by the Ollama script (both accept plain JSON Schema). */
export const ENRICHMENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Nom naturel en français, jamais une traduction littérale." },
    description: { type: "string" },
    instructions: { type: "array", items: { type: "string" } },
    executionTips: { type: "array", items: { type: "string" } },
    commonMistakes: { type: "array", items: { type: "string" } },
    breathingTips: { type: ["string", "null"], description: "null si non pertinent pour cet exercice." },
    precautions: { type: ["string", "null"], description: "null si aucune contre-indication réelle." },
    verifiedPrimaryMuscle: { type: "string", enum: MUSCLE_GROUP_VALUES },
    verifiedSecondaryMuscles: { type: "array", items: { type: "string", enum: MUSCLE_GROUP_VALUES } },
    exerciseType: { type: "string", enum: EXERCISE_TYPE_VALUES },
    tags: { type: "array", items: { type: "string" } },
    difficulty: { type: "string", enum: DIFFICULTY_VALUES },
    technicalLevel: { type: "string", enum: TECHNICAL_LEVEL_VALUES },
    muscleActivation: {
      type: "object",
      properties: {
        primary: { type: "array", items: { type: "string", enum: MUSCLE_GROUP_VALUES } },
        secondary: { type: "array", items: { type: "string", enum: MUSCLE_GROUP_VALUES } },
        activationScore: {
          type: "object",
          description: "Clé = groupe musculaire (parmi la liste autorisée), valeur = 0-100.",
          additionalProperties: { type: "number" },
        },
      },
      required: ["primary", "secondary", "activationScore"],
    },
    equipmentLevel: { type: "string", enum: EQUIPMENT_LEVEL_VALUES },
    trainingGoals: { type: "array", items: { type: "string", enum: TRAINING_GOAL_VALUES } },
    movementPatterns: { type: "array", items: { type: "string", enum: MOVEMENT_PATTERN_VALUES } },
    progressionExercises: {
      type: "array",
      description: "Vide si aucune progression clairement pertinente.",
      items: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    },
    regressionExercises: {
      type: "array",
      description: "Vide si aucune régression clairement pertinente.",
      items: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    },
    coachNotes: {
      type: "object",
      properties: {
        execution: { type: "array", items: { type: "string" } },
        programming: { type: "array", items: { type: "string" } },
        safety: { type: "array", items: { type: "string" } },
      },
      required: ["execution", "programming", "safety"],
    },
  },
  required: [
    "name",
    "description",
    "instructions",
    "executionTips",
    "commonMistakes",
    "breathingTips",
    "precautions",
    "verifiedPrimaryMuscle",
    "verifiedSecondaryMuscles",
    "exerciseType",
    "tags",
    "difficulty",
    "technicalLevel",
    "muscleActivation",
    "equipmentLevel",
    "trainingGoals",
    "movementPatterns",
    "progressionExercises",
    "regressionExercises",
    "coachNotes",
  ],
};

export function buildSystemPrompt(): string {
  return `Tu es un coach sportif professionnel francophone (France/Belgique), rédacteur pour la bibliothèque de connaissances IronFlow.

RÈGLES STRICTES :
- Jamais une traduction littérale : rédige comme un coach qui explique l'exercice à un pratiquant, avec un vocabulaire naturel et professionnel.
- Utilise UNIQUEMENT les valeurs autorisées listées ci-dessous pour les champs à vocabulaire fermé — n'invente jamais de valeur hors liste.
- "breathingTips" et "precautions" : renvoie null si ce n'est pas pertinent pour cet exercice précis — ne remplis jamais artificiellement juste pour donner une impression d'homogénéité.
- "tags" : vocabulaire libre mais contrôlé et cohérent (ex : force, hypertrophie, endurance, mobilité, poussée, tirage, compound, isolation, poids du corps, haltères, barre, kettlebell, cardio, plyométrie...).
- "progressionExercises"/"regressionExercises" : uniquement des exercices réels et connus ; tableau vide si rien de clairement pertinent — jamais forcé.
- Les données fournies (nom, muscles, équipement, catégorie, difficulté, description et instructions déjà en français) sont la base factuelle : ne les invente pas, mais élabore dessus en coach professionnel plutôt que de les paraphraser mot à mot. "name"/"description"/"instructions" peuvent reprendre le texte fourni tel quel s'il est déjà bon, ou l'améliorer légèrement — l'essentiel de ta valeur ajoutée est dans les champs que les données fournies ne couvrent pas (coachNotes, erreurs fréquentes détaillées, objectifs d'entraînement, activation musculaire, variantes).
- Réponds UNIQUEMENT en appelant l'outil "submit_exercise_fiche" avec tous les champs remplis — jamais de texte libre en dehors de cet appel.

Valeurs autorisées :
- muscles (verifiedPrimaryMuscle / verifiedSecondaryMuscles / muscleActivation.primary/secondary) : ${MUSCLE_GROUP_VALUES.join(", ")}
- exerciseType : ${EXERCISE_TYPE_VALUES.join(", ")}
- difficulty : ${DIFFICULTY_VALUES.join(", ")}
- technicalLevel : ${TECHNICAL_LEVEL_VALUES.join(", ")}
- equipmentLevel : ${EQUIPMENT_LEVEL_VALUES.join(", ")}
- trainingGoals : ${TRAINING_GOAL_VALUES.join(", ")}
- movementPatterns : ${MOVEMENT_PATTERN_VALUES.join(", ")}`;
}

/** Feeds the model WorkoutX's own French text (`nameFr`/`description`/
 * `instructions` — real translations since the Phase 0 `--lang=fr`
 * re-import, not machine-translated by this pipeline) as factual grounding,
 * plus the English name for disambiguation. The model elaborates on this
 * French base rather than translating from English itself. */
export function buildUserPrompt(record: ExerciseRecord): string {
  const raw = (record.raw ?? {}) as Record<string, unknown>;
  const lines = [
    `Exercice à traiter :`,
    `- Nom (français, WorkoutX) : ${record.nameFr}`,
    `- Nom anglais (référence) : ${record.nameEn ?? record.nameFr}`,
    `- Catégorie IronFlow : ${record.category}`,
    `- Muscle principal (WorkoutX) : ${record.primaryMuscle ?? "inconnu"}`,
    `- Muscles secondaires (WorkoutX) : ${(record.secondaryMuscles ?? []).join(", ") || "aucun"}`,
    `- Équipement (WorkoutX) : ${record.equipment ?? "inconnu"}`,
    `- Difficulté (WorkoutX) : ${record.difficulty ?? "inconnue"}`,
    `- Description (français, WorkoutX) : ${record.description ?? "(absente)"}`,
    `- Instructions (français, WorkoutX) : ${
      (record.instructions ?? []).map((s, i) => `${i + 1}. ${s}`).join(" ") || "(absentes)"
    }`,
  ];
  if (typeof raw.bodyPart === "string") lines.push(`- bodyPart (WorkoutX) : ${raw.bodyPart}`);
  if (typeof raw.target === "string") lines.push(`- target (WorkoutX) : ${raw.target}`);
  if (typeof raw.mechanic === "string") lines.push(`- mechanic (WorkoutX) : ${raw.mechanic}`);
  if (typeof raw.force === "string") lines.push(`- force (WorkoutX) : ${raw.force}`);
  return lines.join("\n");
}

export function validateGenerated(fiche: GeneratedFiche): void {
  if (!fiche.name?.trim()) throw new Error("champ 'name' vide");
  if (!fiche.description?.trim()) throw new Error("champ 'description' vide");
  if (!Array.isArray(fiche.instructions) || fiche.instructions.length === 0) {
    throw new Error("champ 'instructions' vide");
  }
  if (!fiche.verifiedPrimaryMuscle) throw new Error("champ 'verifiedPrimaryMuscle' manquant");
}

// ---------- Completeness / merge ----------

export const REQUIRED_LOCALE_FIELDS: (keyof ExerciseLocaleContent)[] = [
  "name",
  "description",
  "instructions",
  "executionTips",
  "commonMistakes",
];

export const REQUIRED_ENRICHMENT_FIELDS: (keyof ExerciseEnrichment)[] = [
  "verifiedPrimaryMuscle",
  "verifiedSecondaryMuscles",
  "exerciseType",
  "tags",
  "difficulty",
  "technicalLevel",
  "muscleActivation",
  "equipmentLevel",
  "trainingGoals",
  "movementPatterns",
  "progressionExercises",
  "regressionExercises",
  "coachNotes",
];

export function isEnrichmentComplete(enrichment: ExerciseEnrichment | null | undefined, locale: string): boolean {
  if (!enrichment) return false;
  const content = enrichment.translations?.[locale];
  if (!content) return false;
  for (const f of REQUIRED_LOCALE_FIELDS) if (content[f] == null) return false;
  for (const f of REQUIRED_ENRICHMENT_FIELDS) if ((enrichment as Record<string, unknown>)[f] == null) return false;
  return true;
}

export function computeQuality(
  enrichment: ExerciseEnrichment,
  locale: string,
): { qualityScore: number; reviewStatus: "generated" | "needs_review" } {
  const content = enrichment.translations[locale] ?? {};
  const checks = [
    ...REQUIRED_LOCALE_FIELDS.map((f) => {
      const v = content[f];
      return v != null && (!Array.isArray(v) || v.length > 0);
    }),
    ...REQUIRED_ENRICHMENT_FIELDS.map((f) => (enrichment as Record<string, unknown>)[f] != null),
  ];
  const filled = checks.filter(Boolean).length;
  const qualityScore = Math.round((filled / checks.length) * 100) / 100;
  const minLengthOk = (content.description?.length ?? 0) >= 40 && (content.instructions?.length ?? 0) >= 2;
  const reviewStatus = qualityScore >= 0.9 && minLengthOk ? "generated" : "needs_review";
  return { qualityScore, reviewStatus };
}

export function mergeEnrichment(
  existing: ExerciseEnrichment | null | undefined,
  generated: GeneratedFiche,
  locale: string,
  verifiedBy: "claude" | "ollama",
): ExerciseEnrichment {
  const prevContent = existing?.translations?.[locale] ?? {};
  const nextContent: ExerciseLocaleContent = {
    name: prevContent.name ?? generated.name,
    description: prevContent.description ?? generated.description,
    instructions: prevContent.instructions ?? generated.instructions,
    executionTips: prevContent.executionTips ?? generated.executionTips,
    commonMistakes: prevContent.commonMistakes ?? generated.commonMistakes,
    breathingTips: prevContent.breathingTips !== undefined ? prevContent.breathingTips : generated.breathingTips,
    precautions: prevContent.precautions !== undefined ? prevContent.precautions : generated.precautions,
  };

  const next: ExerciseEnrichment = {
    translations: { ...(existing?.translations ?? {}), [locale]: nextContent },
    verifiedPrimaryMuscle:
      existing?.verifiedPrimaryMuscle ?? (generated.verifiedPrimaryMuscle as ExerciseEnrichment["verifiedPrimaryMuscle"]),
    verifiedSecondaryMuscles:
      existing?.verifiedSecondaryMuscles ??
      (generated.verifiedSecondaryMuscles as ExerciseEnrichment["verifiedSecondaryMuscles"]),
    alternativeExerciseIds: existing?.alternativeExerciseIds ?? null,
    exerciseType: existing?.exerciseType ?? (generated.exerciseType as ExerciseEnrichment["exerciseType"]),
    tags: existing?.tags ?? generated.tags,
    qualityScore: existing?.qualityScore ?? null,
    reviewStatus: existing?.reviewStatus ?? null,
    verifiedBy: existing?.verifiedBy ?? verifiedBy,
    difficulty: existing?.difficulty ?? (generated.difficulty as ExerciseEnrichment["difficulty"]),
    technicalLevel: existing?.technicalLevel ?? (generated.technicalLevel as ExerciseEnrichment["technicalLevel"]),
    muscleActivation:
      existing?.muscleActivation ?? (generated.muscleActivation as ExerciseEnrichment["muscleActivation"]),
    equipmentLevel: existing?.equipmentLevel ?? (generated.equipmentLevel as ExerciseEnrichment["equipmentLevel"]),
    trainingGoals: existing?.trainingGoals ?? (generated.trainingGoals as ExerciseEnrichment["trainingGoals"]),
    movementPatterns:
      existing?.movementPatterns ?? (generated.movementPatterns as ExerciseEnrichment["movementPatterns"]),
    progressionExercises:
      existing?.progressionExercises ?? generated.progressionExercises.map((p) => ({ name: p.name, id: null })),
    regressionExercises:
      existing?.regressionExercises ?? generated.regressionExercises.map((p) => ({ name: p.name, id: null })),
    coachNotes: existing?.coachNotes ?? generated.coachNotes,
    templateVersion: TEMPLATE_VERSION,
    updatedAt: new Date().toISOString(),
  };

  const { qualityScore, reviewStatus } = computeQuality(next, locale);
  next.qualityScore = qualityScore;
  next.reviewStatus = reviewStatus;
  return next;
}
