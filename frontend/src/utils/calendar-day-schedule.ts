import { ActiveProgram, CalendarEvent } from "@/src/utils/gym-storage";
import { Program, ProgramSession } from "@/src/data/programs";
import { dayIndexForDate } from "@/src/utils/session-estimate";

/**
 * Coloration du calendrier par séance PRÉVUE (pas complétée) pour aujourd'hui
 * et les jours futurs — voir `WeekCalendarView.tsx` (les jours passés
 * gardent leur coloration existante par séance complétée, `pickColor`).
 *
 * Classification heuristique, pas exacte : `Program.category` est le signal
 * principal ; les programmes 'workout' (par défaut) retombent sur un
 * repérage de mots-clés dans le libellé/titre de la séance pour capter les
 * séances cardio au sein d'un programme sinon musculation (ex. "WOD HYROX"
 * dans un programme de force). Limite connue et acceptée en première passe.
 */
export type DayScheduleKind = "none" | "cardio" | "gym" | "both";

const CARDIO_KEYWORDS = /cardio|course|running|vélo|velo|rameur|row(?:er)?|bike|assault|hyrox|ski\s?erg|tapis/i;

function classifySession(session: ProgramSession, programCategory?: Program["category"]): "cardio" | "gym" {
  if (programCategory === "cardio" || programCategory === "stretch") return "cardio";
  const text = `${session.label} ${session.title}`;
  return CARDIO_KEYWORDS.test(text) ? "cardio" : "gym";
}

export function scheduleKindForDate(
  dateStr: string,
  ctx: {
    actives: { active: ActiveProgram; program: Program }[];
    calendarEvents: CalendarEvent[];
  },
): DayScheduleKind {
  let hasCardio = false;
  let hasGym = false;

  for (const { active, program } of ctx.actives) {
    const dayIndex = dayIndexForDate(active.startedAt, dateStr);
    if (dayIndex < 1 || dayIndex > program.days.length) continue;
    const day = program.days[dayIndex - 1];
    if (!day || day.rest) continue;
    for (const session of day.sessions) {
      if (classifySession(session, program.category) === "cardio") hasCardio = true;
      else hasGym = true;
    }
  }

  for (const ev of ctx.calendarEvents) {
    if (ev.date !== dateStr) continue;
    if (ev.kind === "running" || ev.kind === "mobility") hasCardio = true;
    else if (ev.kind === "workout") hasGym = true;
  }

  if (hasCardio && hasGym) return "both";
  if (hasCardio) return "cardio";
  if (hasGym) return "gym";
  return "none";
}
