// Messages de motivation contextuels — pas d'IA. Chaque contexte a son pool ;
// un message est tiré vraiment au hasard dedans, en évitant de répéter l'un
// des `MAX_HISTORY` derniers déjà affichés (voir `motivation-history.ts`).
// Remplace l'ancienne sélection déterministe par jour de l'année (aucune
// vraie aléatoire, aucun anti-répétition au-delà de la taille du pool).

import { getRecentMotivationKeys, recordMotivationShown } from "@/src/utils/motivation-history";

export type MotivationContext =
  | "sessionDone"
  | "streak"
  | "goalClose"
  | "recovery"
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
    "Tu as tenu ta promesse du jour. Ça compte plus que tu ne le penses.",
    "Le plus dur, c'était de commencer. C'est fait.",
    "Encore une victoire discrète que personne ne verra sauf toi.",
    "Ton corps a bougé aujourd'hui. Ton esprit aussi.",
    "Une case cochée, une preuve de plus que tu tiens le cap.",
    "Ce n'était pas obligatoire. Tu l'as fait quand même.",
    "Bravo. Le futur toi te dit merci en silence.",
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
    "Chaque jour ajouté rend la chaîne plus difficile à casser.",
    "Tu ne comptes plus les jours, tu construis une habitude.",
    "Ce streak est la preuve vivante de ta discipline.",
    "Un jour de plus, une version de toi un peu plus solide.",
    "Ta régularité impressionne — continue de l'écrire.",
    "Le streak ne ment jamais sur ton sérieux.",
    "Chaque jour gagné est un jour que tu ne referas jamais deux fois.",
  ],
  // Shown when today's score is close to a great day (85%+ but not maxed).
  goalClose: [
    "Tu y es presque. Un petit effort de plus aujourd'hui.",
    "Si proche du sans-faute. Termine en beauté.",
    "Encore un geste et la journée est parfaite.",
    "Le dernier pourcent est souvent le plus satisfaisant.",
    "Tu touches au but. Ne t'arrête pas maintenant.",
    "Presque au sommet de ta journée. Vas-y.",
    "Il ne manque presque rien. Va chercher ce dernier morceau.",
    "Ta journée est à un cheveu de l'excellence.",
    "Ne laisse pas filer une journée aussi proche du sans-faute.",
    "Le dernier geste compte double aujourd'hui.",
    "Tu as fait l'essentiel. Reste un détail à sceller.",
    "Une journée presque parfaite mérite d'être terminée en beauté.",
  ],
  // Shown when sleep was short — recovery tone instead of performance push.
  recovery: [
    "Une nuit courte n'efface pas tes efforts — aujourd'hui, écoute ton corps.",
    "Récupérer, c'est aussi progresser. Vas-y en douceur aujourd'hui.",
    "Ton corps a besoin d'un jour plus calme. Ce n'est pas un échec.",
    "Moins d'intensité aujourd'hui, plus de constance demain.",
    "Le repos actif compte aussi comme un entraînement.",
    "Une bonne récupération d'aujourd'hui, c'est une bonne séance de demain.",
    "Ralentir un jour n'arrête pas ta progression.",
    "Ton corps te parle. Aujourd'hui, écoute-le.",
    "La régénération fait partie du plan, pas une pause dedans.",
    "Un jour plus léger n'est jamais un jour perdu.",
    "Respecte ta fatigue — la vraie force sait aussi attendre.",
    "Se ménager aujourd'hui, c'est mieux performer après-demain.",
    "Le sommeil a manqué — donne à ton corps la chance de le compenser.",
    "Une séance douce vaut mieux qu'une séance forcée.",
    "La progression n'est pas linéaire — aujourd'hui est un jour de récupération, pas de recul.",
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
    "Le silence du matin est le meilleur moment pour agir.",
    "Personne ne te regarde encore. C'est le moment idéal.",
    "Une bonne journée commence souvent par une petite décision.",
    "Le reste de la journée suivra ce que tu fais maintenant.",
    "Avant que le monde ne s'active, prends ton avance.",
    "Le matin appartient à ceux qui décident d'agir tôt.",
    "Une seule action ce matin peut changer le ton de toute la journée.",
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
    "Ce que tu fais aujourd'hui compte, même sans témoin.",
    "Petit pas, grande direction.",
    "Ton avenir se construit une décision à la fois.",
    "L'effort d'aujourd'hui est invisible avant de devenir évident.",
    "Fais ce que tu peux, avec ce que tu as, là où tu es.",
    "La discipline est une forme de liberté.",
    "Ce n'est pas magique. C'est répétitif. Et ça marche.",
    "Chaque jour est une nouvelle chance de tenir parole envers toi-même.",
  ],
};

export type MotivationSignals = {
  workoutDoneToday: boolean;
  streakDays: number;
  /** Pourcentage de complétion des anneaux du jour (calories brûlées/pas/
   * entraînement/sommeil, moyenne simple — voir `daily-aggregate-score.ts`),
   * 0-100. Remplace l'ancien "score IronFlow" retiré de l'app : ce n'est pas
   * un score, juste une lecture de la progression déjà affichée dans le
   * héros du Dashboard, réutilisée ici pour le seul cas "journée presque
   * parfaite". */
  dayCompletionPct: number;
  /** Nuit de sommeil courte détectée (import santé) — privilégie un ton
   * récupération plutôt que performance. Absent/`false` = signal ignoré. */
  shortSleep?: boolean;
};

function pickContext(signals: MotivationSignals): MotivationContext {
  if (signals.shortSleep && !signals.workoutDoneToday) return "recovery";
  if (signals.workoutDoneToday) return "sessionDone";
  if (signals.streakDays >= 3) return "streak";
  if (signals.dayCompletionPct >= 85 && signals.dayCompletionPct < 100) return "goalClose";
  if (new Date().getHours() < 12) return "morning";
  return "default";
}

/**
 * Choisit un message de motivation contextuel, vraiment aléatoire, en
 * évitant si possible les `MAX_HISTORY` derniers déjà affichés (n'importe
 * quel contexte confondu — voir `motivation-history.ts`). Asynchrone à
 * cause de cet historique persistant en `AsyncStorage`.
 */
export async function motivationMessage(signals: MotivationSignals): Promise<string> {
  const context = pickContext(signals);
  const pool = POOLS[context];
  const recent = new Set(await getRecentMotivationKeys());
  const candidates = pool.filter((m) => !recent.has(m));
  // Si tout le pool de ce contexte a déjà été vu récemment (petit pool,
  // contexte peu fréquent), on autorise à nouveau plutôt que de bloquer.
  const pickFrom = candidates.length > 0 ? candidates : pool;
  const message = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  await recordMotivationShown(message);
  return message;
}
