import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { motion, solidColor, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { RingColor } from "@/src/themes/types";
import HealthTrendChart from "./HealthTrendChart";
import {
  getDailyMetricSeries,
  localDateYYYYMMDD,
  sleepHoursFromRaw,
  HRV_METRIC_NAMES,
  RESPIRATORY_RATE_METRIC_NAMES,
  RESTING_HR_METRIC_NAMES,
  SLEEP_METRIC_NAMES,
  SPO2_METRIC_NAMES,
} from "@/src/utils/health-data-storage";

export type HealthMetricKey = "sleep" | "hrv" | "restingHr" | "respiratoryRate" | "spo2";

type MetricRow = {
  key: HealthMetricKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: number | null;
  baseline: number | null;
  color: RingColor;
  higherIsBetter: boolean;
};

function formatCompact(key: HealthMetricKey, value: number): string {
  if (key === "sleep") {
    const h = Math.floor(value);
    const m = Math.round((value - h) * 60);
    return `${h}h${m.toString().padStart(2, "0")}`;
  }
  return `${Math.round(value)}`;
}

function unitFor(key: HealthMetricKey): string {
  switch (key) {
    case "sleep":
      return "";
    case "hrv":
      return "ms";
    case "restingHr":
      return "bpm";
    case "respiratoryRate":
      return "rpm";
    case "spo2":
      return "%";
  }
}

function formatWithUnit(key: HealthMetricKey, value: number): string {
  const unit = unitFor(key);
  return key === "sleep" ? formatCompact(key, value) : `${Math.round(value)} ${unit}`.trim();
}

function formatBaseline(key: HealthMetricKey, baseline: number): string {
  return `base ${key === "sleep" ? formatCompact(key, baseline) : `${Math.round(baseline)} ${unitFor(key)}`.trim()}`;
}

function formatTrend(
  key: HealthMetricKey,
  value: number,
  baseline: number,
  higherIsBetter: boolean,
): { text: string; good: boolean; up: boolean } | null {
  const diff = value - baseline;
  if (Math.abs(diff) < 0.01) return null;
  const up = diff > 0;
  const good = higherIsBetter ? up : !up;
  if (key === "sleep") {
    const mins = Math.round(diff * 60);
    if (mins === 0) return null;
    return { text: `${mins > 0 ? "+" : ""}${mins} min`, good, up };
  }
  if (key === "restingHr" || key === "respiratoryRate") {
    const rounded = Math.round(diff);
    if (rounded === 0) return null;
    return { text: `${rounded > 0 ? "+" : ""}${rounded} ${unitFor(key)}`, good, up };
  }
  const pct = baseline !== 0 ? Math.round((diff / baseline) * 100) : 0;
  if (pct === 0) return null;
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, good, up };
}

/** Chevron qui pivote en douceur à l'ouverture/fermeture — seul indice
 * animé, discret (pas d'icône qui change brutalement). */
function AnimatedChevron({ open, color }: { open: boolean; color: string }) {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withTiming(open ? 180 : 0, { duration: motion.fast });
  }, [open, rotation]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name="chevron-down" size={14} color={color} />
    </Animated.View>
  );
}

/**
 * Les 5 indicateurs de récupération — en liste (pas en grille de tuiles) :
 * icône teintée discrète, libellé + référence personnelle ("base X",
 * volontairement moins lumineuse que la valeur du jour), valeur + tendance
 * (pilule colorée seulement quand un écart existe, pour rester repérable
 * sans surcharger), chevron. Les séparations entre lignes sont un simple
 * hairline à faible opacité — l'essentiel de la hiérarchie vient de l'espace
 * et de la typographie, pas de bordures. Taper une ligne ouvre le graphique
 * d'évolution juste en dessous d'ELLE (accordéon animé, un seul ouvert à la
 * fois) — même mécanique/données qu'avant (`HealthTrendChart`,
 * `getDailyMetricSeries`), seule la présentation change. Rendu "nu" : cette
 * liste vit à l'intérieur de la grande surface "Récupération" du parent.
 */
