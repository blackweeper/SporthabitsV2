import AsyncStorage from "@react-native-async-storage/async-storage";
import { RADIO_STATIONS } from "@/src/data/radio-stations";

/**
 * Quelles stations du catalogue (~30, `radio-stations.ts`) apparaissent dans
 * le menu radio principal — même patron que `theme-settings.ts`/
 * `app-settings.ts` (clé AsyncStorage dédiée, lecture tolérante, jamais
 * d'exception). Par défaut, les 7 stations d'origine (déjà les plus
 * éprouvées) restent cochées — un install existant ne voit donc aucun
 * changement tant que l'utilisateur ne va pas explicitement gérer sa
 * sélection.
 */

const ENABLED_STATIONS_KEY = "@ironflow/radioEnabledStationUuids";

const DEFAULT_ENABLED_UUIDS: string[] = [
  "962cc6df-0601-11e8-ae97-52543be04c81", // Dance Wave!
  "64a64fad-f583-4c5e-a725-68f84d90716d", // Mixadance FM Fitness
  "877fb292-0e44-46a1-9673-5cac9ce60152", // WORKOUT by rautemusik
  "961787d1-0601-11e8-ae97-52543be04c81", // Frisky
  "960e4940-0601-11e8-ae97-52543be04c81", // Ibiza Global Radio
  "962a748b-0601-11e8-ae97-52543be04c81", // 1.FM Deep House Radio
  "9615dd74-0601-11e8-ae97-52543be04c81", // Antenne Bayern - Workout Hits
];

export async function getEnabledStationUuids(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(ENABLED_STATIONS_KEY);
  if (!raw) return DEFAULT_ENABLED_UUIDS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ENABLED_UUIDS;
    // Filtre toute entrée qui ne correspond plus à une station réelle du
    // catalogue (ex. après une mise à jour de l'app qui en retire une) —
    // jamais un uuid fantôme silencieusement conservé.
    const validUuids = new Set(RADIO_STATIONS.map((s) => s.stationuuid));
    return parsed.filter((id): id is string => typeof id === "string" && validUuids.has(id));
  } catch {
    return DEFAULT_ENABLED_UUIDS;
  }
}

export async function setEnabledStationUuids(uuids: string[]): Promise<void> {
  await AsyncStorage.setItem(ENABLED_STATIONS_KEY, JSON.stringify(uuids));
}

export async function toggleStationEnabled(uuid: string, enabled: boolean): Promise<string[]> {
  const current = await getEnabledStationUuids();
  const next = enabled ? Array.from(new Set([...current, uuid])) : current.filter((id) => id !== uuid);
  await setEnabledStationUuids(next);
  return next;
}
