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
import { TRAINING_GOALS } from "../../src/utils/exercise-training-goal";
import { DISCIPLINES } from "../../src/utils/exercise-discipline";
import type { ExerciseRecord, ExerciseEnrichment, ExerciseLocaleContent } from "../../src/utils/exercise-records";

export const TEMPLATE_VERSION = 3;

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
export const FATIGUE_LEVEL_VALUES = ["low", "medium", "high"] as const;
export const TRAINING_GOAL_VALUES = TRAINING_GOALS;
export const DISCIPLINE_VALUES = DISCIPLINES;

/** Real WorkoutX exercise objects carry `popularityRank` (1-5) in `raw` —
 * free, already fetched, no extra computation needed. Shared between the
 * enrichment processing-order heuristic (`enrich-library-content-ollama.ts`)
 * and the official-300 curation scoring (`curate-official-library.ts`) so
 * both agree on what counts as a "foundational" movement. */
export const FOUNDATIONAL_MOVEMENT_KEYWORDS = [
  "squat",
  "deadlift",
  "bench press",
  "pull-up",
  "pull up",
  "overhead press",
  "row",
  "clean",
  "snatch",
  "push-up",
  "push up",
  "lunge",
];

export type GeneratedFiche = {
  name: string;
  description: string;
  instructions: string[];
  executionTips: string[];
  commonMistakes: string[];
  breathingTips: string | null;
  precautions: string | null;
  /** "Pourquoi faire cet exercice" — voix IronFlow, jamais générique. */
  rationale: string;
  /** Échauffement spécifique conseillé ; null si un échauffement générique suffit. */
  warmupSuggestion: string | null;
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
  fatigueLevel: string;
  /** Une entrée par objectif de `trainingGoals` pour lequel un repos
   * spécifique a du sens — vide si le repos standard suffit partout. */
  restTimeByGoal: { goal: string; restTime: string }[];
  alternativeEquipment: string[];
  disciplines: string[];
  /** Chaque erreur fréquente appariée à sa correction technique — remplace
   * "commonMistakes" (simple liste) une fois l'enrichment passé. */
  mistakeCorrections: { mistake: string; correction: string }[];
  /** Une entrée par niveau (parmi "difficulty") pour lequel une note et/ou
   * des prérequis apportent vraiment quelque chose — vide ou partiel sinon,
   * jamais rempli artificiellement pour les 3 niveaux. */
  levelGuidance: { level: string; note: string | null; prerequisites: string[] }[];
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
    rationale: {
      type: "string",
      description: "Pourquoi faire cet exercice — sa place et son intérêt dans un programme, voix IronFlow.",
    },
    warmupSuggestion: {
      type: ["string", "null"],
      description: "Échauffement spécifique ; null si un échauffement générique suffit.",
    },
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
    fatigueLevel: { type: "string", enum: FATIGUE_LEVEL_VALUES },
    restTimeByGoal: {
      type: "array",
      description: "Une entrée par objectif nécessitant un repos spécifique ; vide si le repos standard suffit.",
      items: {
        type: "object",
        properties: {
          goal: { type: "string", enum: TRAINING_GOAL_VALUES },
          restTime: { type: "string" },
        },
        required: ["goal", "restTime"],
      },
    },
    alternativeEquipment: {
      type: "array",
      description: "Matériel de substitution si l'équipement principal n'est pas disponible ; vide si non applicable.",
      items: { type: "string" },
    },
    disciplines: { type: "array", items: { type: "string", enum: DISCIPLINE_VALUES } },
    mistakeCorrections: {
      type: "array",
      description:
        "Une entrée par erreur fréquente, chacune avec sa correction technique précise. Remplace commonMistakes en plus riche.",
      items: {
        type: "object",
        properties: { mistake: { type: "string" }, correction: { type: "string" } },
        required: ["mistake", "correction"],
      },
    },
    levelGuidance: {
      type: "array",
      description:
        "Une entrée par niveau pour lequel il y a une vraie note ou de vrais prérequis à donner ; vide si aucun niveau n'a besoin de guidance spécifique pour cet exercice.",
      items: {
        type: "object",
        properties: {
          level: { type: "string", enum: DIFFICULTY_VALUES },
          note: { type: ["string", "null"] },
          prerequisites: { type: "array", items: { type: "string" } },
        },
        required: ["level", "note", "prerequisites"],
      },
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
    "rationale",
    "warmupSuggestion",
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
    "fatigueLevel",
    "restTimeByGoal",
    "alternativeEquipment",
    "disciplines",
    "mistakeCorrections",
    "levelGuidance",
  ],
};

