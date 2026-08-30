import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import { formatHealthMetricValue } from "@/src/utils/health-metric-config";

type Row = { key: "deep" | "rem" | "light" | "awake"; label: string; hours: number };

function Bar({ pct, color }: { pct: number; color: string }) {
  const { theme } = useTheme();
  const fill = useSharedValue(0);
  useEffect(() => {
    const cfg = theme.ringFill;
    fill.value =
      cfg.type === "spring"
        ? withSpring(pct, { damping: cfg.damping, stiffness: cfg.stiffness })
        : withTiming(pct, { duration: cfg.duration, easing: Easing.out(Easing.cubic) });
  }, [pct, theme.ringFill, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceTertiary }]}>
      <Animated.View style={[styles.barFill, style, { backgroundColor: color }]} />
    </View>
  );
}

/**
 * "RÉPARTITION" — quantités RÉELLES par phase (`sleepStageDetailFromRaw`),
 * jamais une position temporelle (voir `SleepStagesChart` pour la nuance :
 * Health Auto Export ne fournit que des totaux par nuit, pas d'épisodes
 * horodatés — cette carte est donc la représentation honnête de ce que les
 * données permettent). Masquée entièrement si aucune phase n'est disponible.
 */
export default function SleepDistribution({
  deepHours,
  remHours,
  lightHours,
  awakeHours,
}: {
  deepHours: number | null;
  remHours: number | null;
  lightHours: number | null;
  awakeHours: number | null;
}) {
  const { theme } = useTheme();
  const allRows: Row[] = [
    { key: "deep", label: "Sommeil profond", hours: deepHours ?? -1 },
    { key: "rem", label: "Sommeil REM", hours: remHours ?? -1 },
    { key: "light", label: "Sommeil léger", hours: lightHours ?? -1 },
    { key: "awake", label: "Éveillé", hours: awakeHours ?? -1 },
  ];
  const rows = allRows.filter((r) => r.hours >= 0);

  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.hours, 0);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>RÉPARTITION</Text>
      <GlassCard level="card" style={styles.card}>
        {rows.map((r, i) => {
          const color = theme.colors.sleepStages[r.key];
          const pct = total > 0 ? (r.hours / total) * 100 : 0;
          return (
            <View
              key={r.key}
              style={[styles.row, i > 0 && { borderTopColor: theme.colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}
            >
              <View style={styles.rowHead}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {r.label}
                </Text>
                <Text style={[styles.rowValue, { color: theme.colors.onSurfaceSecondary }]}>
                  {formatHealthMetricValue("sleep", r.hours)}
                </Text>
                <Text style={[styles.rowPct, { color: theme.colors.onSurfaceTertiary }]}>{Math.round(pct)}%</Text>
              </View>
              <Bar pct={pct / 100} color={color} />
            </View>
          );
        })}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  card: { padding: spacing.md, gap: spacing.md },
  row: { gap: 7, paddingTop: spacing.sm, paddingBottom: 2 },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: "700" },
  rowValue: { fontSize: 12.5, fontWeight: "700" },
  rowPct: { fontSize: 11, fontWeight: "700", minWidth: 32, textAlign: "right" },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
});
