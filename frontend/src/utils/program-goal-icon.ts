/**
 * Icône Ionicons associée à l'identité visuelle d'un programme — remplace
 * l'affichage brut de `Program.coverEmoji` (emoji libre choisi parmi
 * `COVER_EMOJIS`, `src/data/programs.ts`) par une icône cohérente avec le
 * reste du design system, même patron que `EXERCISE_CATEGORY_ICON`
 * (`src/utils/exercise-category.ts`). Le champ `coverEmoji` reste stocké
 * tel quel (compatibilité programmes existants) — seule sa RÉSOLUTION en
 * icône change ici.
 */
export const PROGRAM_ICON_BY_EMOJI: Record<string, any> = {
  "💪": "barbell-outline",
  "🔥": "flame-outline",
  "🏋️": "barbell",
  "⚡": "flash-outline",
  "🏃": "walk-outline",
  "🎯": "flag-outline",
  "🥊": "shield-outline",
  "🚴": "bicycle-outline",
  "🧘": "body-outline",
};

export const DEFAULT_PROGRAM_ICON = "barbell-outline";

export function programIconFor(emoji: string | null | undefined): any {
  return (emoji && PROGRAM_ICON_BY_EMOJI[emoji]) || DEFAULT_PROGRAM_ICON;
}
