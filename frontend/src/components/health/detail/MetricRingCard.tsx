import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { RingColor } from "@/src/themes/types";
import GlassCard from "@/src/components/ui/GlassCard";
import MultiRingGauge, { innerContentDiameter } from "@/src/components/ui/MultiRingGauge";
import StatHero from "@/src/components/ui/StatHero";
import InteractiveHealthChart from "@/src/components/health/InteractiveHealthChart";
import { DailyMetricPoint } from "@/src/utils/health-data-storage";

const RING_SIZE = 132;
const RING_STROKE = 11;

/**
 * Fiche premium pour les métriques "pourcentage ponctuel" (SpO2) — un anneau
 * représentant directement la valeur (jamais une progression vers un
 * objectif, SpO2 n'en a pas), immédiatement lisible comme un %. Même
 * garde-fou anti-débordement que partout ailleurs (`StatHero`+
 * `fitDiameter`) — jamais une taille de police fixe dans un anneau.
 */
export default function MetricRingCard({
  icon,
  label,
  color,
  todayValue,
  average,
  best,
  worst,
  loadSeries,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: RingColor;
  todayValue: number | null;
  average: number | null;
  best: number | null;
  worst: number | null;
  loadSeries: (days: number) => Promise<DailyMetricPoint[]>;
}) {
  const { theme } = useTheme();
  const solid = Array.isArray(color) ? color[1] : color;
  // `today` peut être `null` sans qu'aucune vraie mesure récente ne le soit
  // (ex. la seule mesure de la fenêtre n'est pas datée d'aujourd'hui à la
  // seconde près) — replier sur la moyenne récente plutôt que d'afficher un
  // "—" trompeur alors que les 3 stats juste en dessous montrent déjà de
  // vraies valeurs. Reste honnête : le libellé sous l'anneau change en
  // conséquence, jamais présenté comme "aujourd'hui" si ça ne l'est pas.
  const displayValue = todayValue ?? average;
  const hasValue = displayValue != null;
  const ringCaption = todayValue != null ? "aujourd'hui" : "mesure récente";
  const pct = hasValue ? Math.max(0, Math.min(1, displayValue! / 100)) : 0;
  const formatValue = (v: number) => `${Math.round(v)}%`;

  return (
    <GlassCard level="elevated" accent={solid} style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name={icon} size={14} color={solid} />
        <Text style={[styles.headerLabel, { color: solid }]}>{label.toUpperCase()}</Text>
      </View>

      <View style={styles.ringWrap}>
        <MultiRingGauge rings={[{ pct, color }]} size={RING_SIZE} strokeWidth={RING_STROKE} ringFill={theme.ringFill}>
          <StatHero
            value={hasValue ? displayValue! : 0}
            formatter={(v) => (hasValue ? formatValue(v) : "—")}
            unit={ringCaption}
            color={theme.colors.onSurface}
            fitDiameter={innerContentDiameter(RING_SIZE, RING_STROKE, 4, 1)}
          />
        </MultiRingGauge>
      </View>

      {(average != null || best != null || worst != null) && (
        <View style={styles.statsRow}>
          <Stat label="Moyenne" value={average} formatValue={formatValue} color={theme.colors.onSurface} />
          <View style={[styles.sep, { backgroundColor: theme.colors.divider }]} />
          <Stat label="Minimum" value={worst} formatValue={formatValue} color={theme.colors.error} />
          <View style={[styles.sep, { backgroundColor: theme.colors.divider }]} />
          <Stat label="Maximum" value={best} formatValue={formatValue} color={theme.colors.success} />
        </View>
      )}

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
  card: { padding: spacing.lg, gap: spacing.md },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  ringWrap: { alignItems: "center", paddingVertical: spacing.sm },
  statsRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 15, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "700" },
  sep: { width: 1, height: 28 },
  chartWrap: { marginTop: spacing.xs },
});
