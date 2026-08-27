import AsyncStorage from "@react-native-async-storage/async-storage";

/** Même patron que `app-settings.ts` — clé dédiée plutôt que d'étendre
 * `AppSettings`, pour garder le système de thèmes indépendant/déplaçable. */

export type ThemeId = "classic" | "sunset";

const THEME_KEY = "@ironflow/themeId";
const DEFAULT_THEME_ID: ThemeId = "classic";

export async function getThemeId(): Promise<ThemeId> {
  const raw = await AsyncStorage.getItem(THEME_KEY);
  return raw === "sunset" || raw === "classic" ? raw : DEFAULT_THEME_ID;
}

export async function saveThemeId(id: ThemeId): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, id);
}
