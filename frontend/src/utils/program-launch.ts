import { ActiveProgram, findOrCreateProgramPlan, uid } from "@/src/utils/gym-storage";
import { Program, ProgramDay, ProgramSession } from "@/src/data/programs";

/**
 * Lance (ou reprend) la séance d'un jour de programme donné — extrait tel
 * quel de `handlePressDay` (`app/(tabs)/training.tsx`), pour que le Dashboard
 * réutilise exactement le même mécanisme au lieu d'une réimplémentation.
 * Un programme n'est qu'un modèle : lancer un jour différent d'"aujourd'hui"
 * est un usage volontairement supporté (`findOrCreateProgramPlan` est déjà
 * agnostique du jour) — signature identique à l'ancien `handlePressDay` pour
 * rester un remplacement direct partout où elle est appelée.
 */
export async function launchProgramDay(
  program: Program,
  active: ActiveProgram,
  dayIndex: number,
  day: ProgramDay,
  sessionIndex: number,
  session: ProgramSession,
  router: any,
): Promise<void> {
  if (!session) return;
  const isStretch = program.category === "stretch";
  const plan = await findOrCreateProgramPlan(program.id, dayIndex, sessionIndex, () => ({
    title: `${program.title} · J${dayIndex}${session.label ? " · " + session.label : ""}`,
    type: isStretch ? "stretch" : "mixte",
    category: isStretch ? "stretch" : "workout",
    createdAt: new Date().toISOString(),
    programSource: { programId: program.id, dayIndex, sessionIndex },
    exercises: session.exercises.map((e) => ({ ...e, id: uid() })),
  }));
  router.push(`/workout/${plan.id}`);
}
