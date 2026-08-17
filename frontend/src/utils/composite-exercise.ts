/**
 * Détecte et décompose une entrée d'exercice "composite" — la convention
 * déjà établie dans `starter-programs.ts`/`wod-library.ts` pour les AMRAP/
 * EMOM/relais : un seul `Exercise` dont `name` encode tout le circuit en
 * texte, ex. `"AMRAP 13' : 200m course → 10 S.HSPU/HSPU → 10 pistols"`.
 * Cette fonction sert uniquement l'affichage (montrer les mouvements réels
 * plutôt qu'une phrase illisible) — elle ne touche jamais au modèle de
 * lancement de la séance : l'entrée reste un seul `Exercise`/
 * `SessionExerciseLog`, un seul jeu de séries, exactement comme avant.
 */
export function parseCompositeExerciseName(name: string): string[] | null {
  if (!name.includes("→")) return null;
  const segments = name
    .split("→")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length < 2) return null;

  // Le tout premier segment porte encore le préfixe ("AMRAP 13'", "EMOM
  // montant", "Relais Hyrox"...) suivi de " : " puis du premier mouvement —
  // seul segment à nettoyer, les suivants sont déjà de purs mouvements.
  const colonIdx = segments[0].indexOf(" : ");
  segments[0] = colonIdx >= 0 ? segments[0].slice(colonIdx + 3).trim() : segments[0];

  return segments.filter(Boolean);
}

/**
 * Nettoie un item de circuit ("250m Rameur", "15 Wall Balls (5kg)") pour la
 * RÉSOLUTION vers un `ExerciseRecord` — jamais pour l'affichage (le libellé
 * complet reste affiché tel quel, distance/charge comprises). Retire
 * uniquement : la quantité/distance en tête ("250m ", "15 ") et une
 * parenthèse de charge/équipement en fin ("(5kg)"). Purement syntaxique —
 * aucune tentative de correspondance approximative (cohérent avec la règle
 * déjà établie ailleurs : jamais de lien automatique incertain). Un item qui
 * ne matche toujours pas après ce nettoyage reste simplement en repli
 * emoji, comme avant.
 */
/**
 * Extrait le préfixe d'une entrée composite ("AMRAP 15 min", "EMOM montant",
 * "Relais Hyrox"...) — la portion avant le premier " : ", sans la liste des
 * mouvements. Sert de titre court pour le montage image (`CompositeExerciseImage`
 * utilisé en héros) plutôt que de répéter la phrase complète déjà lisible
 * dans les légendes de chaque panneau.
 */
export function parseCompositePrefix(name: string): string | null {
  if (!name.includes("→")) return null;
  const firstSeg = name.split("→")[0];
  const colonIdx = firstSeg.indexOf(" : ");
  if (colonIdx < 0) return null;
  return firstSeg.slice(0, colonIdx).trim();
}

export function cleanCompositeItemLabel(item: string): string {
  let s = item.trim();
  s = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  s = s.replace(/^\d+[a-zA-Zàéèê]*\s+/, "").trim();
  return s;
}
