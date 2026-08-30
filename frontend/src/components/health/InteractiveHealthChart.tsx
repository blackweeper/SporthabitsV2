import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from "react-native";
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

/** "mar. 4 août" — jour + date absolue et complète (jamais "Hier"/"Demain",
 * qui n'ont pas de sens en parcourant un historique de plusieurs mois). */
function weekdayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const text = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type ChartPoint = { value: number; label: string; date: string };

/** Point rond agrandi au point sélectionné — remplace `pointerConfig.
 * pointerColor`/`radius` par défaut de la librairie (`react-native-gifted-
 * charts` positionne ce composant lui-même via `pointerComponent`, déjà
 * exactement centré sur le point). Anneau "découpe" (couleur de fond de
 * carte) autour du disque coloré pour qu'il se détache nettement de la
 * courbe/barre derrière lui. Exporté pour être réutilisé tel quel par
 * `MetricGoalCard` (graphiques en barres) — même langage visuel de
 * sélection sur les deux types de graphique. */
export function SelectedDot({ color }: { color: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: color,
        borderWidth: 3,
        borderColor: theme.colors.surface,
      }}
    />
  );
}

/**
 * Badge flottant affiché au point sélectionné — jour+date en tête, puis
 * point coloré + valeur en gros, cohérent avec la couleur propre du
 * graphique appelant (jamais une teinte neutre unique pour tous). Fond
 * opaque plutôt qu'un vrai flou temps réel : ce composant est positionné par
 * `react-native-gifted-charts` en dehors de la hiérarchie normale de cartes
 * (un `BlurView` y serait plus fragile qu'utile pour un badge aussi petit) —
 * un fond teinté uni suffit à la lisibilité, cohérent avec le reste du
 * design (rayon, ombre colorée) sans ce risque. Exporté pour être réutilisé
 * tel quel par `MetricGoalCard` (graphiques en barres) — un seul composant
 * de badge daté pour tout IronFlow, jamais une deuxième implémentation.
 */
export function PointerLabel({
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
        styles.pointerCard,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderColor: withAlpha(color, 35),
          borderRadius: theme.radius.md,
        },
        coloredShadow(color, { offsetY: 4, opacity: 0.32, radius: 14, elevation: 6 }),
      ]}
    >
      <Text style={[styles.pointerDate, { color: theme.colors.onSurfaceTertiary }]}>{weekdayDate(item.date)}</Text>
      <View style={styles.pointerRow}>
        <View style={[styles.pointerDot, { backgroundColor: color }]} />
        <Text style={[styles.pointerValue, { color: theme.colors.onSurface }]}>{formatValue(item.value)}</Text>
      </View>
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
 * Habillage visuel inspiré d'une référence fournie (courbe éditoriale,
 * grille minimale en pointillés, point rond agrandi de sélection + badge
 * daté, jamais de ligne verticale/croix — retirées sur retour utilisateur,
 * jugées trop chargées) — MAIS chaque graphique garde sa propre couleur
 * d'accent (`color`), jamais une palette neutre unique comme la référence :
 * c'est la seule chose qui change d'un appel à l'autre.
 *
 * Interaction (voir `pointerConfig` de `react-native-gifted-charts` — la
 * fonctionnalité native de la librairie, pas un geste réécrit à la main) :
 * glisser le doigt sur le graphique fait apparaître le point `SelectedDot`
 * + le badge `PointerLabel` au jour le plus proche, qui suivent le doigt en
 * continu pendant tout le glissé — un seul geste satisfait à la fois
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
  const gridColor = withAlpha(theme.colors.onSurface, 8);

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
        <View
          // Léger halo autour de la courbe (web uniquement — `filter` n'est
          // pas une propriété RN standard, sans effet natif, purement un
          // rehaussement visuel du PWA) : la même courbe SVG sans ce calque
          // reste identique en cas d'absence de support.
          style={Platform.OS === "web" ? ({ filter: `drop-shadow(0 0 5px ${withAlpha(lineColor, 55)})` } as never) : undefined}
        >
          <LineChart
            data={chartData}
            color={lineColor}
            thickness={2.5}
            areaChart
            startFillColor={lineColor}
            startOpacity={0.16}
            endFillColor={lineColor}
            endOpacity={0.01}
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 8 }}
            rulesType="dashed"
            rulesColor={gridColor}
            rulesThickness={1}
            noOfSections={5}
            showVerticalLines
            verticalLinesColor={gridColor}
            verticalLinesThickness={1}
            verticalLinesStrokeDashArray={[4, 4]}
            width={chartW}
            // Réserve de la place au-dessus du tracé pour le badge daté
            // (`pointerLabelHeight`) — sans ça, sélectionner un point proche
            // du haut du graphique fait déborder le badge hors de la zone
            // rendue par la librairie (coupé net), quel que soit le padding
            // de la carte englobante (le clip a lieu à l'intérieur du
            // graphique lui-même, pas au niveau de `GlassCard`).
            overflowTop={110}
            isAnimated
            animationDuration={500}
            curved
            hideDataPoints
            initialSpacing={6}
            pointerConfig={{
              showPointerStrip: false,
              pointerColor: lineColor,
              radius: 5,
              pointerComponent: () => <SelectedDot color={lineColor} />,
              activatePointersInstantlyOnTouch: true,
              persistPointer: true,
              resetPointerOnDataChange: true,
              autoAdjustPointerLabelPosition: true,
              pointerLabelWidth: 140,
              pointerLabelHeight: 60,
              pointerLabelComponent: (items: ChartPoint[]) => (
                <PointerLabel items={items} color={lineColor} formatValue={fmt} />
              ),
            }}
          />
        </View>
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
  pointerCard: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 5,
  },
  pointerDate: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },
  pointerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pointerDot: { width: 7, height: 7, borderRadius: 3.5 },
  pointerValue: { fontSize: 16, fontWeight: "800" },
});
