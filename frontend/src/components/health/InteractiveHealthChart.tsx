import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { coloredShadow, solidColor, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { RingColor } from "@/src/themes/types";
import { DailyMetricPoint } from "@/src/utils/health-data-storage";

export type TrendPeriodKey = "today" | "week" | "30d" | "3m" | "6m" | "1y";

export const PERIOD_DAYS: Record<TrendPeriodKey, number> = { today: 1, week: 7, "30d": 30, "3m": 90, "6m": 182, "1y": 365 };
const PERIOD_LABEL: Record<TrendPeriodKey, string> = {
  today: "Jour",
  week: "Semaine",
  "30d": "Mois",
  "3m": "3 mois",
  "6m": "6 mois",
  "1y": "Année",
};
const DEFAULT_PERIODS: TrendPeriodKey[] = ["today", "week", "30d", "3m", "1y"];

function shortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/** "29 août" — date absolue et complète (jamais "Hier"/"Demain", qui n'ont
 * pas de sens en parcourant un historique de plusieurs mois). */
function longDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
}

type ChartPoint = { value: number; label: string; date: string };

/**
 * Badge flottant affiché au point sélectionné — "29 août / 10 245" (voir le
 * brief, style visuel en petites capitales). Fond opaque plutôt qu'un vrai
 * flou temps réel : ce composant est positionné par
 * `react-native-gifted-charts` en dehors de la hiérarchie normale de cartes
 * (un `BlurView` y serait plus fragile qu'utile pour un badge aussi petit) —
 * un fond teinté uni suffit à la lisibilité, cohérent avec le reste du
 * design (rayon, ombre colorée) sans ce risque.
 */
function PointerLabel({
  items,
  color,
  formatValue,
}: {
  items: ChartPoint[];
  color: string;
  formatValue: (value: number) => string;
}) {
  const { theme } = useTheme();
  const item = items?.[0];
  if (!item) return null;
  return (
    <View
      style={[
        styles.pointerBadge,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderColor: withAlpha(color, 55),
          borderRadius: theme.radius.md,
        },
        coloredShadow(color, { offsetY: 2, opacity: 0.28, radius: 8, elevation: 4 }),
      ]}
    >
      <Text style={[styles.pointerDate, { color: theme.colors.onSurfaceTertiary }]}>{longDate(item.date)}</Text>
      <Text style={[styles.pointerValue, { color }]}>{formatValue(item.value)}</Text>
    </View>
  );
}

/**
 * Graphique d'évolution interactif — composant générique partagé par TOUTES
 * les fiches Santé (Pas, Distance, Calories actives, Sommeil, VFC, FC repos,
 * Respiration, SpO2) : jamais un graphique réimplémenté par métrique, juste
 * `loadSeries`/`formatValue` qui changent selon l'appelant. Même donnée que
 * `HealthMetricGrid`/`/health-metric/[key]` (registre santé existant, voir
 * `health-metric-config.ts`/`health-data-storage.ts`) — jamais de valeur
 * inventée : un point manquant est simplement absent de la série, jamais
 * interpolé ou mis à zéro.
 *
 * Interaction (voir `pointerConfig` de `react-native-gifted-charts` — la
 * fonctionnalité native de la librairie, pas un geste réécrit à la main) :
 * glisser le doigt sur le graphique fait apparaître une ligne verticale + un
 * point + le badge `PointerLabel` au jour le plus proche, qui suit le doigt
 * en continu pendant tout le glissé — un seul geste satisfait à la fois
 * "sélectionner un jour" et "swipe pour voir les jours voisins" (tous les
 * jours de la période sont déjà tracés sur l'axe ; le glissé ne fait que
 * déplacer la sélection dessus, rien à charger en plus). La zone tactile de
 * ce geste est strictement le graphique (la vue du `LineChart`, pas la
 * page) — le `ScrollView` englobant garde la priorité sur un geste
 * majoritairement vertical, négociation de responder standard de React
 * Native dont dépendent déjà d'autres écrans de cette app.
 */
