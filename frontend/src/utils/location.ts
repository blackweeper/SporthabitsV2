import * as Location from "expo-location";

/**
 * Position de l'appareil, une seule fois (pas de suivi continu — inutile
 * pour une météo actuelle). Ne lève jamais : permission refusée, service
 * désactivé ou toute autre erreur retournent `null`, laissant l'appelant
 * (voir `WeatherChip.tsx`) afficher un état vide propre plutôt qu'un crash.
 */
export async function getDeviceLocationOnce(): Promise<{ lat: number; lon: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}
