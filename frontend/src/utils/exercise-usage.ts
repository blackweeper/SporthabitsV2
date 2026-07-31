import { Program } from "@/src/data/programs";
import { Plan } from "@/src/utils/gym-storage";

export type ExerciseUsage = {
  key: string;
  kind: "program" | "plan";
  id: string;
  title: string;
};

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Finds which static Programs and user Plans already include an exercise —
 * matched by normalized name (or one of its `aliases`), the same convention
 * already used for PR/session matching elsewhere (`exercise-detail.ts`,
 * `exercise-progress.ts`) rather than inventing a fuzzier one just for this.
 */
export function findExerciseUsage(
  name: string,
  aliases: string[],
  programs: Program[],
  plans: Plan[],
): ExerciseUsage[] {
  const keys = new Set([name, ...aliases].map(normalize));
  const usage: ExerciseUsage[] = [];

  for (const program of programs) {
    const used = program.days.some((d) =>
      d.sessions.some((s) => s.exercises.some((e) => keys.has(normalize(e.name)))),
    );
    if (used) {
      usage.push({ key: `program-${program.id}`, kind: "program", id: program.id, title: program.title });
    }
  }

  for (const plan of plans) {
    const used = plan.exercises.some((e) => keys.has(normalize(e.name)));
    if (used) {
      usage.push({ key: `plan-${plan.id}`, kind: "plan", id: plan.id, title: plan.title });
    }
  }

  return usage;
}
