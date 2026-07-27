// Contextual motivation messages — no AI involved. Each context has its own
// pool; a message is picked deterministically from the day of the year, so
// it changes every day and (as long as a pool has at least a handful of
// entries) can't repeat within a few days, while still being 100%
// reproducible (no randomness, no network call).

export type MotivationContext =
  | "sessionDone"
  | "streak"
  | "goalClose"
  | "morning"
  | "default";

const POOLS: Record<MotivationContext, string[]> = {
  // Shown once a workout session is logged today.
  sessionDone: [
    "Séance dans la poche. Ton corps te remerciera demain.",
    "C'est fait. C'est ça, la vraie discipline.",
    "Une de plus au compteur. Continue comme ça.",
    "Bien joué. Le repos aussi fait partie du travail.",
    "Tu l'as fait, même les jours où c'était dur.",
    "Séance validée. Ton futur toi applaudit.",
    "Chaque séance terminée est un dépôt sur ton compte progrès.",
    "Fait, pas parfait. Et c'est très bien comme ça.",
  ],
  // Shown when the user is on a streak of several days.
  streak: [
    "Ta série continue. Ne casse pas la chaîne aujourd'hui.",
    "Jour après jour, tu construis quelque chose de solide.",
    "La régularité est ta meilleure arme. Garde le rythme.",
    "Ce streak, c'est la preuve que tu tiens tes promesses.",
    "Encore un jour, encore une brique posée.",
    "Ta constance parle plus fort que tes excuses d'hier.",
    "La série continue — et elle te ressemble.",
    "Le vrai progrès, c'est ce que tu fais dire à ce streak.",
  ],
  // Shown when today's score is close to a great day (85%+ but not maxed).
  goalClose: [
    "Tu y es presque. Un petit effort de plus aujourd'hui.",
    "Si proche du sans-faute. Termine en beauté.",
    "Encore un geste et la journée est parfaite.",
    "Le dernier pourcent est souvent le plus satisfaisant.",
    "Tu touches au but. Ne t'arrête pas maintenant.",
    "Presque au sommet de ta journée. Vas-y.",
  ],
  // Shown in the morning before anything is logged yet.
  morning: [
    "Nouvelle journée, nouvelle page à écrire.",
    "Le meilleur moment pour commencer, c'est maintenant.",
    "Aujourd'hui ne se rattrape pas demain. Profites-en.",
    "Pose la première pierre de ta journée.",
    "Chaque matin est une chance de faire mieux qu'hier.",
    "Commence petit, mais commence.",
    "Le corps atteint ce que l'esprit croit possible.",
    "Ta journée, tes règles. Fais-en quelque chose de bien.",
  ],
  // General fallback for the rest of the day.
  default: [
    "Chaque rep te rapproche de la meilleure version de toi.",
    "La discipline bat la motivation.",
    "Ton seul concurrent : celui d'hier.",
    "L'excuse d'aujourd'hui, c'est le regret de demain.",
    "Fais-le pour le toi de dans 6 mois.",
    "Ce qui te fait transpirer aujourd'hui t'endurcit pour demain.",
    "Les progrès invisibles construisent les résultats visibles.",
    "Un jour à la fois. Un rep à la fois.",
    "La constance transforme.",
    "Personne ne va soulever cette barre à ta place.",
    "L'entraînement est un investissement, pas une dépense.",
    "Le confort tue les rêves.",
    "Fort dehors. Fort dedans.",
    "Le mental d'abord. Les muscles suivront.",
    "Chaque séance compte, même la petite.",
    "Le succès est la somme de petits efforts répétés.",
    "Ne te compare pas. Dépasse-toi.",
    "Ta transformation dépend de ta répétition.",
    "Ce que tu ne mesures pas, tu ne peux pas l'améliorer.",
    "Fais aujourd'hui ce que d'autres remettent à demain.",
    "Les records sont faits pour être battus. Le tien aussi.",
    "Sois exigeant sur tes habitudes, patient sur le résultat.",
  ],
};

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

export type MotivationSignals = {
  workoutDoneToday: boolean;
  streakDays: number;
  /** Today's overall score, 0-100. */
  score: number;
};

function pickContext(signals: MotivationSignals): MotivationContext {
  if (signals.workoutDoneToday) return "sessionDone";
  if (signals.streakDays >= 3) return "streak";
  if (signals.score >= 85 && signals.score < 100) return "goalClose";
  if (new Date().getHours() < 12) return "morning";
  return "default";
}

/** Pick today's motivation message, contextual to the day's progress. */
export function motivationMessage(signals: MotivationSignals): string {
  const context = pickContext(signals);
  const pool = POOLS[context];
  return pool[dayOfYear() % pool.length];
}
