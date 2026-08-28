import AsyncStorage from "@react-native-async-storage/async-storage";
import { RADIO_STATIONS } from "@/src/data/radio-stations";

/**
 * Quelles stations du catalogue (18, `radio-stations.ts`, tag `workout`
 * trié par popularité) apparaissent dans le menu radio principal — même
 * patron que `theme-settings.ts`/`app-settings.ts` (clé AsyncStorage
 * dédiée, lecture tolérante, jamais d'exception). Par défaut, les 10
 * stations les plus populaires (les premières du tableau, déjà trié par
 * `clickcount` décroissant) restent cochées ; les 8 restantes sont
 * disponibles en un tap depuis l'écran de gestion.
 */

const ENABLED_STATIONS_KEY = "@ironflow/radioEnabledStationUuids";

const DEFAULT_ENABLED_UUIDS: string[] = [
  "962f863e-0601-11e8-ae97-52543be04c81", // Radios 100FM
  "2c6e2132-2f82-11e9-8f31-52543be04c81", // FFH Workout
  "9615dd74-0601-11e8-ae97-52543be04c81", // Antenne Bayern - Workout Hits
  "877fb292-0e44-46a1-9673-5cac9ce60152", // WORKOUT by rautemusik
  "98d0e6a9-4919-11e8-b1b0-52543be04c81", // Sunshine Live - Workout
  "68bc1cdd-bc57-4a7c-9381-bc5374ab0881", // Hotmix Sport Workout
  "64a64fad-f583-4c5e-a725-68f84d90716d", // Mixadance FM Fitness
  "e6eb9cb5-c206-4e78-9b5e-5d10084363a7", // COOLFM Sportoláshoz
  "5700b31a-e01e-4dc8-8b33-438d1d77366d", // FMV FIT Radio High Energy
  "29c0dffe-f333-45f2-b5cb-fdcfd9d92093", // Radio ROKS (Moldova) - Workout
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
