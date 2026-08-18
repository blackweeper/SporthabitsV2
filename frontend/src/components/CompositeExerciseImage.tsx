import { useState } from "react";
import { View, Text, StyleSheet, Image, LayoutChangeEvent } from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import { matchExerciseRecord } from "@/src/utils/exercise-record-match";
import { cleanCompositeItemLabel } from "@/src/utils/composite-exercise";
import { CORE_LIBRARY_ASSETS } from "@/src/data/core-library-assets.generated";
import { useExerciseMedia } from "@/src/hooks/useExerciseMedia";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";

/** Une vignette carrée indépendante du montage — même priorité de résolution
 * que `ExerciseThumbnail` (bundled -> réseau -> emoji) et même langage
 * visuel (`resizeMode="contain"` + fond neutre, jamais de recadrage/
 * étirement) plutôt que l'ancien `cover` plein cadre qui déformait les
 * photos portrait dans un panneau large et court. Composant à part pour
 * respecter les règles des hooks dans un `.map()`. */
function CompositePanel({
  name,
  records,
  size,
  showCaption,
}: {
  name: string;
  records: ExerciseRecord[];
  size: number;
  showCaption: boolean;
}) {
  // Résolution sur le nom nettoyé (sans quantité/distance/charge — "250m
  // Rameur" -> "Rameur") : la quantité en tête ne matche jamais un nom de
  // bibliothèque, elle rendait toute résolution impossible.
  const cleanedName = cleanCompositeItemLabel(name);
  const record = matchExerciseRecord(cleanedName, records);
  const bundled = record?.id ? CORE_LIBRARY_ASSETS[record.id] : undefined;
  const { uri: networkUri } = useExerciseMedia(!bundled ? (record?.id ?? null) : null);
  const source = bundled ?? (networkUri ? { uri: networkUri } : null);

  return (
    <View style={{ width: size }}>
      <View style={[styles.panel, { width: size, height: size }]}>
        {source ? (
          <Image source={source} style={styles.panelImg} resizeMode="contain" />
        ) : (
          <View style={styles.panelFallback}>
            <Text style={{ fontSize: size * 0.4 }}>{iconEmojiForExercise(cleanedName, null)}</Text>
          </View>
        )}
      </View>
      {showCaption && (
        <Text style={styles.panelLabel} numberOfLines={1}>
          {name}
        </Text>
      )}
    </View>
  );
}

/**
 * Montage visuel d'une entrée d'exercice composite (AMRAP/EMOM/relais — voir
 * `parseCompositeExerciseName`) : une vignette carrée propre par mouvement,
 * séparées par un espacement régulier — plutôt que l'ancien montage "collé"
 * en un seul panneau large et court, qui forçait `resizeMode="cover"` à
 * rogner/étirer des photos portrait dans un cadre bien trop large pour leur
 * hauteur. Grille avec wrap — 3 vignettes max côte à côte puis passage à la
 * ligne suivante — pour rester lisible sur mobile même avec de nombreux
 * segments (WOD à 5-6 mouvements).
 *
 * `compact` (utilisé par le montage miniature de `ExerciseLiveOverlay`) :
 * vignettes de taille fixe et réduite, sans légende sous chacune (le nom de
 * l'exercice en cours est déjà affiché en grand juste au-dessus) — le
 * montage complet, lui, reste responsive (chaque vignette occupe 1/3 de la
 * largeur disponible) pour rester grand et net.
 */
export default function CompositeExerciseImage({
  items,
  records,
  showLabel = true,
  compact = false,
}: {
  items: string[];
  records: ExerciseRecord[];
  showLabel?: boolean;
  compact?: boolean;
}) {
  const columns = Math.min(3, items.length) || 1;
  const gap = compact ? spacing.xs : spacing.sm;
  // Largeur mesurée du cadre — nécessaire pour calculer une vignette
  // VRAIMENT carrée (les pourcentages CSS ignorent `gap` dans leur propre
  // calcul, ce qui ferait déborder ou re-wrapper prématurément une rangée de
  // 3 largeurs à 33,3% + espacements). Valeur de repli raisonnable
  // (largeur de contenu mobile typique) le temps du premier layout, pour
  // éviter un flash de vignettes à taille nulle — même discipline que
  // `useDynamicMediaHeight`.
  const [frameWidth, setFrameWidth] = useState(343);
  const panelSize = compact ? 48 : Math.max(0, (frameWidth - gap * (columns - 1)) / columns);
  const onLayout = compact ? undefined : (e: LayoutChangeEvent) => setFrameWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      {showLabel && <Text style={styles.label}>COMPOSÉ DE</Text>}
      <View style={[styles.frame, { gap }]} onLayout={onLayout}>
        {items.map((item, i) => (
          <CompositePanel
            key={`${item}-${i}`}
            name={item}
            records={records}
            size={panelSize}
            showCaption={!compact}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  frame: { flexDirection: "row", flexWrap: "wrap" },
  panel: {
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  panelImg: { width: "100%", height: "100%" },
  panelFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandTertiary,
  },
  panelLabel: {
    marginTop: 4,
    color: colors.onSurfaceSecondary,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
});
