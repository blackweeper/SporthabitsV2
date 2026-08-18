import { View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, withAlpha } from "@/src/theme";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import { matchExerciseRecord } from "@/src/utils/exercise-record-match";
import { cleanCompositeItemLabel } from "@/src/utils/composite-exercise";
import { CORE_LIBRARY_ASSETS } from "@/src/data/core-library-assets.generated";
import { useExerciseMedia } from "@/src/hooks/useExerciseMedia";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";

/** Un panneau du montage — résout sa propre image (même priorité que
 * `ExerciseThumbnail` : bundled -> réseau -> emoji) mais remplit tout
 * l'espace disponible (`resizeMode="cover"`) au lieu d'une vignette carrée,
 * pour fusionner visuellement avec ses voisins. Composant à part pour
 * respecter les règles des hooks dans un `.map()` (même discipline que
 * `ExerciseThumbnail`/`PickerRowImage`). */
function CompositePanel({
  name,
  records,
  widthPct,
  rowHeight,
  showRightBorder,
  showBottomBorder,
}: {
  name: string;
  records: ExerciseRecord[];
  widthPct: number;
  rowHeight: number;
  showRightBorder: boolean;
  showBottomBorder: boolean;
}) {
  // Résolution sur le nom nettoyé (sans quantité/distance/charge — "250m
  // Rameur" -> "Rameur") : la quantité en tête ne matche jamais un nom de
  // bibliothèque, elle rendait toute résolution impossible. Le libellé
  // affiché (`name`, ci-dessous) reste inchangé, complet.
  const cleanedName = cleanCompositeItemLabel(name);
  const record = matchExerciseRecord(cleanedName, records);
  const bundled = record?.id ? CORE_LIBRARY_ASSETS[record.id] : undefined;
  const { uri: networkUri } = useExerciseMedia(!bundled ? (record?.id ?? null) : null);
  const source = bundled ?? (networkUri ? { uri: networkUri } : null);

  return (
    <View
      style={[
        styles.panel,
        { width: `${widthPct}%`, height: rowHeight },
        showRightBorder && styles.panelDividerRight,
        showBottomBorder && styles.panelDividerBottom,
      ]}
    >
      {source ? (
        <Image source={source} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.panelFallback]}>
          <Text style={styles.panelEmoji}>{iconEmojiForExercise(cleanedName, null)}</Text>
        </View>
      )}
      <LinearGradient
        colors={["transparent", withAlpha("#000000", 85)]}
        style={styles.panelGradient}
        pointerEvents="none"
      />
      <Text style={styles.panelLabel} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

/**
 * Montage visuel d'une entrée d'exercice composite (AMRAP/EMOM/relais — voir
 * `parseCompositeExerciseName`) : une seule image, découpée en autant de
 * panneaux que de mouvements réels du circuit, chacun collé à son voisin
 * (pas de vignettes séparées). Grille avec wrap — 3 panneaux max côte à côte
 * puis passage à la ligne suivante — pour rester lisible sur mobile même
 * avec de nombreux segments (WOD à 5-6 mouvements) : au-delà de 3, un
 * `flex:1` sans limite écrasait chaque panneau en bande verticale illisible.
 * `height` désigne désormais la hauteur d'UNE ligne (le montage grandit
 * naturellement avec le nombre de lignes), pas la hauteur totale figée.
 */
export default function CompositeExerciseImage({
  items,
  records,
  height = 100,
  showLabel = true,
}: {
  items: string[];
  records: ExerciseRecord[];
  height?: number;
  showLabel?: boolean;
}) {
  const columns = Math.min(3, items.length) || 1;
  const totalRows = Math.ceil(items.length / columns);
  return (
    <View style={styles.wrap}>
      {showLabel && <Text style={styles.label}>COMPOSÉ DE</Text>}
      <View style={styles.frame}>
        {items.map((item, i) => {
          const rowIndex = Math.floor(i / columns);
          const isRowEnd = (i + 1) % columns === 0 || i === items.length - 1;
          const isLastRow = rowIndex === totalRows - 1;
          return (
            <CompositePanel
              key={`${item}-${i}`}
              name={item}
              records={records}
              widthPct={100 / columns}
              rowHeight={height}
              showRightBorder={!isRowEnd}
              showBottomBorder={!isLastRow}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  frame: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  panel: { position: "relative" },
  panelDividerRight: { borderRightWidth: 1, borderRightColor: withAlpha("#000000", 30) },
  panelDividerBottom: { borderBottomWidth: 1, borderBottomColor: withAlpha("#000000", 30) },
  panelFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  panelEmoji: { fontSize: 26 },
  panelGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" },
  panelLabel: {
    position: "absolute",
    left: 4,
    right: 4,
    bottom: 4,
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
});
