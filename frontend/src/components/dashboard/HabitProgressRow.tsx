import { GestureResponderEvent, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Ligne compacte de progression (icône + libellé + barre + valeur/objectif),
 * même idiome visuel que `progMiniTrack`/`progMiniFill` déjà utilisé pour les
 * mini-cartes de programme du Dashboard — sur le modèle du widget hydratation
 * actuel (tap pour ouvrir le détail, "+" pour un ajout rapide) mais en liste,
 * pas en anneau. Utilisée pour l'Eau et toute habitude personnalisée.
 */
export default function HabitProgressRow({
  testID,
  icon,
  color,
  label,
  value,
  target,
  unit,
  onPress,
  onLongPress,
  onQuickAdd,
  quickAddIcon = "add",
  done = false,
  bare = false,
}: {
  testID?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: number;
  target: number;
  unit?: string;
  onPress: () => void;
  onLongPress?: () => void;
  onQuickAdd?: () => void;
  /** Icône du bouton d'action rapide — "add" (défaut, ex. Eau) ou "play"
   * (habitudes chronométrées : lance le minuteur associé à cette ligne,
   * même emplacement/style que le "+" pour un alignement garanti identique). */
  quickAddIcon?: keyof typeof Ionicons.glyphMap;
  done?: boolean;
  /** Rend une simple ligne sans son propre cadre/fond — pour un contexte où
   * cette rangée vit déjà à l'intérieur d'une autre carte (ex. le héros
   * Sunset) et ne doit pas dupliquer l'effet carte imbriquée dans une carte. */
  bare?: boolean;
}) {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(1, target > 0 ? value / target : 0));

  const handleQuickAdd = (e: GestureResponderEvent) => {
    e.stopPropagation?.();
    onQuickAdd?.();
  };

  const row = (
    <PressableScale
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      style={styles.rowInner}
    >
      <View style={[styles.iconChip, { backgroundColor: withAlpha(color, 18) }]}>
        <Ionicons name={done ? "checkmark" : icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.headLine}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.value, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
            {formatCompact(value)}
            {unit ? ` ${unit}` : ""}
            {target > 0 ? ` / ${formatCompact(target)}${unit ? ` ${unit}` : ""}` : ""}
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: theme.colors.surfaceTertiary }]}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
      {!done && onQuickAdd && (
        <PressableScale
          testID={testID ? `${testID}-quickadd` : undefined}
          style={[styles.quickAddBtn, { backgroundColor: color }]}
          onPress={handleQuickAdd}
          hitSlop={6}
        >
          <Ionicons name={quickAddIcon} size={14} color="#fff" />
        </PressableScale>
      )}
    </PressableScale>
  );

  if (bare) return row;
  return <GlassCard style={styles.row}>{row}</GlassCard>;
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  headLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  label: { flex: 1, fontWeight: "700", fontSize: 12 },
  value: { fontWeight: "700", fontSize: 11 },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 6,
  },
  fill: { height: "100%", borderRadius: 2 },
  quickAddBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
