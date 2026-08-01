import { colors } from "@/src/theme";
import { Plan } from "@/src/utils/gym-storage";

/**
 * Couleur canonique par type de séance/programme — un seul point de vérité
 * pour que la même catégorie (cardio, hiit, mixte/WOD, mobilité) affiche
 * toujours la même teinte partout (training.tsx, programs.tsx,
 * custom-program/[id].tsx), au lieu d'un hex dupliqué à chaque écran.
 */
export const PLAN_TYPE_COLORS: Record<Plan["type"], string> = {
  musculation: colors.brand,
  cardio: "#00B0FF",
  hiit: colors.warning,
  mixte: "#E040FB",
  stretch: colors.success,
};
