import { ScrollView, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { LIBRARY_MUSCLE_GROUPS, MuscleGroupKey } from "@/src/utils/muscle-groups";
import PressableScale from "@/src/components/ui/PressableScale";

export type LibTab = "favorites" | "musculation" | "cardio_machine" | "mobility" | "all";

export const LIB_TABS: { key: LibTab; label: string; emoji: string }[] = [
  { key: "favorites", label: "Favoris", emoji: "⭐" },
  { key: "musculation", label: "Musculation", emoji: "💪" },
  { key: "cardio_machine", label: "Cardio", emoji: "🏃" },
  { key: "mobility", label: "Étirements", emoji: "🧘" },
  { key: "all", label: "Tous", emoji: "📋" },
];

/** Category tab row (Favoris/Musculation/Cardio/Étirements/Tous) — shared by
 * the exercise-picker modal and the Bibliothèque tab. */
export function CategoryTabRow({
  tab,
  onChange,
  testIDPrefix = "ex-library-tab",
}: {
  tab: LibTab;
  onChange: (t: LibTab) => void;
  testIDPrefix?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ maxHeight: 42 }}
      contentContainerStyle={styles.row}
    >
      {LIB_TABS.map((t) => {
        const active = tab === t.key;
        return (
          <PressableScale
            key={t.key}
            testID={`${testIDPrefix}-${t.key}`}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(t.key)}
          >
            <Text style={styles.emoji}>{t.emoji}</Text>
            <Text style={[styles.chipText, active && { color: "#fff" }]}>{t.label}</Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

/** Muscle-group chip row (only meaningful for the Musculation category). */
export function MuscleChipRow({
  muscle,
  onChange,
  testIDPrefix = "ex-library-muscle",
}: {
  muscle: MuscleGroupKey | null;
  onChange: (m: MuscleGroupKey | null) => void;
  testIDPrefix?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ maxHeight: 38 }}
      contentContainerStyle={styles.row}
    >
      <PressableScale
        testID={`${testIDPrefix}-all`}
        style={[styles.miniChip, !muscle && styles.chipActive]}
        onPress={() => onChange(null)}
      >
        <Text style={[styles.miniChipText, !muscle && { color: "#fff" }]}>Tous</Text>
      </PressableScale>
      {LIBRARY_MUSCLE_GROUPS.map((mg) => {
        const active = muscle === mg.key;
        return (
          <PressableScale
            key={mg.key}
            testID={`${testIDPrefix}-${mg.key}`}
            style={[styles.miniChip, active && styles.chipActive]}
            onPress={() => onChange(active ? null : mg.key)}
          >
            <Text style={styles.emoji}>{mg.emoji}</Text>
            <Text style={[styles.miniChipText, active && { color: "#fff" }]}>{mg.label}</Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

/** Equipment chip row — only rendered when the caller has at least one
 * distinct equipment value to filter on (today: from custom exercises only,
 * since the static library and WorkoutX import don't provide it yet in this
 * phase). Kept as its own component so the Bibliothèque tab's "structure
 * finale" (catégorie / muscle / équipement combinables) is already in place. */
export function EquipmentChipRow({
  equipment,
  options,
  onChange,
  testIDPrefix = "ex-library-equipment",
}: {
  equipment: string | null;
  options: string[];
  onChange: (e: string | null) => void;
  testIDPrefix?: string;
}) {
  if (options.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ maxHeight: 38 }}
      contentContainerStyle={styles.row}
    >
      <PressableScale
        testID={`${testIDPrefix}-all`}
        style={[styles.miniChip, !equipment && styles.chipActive]}
        onPress={() => onChange(null)}
      >
        <Text style={[styles.miniChipText, !equipment && { color: "#fff" }]}>
          Tout matériel
        </Text>
      </PressableScale>
      {options.map((eq) => {
        const active = equipment === eq;
        return (
          <PressableScale
            key={eq}
            testID={`${testIDPrefix}-${eq}`}
            style={[styles.miniChip, active && styles.chipActive]}
            onPress={() => onChange(active ? null : eq)}
          >
            <Text style={[styles.miniChipText, active && { color: "#fff" }]}>{eq}</Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  emoji: { fontSize: 12 },
  chipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  miniChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniChipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
    fontSize: 10,
  },
});
