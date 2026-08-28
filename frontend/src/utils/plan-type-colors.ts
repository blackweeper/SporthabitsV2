import { Plan } from "@/src/utils/gym-storage";
import { Theme } from "@/src/themes/types";

/**
 * Couleur canonique par type de séance/programme — un seul point de vérité
 * pour que la même catégorie (cardio, hiit, mixte/WOD, mobilité) affiche
 * toujours la même teinte partout (training.tsx, programs.tsx,
 * custom-program/[id].tsx), au lieu d'un hex dupliqué à chaque écran.
 *
 * Fonction du thème actif (plus une constante statique) : `musculation`/
 * `cardio`/`stretch` pointent vers les couleurs sémantiques de
 * `theme.colors.data` (Force/Cardio/Progression), qui changent selon le
 * thème (Classique reste `#FF3D00`/`#3B82F6`/`#00E676` — byte-identique à
 * avant ; Glacier Aurora devient Glacier Blue/Cyan/Vert) — sinon ces 3
 * catégories restaient figées sur les anciennes couleurs statiques quel que
 * soit le thème choisi. `hiit`/`mixte` gardent une teinte dédiée hors du set
 * de données (pas de catégorie `data` correspondante).
 */
export function getPlanTypeColors(theme: Theme): Record<Plan["type"], string> {
  return {
    musculation: theme.colors.data.strength,
    cardio: theme.colors.data.cardio,
    hiit: theme.colors.warning,
    mixte: "#E040FB",
    stretch: theme.colors.success,
  };
}
