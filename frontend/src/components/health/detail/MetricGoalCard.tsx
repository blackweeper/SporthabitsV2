import { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-gifted-charts";
import { spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import AnimatedNumber from "@/src/components/ui/AnimatedNumber";
import { DailyMetricPoint } from "@/src/utils/health-data-storage";

function shortDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" }).slice(0, 1).toUpperCase();
}

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
    <View style={[styles.track, { backgroundColor: theme.colors.surfaceTertiary }]}>
      <Animated.View style={[styles.fill, style, { backgroundColor: color }]} />
    </View>
  );
}

/**
 * Fiche premium pour les métriques "objectif quotidien" (Pas/Distance/
 * Calories actives) — reprend la structure de la référence fournie (icône+
 * libellé, %, grande valeur, barre fine, "Objectif", MOYENNE, historique en
 * barres) avec l'identité IronFlow (`color` = accent de la métrique, jamais
 * l'orange de la référence). Toutes les valeurs viennent de
 * `computeMetricKpis`/`loadHealthMetricSeries` (aucune seconde source) ;
 * masquée section par section quand une donnée est absente.
 */
export default function MetricGoalCard({
  icon,
  label,
  color,
  todayValue,
  target,
  unit,
  formatValue,
  formatMainValue,
  average,
  best,
  history,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  todayValue: number | null;
  target: number;
  unit: string;
  formatValue: (v: number) => string;
  /** Nombre seul (sans unité) pour la grande valeur héro — voir
   * `MetricDetailScreen.tsx`. */
  formatMainValue: (v: number) => string;
  average: number | null;
  best: number | null;
  history: DailyMetricPoint[];
}) {
  const { theme } = useTheme();
  const hasToday = todayValue != null;
  const pct = hasToday ? Math.max(0, Math.min(1, todayValue! / target)) : 0;
  const pctLabel = hasToday ? `${Math.round(pct * 100)}%` : "—";
  const chartW = Dimensions.get("window").width - spacing.lg * 2 - spacing.lg * 2;

  return (
    <GlassCard level="elevated" accent={color} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name={icon} size={14} color={color} />
          <Text style={[styles.headerLabel, { color }]}>{label.toUpperCase()}</Text>
        </View>
        <Text style={[styles.headerPct, { color }]}>{pctLabel}</Text>
      </View>

      <View style={styles.valueRow}>
        <AnimatedNumber
          value={hasToday ? todayValue! : 0}
          formatter={(v) => (hasToday ? formatMainValue(v) : "—")}
          style={[styles.value, { color: theme.colors.onSurface }]}
        />
        <Text style={[styles.unit, { color: theme.colors.onSurfaceTertiary }]}>{unit}</Text>
      </View>

      <Bar pct={pct} color={color} />
      <Text style={[styles.goalCaption, { color: theme.colors.onSurfaceTertiary }]}>Objectif · {formatValue(target)}</Text>

      {average != null && (
        <View style={styles.averageBlock}>
          <Text style={[styles.averageLabel, { color: theme.colors.onSurfaceTertiary }]}>MOYENNE</Text>
          <Text style={[styles.averageValue, { color: theme.colors.onSurface }]}>{formatValue(average)}</Text>
          {best != null && (
            <Text style={[styles.bestCaption, { color: theme.colors.onSurfaceSecondary }]}>
              Meilleur jour · {formatValue(best)}
            </Text>
          )}
        </View>
      )}

      {history.length >= 2 && (
        <View style={styles.chartWrap}>
          <BarChart
            data={history.map((h) => ({ value: h.value, label: shortDay(h.date), frontColor: color }))}
            height={100}
            barWidth={18}
            spacing={Math.max(14, chartW / history.length - 30)}
            barBorderRadius={4}
            hideRules
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 9 }}
            noOfSections={3}
            isAnimated
          />
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  headerPct: { fontSize: 13, fontWeight: "800" },
  valueRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: spacing.xs },
  value: { fontSize: 44, fontWeight: "800", letterSpacing: -1 },
  unit: { fontSize: 14, fontWeight: "700", marginBottom: 8, textTransform: "lowercase" },
  track: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: spacing.sm },
  fill: { height: "100%", borderRadius: 3 },
  goalCaption: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  averageBlock: { marginTop: spacing.md, gap: 2 },
  averageLabel: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1 },
  averageValue: { fontSize: 22, fontWeight: "800" },
  bestCaption: { fontSize: 11.5, fontWeight: "600", marginTop: 2 },
  chartWrap: { marginTop: spacing.md },
});
