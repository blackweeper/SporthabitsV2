// 30 messages de motivation. Sélection déterministe basée sur le jour de l'année.
export const MOTIVATION_QUOTES: string[] = [
  "Chaque rep te rapproche de la meilleure version de toi.",
  "La discipline bat la motivation.",
  "Ton seul concurrent : celui d'hier.",
  "L'excuse d'aujourd'hui = le regret de demain.",
  "Fais-le pour le toi de dans 6 mois.",
  "Le corps atteint ce que l'esprit croit.",
  "Ce qui te brûle t'endurcit.discipline.",
  "Les progrès invisibles construisent les résultats visibles.",
  "Un jour à la fois. Un rep à la fois.",
  "Sue aujourd'hui, brille demain.",
  "La constance transforme.",
  "Personne ne va soulever cette barre à ta place.",
  "L'entraînement est un investissement, pas une dépense.",
  "Le confort tue les rêves.",
  "Trust the process.",
  "Fort dehors. Fort dedans.",
  "Le mental d'abord. Les muscles suivront.",
  "Chaque séance compte, même la petite.",
  "Fatigué ? Vas-y quand même. Toujours.",
  "Les excuses sont pour ceux qui ne veulent pas.",
  "Le succès est la somme de petits efforts répétés.",
  "Ne te compare pas. Domine.",
  "Ta transformation dépend de ta répétition.",
  "Push. Even when you don't feel like it.",
  "Le silence de l'effort parle plus fort que les mots.",
  "Ce que tu ne mesures pas, tu ne peux pas améliorer.",
  "Ton corps est ton temple. Entretiens-le.",
  "Fais aujourd'hui ce que d'autres ne feront pas.",
  "Les records sont faits pour être battus. Le tien.",
  "Sois brutal avec toi-même sur les habitudes, doux sur le résultat.",
];

/** Pick a quote deterministically based on today's date. */
export function todayQuote(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return MOTIVATION_QUOTES[dayOfYear % MOTIVATION_QUOTES.length];
}