export default function HealthMetricGrid({
  sleepHours,
  sleepAvg7d,
  hrv,
  hrvAvg7d,
  restingHr,
  restingHrAvg7d,
  respiratoryRate,
  respiratoryRateAvg7d,
  spo2,
  spo2Avg7d,
}: {
  sleepHours: number | null;
  sleepAvg7d: number | null;
  hrv: number | null;
  hrvAvg7d: number | null;
  restingHr: number | null;
  restingHrAvg7d: number | null;
  respiratoryRate: number | null;
  respiratoryRateAvg7d: number | null;
  spo2: number | null;
  spo2Avg7d: number | null;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const [selected, setSelected] = useState<HealthMetricKey | null>(null);

  const rows: MetricRow[] = [
    { key: "sleep", label: "Sommeil", icon: "moon", value: sleepHours, baseline: sleepAvg7d, color: theme.colors.metricColors.sleep, higherIsBetter: true },
    { key: "hrv", label: "VFC", icon: "pulse", value: hrv, baseline: hrvAvg7d, color: theme.colors.brand, higherIsBetter: true },
    { key: "restingHr", label: "FC repos", icon: "heart", value: restingHr, baseline: restingHrAvg7d, color: theme.colors.info, higherIsBetter: false },
    { key: "respiratoryRate", label: "Respiration", icon: "body", value: respiratoryRate, baseline: respiratoryRateAvg7d, color: theme.colors.progress, higherIsBetter: false },
    { key: "spo2", label: "SpO2", icon: "water", value: spo2, baseline: spo2Avg7d, color: theme.colors.info, higherIsBetter: true },
  ];

  const loadSeriesFor = (key: HealthMetricKey) => async (days: number) => {
    const today = localDateYYYYMMDD();
    switch (key) {
      case "sleep":
        return getDailyMetricSeries(SLEEP_METRIC_NAMES, days, today, "sum", undefined, true, sleepHoursFromRaw);
      case "hrv":
        return getDailyMetricSeries(HRV_METRIC_NAMES, days, today, "avg", undefined, true);
      case "restingHr":
        return getDailyMetricSeries(RESTING_HR_METRIC_NAMES, days, today, "avg", undefined, true);
      case "respiratoryRate":
        return getDailyMetricSeries(RESPIRATORY_RATE_METRIC_NAMES, days, today, "avg", undefined, true);
      case "spo2": {
        const series = await getDailyMetricSeries(SPO2_METRIC_NAMES, days, today, "avg", undefined, true);
        return series.map((p) => ({ ...p, value: p.value <= 1 ? p.value * 100 : p.value }));
      }
    }
  };

  return (
    <View>
      <Text style={[styles.eyebrow, { color: theme.colors.onSurface }]}>INDICATEURS</Text>
      {rows.map((row, i) => {
        const trend = row.value != null && row.baseline != null ? formatTrend(row.key, row.value, row.baseline, row.higherIsBetter) : null;
        const open = selected === row.key;
        const accent = solidColor(row.color);
        return (
          <View key={row.key}>
            <Pressable
              testID={`health-metric-${row.key}`}
              onPress={() => setSelected(open ? null : row.key)}
              style={[styles.row, i > 0 && { borderTopColor: theme.colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}
            >
              <View style={[styles.iconBadge, { backgroundColor: withAlpha(accent, 12) }]}>
                <Ionicons name={row.icon} size={13} color={accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>{row.label}</Text>
                <Text style={[styles.rowSub, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
                  {row.baseline != null ? formatBaseline(row.key, row.baseline) : row.value == null ? "Non disponible" : "Pas encore de référence"}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowValue, { color: theme.colors.onSurface }]}>
                  {row.value != null ? formatWithUnit(row.key, row.value) : "—"}
                </Text>
                {trend && (
                  <View style={[styles.trendPill, trend.good && { backgroundColor: withAlpha(theme.colors.success, 14) }]}>
                    <Ionicons
                      name={trend.up ? "arrow-up" : "arrow-down"}
                      size={9}
                      color={trend.good ? theme.colors.success : theme.colors.onSurfaceSecondary}
                    />
                    <Text style={[styles.trendText, { color: trend.good ? theme.colors.success : theme.colors.onSurfaceSecondary }]}>
                      {trend.text}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ marginLeft: 8 }}>
                <AnimatedChevron open={open} color={theme.colors.onSurfaceTertiary} />
              </View>
            </Pressable>

            {open && (
              <Animated.View entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)}>
                <HealthTrendChart color={row.color} loadSeries={loadSeriesFor(row.key)} />
                <Pressable
                  testID={`health-metric-detail-${row.key}`}
                  onPress={() => router.push({ pathname: "/health-metric/[key]", params: { key: row.key } })}
                  style={styles.detailLink}
                >
                  <Text style={[styles.detailLinkText, { color: theme.colors.brand }]}>Voir toutes les données</Text>
                  <Ionicons name="chevron-forward" size={12} color={theme.colors.brand} />
                </Pressable>
              </Animated.View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 14, fontWeight: "800", letterSpacing: 1, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 11 },
  detailLink: { flexDirection: "row", alignItems: "center", gap: 3, paddingLeft: 37, paddingBottom: 14, marginTop: -4 },
  detailLinkText: { fontSize: 11.5, fontWeight: "700" },
  iconBadge: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 13.5, fontWeight: "700" },
  rowSub: { fontSize: 10.5, letterSpacing: 0.2 },
  rowRight: { alignItems: "flex-end", gap: 3 },
  rowValue: { fontSize: 15, fontWeight: "800" },
  trendPill: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  trendText: { fontSize: 10, fontWeight: "700" },
});
