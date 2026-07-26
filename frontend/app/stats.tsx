import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { getSessions } from "@/src/utils/gym-storage";
import { computeAdvancedStats, AdvancedStats } from "@/src/utils/stats";
import CalendarView from "@/src/components/CalendarView";

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default function StatsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [monthOffset, setMonthOffset] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await getSessions();
        setSessions(s);
        setStats(computeAdvancedStats(s));
      })();
    }, []),
  );

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Statistiques</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="close-stats"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Statistiques</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Streak card */}
        <View style={styles.streakCard}>
          <Ionicons name="flame" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakBig}>{stats.currentStreakDays} jours</Text>
            <Text style={styles.streakSub}>
              Meilleure série : {stats.bestStreakDays} jours
            </Text>
          </View>
        </View>

        {/* Grid of stats */}
        <View style={styles.grid}>
          <StatBox icon="checkmark-done" value={String(stats.totalSessions)} label="Séances totales" />
          <StatBox
            icon="barbell"
            value={`${(stats.totalVolumeKg / 1000).toFixed(1)} t`}
            label="Volume total"
          />
          <StatBox icon="flame" value={`${stats.totalCalories}`} label="Kcal brûlées" />
          <StatBox
            icon="time"
            value={formatDuration(stats.totalDurationSec)}
            label="Temps total"
          />
          <StatBox
            icon="stopwatch"
            value={formatDuration(stats.avgDurationSec)}
            label="Durée moyenne"
          />
          <StatBox
            icon="layers"
            value={String(stats.distinctExercises)}
            label="Exercices variés"
          />
          <StatBox
            icon="stopwatch-outline"
            value={`${stats.cardioKmYear.toFixed(1)} km`}
            label="Cardio cette année"
          />
          <StatBox
            icon="earth"
            value={`${stats.cardioKmTotal.toFixed(1)} km`}
            label="Cardio cumulé"
          />
        </View>

        {stats.favoriteExercise && (
          <View style={styles.highlightCard}>
            <Ionicons name="star" size={18} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.highlightLabel}>Exercice préféré</Text>
              <Text style={styles.highlightVal}>
                {capitalize(stats.favoriteExercise)}
              </Text>
            </View>
          </View>
        )}
        {stats.forgottenExercise && (
          <View style={styles.highlightCardMuted}>
            <Ionicons name="alert-circle" size={18} color={colors.onSurfaceSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.highlightLabelMuted}>Exercice oublié</Text>
              <Text style={styles.highlightValMuted}>
                {capitalize(stats.forgottenExercise)}
              </Text>
              <Text style={styles.highlightSubMuted}>
                Fait il y a plus de 30 jours
              </Text>
            </View>
          </View>
        )}

        {/* Calendar */}
        <Text style={styles.sectionTitle}>Calendrier</Text>
        <CalendarView
          sessions={sessions}
          monthOffset={monthOffset}
          onChangeMonth={setMonthOffset}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: any;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={14} color={colors.brand} />
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brand,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  streakBig: { color: "#fff", fontSize: 28, fontWeight: "800" },
  streakSub: { color: "#fff", opacity: 0.9, fontSize: 12, marginTop: 2 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statBox: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  statVal: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  statLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  highlightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  highlightLabel: {
    color: colors.brandSecondary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "800",
  },
  highlightVal: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  highlightCardMuted: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  highlightLabelMuted: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "800",
  },
  highlightValMuted: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  highlightSubMuted: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
});
