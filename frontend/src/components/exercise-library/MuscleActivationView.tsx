import { View, Text, StyleSheet } from "react-native";
import { colors, radius } from "@/src/theme";
import { EXERCISE_MUSCLE_GROUP_LABEL, ExerciseMuscleGroup } from "@/src/utils/exercise-muscle-groups";

/**
 * Interim visualization for `ExerciseEnrichment.muscleActivation` — a ranked
 * bar per muscle group, colored by primary/secondary. Deliberately built as
 * its own component with a narrow, self-contained props contract (per-muscle
 * 0-100 scores) so a future real anatomical body-map/SVG illustration can
 * replace what's INSIDE this file without touching any caller — the fiche
 * just needs "here's the activation data", not "here's how to draw a body".
 */
export default function MuscleActivationView({
  primary,
  secondary,
  activationScore,
}: {
  primary?: ExerciseMuscleGroup[];
  secondary?: ExerciseMuscleGroup[];
  activationScore?: Partial<Record<ExerciseMuscleGroup, number>>;
}) {
  const primarySet = new Set(primary ?? []);
  const entries = Object.entries(activationScore ?? {}) as [ExerciseMuscleGroup, number][];
  if (entries.length === 0) return null;

  const sorted = entries.slice().sort((a, b) => b[1] - a[1]);

  return (
    <View style={styles.wrap}>
      {sorted.map(([muscle, score]) => {
        const isPrimary = primarySet.has(muscle);
        return (
          <View key={muscle} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {EXERCISE_MUSCLE_GROUP_LABEL[muscle] ?? muscle}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.max(0, Math.min(100, score))}%`,
                    backgroundColor: isPrimary ? colors.progress : colors.progressTertiary,
                  },
                ]}
              />
            </View>
            <Text style={styles.value}>{Math.round(score)}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { width: 88, color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700" },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill },
  value: { width: 32, textAlign: "right", color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "700" },
});
