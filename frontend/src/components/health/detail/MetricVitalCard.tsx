import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { RingColor } from "@/src/themes/types";
import GlassCard from "@/src/components/ui/GlassCard";
import AnimatedNumber from "@/src/components/ui/AnimatedNumber";
import InteractiveHealthChart from "@/src/components/health/InteractiveHealthChart";
import { DailyMetricPoint } from "@/src/utils/health-data-storage";

/**
 * Fiche premium pour les métriques "signe vital ponctuel" (VFC/FC repos/
 * Respiration) — pas d'objectif ni de barres (une seule mesure par jour, pas
 * une quantité qui s'accumule) : grande valeur du jour, Moyenne/Min/Max
 * réels, puis `InteractiveHealthChart` (déjà l'implémentation interactive
 * partagée — jamais un second graphique de ligne réécrit ici). `note`
 * optionnelle pour un repère contextuel (plage normale, comparaison
 * baseline) — jamais un diagnostic, un texte informatif court.
 */
export default function MetricVitalCard({
  icon,
  label,
  color,
  todayValue,
  average,
  best,
  worst,
  unit,
  formatValue,
  formatMainValue,
  loadSeries,
  note,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: RingColor;
  todayValue: number | null;
  average: number | null;
  best: number | null;
  worst: number | null;
  unit: string;
  formatValue: (v: number) => string;
  /** Nombre seul (sans unité) pour la grande valeur héro — voir
   * `MetricDetailScreen.tsx`. */
  formatMainValue: (v: number) => string;
  loadSeries: (days: number) => Promise<DailyMetricPoint[]>;
  note?: string | null;
}) {
  const { theme } = useTheme();
  const solid = Array.isArray(color) ? color[1] : color;
  const hasToday = todayValue != null;

  return (
    <GlassCard level="elevated" accent={solid} style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name={icon} size={14} color={solid} />
        <Text style={[styles.headerLabel, { color: solid }]}>{label.toUpperCase()}</Text>
      </View>

      <View style={styles.valueRow}>
        <AnimatedNumber
          value={hasToday ? todayValue! : 0}
          formatter={(v) => (hasToday ? formatMainValue(v) : "—")}
          style={[styles.value, { color: theme.colors.onSurface }]}
        />
        <Text style={[styles.unit, { color: theme.colors.onSurfaceTertiary }]}>{unit}</Text>
      </View>
      <Text style={[styles.todayCaption, { color: theme.colors.onSurfaceTertiary }]}>Aujourd&apos;hui</Text>

      {(average != null || best != null || worst != null) && (
        <View style={styles.statsRow}>
          <Stat label="Moyenne" value={average} formatValue={formatValue} color={theme.colors.onSurface} />
          <View style={[styles.sep, { backgroundColor: theme.colors.divider }]} />
          <Stat label="Minimum" value={worst} formatValue={formatValue} color={theme.colors.onSurface} />
          <View style={[styles.sep, { backgroundColor: theme.colors.divider }]} />
          <Stat label="Maximum" value={best} formatValue={formatValue} color={theme.colors.onSurface} />
        </View>
      )}

      {note && <Text style={[styles.note, { color: theme.colors.onSurfaceSecondary }]}>{note}</Text>}

      <View style={styles.chartWrap}>
        <InteractiveHealthChart
          color={color}
          loadSeries={loadSeries}
          indent={false}
          periods={["week", "30d", "6m", "1y"]}
          defaultPeriod="week"
          formatValue={formatValue}
        />
      </View>
    </GlassCard>
  );
}

function Stat({
  label,
  value,
  formatValue,
  color,
}: {
  label: string;
  value: number | null;
  formatValue: (v: number) => string;
  color: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value != null ? formatValue(value) : "—"}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.onSurfaceTertiary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  valueRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: spacing.xs },
  value: { fontSize: 44, fontWeight: "800", letterSpacing: -1 },
  unit: { fontSize: 14, fontWeight: "700", marginBottom: 8, textTransform: "lowercase" },
  todayCaption: { fontSize: 12, fontWeight: "600", marginTop: -6 },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 15, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "700" },
  sep: { width: 1, height: 28 },
  note: { fontSize: 11.5, fontWeight: "600", marginTop: spacing.xs, fontStyle: "italic" },
  chartWrap: { marginTop: spacing.md },
});