export function buildSystemPrompt(): string {
  return `Tu es un coach sportif professionnel francophone (France/Belgique), rédacteur pour la bibliothèque de connaissances IronFlow.

RÈGLES STRICTES :
- Jamais une traduction littérale : rédige comme un coach qui explique l'exercice à un pratiquant, avec un vocabulaire naturel et professionnel.
- VOIX IRONFLOW (règle la plus importante) : "executionTips", "coachNotes" et "rationale" ne sont PAS des conseils génériques de manuel — l'utilisateur doit sentir qu'IronFlow lui apprend concrètement quelque chose de spécifique à CET exercice précis. Bannis les formulations passe-partout ("gardez le dos droit", "contrôlez le mouvement") sauf si tu les rends concrètes et propres à ce mouvement précis (angle, repère corporel, sensation recherchée). Si un conseil pourrait être copié-collé sur n'importe quel autre exercice sans rien changer, ne l'écris pas.
- Utilise UNIQUEMENT les valeurs autorisées listées ci-dessous pour les champs à vocabulaire fermé — n'invente jamais de valeur hors liste.
- "breathingTips", "precautions", "warmupSuggestion" : renvoie null si ce n'est pas pertinent pour cet exercice précis — ne remplis jamais artificiellement juste pour donner une impression d'homogénéité.
- "rationale" : un court paragraphe (2-3 phrases) sur POURQUOI cet exercice mérite sa place dans un programme — jamais une redite de "description".
- "restTimeByGoal" : uniquement les objectifs de "trainingGoals" pour lesquels un repos différent du standard a un vrai sens ; tableau vide sinon.
- "alternativeEquipment" : uniquement si un vrai substitut existe pour CET exercice précis ; tableau vide sinon.
- "disciplines" : les disciplines/programmes où cet exercice est particulièrement pertinent (pas juste "musculation" par défaut pour tout ce qui est en salle — réserve ce tag aux exercices vraiment centraux en musculation généraliste).
- "mistakeCorrections" : chaque erreur DOIT être appariée à sa correction technique concrète (pas juste "à éviter" — dis QUOI faire à la place) ; remplit ce champ même si "commonMistakes" existe déjà, il est plus riche.
- "levelGuidance" : une entrée par niveau (parmi "difficulty") seulement quand ce niveau précis a vraiment besoin d'une note ou de prérequis pour CET exercice — jamais les 3 niveaux par défaut. "prerequisites" reste vide s'il n'y en a pas.
- "tags" : vocabulaire libre mais contrôlé et cohérent (ex : force, hypertrophie, endurance, mobilité, poussée, tirage, compound, isolation, poids du corps, haltères, barre, kettlebell, cardio, plyométrie...).
- "progressionExercises"/"regressionExercises" : uniquement des exercices réels et connus ; tableau vide si rien de clairement pertinent — jamais forcé.
- Les données fournies (nom, muscles, équipement, catégorie, difficulté, description et instructions déjà en français) sont la base factuelle : ne les invente pas, mais élabore dessus en coach professionnel plutôt que de les paraphraser mot à mot. "name"/"description"/"instructions" peuvent reprendre le texte fourni tel quel s'il est déjà bon, ou l'améliorer légèrement — l'essentiel de ta valeur ajoutée est dans les champs que les données fournies ne couvrent pas (coachNotes, rationale, erreurs fréquentes détaillées, objectifs d'entraînement, activation musculaire, variantes, disciplines).
- Réponds UNIQUEMENT en appelant l'outil "submit_exercise_fiche" avec tous les champs remplis — jamais de texte libre en dehors de cet appel.

Valeurs autorisées :
- muscles (verifiedPrimaryMuscle / verifiedSecondaryMuscles / muscleActivation.primary/secondary) : ${MUSCLE_GROUP_VALUES.join(", ")}
- exerciseType : ${EXERCISE_TYPE_VALUES.join(", ")}
- difficulty : ${DIFFICULTY_VALUES.join(", ")}
- technicalLevel : ${TECHNICAL_LEVEL_VALUES.join(", ")}
- equipmentLevel : ${EQUIPMENT_LEVEL_VALUES.join(", ")}
- trainingGoals (aussi les clés valides de restTimeByGoal.goal) : ${TRAINING_GOAL_VALUES.join(", ")}
- movementPatterns : ${MOVEMENT_PATTERN_VALUES.join(", ")}
- fatigueLevel : ${FATIGUE_LEVEL_VALUES.join(", ")}
- disciplines : ${DISCIPLINE_VALUES.join(", ")}`;
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
    rationale: prevContent.rationale ?? generated.rationale,
    warmupSuggestion:
      prevContent.warmupSuggestion !== undefined ? prevContent.warmupSuggestion : generated.warmupSuggestion,
    mistakeCorrections:
      prevContent.mistakeCorrections ?? (generated.mistakeCorrections.length ? generated.mistakeCorrections : null),
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
    fatigueLevel: existing?.fatigueLevel ?? (generated.fatigueLevel as ExerciseEnrichment["fatigueLevel"]),
    restTimeByGoal:
      existing?.restTimeByGoal ??
      (generated.restTimeByGoal.length
        ? (Object.fromEntries(
            generated.restTimeByGoal.map((r) => [r.goal, r.restTime]),
          ) as ExerciseEnrichment["restTimeByGoal"])
        : null),
    alternativeEquipment: existing?.alternativeEquipment ?? (generated.alternativeEquipment.length ? generated.alternativeEquipment : null),
    disciplines: existing?.disciplines ?? (generated.disciplines as ExerciseEnrichment["disciplines"]),
    levelGuidance:
      existing?.levelGuidance ??
      (generated.levelGuidance.length
        ? (Object.fromEntries(
            generated.levelGuidance.map((g) => [g.level, { note: g.note, prerequisites: g.prerequisites }]),
          ) as ExerciseEnrichment["levelGuidance"])
        : null),
    templateVersion: TEMPLATE_VERSION,
    updatedAt: new Date().toISOString(),
  };

  const { qualityScore, reviewStatus } = computeQuality(next, locale);
  next.qualityScore = qualityScore;
  next.reviewStatus = reviewStatus;
  return next;
}
