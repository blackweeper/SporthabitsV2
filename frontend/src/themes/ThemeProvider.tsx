import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { THEMES } from "./registry";
import { Theme } from "./types";
import { getThemeId, saveThemeId, ThemeId } from "@/src/utils/theme-settings";
import { getActiveWallpaperId, getWallpaperImageUri } from "@/src/utils/wallpaper-storage";

type ThemeContextValue = {
  themeId: ThemeId;
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
  /** Image du fond d'écran personnalisé actif (thème Sunset), ou `null` si
   * aucun n'est choisi — `ThemedBackground` retombe alors sur le dégradé par
   * défaut du thème. */
  wallpaperUri: string | null;
  /** À appeler depuis Réglages après ajout/sélection/suppression d'un fond,
   * pour que le Dashboard reflète le changement immédiatement. */
  refreshWallpaper: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Monté une seule fois à la racine (`app/_layout.tsx`), autour de tout le
 * `<Stack>` — un Provider n'affecte que les écrans qui appellent
 * `useTheme()` (Dashboard/`/day-detail`/barre d'onglets à ce jour), donc
 * aucun risque pour les écrans non migrés.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>("classic");
  const [wallpaperUri, setWallpaperUri] = useState<string | null>(null);

  const refreshWallpaper = useCallback(() => {
    (async () => {
      const activeId = await getActiveWallpaperId();
      if (!activeId) {
        setWallpaperUri(null);
        return;
      }
      // `null` si le blob a disparu (suppression concurrente, etc.) —
      // `ThemedBackground` retombe alors proprement sur le dégradé par défaut.
      setWallpaperUri(await getWallpaperImageUri(activeId));
    })();
  }, []);

  useEffect(() => {
    getThemeId().then(setThemeIdState);
    refreshWallpaper();
  }, [refreshWallpaper]);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id); // re-rend instantané
    saveThemeId(id); // persistance, fire-and-forget — même discipline que saveAppSettings
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ themeId, theme: THEMES[themeId], setThemeId, wallpaperUri, refreshWallpaper }),
    [themeId, setThemeId, wallpaperUri, refreshWallpaper],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme() doit être appelé sous <ThemeProvider> (voir app/_layout.tsx).");
  }
  return ctx;
}
