import { useEffect, useState } from "react";
import { Image, ImageSourcePropType, LayoutChangeEvent } from "react-native";

/**
 * Mesure le ratio réel d'une image (locale `require()` ou distante `{uri}`)
 * et calcule la hauteur qu'un cadre `width:"100%"` doit prendre pour que ce
 * ratio soit respecté exactement (dans des bornes données), afin qu'un
 * `resizeMode="contain"` ne produise ni recadrage ni bande vide dans le cas
 * courant. Extrait de `ExerciseMediaFrame` pour être réutilisable dans un
 * contexte plus étroit (carte de grille) avec ses propres bornes.
 */
function resolveLocalRatio(source: ImageSourcePropType): number | null {
  try {
    const resolved = Image.resolveAssetSource(source as never);
    if (resolved?.width && resolved?.height) return resolved.width / resolved.height;
  } catch {
    // Source distante (`{uri}`) — résolue via Image.getSize à la place.
  }
  return null;
}

export function useDynamicMediaHeight(
  source: ImageSourcePropType | null,
  {
    minHeight,
    maxHeight,
    minRatio = 0.62,
    maxRatio = 1.9,
    defaultRatio = 1,
  }: { minHeight: number; maxHeight: number; minRatio?: number; maxRatio?: number; defaultRatio?: number },
): { height: number; onLayout: (e: LayoutChangeEvent) => void } {
  const [ratio, setRatio] = useState(defaultRatio);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!source) return;
    const uri = (source as { uri?: string })?.uri;
    if (uri) {
      let cancelled = false;
      Image.getSize(
        uri,
        (w, h) => {
          if (!cancelled && w > 0 && h > 0) setRatio(w / h);
        },
        () => {},
      );
      return () => {
        cancelled = true;
      };
    }
    const local = resolveLocalRatio(source);
    if (local) setRatio(local);
  }, [source]);

  const clampedRatio = Math.min(maxRatio, Math.max(minRatio, ratio));
  const height = width > 0 ? Math.min(maxHeight, Math.max(minHeight, width / clampedRatio)) : minHeight;

  return {
    height,
    onLayout: (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width),
  };
}
