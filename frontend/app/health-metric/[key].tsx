import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import SleepDetailScreen from "@/src/components/health/sleep/SleepDetailScreen";
import MetricDetailScreen from "@/src/components/health/detail/MetricDetailScreen";
import { localDateYYYYMMDD } from "@/src/utils/health-data-storage";
import {
  computeYearlyDailyAverages,
  formatHealthMetricValue,
  isHealthMetricKey,
  HEALTH_METRIC_LABEL,
  HealthMetricKey,
  YearlyAverage,
} from "@/src/utils/health-metric-config";

const SUM_METRIC_KEYS: HealthMetricKey[] = ["steps", "walkingDistance", "activeCalories"];

/**
 * Vue détaillée d'un indicateur Santé — accessible depuis la liste
 * "Récupération" (`HealthMetricGrid`) et les tuiles Pas/Distance/Calories
 * actives du Dashboard/Santé. Coquille commune (retour/titre/safe-area) —
 * le corps est délégué à `SleepDetailScreen` (fiche dédiée) ou
 * `MetricDetailScreen` (Pas/Distance/Calories actives/VFC/FC repos/
 * Respiration/SpO2, chacune avec sa propre visualisation, voir ce fichier).
 * Jamais de donnée inventée : un indicateur sans donnée réelle affiche un
 * état vide explicite, pas un 0.
 */
export default function HealthMetricDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { key: rawKey } = useLocalSearchParams<{ key: string }>();
  const key: HealthMetricKey | null = isHealthMetricKey(rawKey) ? rawKey : null;
  const [yearly, setYearly] = useState<YearlyAverage[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!key || key === "sleep" || !SUM_METRIC_KEYS.includes(key)) return;
      computeYearlyDailyAverages(key).then(setYearly);
    }, [key]),
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

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xl3 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {key === "sleep" ? (
            <SleepDetailScreen />
          ) : (
            <>
              <MetricDetailScreen metricKey={key} />

              {yearly.length >= 2 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>COMPARAISON ANNUELLE</Text>
                  <GlassCard level="subtle" style={styles.yearlyCard}>
                    {yearly.map((y, i) => {
                      const prev = yearly[i + 1];
                      const pct = prev ? Math.round(((y.dailyAverage - prev.dailyAverage) / prev.dailyAverage) * 100) : null;
                      return (
                        <View
                          key={y.year}
                          style={[styles.yearlyRow, i > 0 && { borderTopColor: theme.colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}
                        >
                          <Text style={[styles.yearlyYear, { color: theme.colors.onSurface }]}>{y.year}</Text>
                          <Text style={[styles.yearlyValue, { color: theme.colors.onSurface }]}>
                            {formatHealthMetricValue(key, y.dailyAverage)}/j
                          </Text>
                          {pct != null && (
                            <Text
                              style={[
                                styles.yearlyDelta,
                                { color: pct >= 0 ? theme.colors.success : theme.colors.error },
                              ]}
                            >
                              {pct >= 0 ? "+" : ""}
                              {pct}%
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </GlassCard>
                </View>
              )}
            </>
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
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  yearlyCard: { padding: spacing.md },
  yearlyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10 },
  yearlyYear: { flex: 1, fontSize: 14, fontWeight: "800" },
  yearlyValue: { fontSize: 13, fontWeight: "700" },
  yearlyDelta: { fontSize: 12, fontWeight: "800", minWidth: 50, textAlign: "right" },
});
