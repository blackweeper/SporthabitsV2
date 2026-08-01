import type { ExerciseTemplate } from "@/src/data/programs";
import type { Exercise } from "@/src/utils/gym-storage";

/** "4 × 8 · 70kg" / "3 × 30s" / "AMRAP 10 min" / "EMOM 12 min" · repos —
 * shared by every screen that lists a program/plan exercise row
 * (`program/[id].tsx`, `SessionPreviewModal.tsx`, `ProgramDayCardFull.tsx`). */
export function formatExerciseDetail(ex: ExerciseTemplate | Exercise): string {
  const parts: string[] = [];
  if (ex.mode === "reps") {
    parts.push(`${ex.sets || 1} × ${ex.reps ?? "?"}`);
    if (ex.weight) parts.push(String(ex.weight));
  } else if (ex.mode === "time") {
    parts.push(`${ex.sets || 1} × ${ex.duration_seconds || 0}s`);
  } else if (ex.mode === "amrap") {
    parts.push(`AMRAP ${Math.round((ex.duration_seconds || 0) / 60)} min`);
  } else if (ex.mode === "emom") {
    parts.push(`EMOM ${ex.sets || 1} min`);
    if (ex.reps) parts.push(String(ex.reps));
  }
  if (ex.rest_seconds && ex.mode !== "amrap") parts.push(`repos ${ex.rest_seconds}s`);
  return parts.join(" · ");
}