export default function InteractiveHealthChart({
  color,
  loadSeries,
  indent = true,
  periods = DEFAULT_PERIODS,
  defaultPeriod = "week",
  formatValue,
}: {
  color: RingColor;
  loadSeries: (days: number) => Promise<DailyMetricPoint[]>;
  /** Retrait gauche pour s'aligner sous le texte d'une ligne parente (voir
   * `HealthMetricGrid`) — désactivé (`false`) pour un usage plein largeur,
   * ex. la vue détaillée `/health-metric/[key]`. */
  indent?: boolean;
  /** Sous-ensemble de périodes à proposer (défaut : les 5 historiques,
   * `today` inclus) — la vue détaillée `/health-metric/[key]` n'affiche que
   * `week/30d/6m/1y` ("Semaine/Mois/6 mois/Année"), sans dupliquer le
   * composant. */
  periods?: TrendPeriodKey[];
  defaultPeriod?: TrendPeriodKey;
  /** Formate une valeur brute pour l'affichage (badge du point sélectionné
   * + moyenne de la période) — ex. `(v) => formatHealthMetricValue("steps", v)`
   * → "10 245". Repli sur un entier brut arrondi si non fourni. */
  formatValue?: (value: number) => string;
}) {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<TrendPeriodKey>(defaultPeriod);
  const [points, setPoints] = useState<DailyMetricPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const fmt = formatValue ?? ((v: number) => `${Math.round(v)}`);

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
  const chartData: ChartPoint[] = points.map((p) => ({
    value: Math.round(p.value * 100) / 100,
    label: shortDate(p.date),
    date: p.date,
  }));

  // Moyenne réelle de la période affichée, recalculée depuis les points
  // effectivement chargés — jamais une valeur à part figée sur 7 jours :
  // change avec le sélecteur de période, exactement la donnée du graphique.
  const average = useMemo(() => {
    if (points.length === 0) return null;
    return points.reduce((sum, p) => sum + p.value, 0) / points.length;
  }, [points]);

  return (
    <View style={[styles.wrap, !indent && { paddingLeft: 0 }]}>
      <View style={styles.headerRow}>
        <View style={styles.periodRow}>
          {periods.map((p) => {
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
        {average != null && (
          <Text testID="health-chart-average" style={[styles.averageText, { color: theme.colors.onSurfaceTertiary }]}>
            Moyenne <Text style={{ color: lineColor, fontWeight: "800" }}>{fmt(average)}</Text>
          </Text>
        )}
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
          pointerConfig={{
            pointerStripUptoDataPoint: true,
            pointerStripColor: lineColor,
            pointerStripWidth: 1.5,
            strokeDashArray: [4, 4],
            pointerColor: lineColor,
            radius: 5,
            activatePointersInstantlyOnTouch: true,
            persistPointer: true,
            resetPointerOnDataChange: true,
            autoAdjustPointerLabelPosition: true,
            pointerLabelWidth: 130,
            pointerLabelHeight: 54,
            pointerLabelComponent: (items: ChartPoint[]) => (
              <PointerLabel items={items} color={lineColor} formatValue={fmt} />
            ),
          }}
        />
      ) : (
        <Text style={[styles.hint, { color: theme.colors.onSurfaceTertiary }]}>
          {loading
            ? "Chargement…"
            : chartData.length === 0
              ? "Aucune donnée disponible."
              : "Pas encore assez de données sur cette période."}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingLeft: 37, paddingBottom: 16, paddingTop: 2, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  periodRow: { flexDirection: "row", gap: 16 },
  periodChip: { alignItems: "center", gap: 5, paddingBottom: 4 },
  periodChipText: { fontSize: 11, fontWeight: "700" },
  periodUnderline: { height: 2, width: 14, borderRadius: 1 },
  averageText: { fontSize: 11, fontWeight: "600" },
  hint: { fontSize: 11, fontStyle: "italic", paddingVertical: 10 },
  pointerBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    gap: 1,
  },
  pointerDate: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  pointerValue: { fontSize: 14, fontWeight: "800", textTransform: "uppercase" },
});
