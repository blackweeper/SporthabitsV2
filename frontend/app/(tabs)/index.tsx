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
import Svg, { Circle } from "react-native-svg";
import { colors, radius, spacing } from "@/src/theme";
import {
  ActiveProgram,
  currentDayIndex,
  DEFAULT_CALORIES_TARGET_KCAL,
  DEFAULT_STEPS_TARGET,
  DEFAULT_WATER_TARGET_ML,
  Measurement,
  setHabitValue,
  getActivePrograms,
  getHabits,
  getHabitLogs,
  getMeasurements,
  getPRs,
  getProfile,
  getSessions,
  getWellnessLog,
  Habit,
  HabitLog,
  HABIT_KIND_ICON,
  PersonalRecord,
  todayYYYYMMDD,
  UserProfile,
  WellnessLog,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import { findProgram } from "@/src/utils/programs";
import { Program } from "@/src/data/programs";
import { computeDailyScore } from "@/src/utils/scoring";
import { computeXPState } from "@/src/utils/xp";
import { computeAdvancedStats } from "@/src/utils/stats";
import { todayQuote } from "@/src/data/motivation";
import {
  WellnessQuickWidgets,
} from "@/src/components/WellnessWidgets";

type ActiveWithProgram = { active: ActiveProgram; program: Program };

export default function TodayScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [name, setName] = useState<string>("");
  const [actives, setActives] = useState<ActiveWithProgram[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wellness, setWellness] = useState<WellnessLog | null>(null);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);

  const load = useCallback(async () => {
    setSessions(await getSessions());
    setHabits(await getHabits());
    setLogs(await getHabitLogs());
    setMeasurements(await getMeasurements());
    setPRs(await getPRs());
    const p = await getProfile();
    setProfile(p);
    setName((p as any).name ?? "");
    const list = await getActivePrograms();
    const resolved: ActiveWithProgram[] = [];
    for (const a of list) {
      const prog = await findProgram(a.programId);
      if (prog) resolved.push({ active: a, program: prog });
    }
    setActives(resolved);
    setWellness(await getWellnessLog(todayYYYYMMDD()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const daily = computeDailyScore(sessions, habits, logs, {
    log: wellness,
    waterTarget: profile?.water_target_ml || DEFAULT_WATER_TARGET_ML,
    caloriesTarget: profile?.calories_target_kcal || DEFAULT_CALORIES_TARGET_KCAL,
    stepsTarget: profile?.steps_target || DEFAULT_STEPS_TARGET,
  });
  const stats = computeAdvancedStats(sessions);
  const xpState = computeXPState({ sessions, habits, habitLogs: logs, prs });
  const lastMeasurement = measurements[0];
  const firstMeasurement = measurements[measurements.length - 1];
  const weightDelta =
    lastMeasurement?.weight_kg != null && firstMeasurement?.weight_kg != null
      ? lastMeasurement.weight_kg - firstMeasurement.weight_kg
      : null;

  const primary = actives[0];
  const dayIndex = primary
    ? currentDayIndex(primary.active, primary.program.durationDays)
    : null;
  const totalDays = primary?.program.durationDays ?? null;

  const today = todayYYYYMMDD();
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Bonjour" : greetingHour < 18 ? "Salut" : "Bonsoir";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Motivation banner */}
        <View style={styles.motivationCard}>
          <Ionicons name="sparkles" size={14} color={colors.brand} />
          <Text style={styles.motivationText}>{todayQuote()}</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>IRONFLOW</Text>
            <Text style={styles.greeting}>
              {greeting}{name ? `, ${name}` : ""} 👋
            </Text>
            <Text style={styles.date}>{formatFullDate()}</Text>
          </View>
          {dayIndex && totalDays ? (
            <View style={styles.dayBadge}>
              <Text style={styles.dayLabel}>JOUR</Text>
              <Text style={styles.dayValue}>{dayIndex}</Text>
              <Text style={styles.daySub}>/ {totalDays}</Text>
            </View>
          ) : null}
        </View>

        {/* Score circle */}
        <View style={styles.scoreCard}>
          <ScoreCircle score={daily.score} />
          <View style={{ flex: 1 }}>
            <Text style={styles.scoreLabel}>SCORE DU JOUR</Text>
            <Text style={styles.scoreValue}>{daily.score}%</Text>
            <Text style={styles.scoreHint}>
              {daily.items.filter((i) => i.achieved >= 1).length}/
              {daily.items.length} objectifs
            </Text>
          </View>
        </View>

        {/* XP + Level card */}
        <Pressable
          style={styles.xpCard}
          testID="xp-card"
          onPress={() => router.push("/profile")}
        >
          <View style={styles.xpHeadRow}>
            <View style={styles.xpBadge}>
              <Text style={styles.xpLevelNum}>{xpState.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.xpLabel}>NIVEAU {xpState.level}</Text>
              <Text style={styles.xpValue}>{xpState.xp} XP</Text>
              <Text style={styles.xpHint}>
                {xpState.nextBadge
                  ? `${xpState.xpToNext} XP → niveau ${xpState.level + 1} · badge ${xpState.nextBadge.emoji} ${xpState.nextBadge.title} au N${xpState.nextBadge.level}`
                  : `${xpState.xpToNext} XP → niveau ${xpState.level + 1}`}
              </Text>
            </View>
          </View>
          <View style={styles.xpBar}>
            <View
              style={[
                styles.xpFill,
                { width: `${xpState.progress * 100}%` },
              ]}
            />
          </View>
          {xpState.unlockedBadges.length > 0 && (
            <View style={styles.badgeRow}>
              {xpState.unlockedBadges.slice(-6).map((b) => (
                <View
                  key={b.level}
                  style={[styles.badge, { backgroundColor: b.color + "30", borderColor: b.color }]}
                >
                  <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>

        {/* CTA principal */}
        <Pressable
          testID="start-session"
          style={styles.mainCta}
          onPress={() => router.push("/plans")}
        >
          <Ionicons name="flame" size={22} color="#fff" />
          <Text style={styles.mainCtaText}>DÉMARRER LA SÉANCE</Text>
        </Pressable>

        {/* Programmes actifs — jusqu'à 2 en parallèle */}
        {actives.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {actives.length > 1 ? "Programmes actifs" : "Programme actif"}
            </Text>
            <View style={styles.programsRow}>
              {actives.map(({ active, program }) => {
                const di = currentDayIndex(active, program.durationDays);
                const totalSess = program.days.reduce(
                  (a, d) => a + (d.rest ? 0 : d.sessions.length),
                  0,
                );
                const done = active.completedSessions.length;
                const pct = totalSess ? done / totalSess : 0;
                return (
                  <Pressable
                    key={program.id}
                    testID={`active-program-${program.id}`}
                    style={[
                      styles.progMini,
                      { borderLeftColor: program.color },
                    ]}
                    onPress={() => router.push(`/program/${program.id}`)}
                  >
                    <View style={styles.progMiniHead}>
                      <Text style={styles.progMiniEmoji}>
                        {program.coverEmoji}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={styles.progMiniTitle}
                          numberOfLines={1}
                        >
                          {program.title}
                        </Text>
                        <Text style={styles.progMiniMeta}>
                          Jour {di}/{program.durationDays} · {done}/{totalSess}{" "}
                          séances
                        </Text>
                      </View>
                    </View>
                    <View style={styles.progMiniTrack}>
                      <View
                        style={[
                          styles.progMiniFill,
                          {
                            width: `${pct * 100}%`,
                            backgroundColor: program.color,
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Interactive daily widgets */}
        <View style={styles.widgetsHead}>
          <Text style={styles.sectionTitle}>Aujourd&apos;hui</Text>
          <Pressable
            testID="manage-habits"
            hitSlop={8}
            onPress={() => router.push("/progression?tab=habits" as any)}
          >
            <Text style={styles.widgetsMoreLink}>Gérer</Text>
          </Pressable>
        </View>
        <View style={styles.widgetsGrid}>
          {/* Séance widget (workout) */}
          <SessionWidget
            done={daily.workoutDone}
            onPress={() => router.push("/training")}
          />
          {/* Habit widgets */}
          {habits.map((h) => {
            const cur =
              logs.find((l) => l.habitId === h.id && l.date === today)?.value ?? 0;
            const target = h.target && h.target > 0 ? h.target : 1;
            return (
              <HabitWidget
                key={h.id}
                habit={h}
                current={cur}
                target={target}
                onIncrement={async () => {
                  const next = cur >= target ? 0 : cur + 1;
                  await setHabitValue(h.id, today, next);
                  load();
                }}
                onLongPress={async () => {
                  await setHabitValue(h.id, today, 0);
                  load();
                }}
                onOpen={() => router.push(`/habit/${h.id}` as any)}
              />
            );
          })}
          {/* Add habit widget */}
          <Pressable
            testID="add-habit-widget"
            style={styles.addWidget}
            onPress={() => router.push("/habit/new" as any)}
          >
            <Ionicons name="add-circle" size={26} color={colors.brand} />
            <Text style={styles.addWidgetLabel}>Nouvelle habitude</Text>
          </Pressable>
        </View>

        {/* Streak — hero metric */}
        <Pressable
          testID="streak-hero"
          style={styles.streakHero}
          onPress={() => router.push("/stats")}
        >
          <View style={styles.streakLeft}>
            <Ionicons name="flame" size={30} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakLabel}>STREAK ACTUEL</Text>
            <Text style={styles.streakBig}>
              {stats.currentStreakDays}
              <Text style={styles.streakUnit}> jours</Text>
            </Text>
            <Text style={styles.streakSub}>
              {stats.currentStreakDays === 0
                ? "Fais une séance aujourd'hui pour lancer ta série 🔥"
                : stats.currentStreakDays >= stats.bestStreakDays
                ? "Tu es sur ton record ! Continue ↗"
                : `Record : ${stats.bestStreakDays} jours`}
            </Text>
          </View>
        </Pressable>

        {/* Wellness quick widgets — Water / Calories / Steps */}
        <Text style={styles.sectionTitle}>Bien-être du jour</Text>
        <WellnessQuickWidgets
          log={wellness}
          targetWater={profile?.water_target_ml || DEFAULT_WATER_TARGET_ML}
          targetCalories={
            profile?.calories_target_kcal || DEFAULT_CALORIES_TARGET_KCAL
          }
          targetSteps={profile?.steps_target || DEFAULT_STEPS_TARGET}
          onChange={load}
        />

        {/* Quick stats — secondary */}
        <Text style={styles.sectionTitle}>Statistiques rapides</Text>
        <View style={styles.statsGrid}>
          <QuickStat
            icon="body"
            value={
              lastMeasurement?.weight_kg != null
                ? `${lastMeasurement.weight_kg} kg`
                : "—"
            }
            label="Poids actuel"
            trend={
              weightDelta != null
                ? `${weightDelta >= 0 ? "+" : ""}${weightDelta.toFixed(1)} kg`
                : undefined
            }
            onPress={() => router.push("/progression")}
          />
          <QuickStat
            icon="checkmark-done"
            value={String(stats.totalSessions)}
            label="Séances totales"
            onPress={() => router.push("/training")}
          />
          <QuickStat
            icon="barbell"
            value={`${(stats.totalVolumeKg / 1000).toFixed(1)}t`}
            label="Volume soulevé"
            onPress={() => router.push("/stats")}
          />
          <QuickStat
            icon="time"
            value={formatShortDuration(stats.avgDurationSec)}
            label="Durée moyenne"
            onPress={() => router.push("/stats")}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionWidget({
  done,
  onPress,
}: {
  done: boolean;
  onPress: () => void;
}) {
  const bg = done ? "#FF572220" : colors.surfaceSecondary;
  const border = done ? "#FF5722" : colors.border;
  return (
    <Pressable
      testID="widget-session"
      style={[
        styles.widget,
        { backgroundColor: bg, borderColor: border },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.widgetIcon,
          { backgroundColor: done ? "#FF5722" : colors.surfaceTertiary },
        ]}
      >
        <Ionicons
          name="barbell"
          size={16}
          color={done ? "#fff" : colors.onSurfaceTertiary}
        />
      </View>
      <Text style={styles.widgetTitle} numberOfLines={1}>
        Séance
      </Text>
      <Text style={styles.widgetProgress}>
        {done ? "Fait ✓" : "À faire"}
      </Text>
      <View style={styles.widgetBar}>
        <View
          style={[
            styles.widgetBarFill,
            {
              width: done ? "100%" : "0%",
              backgroundColor: "#FF5722",
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function HabitWidget({
  habit,
  current,
  target,
  onIncrement,
  onLongPress,
  onOpen,
}: {
  habit: Habit;
  current: number;
  target: number;
  onIncrement: () => void;
  onLongPress: () => void;
  onOpen: () => void;
}) {
  const done = current >= target;
  const color = habit.color ?? "#4CAF50";
  const bg = done ? `${color}20` : colors.surfaceSecondary;
  const border = done ? color : colors.border;
  const iconName = (habit.kind ? HABIT_KIND_ICON[habit.kind] : "star") as any;
  const pct = target > 0 ? Math.min(1, current / target) : 0;
  return (
    <Pressable
      testID={`widget-${habit.id}`}
      style={[styles.widget, { backgroundColor: bg, borderColor: border }]}
      onPress={onIncrement}
      onLongPress={() => {
        // Long press: quick shortcut to open habit settings
        onOpen();
      }}
      delayLongPress={450}
    >
      <View style={styles.widgetTopRow}>
        <View
          style={[
            styles.widgetIcon,
            { backgroundColor: done ? color : colors.surfaceTertiary },
          ]}
        >
          <Ionicons
            name={iconName}
            size={16}
            color={done ? "#fff" : colors.onSurfaceTertiary}
          />
        </View>
        {target > 1 ? (
          <Pressable
            testID={`widget-${habit.id}-reset`}
            hitSlop={8}
            onPress={onLongPress}
            style={styles.widgetResetBtn}
          >
            <Ionicons
              name="refresh"
              size={12}
              color={colors.onSurfaceTertiary}
            />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.widgetTitle} numberOfLines={1}>
        {habit.title}
      </Text>
      <Text style={[styles.widgetProgress, done && { color }]}>
        {target > 1 ? `${current}/${target}${habit.unit ? " " + habit.unit : ""}` : done ? "Fait ✓" : "À faire"}
      </Text>
      <View style={styles.widgetBar}>
        <View
          style={[
            styles.widgetBarFill,
            {
              width: `${Math.round(pct * 100)}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const size = 84;
  const strokeWidth = 8;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceTertiary}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.brand}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ color: colors.onSurface, fontSize: 20, fontWeight: "800" }}>
          {score}%
        </Text>
      </View>
    </View>
  );
}

function QuickStat({
  icon,
  value,
  label,
  trend,
  onPress,
}: {
  icon: any;
  value: string;
  label: string;
  trend?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.qStat} onPress={onPress}>
      <View style={styles.qStatIcon}>
        <Ionicons name={icon} size={14} color={colors.brand} />
      </View>
      <Text style={styles.qStatValue}>{value}</Text>
      <Text style={styles.qStatLabel}>{label}</Text>
      {trend ? <Text style={styles.qStatTrend}>{trend}</Text> : null}
    </Pressable>
  );
}

function formatFullDate() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShortDuration(sec: number): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? m : ""}`;
  return `${m}m`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  motivationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brandTertiary,
    padding: 10,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
  },
  motivationText: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    fontStyle: "italic",
  },
  streakHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#FF5722",
    padding: spacing.lg,
    borderRadius: radius.md,
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  streakLeft: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  streakLabel: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "800",
    opacity: 0.9,
  },
  streakBig: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "800",
    marginTop: 2,
  },
  streakUnit: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    opacity: 0.9,
  },
  streakSub: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.9,
    marginTop: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  brand: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  greeting: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  date: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
  },
  dayBadge: {
    alignItems: "center",
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  dayLabel: {
    color: colors.brandSecondary,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "800",
  },
  dayValue: { color: colors.brand, fontSize: 22, fontWeight: "800" },
  daySub: { color: colors.brandSecondary, fontSize: 11, fontWeight: "700" },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "800",
  },
  scoreValue: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  scoreHint: { color: colors.brand, fontSize: 12, fontWeight: "700", marginTop: 2 },
  xpCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  xpHeadRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  xpBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  xpLevelNum: { color: "#fff", fontWeight: "800", fontSize: 20 },
  xpLabel: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  xpValue: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  xpHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  xpBar: {
    height: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 3,
    overflow: "hidden",
  },
  xpFill: { height: "100%", borderRadius: 3, backgroundColor: colors.brand },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  badgeEmoji: { fontSize: 15 },
  mainCta: {
    backgroundColor: colors.brand,
    padding: 18,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  mainCtaText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 1.5,
  },
  progCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  programsRow: {
    gap: spacing.sm,
  },
  progMini: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: 8,
  },
  progMiniHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progMiniEmoji: {
    fontSize: 26,
  },
  progMiniTitle: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 14,
  },
  progMiniMeta: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  progMiniTrack: {
    height: 4,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 2,
    overflow: "hidden",
  },
  progMiniFill: {
    height: "100%",
    borderRadius: 2,
  },
  progLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  progName: { color: colors.onSurface, fontSize: 14, fontWeight: "700", marginTop: 2 },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  checkCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  checkRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { color: colors.onSurface, fontWeight: "600", fontSize: 14, flex: 1 },
  checkLabelDone: {
    textDecorationLine: "line-through",
    color: colors.onSurfaceTertiary,
  },
  checkWeight: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "700",
  },
  emptyHabitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyHabitText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
  },
  widgetsHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.sm,
  },
  widgetsMoreLink: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
  },
  widgetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  widget: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    minHeight: 108,
  },
  widgetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  widgetIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  widgetResetBtn: {
    padding: 4,
    borderRadius: 6,
  },
  widgetTitle: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  widgetProgress: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    fontWeight: "600",
  },
  widgetBar: {
    height: 4,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  widgetBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  addWidget: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: "dashed",
    padding: spacing.md,
    minHeight: 108,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addWidgetLabel: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  qStat: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  qStatIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  qStatValue: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  qStatLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "600",
  },
  qStatTrend: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
});
