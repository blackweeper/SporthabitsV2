import { Program, ProgramDay } from "@/src/data/programs";

export type WeekDayColumn = { dayIndex: number; day: ProgramDay };

/** Jours non-repos d'une tranche de jours (1-based, inclusive), plafonnée à
 * la durée réelle du programme. Partagé par `program/[id].tsx` (vue
 * semaine paginée) et `training.tsx` (bandes "Cette semaine"/"Semaines à
 * venir" du hub Entraînements) pour ne jamais dupliquer cette logique. */
export function nonRestDaysInRange(
  program: Program,
  startDayIndex: number,
  endDayIndex: number,
): WeekDayColumn[] {
  const columns: WeekDayColumn[] = [];
  const clampedEnd = Math.min(endDayIndex, program.durationDays);
  for (let i = startDayIndex; i <= clampedEnd; i++) {
    const day = program.days[i - 1];
    if (!day || day.rest) continue;
    columns.push({ dayIndex: i, day });
  }
  return columns;
}

/** Index de semaine (0-based) contenant ce jour (1-based). */
export function weekIndexForDay(dayIndex: number): number {
  return Math.floor((dayIndex - 1) / 7);
}

/** Bornes de jours (1-based, inclusive) pour une semaine donnée (0-based). */
export function weekDayRange(weekIndex: number): { start: number; end: number } {
  const start = weekIndex * 7 + 1;
  return { start, end: start + 6 };
}

export function formatDateRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
  });
  const endStr = end.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${startStr} – ${endStr}`;
}
