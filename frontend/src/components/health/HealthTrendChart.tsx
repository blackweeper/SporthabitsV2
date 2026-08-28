import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { solidColor, spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { RingColor } from "@/src/themes/types";
import { DailyMetricPoint } from "@/src/utils/health-data-storage";

export type TrendPeriodKey = "today" | "week" | "30d" | "3m" | "1y";

const PERIOD_DAYS: Record<TrendPeriodKey, number> = { today: 1, week: 7, "30d": 30, "3m": 90, "1y": 365 };
const PERIOD_LABEL: Record<TrendPeriodKey, string> = {
  today: "Jour",
  week: "7 j",
  "30d": "30 j",
  "3m": "3 mois",
  "1y": "1 an",
};
const PERIODS: TrendPeriodKey[] = ["today", "week", "30d", "3m", "1y"];

function shortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/**
 * Graphique d'évolution d'un indicateur — s'ouvre directement sous la ligne
 * sélectionnée (voir `HealthMetricGrid`), sans cadre propre ni titre
 * dupliqué (déjà visibles sur la ligne juste au-dessus) : c'est ce qui lui
 * donne l'air de faire partie de la ligne plutôt que d'être une nouvelle
 * carte injectée. Léger retrait horizontal pour s'aligner sous le texte de
 * la ligne (pas sous son icône). Sélecteur de période minimal (soulignement,
 * pas de pilules pleines) — cohérent avec "éviter tout effet gaming".
 * Affiche un état honnête (pas un graphique vide/cassé) quand moins de 2
 * points existent sur la période choisie.
 */
export default function HealthTrendChart({
  color,
  loadSeries,
  indent = true,
}: {
  color: RingColor;
  loadSeries: (days: number) => Promise<DailyMetricPoint[]>;
  /** Retrait gauche pour s'aligner sous le texte d'une ligne parente (voir
   * `HealthMetricGrid`) — désactivé (`false`) pour un usage plein largeur,
   * ex. la vue détaillée `/health-metric/[key]`. */
  indent?: boolean;
}) {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<TrendPeriodKey>("week");
  const [points, setPoints] = useState<DailyMetricPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadSeries(PERIOD_DAYS[period]).then((series) => {
      if (!cancelled) {
        setPoints(series);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [period, loadSeries]);

  const chartW = Dimensions.get("window").width - spacing.lg * 2 - (indent ? 78 : 16);
  const lineColor = solidColor(color);
  const chartData = points.map((p) => ({ value: Math.round(p.value * 100) / 100, label: shortDate(p.date) }));

  return (
    <View style={[styles.wrap, !indent && { paddingLeft: 0 }]}>
      <View style={styles.periodRow}>
        {PERIODS.map((p) => {
          const active = p === period;
          return (
            <Pressable key={p} testID={`health-period-${p}`} onPress={() => setPeriod(p)} style={styles.periodChip}>
              <Text style={[styles.periodChipText, { color: active ? lineColor : theme.colors.onSurfaceTertiary }]}>
                {PERIOD_LABEL[p]}
              </Text>
              {active && <View style={[styles.periodUnderline, { backgroundColor: lineColor }]} />}
            </Pressable>
          );
        })}
      </View>
      {!loading && chartData.length >= 2 ? (
        <LineChart
          data={chartData}
          color={lineColor}
          thickness={2}
          areaChart
          startFillColor={lineColor}
          startOpacity={0.2}
          endFillColor={lineColor}
          endOpacity={0.01}
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 9 }}
          xAxisLabelTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 8 }}
          hideRules
          width={chartW}
          isAnimated
          animationDuration={500}
          curved
          dataPointsColor={lineColor}
          dataPointsRadius={2.5}
          initialSpacing={6}
        />
      ) : (
        <Text style={[styles.hint, { color: theme.colors.onSurfaceTertiary }]}>
          {loading ? "Chargement…" : "Pas encore assez de données sur cette période."}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingLeft: 37, paddingBottom: 16, paddingTop: 2, gap: 12 },
  periodRow: { flexDirection: "row", gap: 16 },
  periodChip: { alignItems: "center", gap: 5, paddingBottom: 4 },
  periodChipText: { fontSize: 11, fontWeight: "700" },
  periodUnderline: { height: 2, width: 14, borderRadius: 1 },
  hint: { fontSize: 11, fontStyle: "italic", paddingVertical: 10 },
});
