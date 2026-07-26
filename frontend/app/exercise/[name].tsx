import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-gifted-charts";
import { colors, radius, spacing } from "@/src/theme";
import { getPRs, getSessions } from "@/src/utils/gym-storage";
import {
  computeExerciseDetail,
  ExerciseDetail,
  listAllExercises,
} from "@/src/utils/exercise-detail";

export default function ExerciseDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const decoded = decodeURIComponent(name ?? "");
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [suggestions, setSuggestions] = useState<{ name: string; count: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const sessions = await getSessions();
        const prs = await getPRs();
        if (decoded) {
          setDetail(computeExerciseDetail(decoded, sessions, prs));
        } else {
          setSuggestions(listAllExercises(sessions));
        }
      })();
    }, [decoded]),
  );

  // If no name provided, show a picker of all exercises done
  if (!decoded) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Choisir un exercice</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          {suggestions.length === 0 ? (
            <Text style={styles.emptyText}>
              Fais au moins une séance pour analyser tes exercices.
            </Text>
          ) : (
            suggestions.map((s) => (
              <Pressable
                key={s.name}
                testID={`pick-${s.name}`}
                style={styles.pickRow}
                onPress={() =>
                  router.push(`/exercise/${encodeURIComponent(s.name)}`)
                }
              >
                <Ionicons name="barbell" size={16} color={colors.brand} />
                <Text style={styles.pickName}>{s.name}</Text>
                <Text style={styles.pickCount}>{s.count} séance{s.count > 1 ? "s" : ""}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const chartW = Dimensions.get("window").width - spacing.lg * 2 - 32;
  const chartData = detail.historyPoints.map((p) => ({
    value: Math.round(p.volume),
    label: shortDate(p.date),
  }));

  const firstDate = detail.historyPoints[0]?.date;
  const lastVolume = detail.historyPoints[detail.historyPoints.length - 1]?.volume ?? 0;
  const firstVolume = detail.historyPoints[0]?.volume ?? 0;
  const delta = lastVolume - firstVolume;
  const progression = firstVolume > 0 ? (delta / firstVolume) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="close-detail"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {detail.name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <KPI
            icon="checkmark-done"
            value={String(detail.totalOccurrences)}
            label="Fois pratiqué"
          />
          <KPI
            icon="barbell"
            value={`${(detail.totalVolumeKg / 1000).toFixed(1)} t`}
            label="Volume total"
          />
          <KPI
            icon="trophy"
            value={String(detail.linkedPRs.length)}
            label="Records"
          />
          <KPI
            icon="trending-up"
            value={
              firstVolume > 0
                ? `${progression >= 0 ? "+" : ""}${progression.toFixed(0)}%`
                : "—"
            }
            label="Progression"
          />
        </View>

        {/* Last session */}
        {detail.lastSession && (
          <View style={styles.lastCard}>
            <Text style={styles.lastLabel}>DERNIÈRE SÉANCE</Text>
            <Text style={styles.lastValue}>
              {detail.lastSession.weight
                ? `${detail.lastSession.weight} × ${detail.lastSession.reps}`
                : detail.lastSession.reps}
            </Text>
            <Text style={styles.lastSub}>
              {formatDate(detail.lastSession.date)} · {detail.lastSession.setsDone} série
              {detail.lastSession.setsDone > 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {/* Chart */}
        {chartData.length >= 2 ? (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Volume par séance (kg)</Text>
            <LineChart
              data={chartData}
              color={colors.brand}
              thickness={3}
              areaChart
              startFillColor={colors.brand}
              startOpacity={0.5}
              endFillColor={colors.brand}
              endOpacity={0.05}
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={{ color: colors.onSurfaceTertiary, fontSize: 10 }}
              xAxisLabelTextStyle={{
                color: colors.onSurfaceTertiary,
                fontSize: 9,
              }}
              hideRules
              width={chartW}
              isAnimated
              curved
              dataPointsColor={colors.brand}
              dataPointsRadius={3}
            />
            {firstDate && (
              <Text style={styles.chartHint}>
                Depuis le {formatDate(firstDate)}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.hintBox}>
            <Ionicons name="information-circle" size={14} color={colors.brand} />
            <Text style={styles.hintText}>
              Fais cet exercice au moins 2 fois pour voir le graphique.
            </Text>
          </View>
        )}

        {/* Best by reps */}
        {detail.bestByReps.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Records par nombre de reps</Text>
            <View style={styles.prGrid}>
              {detail.bestByReps.slice(0, 8).map((b) => (
                <View key={b.reps} style={styles.prChip}>
                  <Text style={styles.prReps}>{b.reps}RM</Text>
                  <Text style={styles.prWeight}>{b.weight} kg</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* PRs enregistrés */}
        {detail.linkedPRs.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Records enregistrés</Text>
            {detail.linkedPRs.map((pr) => (
              <View key={pr.id} style={styles.prCard}>
                <Ionicons name="trophy" size={14} color={colors.brand} />
                <Text style={styles.prCardText}>
                  {(pr.type ?? "weight") === "weight"
                    ? `${pr.weight_kg} kg × ${pr.reps}`
                    : (pr.type === "reps"
                      ? `${pr.reps} reps`
                      : `${(pr.distance_m ?? 0) / 1000} km`)}
                </Text>
                <Text style={styles.prCardDate}>{formatDate(pr.date)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function KPI({
  icon,
  value,
  label,
}: {
  icon: any;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.kpiBox}>
      <Ionicons name={icon} size={14} color={colors.brand} />
      <Text style={styles.kpiVal}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  title: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textTransform: "capitalize",
  },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  pickName: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
    textTransform: "capitalize",
  },
  pickCount: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kpiBox: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  kpiVal: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  kpiLabel: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "600" },
  lastCard: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  lastLabel: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "800",
    opacity: 0.9,
  },
  lastValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  lastSub: { color: "#fff", opacity: 0.9, fontSize: 12, marginTop: 4 },
  chartCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  chartTitle: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  chartHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: spacing.sm,
    fontStyle: "italic",
    textAlign: "center",
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  hintText: {
    color: colors.brandSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  prGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  prChip: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: "center",
    minWidth: 78,
  },
  prReps: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  prWeight: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  prCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  prCardText: { color: colors.onSurface, fontWeight: "700", flex: 1 },
  prCardDate: { color: colors.onSurfaceTertiary, fontSize: 11 },
});
