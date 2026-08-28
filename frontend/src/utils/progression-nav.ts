/** Onglets de Performance (anciennement "Évolution") — Score IronFlow/
 * Habitudes/Objectifs/Journal ont été retirés de cet écran (voir la refonte
 * "Performance" : le Score est supprimé de l'app, les Habitudes se gèrent
 * depuis le Dashboard, le Journal/les Rappels ont migré vers Réglages,
 * les Objectifs restent gérés depuis `/goals`). Records n'est plus un
 * onglet séparé — intégré dans Exercices. */
export type ProgressionTab = "exercises" | "level" | "defis";

export function progressionHref(tab: ProgressionTab): string {
  return `/progression?tab=${tab}`;
}
