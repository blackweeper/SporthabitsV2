/**
 * Regroupe les occurrences répétées d'un même exercice au sein d'une liste
 * (le format "round-robin réel" déjà établi pour les EMOM/tours — une
 * entrée par passage, ex. "Rameur, BikeErg, SkiErg, Tapis" répété 10 fois
 * pour un EMOM 40 — voir `starter-programs.ts`) en une seule entrée
 * visuelle par nom, avec un compteur d'occurrences. Purement pour
 * l'affichage en aperçu (cartes de jour) — ne touche jamais au modèle de
 * données ni au lancement réel de la séance, qui continue de recevoir la
 * liste complète, non groupée.
 */
export type GroupedExercise<T> = { exercise: T; count: number };

export function groupRoundRobinExercises<T extends { name: string }>(
  exercises: T[],
): GroupedExercise<T>[] {
  const groups: GroupedExercise<T>[] = [];
  const byName = new Map<string, GroupedExercise<T>>();
  for (const ex of exercises) {
    const existing = byName.get(ex.name);
    if (existing) {
      existing.count++;
      continue;
    }
    const group: GroupedExercise<T> = { exercise: ex, count: 1 };
    byName.set(ex.name, group);
    groups.push(group);
  }
  return groups;
}
