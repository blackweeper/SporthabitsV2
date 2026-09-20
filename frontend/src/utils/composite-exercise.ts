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
// Quantité en tête d'un segment : "15", "250m", "20 cal", "10+ cal", "30/20 cal",
// "1 min", "5-10-15-20-25 cal" (échelle). L'unité collée ("250m") ou séparée
// ("cal", "min", "sec") fait partie de la quantité, jamais du nom du mouvement —
// avant, "20 cal Rameur" donnait un mouvement "cal Rameur" introuvable dans la
// bibliothèque. Doit rester alignée sur `scripts/lib/wod-normalize.js` (QTY).
const NUM = "\\d+(?:[.,]\\d+)?";
const QUANTITY = `${NUM}(?:[-–/+]${NUM})*\\+?[a-zA-Zàéèê]*(?:\\s+(?:cal|min|sec)\\b)?`;
const QUANTITY_PREFIX = new RegExp(`^${QUANTITY}\\s+`, "i");
const QUANTITY_SPLIT = new RegExp(`^(${QUANTITY})\\s+(.+)$`, "i");
// "(20/14 lb)", "(24/16 kg)", "(2x24/12 kg)", "(2/1.5 pood)", "(36/30 in)".
const LOAD_SPEC_PAREN = new RegExp(`\\(\\s*(?:\\d+\\s*x\\s*)?${NUM}(?:\\s*/\\s*${NUM})?\\s*(?:lbs?|kg|pood|in)\\s*\\)`, "gi");

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
  // Charge/hauteur de boîte au milieu du segment ("15 (20/14 lb) Wall Balls") —
  // ne concerne que les données antérieures à la normalisation des WODs (voir
  // `scripts/lib/wod-normalize.js`) et les circuits créés à la main.
  s = s.replace(LOAD_SPEC_PAREN, " ").replace(/\s{2,}/g, " ").trim();
  s = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  s = s.replace(QUANTITY_PREFIX, "").trim();
  s = s.replace(/^max\s+/i, "").trim();
  return s;
}

/**
 * Sépare la quantité en tête d'un segment composite ("5 Traction" → reps
 * "5", nom "Traction") de son nom de mouvement — pour reconstruire des
 * cartes d'édition (`CircuitCardListEditor`) où la quantité doit vivre dans
 * son propre champ "Reps / consigne", jamais concaténée au nom affiché
 * (sinon un lien bibliothèque écrase le nom entier et perd la quantité).
 * Même regex que `cleanCompositeItemLabel`, mais la quantité capturée est
 * conservée au lieu d'être jetée. Segment sans quantité en tête ("Squats
 * sans poids") → reps vide, nom inchangé.
 */
export function splitCompositeItemQuantity(item: string): { reps: string; name: string } {
  const trimmed = item.trim();
  const match = trimmed.match(QUANTITY_SPLIT);
  if (match) {
    return { reps: match[1], name: match[2].trim() };
  }
  return { reps: "", name: trimmed };
}
