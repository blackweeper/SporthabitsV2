import AsyncStorage from "@react-native-async-storage/async-storage";
import { bigStoreGet, bigStoreRemove, bigStoreSet } from "./big-kv-store";
import { uid } from "./gym-storage";

/**
 * Fonds d'écran personnalisés (thème Sunset) — même séparation "petit index
 * + gros blobs" que `exercise-media-cache.ts` : l'index (liste d'id +
 * fond actif) est minuscule et vit dans `AsyncStorage`, chaque image (une
 * chaîne `data:` base64, potentiellement plusieurs centaines de Ko même
 * compressée) vit dans `bigStoreGet`/`bigStoreSet` (IndexedDB sur web —
 * évite le plafond ~5 Mo de `localStorage`, voir `big-kv-store.ts`) pour ne
 * jamais saturer le quota avec plusieurs fonds ajoutés. N'écrit/ne relit
 * jamais TOUTES les images d'un coup — seule l'image concernée par
 * l'opération (ajout/suppression/lecture de l'actif) est chargée.
 */

export type WallpaperMeta = { id: string; createdAt: string };

const INDEX_KEY = "@ironflow/wallpapers/index";
const ACTIVE_KEY = "@ironflow/wallpapers/activeId";
const blobKey = (id: string) => `@ironflow/wallpapers/blob/${id}`;

export async function getWallpaperList(): Promise<WallpaperMeta[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function getActiveWallpaperId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_KEY);
}

export async function setActiveWallpaperId(id: string | null): Promise<void> {
  if (id) await AsyncStorage.setItem(ACTIVE_KEY, id);
  else await AsyncStorage.removeItem(ACTIVE_KEY);
}

/** Retourne l'image (chaîne `data:image/...;base64,...` prête pour `<Image
 * source={{uri}}>`) d'un fond par son id, ou `null` s'il n'existe plus. */
export async function getWallpaperImageUri(id: string): Promise<string | null> {
  return bigStoreGet(blobKey(id));
}

/** Enregistre une nouvelle image déjà compressée/encodée par l'appelant
 * (voir `wallpaper-picker.ts`) et l'ajoute à l'index. Ne la sélectionne PAS
 * automatiquement comme fond actif — l'appelant décide. */
export async function addWallpaper(dataUri: string): Promise<WallpaperMeta> {
  const meta: WallpaperMeta = { id: uid(), createdAt: new Date().toISOString() };
  await bigStoreSet(blobKey(meta.id), dataUri);
  const list = await getWallpaperList();
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify([...list, meta]));
  return meta;
}

export async function removeWallpaper(id: string): Promise<void> {
  await bigStoreRemove(blobKey(id));
  const list = (await getWallpaperList()).filter((w) => w.id !== id);
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(list));
  const activeId = await getActiveWallpaperId();
  if (activeId === id) await setActiveWallpaperId(null);
}
