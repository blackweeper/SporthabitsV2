import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { RingColor } from "@/src/themes/types";
import ThemedBackground from "@/src/themes/ThemedBackground";
import HealthTrendChart from "@/src/components/health/HealthTrendChart";
import { HealthMetricSample, localDateYYYYMMDD, sleepStageDetailFromRaw } from "@/src/utils/health-data-storage";
import {
  formatHealthMetricValue,
  isHealthMetricKey,
  loadHealthMetricRawSamples,
  loadHealthMetricSeries,
  valueOfSample,
  HEALTH_METRIC_LABEL,
  HealthMetricKey,
} from "@/src/utils/health-metric-config";

function formatHoursMinutes(hours: number | null): string | null {
  if (hours == null) return null;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function formatTimeOnly(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatSampleDate(dateStr: string): string {
  // Health Auto Export envoie soit une date pure ("2026-08-27"), soit un
  // horodatage complet ("2026-08-27 10:33:00 +0200") — les deux se parsent
  // correctement via `Date`, seul le format d'affichage change selon la
  // présence d'une heure.
  const hasTime = dateStr.includes(":");
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/**
 * Vue détaillée d'un indicateur Santé — accessible depuis la liste
 * "Récupération" (`HealthMetricGrid`, lien "Voir toutes les données" sous
 * le graphique déjà déplié). Reprend le même graphique d'évolution
 * (`HealthTrendChart`, composant partagé, aucune logique dupliquée) puis
 * liste TOUS les échantillons individuellement reçus via Health Auto
 * Export pour cette métrique — au-delà de ce que le graphique résume par
 * jour. Jamais de donnée inventée : une liste vide s'affiche honnêtement
 * si rien n'a encore été importé.
 */
export default function HealthMetricDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { key: rawKey } = useLocalSearchParams<{ key: string }>();
  const key: HealthMetricKey | null = isHealthMetricKey(rawKey) ? rawKey : null;
  const [samples, setSamples] = useState<HealthMetricSample[]>([]);

  const reload = useCallback(async () => {
    if (!key) return;
    setSamples(await loadHealthMetricRawSamples(key));
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (!key) {
    return (
      <View style={{ flex: 1 }}>
        <ThemedBackground />
        <SafeAreaView style={[styles.container, theme.background.mode === "gradient" && { backgroundColor: "transparent" }]}>
          <Text style={[styles.loading, { color: theme.colors.onSurfaceTertiary }]}>Indicateur inconnu.</Text>
        </SafeAreaView>
      </View>
    );
  }

  const colorByKey: Record<HealthMetricKey, RingColor> = {
    steps: theme.colors.metricColors.steps,
    walkingDistance: theme.colors.info,
    activeCalories: theme.colors.metricColors.caloriesBurn,
    sleep: theme.colors.metricColors.sleep,
    hrv: theme.colors.brand,
    restingHr: theme.colors.info,
    respiratoryRate: theme.colors.progress,
    spo2: theme.colors.info,
  };
  const latest = samples[0] ?? null;
  const latestValue = latest ? valueOfSample(key, latest) : null;
  const sleepStages = key === "sleep" && latest ? sleepStageDetailFromRaw(latest.raw) : null;
  const today = localDateYYYYMMDD();

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface },
        ]}
        edges={["top"]}
      >
        <View style={styles.header}>
          <Pressable testID="health-metric-back" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{HEALTH_METRIC_LABEL[key]}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View>
            <Text style={[styles.currentValue, { color: theme.colors.onSurface }]}>
              {latestValue != null ? formatHealthMetricValue(key, latestValue) : "—"}
            </Text>
            <Text style={[styles.currentLabel, { color: theme.colors.onSurfaceTertiary }]}>
              {latest ? `Dernière donnée · ${formatSampleDate(latest.date)}` : "Aucune donnée importée pour l'instant"}
            </Text>
          </View>

          {sleepStages && (sleepStages.deepHours != null || sleepStages.remHours != null || sleepStages.coreHours != null) && (
            <View style={[styles.stagesCard, { borderColor: theme.colors.divider }]}>
              {sleepStages.inBedStart && sleepStages.sleepEnd && (
                <View style={styles.stagesTimesRow}>
                  <View>
                    <Text style={[styles.stagesTimeLabel, { color: theme.colors.onSurfaceTertiary }]}>Coucher</Text>
                    <Text style={[styles.stagesTimeValue, { color: theme.colors.onSurface }]}>
                      {formatTimeOnly(sleepStages.inBedStart)}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={14} color={theme.colors.onSurfaceTertiary} />
                  <View>
                    <Text style={[styles.stagesTimeLabel, { color: theme.colors.onSurfaceTertiary }]}>Réveil</Text>
                    <Text style={[styles.stagesTimeValue, { color: theme.colors.onSurface }]}>
                      {formatTimeOnly(sleepStages.sleepEnd)}
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.stagesGrid}>
                {sleepStages.deepHours != null && (
                  <View style={styles.stageItem}>
                    <Text style={[styles.stageValue, { color: theme.colors.progress }]}>{formatHoursMinutes(sleepStages.deepHours)}</Text>
                    <Text style={[styles.stageLabel, { color: theme.colors.onSurfaceTertiary }]}>Profond</Text>
                  </View>
                )}
                {sleepStages.coreHours != null && (
                  <View style={styles.stageItem}>
                    <Text style={[styles.stageValue, { color: theme.colors.brand }]}>{formatHoursMinutes(sleepStages.coreHours)}</Text>
                    <Text style={[styles.stageLabel, { color: theme.colors.onSurfaceTertiary }]}>Léger</Text>
                  </View>
                )}
                {sleepStages.remHours != null && (
                  <View style={styles.stageItem}>
                    <Text style={[styles.stageValue, { color: theme.colors.info }]}>{formatHoursMinutes(sleepStages.remHours)}</Text>
                    <Text style={[styles.stageLabel, { color: theme.colors.onSurfaceTertiary }]}>REM</Text>
                  </View>
                )}
                {sleepStages.awakeHours != null && (
                  <View style={styles.stageItem}>
                    <Text style={[styles.stageValue, { color: theme.colors.onSurfaceSecondary }]}>{formatHoursMinutes(sleepStages.awakeHours)}</Text>
                    <Text style={[styles.stageLabel, { color: theme.colors.onSurfaceTertiary }]}>Éveil</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <HealthTrendChart color={colorByKey[key]} loadSeries={(days) => loadHealthMetricSeries(key, days, today)} indent={false} />

          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Toutes les données importées {samples.length > 0 ? `(${samples.length})` : ""}
          </Text>
          {samples.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.onSurfaceTertiary }]}>
              Rien n&apos;a encore été reçu pour cet indicateur via Health Auto Export.
            </Text>
          ) : (
            samples.map((s, i) => {
              const v = valueOfSample(key, s);
              return (
                <View
                  key={`${s.date}-${i}`}
                  style={[styles.sampleRow, i > 0 && { borderTopColor: theme.colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}
                >
                  <Text style={[styles.sampleDate, { color: theme.colors.onSurfaceSecondary }]}>{formatSampleDate(s.date)}</Text>
                  <Text style={[styles.sampleValue, { color: theme.colors.onSurface }]}>
                    {v != null ? formatHealthMetricValue(key, v) : "—"}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { textAlign: "center", marginTop: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 16, fontWeight: "800" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl3, gap: spacing.lg },
  currentValue: { fontSize: 36, fontWeight: "800" },
  currentLabel: { fontSize: 12, marginTop: 2 },
  stagesCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
  },
  stagesTimesRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stagesTimeLabel: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.3 },
  stagesTimeValue: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  stagesGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stageItem: { minWidth: 64 },
  stageValue: { fontSize: 15, fontWeight: "800" },
  stageLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3, marginTop: 1 },
  sectionTitle: { fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  empty: { fontSize: 13, fontStyle: "italic" },
  sampleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  sampleDate: { fontSize: 12.5, fontWeight: "600" },
  sampleValue: { fontSize: 13.5, fontWeight: "800" },
});
