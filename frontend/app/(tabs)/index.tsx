import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ImageBackground,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  getPlans,
  getSessions,
  Plan,
  WorkoutSession,
} from "@/src/utils/gym-storage";

const HERO_BG =
  "https://images.unsplash.com/photo-1637430308606-86576d8fef3c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwYXRtb3NwaGVyaWMlMjBneW0lMjBlcXVpcG1lbnR8ZW58MHx8fHwxNzg0OTgxNDQyfDA&ixlib=rb-4.1.0&q=85";

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function daysAgo(dateISO: string) {
  const diff = Date.now() - new Date(dateISO).getTime();
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Hier";
  return `Il y a ${d} jours`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setPlans(await getPlans());
        setSessions(await getSessions());
      })();
    }, []),
  );

  const totalSessions = sessions.length;
  const totalTime = sessions.reduce((a, s) => a + s.durationSeconds, 0);
  const totalCalories = sessions.reduce(
    (a, s) => a + (s.caloriesBurned ?? 0),
    0,
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <ImageBackground
          source={{ uri: HERO_BG }}
          style={styles.hero}
          imageStyle={styles.heroImg}
        >
          <LinearGradient
            colors={["rgba(14,14,14,0.2)", "rgba(14,14,14,0.98)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>IRONFLOW</Text>
            <Text style={styles.heroTitle}>
              Prêt à{"\n"}transpirer ?
            </Text>
            <Pressable
              testID="start-workout-btn"
              onPress={() => router.push("/plans")}
              style={({ pressed }) => [
                styles.ctaBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="flame" size={20} color="#fff" />
              <Text style={styles.ctaText}>DÉMARRER UNE SÉANCE</Text>
            </Pressable>
          </View>
        </ImageBackground>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard
            testID="stat-sessions"
            label="Séances"
            value={String(totalSessions)}
            icon="checkmark-done"
          />
          <StatCard
            testID="stat-calories"
            label="Calories"
            value={`${totalCalories} kcal`}
            icon="flame"
          />
          <StatCard
            testID="stat-time"
            label="Temps total"
            value={formatDuration(totalTime)}
            icon="time"
          />
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <Pressable
            testID="quick-import"
            style={styles.quickBtn}
            onPress={() => router.push("/import")}
          >
            <Ionicons name="camera" size={22} color={colors.brand} />
            <Text style={styles.quickTitle}>Importer un plan</Text>
            <Text style={styles.quickSub}>Photo → IA</Text>
          </Pressable>
          <Pressable
            testID="quick-create"
            style={styles.quickBtn}
            onPress={() => router.push("/plan/new")}
          >
            <Ionicons name="add-circle" size={22} color={colors.brand} />
            <Text style={styles.quickTitle}>Créer un plan</Text>
            <Text style={styles.quickSub}>Manuellement</Text>
          </Pressable>
        </View>

        {/* Recent sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dernières séances</Text>
          {sessions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="barbell-outline"
                size={38}
                color={colors.onSurfaceTertiary}
              />
              <Text style={styles.emptyText}>
                Aucune séance encore.{"\n"}Commence par importer ton plan.
              </Text>
            </View>
          ) : (
            sessions.slice(0, 5).map((s) => (
              <Pressable
                key={s.id}
                style={styles.sessionRow}
                testID={`recent-session-${s.id}`}
                onPress={() => router.push(`/session/${s.id}`)}
              >
                <View style={styles.sessionIcon}>
                  <Ionicons name="flame" size={18} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle}>{s.planTitle}</Text>
                  <Text style={styles.sessionMeta}>
                    {daysAgo(s.startedAt)} · {formatDuration(s.durationSeconds)} ·{" "}
                    {s.caloriesBurned ?? 0} kcal
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.onSurfaceTertiary}
                />
              </Pressable>
            ))
          )}
        </View>

        <View style={{ height: spacing.xl2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
  testID,
}: {
  label: string;
  value: string;
  icon: any;
  testID?: string;
}) {
  return (
    <View style={styles.statCard} testID={testID}>
      <Ionicons name={icon} size={16} color={colors.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingBottom: spacing.xl2 },
  hero: {
    height: 320,
    justifyContent: "flex-end",
  },
  heroImg: { resizeMode: "cover" },
  heroContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  heroLabel: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
  },
  heroTitle: {
    color: colors.onSurface,
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 46,
    letterSpacing: -1,
  },
  ctaBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 1.2,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  statValue: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
  },
  statLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  quickRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 6,
  },
  quickTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 14 },
  quickSub: { color: colors.onSurfaceTertiary, fontSize: 11 },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  emptyBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionTitle: { color: colors.onSurface, fontWeight: "600", fontSize: 14 },
  sessionMeta: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  sessionCount: {
    color: colors.brand,
    fontWeight: "700",
    fontSize: 12,
  },
});
