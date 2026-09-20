import type { ExerciseTemplate } from './programs';
import type { ExerciseMatchConfidence } from '@/src/utils/gym-storage';

/**
 * Briques communes aux programmes de musculation transcrits d'un PDF
 * (`halteres-4-jours.ts`, `push-pull-legs-90-jours.ts`) : une séance est une
 * liste de blocs, aplatie en `ExerciseTemplate[]` prête pour le moteur de
 * séance.
 *
 * Supersets (A1 → A2 sans repos) : encodés en `RoundBlock` (une séquence
 * d'exercices répétée N fois, `sets:1` chacun), pas en `sets:N` sur un seul
 * exercice — même convention que les circuits de `the-comeback`, pour que le
 * moteur de séance alterne réellement A1/A2 au lieu d'enchaîner N séries du
 * même mouvement.
 */

/** Une ligne d'exercice telle que transcrite du PDF. */
export type BuilderItem = {
  /** Nom affiché dans le programme (la fiche s'ouvre par le nom canonique de l'exercice lié). */
  name: string;
  /** `ExerciseRecord.id` de la bibliothèque. */
  libId: string;
  reps: string;
  /** Repos (s) après cette ligne — 0 pour le 1er exercice d'un superset. */
  rest: number;
  notes: string;
  /** 'exact' = rapprochement évident ; 'manual' = variante/approximation validée à la main. */
  confidence?: ExerciseMatchConfidence;
};

export type BuilderBlock =
  | { kind: 'single'; sets: number; item: BuilderItem }
  | { kind: 'superset'; letter: string; rounds: number; items: [BuilderItem, BuilderItem] };

function toExercise(item: BuilderItem, noteSuffix: string | null, extra: Partial<ExerciseTemplate>): ExerciseTemplate {
  return {
    name: item.name,
    mode: 'reps',
    sets: 1,
    reps: item.reps,
    weight: null,
    rest_seconds: item.rest,
    duration_seconds: null,
    notes: noteSuffix ? `${item.notes} ${noteSuffix}` : item.notes,
    exerciseRecordId: item.libId,
    matchConfidence: item.confidence ?? 'exact',
    ...extra,
  };
}

/**
 * Aplati une liste de blocs en exercices. `blockIdPrefix` doit être unique par
 * séance (le `blockId` d'un superset = `${blockIdPrefix}-${lettre}`).
 * `noteSuffix` est ajouté à la fin des consignes de chaque exercice (ex. la
 * ligne d'effort du mois en cours).
 */
export function buildExercises(
  blocks: BuilderBlock[],
  blockIdPrefix: string,
  noteSuffix: string | null = null,
): ExerciseTemplate[] {
  const exercises: ExerciseTemplate[] = [];
  for (const block of blocks) {
    if (block.kind === 'single') {
      exercises.push(toExercise(block.item, noteSuffix, { sets: block.sets }));
      continue;
    }
    const blockId = `${blockIdPrefix}-${block.letter}`;
    for (let round = 0; round < block.rounds; round++) {
      block.items.forEach((item, sequenceIndex) => {
        exercises.push(
          toExercise(item, noteSuffix, {
            roundBlock: {
              blockId,
              roundIndex: round,
              totalRounds: block.rounds,
              sequenceIndex,
              sequenceLength: block.items.length,
              title: `Superset ${block.letter}`,
            },
          }),
        );
      });
    }
  }
  return exercises;
}
