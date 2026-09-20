import { Platform } from "react-native";

let cached: boolean | null = null;

/**
 * Le volume de lecture peut-il être réglé depuis l'app ?
 *
 * Sur iPhone/iPad (Safari et PWA), `HTMLMediaElement.volume` est en lecture
 * seule : Apple réserve le niveau sonore aux boutons physiques, l'écriture est
 * ignorée et la lecture renvoie toujours 1. On détecte ce comportement plutôt
 * que de deviner l'appareil via le user-agent. Sur les builds natifs
 * (`expo-audio`), le volume est toujours réglable.
 */
export function isVolumeAdjustable(): boolean {
  if (Platform.OS !== "web") return true;
  if (cached !== null) return cached;
  try {
    const probe = new Audio();
    probe.volume = 0.5;
    cached = probe.volume === 0.5;
  } catch {
    cached = false;
  }
  return cached;
}
