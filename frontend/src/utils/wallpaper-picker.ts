import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { addWallpaper, WallpaperMeta } from "./wallpaper-storage";

// Plafond de largeur — un fond d'écran n'a jamais besoin d'être plus
// résolu que ça pour un plein écran de téléphone ; redimensionner avant
// encodage garde le stockage (IndexedDB/AsyncStorage) raisonnable même
// si l'utilisateur ajoute plusieurs photos haute résolution depuis sa
// pellicule.
const MAX_WIDTH = 1080;
const JPEG_QUALITY = 0.7;

/**
 * Ouvre le sélecteur d'images natif/navigateur, compresse et redimensionne
 * l'image choisie, puis l'enregistre via `addWallpaper`. Retourne `null` si
 * l'utilisateur annule ou refuse la permission — jamais d'exception qui
 * remonterait jusqu'à l'écran Réglages.
 */
export async function pickAndAddWallpaper(): Promise<WallpaperMeta | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const manipulated = await manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: JPEG_QUALITY, format: SaveFormat.JPEG, base64: true },
  );
  if (!manipulated.base64) return null;

  return addWallpaper(`data:image/jpeg;base64,${manipulated.base64}`);
}
