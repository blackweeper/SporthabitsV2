/**
 * Coach IronFlow — narratif v1, 100% templaté (aucune IA). Construit la
 * description du `Program` généré à partir de faits déjà connus du moteur
 * (objectif, niveau, phases, point faible nudgé, historique utilisé) — pas
 * de nouvelle donnée calculée ici. Remplaçable plus tard par une couche IA
 * optionnelle (reformulation/motivation uniquement) sans toucher au moteur.
 */
import type { TrainingGoal } from "@/src/utils/exercise-training-goal";
import { TRAINING_GOAL_LABEL } from "@/src/utils/exercise-training-goal";
import type { ProgramLevel, ProgramPhase } from "@/src/data/programs";

const LEVEL_LABEL: Record<ProgramLevel, string> = {
  debutant: "débutant",
  intermediaire: "intermédiaire",
  avance: "avancé",
};

export type ProgramDescriptionInput = {
  goal: TrainingGoal;
  level: ProgramLevel;
  weeklyFrequency: number;
  sessionDurationMinutes: number;
  totalWeeks: number;
  phases: ProgramPhase[];
  /** Objectifs secondaires nudgés par un point faible déclaré (`AthleteCapacities`). */
  weakGoalBoost?: TrainingGoal[] | null;
  /** Vrai quand fréquence/durée ont été préremplies depuis l'historique réel. */
  historyInformed?: boolean;
};

export function buildProgramDescription(input: ProgramDescriptionInput): string {
  const goalLabel = TRAINING_GOAL_LABEL[input.goal];
  const sentences: string[] = [];

  sentences.push(
    `Généré automatiquement pour l'objectif "${goalLabel}" (niveau ${LEVEL_LABEL[input.level]}), ${input.weeklyFrequency}x/semaine, séances d'environ ${input.sessionDurationMinutes} min sur ${input.totalWeeks} semaines.`,
  );

  const deloadCount = input.phases.filter((p) => p.kind === "deload").length;
  if (deloadCount > 0) {
    sentences.push(`Inclut ${deloadCount} semaine${deloadCount > 1 ? "s" : ""} de décharge pour bien récupérer.`);
  }

  if (input.weakGoalBoost && input.weakGoalBoost.length > 0) {
    const boostedLabels = input.weakGoalBoost.map((g) => TRAINING_GOAL_LABEL[g].toLowerCase());
    sentences.push(
      `Ton point faible déclaré est aussi travaillé en filigrane (exercices orientés ${boostedLabels.join(" et ")}).`,
    );
  }

  if (input.historyInformed) {
    sentences.push(`Fréquence et durée ajustées à partir de tes séances réelles récentes.`);
  }

  return sentences.join(" ");
}
