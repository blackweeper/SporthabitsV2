import { classicTheme } from "./classic";
import { sunsetTheme } from "./sunset";
import { Theme } from "./types";
import { ThemeId } from "@/src/utils/theme-settings";

/** Registre des thèmes disponibles — ajouter un 3e thème = un nouveau
 * fichier `src/themes/xxx.ts` exportant un `Theme` + une entrée ici. */
export const THEMES: Record<ThemeId, Theme> = {
  classic: classicTheme,
  sunset: sunsetTheme,
};

export const THEME_LIST: Theme[] = Object.values(THEMES);
