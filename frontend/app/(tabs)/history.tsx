import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-gifted-charts";
import { colors, radius, spacing } from "@/src/theme";
import { getSessions, WorkoutSession } from "@/src/utils/gym-storage";

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m${s}s`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [tab, setTab] = useState<"history" | "stats">("history");

  useFocusEffect(
    useCallback(() => {
      (async () => setSessions(await getSessions()))();
    }, []),
  );

  const weekData = useMemo(() => {
    // last 7 days
    const days: { label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const total =
        sessions
          .filter((s) => {
            const t = new Date(s.startedAt).getTime();
            return t >= d.getTime() && t < next.getTime();
          })
          .reduce((a, s) => a + s.durationSeconds, 0) / 60;
      days.push({
        label: ["D", "L", "M", "M", "J", "V", "S"][d.getDay()],
        value: Math.round(total),
      });
    }
    return days;
  }, [sessions]);

  const totals = useMemo(() => {
    const total = sessions.length;
    const totalMin = Math.round(
      sessions.reduce((a, s) => a + s.durationSeconds, 0) / 60,
    );
    const totalRest = Math.round(
      sessions.reduce((a, s) => a + s.totalRestSeconds, 0) / 60,
    );
    const totalCalories = sessions.reduce(
      (a, s) => a + (s.caloriesBurned ?? 0),
      0,
    );
    const avgDuration = total
      ? Math.round(sessions.reduce((a, s) => a + s.durationSeconds, 0) / total / 60)
      : 0;
    return { total, totalMin, totalRest, avgDuration, totalCalories };
  }, [sessions]);

  const maxBar = Math.max(1, ...weekData.map((d) => d.value));
  const chartWidth = Dimensions.get("window").width - spacing.lg * 2 - 32;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
      </View>

      {/* Segmented control */}
      <View style={styles.segment}>
        <Pressable
          testID="tab-history-seg"
          style={[styles.segBtn, tab === "history" && styles.segBtnActive]}
          onPress={() => setTab("history")}
        >
          <Text
            style={[styles.segText, tab === "history" && styles.segTextActive]}
          >
            SÉANCES
          </Text>
        </Pressable>
        <Pressable
          testID="tab-stats-seg"
          style={[styles.segBtn, tab === "stats" && styles.segBtnActive]}
          onPress={() => setTab("stats")}
        >
          <Text
            style={[styles.segText, tab === "stats" && styles.segTextActive]}
          >
            STATS
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {tab === "history" ? (
          sessions.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="time-outline"
                size={40}
                color={colors.onSurfaceTertiary}
              />
              <Text style={styles.emptyText}>
                Aucune séance enregistrée.{"\n"}Termine ta première séance pour
                la voir ici.
              </Text>
            </View>
          ) : (
            sessions.map((s) => (
              <Pressable
                key={s.id}
                style={styles.sessionCard}
                testID={`session-${s.id}`}
                onPress={() => router.push(`/session/${s.id}`)}
              >
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionTitle}>{s.planTitle}</Text>
                  <Text style={styles.sessionDate}>{formatDate(s.startedAt)}</Text>
                </View>
                <View style={styles.sessionStats}>
                  <View style={styles.sessionStat}>
                    <Ionicons name="time" size={14} color={colors.brand} />
                    <Text style={styles.sessionStatVal}>
                      {formatDuration(s.durationSeconds)}
                    </Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Ionicons name="flame" size={14} color={colors.brand} />
                    <Text style={styles.sessionStatVal}>
                      {s.caloriesBurned ?? 0} kcal
                    </Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Ionicons name="barbell" size={14} color={colors.brand} />
                    <Text style={styles.sessionStatVal}>
                      {s.exercises.length} ex.
                    </Text>
                  </View>
                </View>
                <View style={styles.sessionFoot}>
                  <Text style={styles.sessionMore}>Voir le résumé →</Text>
                </View>
              </Pressable>
            ))
          )
        ) : (
          <>
            {/* Totals */}
            <View style={styles.statsGrid}>
              <StatBox label="Séances" value={String(totals.total)} />
              <StatBox
                label="Calories brûlées"
                value={`${totals.totalCalories}`}
              />
              <StatBox label="Minutes totales" value={String(totals.totalMin)} />
              <StatBox
                label="Durée moyenne"
                value={`${totals.avgDuration} min`}
              />
            </View>
            {/* Weekly chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Cette semaine (minutes)</Text>
              <BarChart
                data={weekData.map((d) => ({
                  value: d.value,
                  label: d.label,
                  frontColor: colors.brand,
                }))}
                barWidth={22}
                spacing={14}
                barBorderRadius={4}
                yAxisThickness={0}
                xAxisThickness={0}
                yAxisTextStyle={{ color: colors.onSurfaceTertiary, fontSize: 10 }}
                xAxisLabelTextStyle={{
                  color: colors.onSurfaceTertiary,
                  fontSize: 10,
                }}
                noOfSections={4}
                maxValue={Math.ceil(maxBar / 5) * 5 || 5}
                hideRules
                width={chartWidth}
                isAnimated
              />
            </View>
          </>
        )}
        <View style={{ height: spacing.xl2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  segment: {
    flexDirection: "row",
    margin: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  segBtnActive: { backgroundColor: colors.brand },
  segText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1,
  },
  segTextActive: { color: "#fff" },
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  empty: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  sessionCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 15 },
  sessionDate: { color: colors.onSurfaceTertiary, fontSize: 11 },
  sessionStats: { flexDirection: "row", gap: spacing.lg },
  sessionStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  sessionStatVal: { color: colors.onSurfaceSecondary, fontSize: 12 },
  sessionFoot: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  sessionMore: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: "48%",
  },
  statBoxValue: {
    color: colors.brand,
    fontSize: 28,
    fontWeight: "800",
  },
  statBoxLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  chartCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  chartTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: spacing.lg,
    letterSpacing: 0.5,
  },
});
