import { ImageSourcePropType, StyleSheet, Text, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { useDynamicMediaHeight } from "@/src/hooks/useDynamicMediaHeight";

/**
 * Cadre média à ratio dynamique — mesure la vraie dimension de l'image
 * (locale ou distante) et dimensionne le cadre pour correspondre exactement
 * à ce ratio (dans des bornes raisonnables), pour qu'un `resizeMode="contain"`
 * ne produise ni recadrage ni bande vide dans le cas courant. Les ratios
 * hors bornes (portrait/paysage extrême) restent en `contain` — jamais de
 * crop — avec un léger letterbox sur fond thème plutôt qu'un cadre cassé.
 * La mesure/clamp elle-même vit dans `useDynamicMediaHeight` (partagée avec
 * `ExerciseCard` pour la grille Bibliothèque) — ce composant ne fait plus
 * qu'habiller ce calcul avec sa propre présentation (badge overlay, repli
 * emoji pleine taille) taillée pour la fiche exercice.
 *
 * Les appelants qui affichent plusieurs cadres côte à côte (illustration +
 * GIF) doivent leur passer les MÊMES `minHeight`/`maxHeight` : c'est ce qui
 * garantit un rendu harmonieux entre les deux médias (mêmes bornes de
 * clamp), pas un ratio identique forcé — deux images de ratio différent
 * gardent chacune leur taille naturelle, sans jamais se recadrer.
 */
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
  const { theme } = useTheme();
  const { height, onLayout } = useDynamicMediaHeight(source, { minHeight, maxHeight });

  return (
    <View
      testID={testID}
      style={[
        styles.frame,
        { height, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceTertiary },
        // Les photos d'exercice sont toutes sur fond blanc — quand
        // `resizeMode="contain"` laisse des bandes de remplissage
        // (letterboxing) autour d'une image qui ne couvre pas tout le
        // cadre, ces bandes doivent être blanches (comme la photo elle-même)
        // plutôt que la surface sombre du thème, sinon des liserés sombres
        // tranchent visiblement avec le fond blanc de la photo.
        source ? { backgroundColor: "#FFFFFF" } : null,
        !source && fallbackTint ? { backgroundColor: withAlpha(fallbackTint, 15) } : null,
      ]}
      onLayout={onLayout}
    >
      {source ? (
        <>
          <Image source={source} style={styles.image} resizeMode="contain" />
          {badgeLabel && (
            <View style={[styles.badge, { borderRadius: theme.radius.pill }]}>
              {badgeIcon && <Ionicons name={badgeIcon} size={11} color={theme.colors.onSurface} />}
              <Text style={[styles.badgeText, { color: theme.colors.onSurface }]}>{badgeLabel}</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackEmoji}>{fallbackEmoji ?? "🏋️"}</Text>
          {fallbackHint && (
            <Text style={[styles.fallbackHint, { color: theme.colors.onSurfaceTertiary }]}>{fallbackHint}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
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
    backgroundColor: withAlpha("#000000", 55),
  },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  fallback: { alignItems: "center", justifyContent: "center", gap: 8 },
  fallbackEmoji: { fontSize: 52 },
  fallbackHint: { fontSize: 11, fontStyle: "italic" },
});
