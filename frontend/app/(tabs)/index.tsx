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
  ActiveProgram,
  currentDayIndex,
  findOrCreateProgramPlan,
  getActiveProgram,
  getPlans,
  getSessions,
  Plan,
  uid,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import { getProgram } from "@/src/data/programs";

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
  const [active, setActive] = useState<ActiveProgram | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setPlans(await getPlans());
        setSessions(await getSessions());
        setActive(await getActiveProgram());
      })();
    }, []),
  );

  const activeProgram = active ? getProgram(active.programId) : null;
  const todayIdx =
    active && activeProgram
      ? currentDayIndex(active, activeProgram.durationDays)
      : null;
  const todayDay =
    activeProgram && todayIdx ? activeProgram.days[todayIdx - 1] : null;
  const todayDone =
    active && todayIdx ? active.completedDayIndexes.includes(todayIdx) : false;

  async function startTodaySession() {
    if (!activeProgram || !todayDay || !todayIdx || todayDay.rest) return;
    const plan = await findOrCreateProgramPlan(
      activeProgram.id,
      todayIdx,
      () => ({
        title: `${activeProgram.title} · J${todayIdx} — ${todayDay.title}`,
        type: 'mixte',
        createdAt: new Date().toISOString(),
        programSource: { programId: activeProgram.id, dayIndex: todayIdx },
        exercises: todayDay.exercises.map((e) => ({ ...e, id: uid() })),
      }),
    );
    router.push(`/workout/${plan.id}`);
  }

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
          <View style={styles.heroTopBar}>
            <View style={{ flex: 1 }} />
            <Pressable
              testID="open-profile"
              style={styles.profileBtn}
              onPress={() => router.push("/profile")}
              hitSlop={8}
            >
              <Ionicons name="person" size={18} color="#fff" />
            </Pressable>
          </View>
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
            testID="quick-programs"
            style={styles.quickBtn}
            onPress={() => router.push("/programs")}
          >
            <Ionicons name="calendar" size={22} color={colors.brand} />
            <Text style={styles.quickTitle}>Programmes</Text>
            <Text style={styles.quickSub}>30 jours</Text>
          </Pressable>
          <Pressable
            testID="quick-import"
            style={styles.quickBtn}
            onPress={() => router.push("/import")}
          >
            <Ionicons name="camera" size={22} color={colors.brand} />
            <Text style={styles.quickTitle}>Importer</Text>
            <Text style={styles.quickSub}>Photo → IA</Text>
          </Pressable>
          <Pressable
            testID="quick-create"
            style={styles.quickBtn}
            onPress={() => router.push("/plan/new")}
          >
            <Ionicons name="add-circle" size={22} color={colors.brand} />
            <Text style={styles.quickTitle}>Créer</Text>
            <Text style={styles.quickSub}>Manuel</Text>
          </Pressable>
        </View>

        {/* Today's program session */}
        {activeProgram && todayDay && todayIdx ? (
          <View style={styles.todayWrap}>
            <View style={styles.todayLabelRow}>
              <View style={styles.todayDot} />
              <Text style={styles.todayLabel}>PROGRAMME EN COURS</Text>
              <Text style={styles.todayProgress}>
                Jour {todayIdx}/{activeProgram.durationDays}
              </Text>
            </View>
            <View
              style={[
                styles.todayCard,
                todayDone && styles.todayCardDone,
              ]}
            >
              <View style={styles.todayLeft}>
                <View
                  style={[
                    styles.todayEmojiBox,
                    { backgroundColor: `${activeProgram.color}30` },
                  ]}
                >
                  <Text style={{ fontSize: 26 }}>{activeProgram.coverEmoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.todayProgramName}>
                    {activeProgram.title}
                  </Text>
                  <Text style={styles.todayDayTitle} numberOfLines={2}>
                    {todayDay.title}
                  </Text>
                  {todayDay.rest ? (
                    <Text style={styles.todayRest}>Journée de repos 😴</Text>
                  ) : (
                    <Text style={styles.todayMeta}>
                      {todayDay.exercises.length} exercice
                      {todayDay.exercises.length > 1 ? "s" : ""}
                    </Text>
                  )}
                </View>
              </View>
              {todayDone ? (
                <View style={styles.doneChip}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.success}
                  />
                  <Text style={styles.doneChipText}>Fait</Text>
                </View>
              ) : todayDay.rest ? null : (
                <Pressable
                  testID="start-today"
                  style={[
                    styles.todayBtn,
                    { backgroundColor: activeProgram.color },
                  ]}
                  onPress={startTodaySession}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.todayBtnText}>C&apos;EST PARTI</Text>
                </Pressable>
              )}
            </View>
            <Pressable
              testID="open-program"
              onPress={() => router.push(`/program/${activeProgram.id}`)}
              style={styles.todayFooter}
            >
              <Text style={styles.todayFooterText}>
                Voir tout le programme →
              </Text>
            </Pressable>
          </View>
        ) : null}

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
  heroTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: spacing.md,
    alignItems: "center",
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
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

  todayWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: 6,
  },
  todayLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  todayLabel: {
    color: colors.success,
    letterSpacing: 1.5,
    fontSize: 10,
    fontWeight: "800",
    flex: 1,
  },
  todayProgress: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success,
    gap: spacing.md,
  },
  todayCardDone: { opacity: 0.75, borderColor: colors.border },
  todayLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  todayEmojiBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  todayProgramName: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  todayDayTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  todayMeta: {
    color: colors.brand,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  todayRest: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 2,
  },
  todayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  todayBtnText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.6,
    fontSize: 11,
  },
  doneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "#0F2F1A",
  },
  doneChipText: { color: colors.success, fontWeight: "700", fontSize: 11 },
  todayFooter: { padding: 6, alignSelf: "flex-end" },
  todayFooterText: {
    color: colors.brand,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.4,
  },
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
