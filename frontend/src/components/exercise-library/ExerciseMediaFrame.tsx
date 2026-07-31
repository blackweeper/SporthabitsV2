import { useEffect, useState } from "react";
import { Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, withAlpha } from "@/src/theme";

/**
 * Cadre média à ratio dynamique — mesure la vraie dimension de l'image
 * (locale ou distante) et dimensionne le cadre pour correspondre exactement
 * à ce ratio (dans des bornes raisonnables), pour qu'un `resizeMode="contain"`
 * ne produise ni recadrage ni bande vide dans le cas courant. Les ratios
 * hors bornes (portrait/paysage extrême) restent en `contain` — jamais de
 * crop — avec un léger letterbox sur fond thème plutôt qu'un cadre cassé.
 *
 * Les appelants qui affichent plusieurs cadres côte à côte (illustration +
 * GIF) doivent leur passer les MÊMES `minHeight`/`maxHeight` : c'est ce qui
 * garantit un rendu harmonieux entre les deux médias (mêmes bornes de
 * clamp), pas un ratio identique forcé — deux images de ratio différent
 * gardent chacune leur taille naturelle, sans jamais se recadrer.
 */
const MIN_RATIO = 0.62;
const MAX_RATIO = 1.9;
const DEFAULT_RATIO = 1;

function resolveLocalRatio(source: ImageSourcePropType): number | null {
  try {
    const resolved = Image.resolveAssetSource(source as never);
    if (resolved?.width && resolved?.height) return resolved.width / resolved.height;
  } catch {
    // Remote-only source (`{uri}`) — resolved via Image.getSize instead.
  }
  return null;
}

export default function ExerciseMediaFrame({
  source,
  fallbackEmoji,
  fallbackTint,
  fallbackHint,
  minHeight = 200,
  maxHeight = 340,
  badgeIcon,
  badgeLabel,
  testID,
}: {
  source: ImageSourcePropType | null;
  fallbackEmoji?: string;
  fallbackTint?: string | null;
  fallbackHint?: string;
  minHeight?: number;
  maxHeight?: number;
  /** Small overlay pill (top-left) shown only when `source` actually
   * renders — e.g. distinguishing the GIF from the illustration without
   * spending a separate label row above the frame. */
  badgeIcon?: keyof typeof Ionicons.glyphMap;
  badgeLabel?: string;
  testID?: string;
}) {
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
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

  const clampedRatio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
  const height =
    width > 0 ? Math.min(maxHeight, Math.max(minHeight, width / clampedRatio)) : minHeight;

  return (
    <View
      testID={testID}
      style={[
        styles.frame,
        { height },
        !source && fallbackTint ? { backgroundColor: withAlpha(fallbackTint, 15) } : null,
      ]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {source ? (
        <>
          <Image source={source} style={styles.image} resizeMode="contain" />
          {badgeLabel && (
            <View style={styles.badge}>
              {badgeIcon && <Ionicons name={badgeIcon} size={11} color={colors.onSurface} />}
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackEmoji}>{fallbackEmoji ?? "🏋️"}</Text>
          {fallbackHint && <Text style={styles.fallbackHint}>{fallbackHint}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: withAlpha("#000000", 55),
  },
  badgeText: { color: colors.onSurface, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  fallback: { alignItems: "center", justifyContent: "center", gap: 8 },
  fallbackEmoji: { fontSize: 52 },
  fallbackHint: { color: colors.onSurfaceTertiary, fontSize: 11, fontStyle: "italic" },
});
