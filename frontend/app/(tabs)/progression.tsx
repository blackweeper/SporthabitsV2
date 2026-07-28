import { useState, useCallback } from "react";
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
import Svg, { Circle } from "react-native-svg";
import { LineChart } from "react-native-gifted-charts";
import { colors, radius, spacing } from "@/src/theme";
import {
  PERIOD_LABEL,
  PeriodKey,
  EXERCISE_CATEGORY_COLOR,
  EXERCISE_CATEGORY_ICON,
  EXERCISE_CATEGORY_LABEL,
  ExerciseCategory,
  getOverrides,
  resolveCategory,
} from "@/src/utils/exercise-category";
import { EXERCISE_LIBRARY } from "@/src/data/exercise-library";
import {
  BADGES,
  computeXPState,
  MAX_LEVEL,
  xpForLevel,
} from "@/src/utils/xp";
import {
  DailyJournalEntry,
  PAIN_ZONE_LABEL,
  deleteDailyJournalEntry,
  deleteHabit,
  deleteMeasurement,
  deletePR,
  deleteReminder,
  getDailyJournal,
  getGoals,
  getHabits,
  getHabitLogs,
  getMeasurements,
  getPRs,
  getProfile,
  getReminders,
  getSessions,
  getWellnessLogs,
  Goal,
  GOAL_CATEGORY_ICON,
  GOAL_CATEGORY_LABEL,
  Habit,
  HabitLog,
  Measurement,
  PersonalRecord,
  Reminder,
  REMINDER_KIND_ICON,
  REMINDER_KIND_LABEL,
  todayYYYYMMDD,
  UserProfile,
  WellnessLog,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import SwipeableRow from "@/src/components/SwipeableRow";
import {
  computeDailyIronflowScore,
  DailyIronflowScore,
  scoreQualitativeLabel,
} from "@/src/utils/scoring";
import { listAllExercises } from "@/src/utils/exercise-detail";
import { ProgressionTab } from "@/src/utils/progression-nav";

type Tab = ProgressionTab;

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Score", icon: "speedometer" },
  { key: "exercises", label: "Exercices", icon: "barbell" },
  { key: "records", label: "Records", icon: "trophy" },
  { key: "level", label: "Niveau", icon: "star" },
  { key: "transformation", label: "Corps", icon: "body" },
  { key: "habits", label: "Habitudes", icon: "checkbox" },
  { key: "journal", label: "Journal", icon: "book" },
];

function isProgressionTab(v: unknown): v is Tab {
  return typeof v === "string" && TABS.some((t) => t.key === v);
}

export default function ProgressionHub() {
  const router = useRouter();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(
    isProgressionTab(tabParam) ? tabParam : "overview",
  );
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [wellness, setWellness] = useState<WellnessLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyJournal, setDailyJournal] = useState<DailyJournalEntry[]>([]);

  // Re-sync the active tab whenever we're pushed here with a `?tab=...`
  // param — this screen stays mounted across tab-bar switches, so a plain
  // useState initializer alone wouldn't react to a later navigation.
  useFocusEffect(
    useCallback(() => {
      if (isProgressionTab(tabParam)) setTab(tabParam);
    }, [tabParam]),
  );

  const reload = useCallback(async () => {
    const [s, p, m, h, hl, r, g, w, pr, dj] = await Promise.all([
      getSessions(),
      getPRs(),
      getMeasurements(),
      getHabits(),
      getHabitLogs(),
      getReminders(),
      getGoals(),
      getWellnessLogs(),
      getProfile(),
      getDailyJournal(),
    ]);
    setSessions(s);
    setPRs(p);
    setMeasurements(m);
    setHabits(h);
    setLogs(hl);
    setReminders(r);
    setGoals(g);
    setWellness(w);
    setProfile(pr);
    setDailyJournal(dj);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const scoreProfile = profile ?? {
    weight_kg: null,
    height_cm: null,
    sex: null,
    age: null,
  };
  const today = todayYYYYMMDD();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const score = computeDailyIronflowScore(
    today,
    sessions,
    habits,
    logs,
    wellness,
    dailyJournal,
    scoreProfile,
  );
  const yesterdayScore = computeDailyIronflowScore(
    yesterday,
    sessions,
    habits,
    logs,
    wellness,
    dailyJournal,
    scoreProfile,
  );
  const scoreDelta = score.score - yesterdayScore.score;
  const exercises = listAllExercises(sessions);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Progression</Text>
      </View>

      <View style={styles.segWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segRow}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                testID={`prog-seg-${t.key}`}
                style={[styles.segChip, active && styles.segChipActive]}
                onPress={() => setTab(t.key)}
              >
                <Ionicons
                  name={t.icon}
                  size={13}
                  color={active ? "#fff" : colors.onSurfaceTertiary}
                />
                <Text style={[styles.segLabel, active && { color: "#fff" }]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "overview" && (
          <OverviewView
            score={score}
            scoreDelta={scoreDelta}
            goals={goals}
            sessions={sessions}
            prs={prs}
            measurements={measurements}
            onOpenStats={() => router.push("/stats")}
            onOpenGoals={() => router.push("/goals")}
          />
        )}
        {tab === "exercises" && (
          <ExercisesView exercises={exercises} router={router} />
        )}
        {tab === "records" && (
          <RecordsView prs={prs} router={router} onChanged={reload} />
        )}
        {tab === "level" && (
          <LevelView sessions={sessions} habits={habits} habitLogs={logs} prs={prs} />
        )}
        {tab === "transformation" && (
          <TransformationView
            measurements={measurements}
            router={router}
            onChanged={reload}
          />
        )}
        {tab === "habits" && (
          <HabitsView
            habits={habits}
            reminders={reminders}
            goals={goals}
            router={router}
            onChanged={reload}
          />
        )}
        {tab === "journal" && <JournalView router={router} onChanged={reload} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const size = 140;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
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
        <Text style={styles.scoreValueBig}>{score}</Text>
        <Text style={styles.scoreOn100}>/100</Text>
      </View>
    </View>
  );
}

function OverviewView({
  score,
  scoreDelta,
  goals,
  sessions,
  prs,
  measurements,
  onOpenStats,
  onOpenGoals,
}: {
  score: DailyIronflowScore;
  scoreDelta: number;
  goals: Goal[];
  sessions: WorkoutSession[];
  prs: PersonalRecord[];
  measurements: Measurement[];
  onOpenStats: () => void;
  onOpenGoals: () => void;
}) {
  const activeGoals = goals.filter((g) => !g.achievedAt);
  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.overviewCard}>
        <Text style={styles.overLabel}>IRONFLOW SCORE</Text>
        <ScoreCircle score={score.score} />
        <Text style={styles.overQualitative}>{scoreQualitativeLabel(score.score)}</Text>
        {scoreDelta !== 0 && (
          <View style={styles.overDeltaRow}>
            <Ionicons
              name={scoreDelta > 0 ? "arrow-up" : "arrow-down"}
              size={13}
              color={scoreDelta > 0 ? colors.success : colors.error}
            />
            <Text
              style={[
                styles.overDeltaText,
                { color: scoreDelta > 0 ? colors.success : colors.error },
              ]}
            >
              {scoreDelta > 0 ? "+" : ""}
              {scoreDelta}% par rapport à hier
            </Text>
          </View>
        )}
      </View>

      {/* Objectifs en cours */}
      <View style={styles.sectionHeadRow}>
        <Text style={styles.sectionTitle}>Objectifs en cours</Text>
        <Pressable
          testID="open-goals-shortcut"
          onPress={onOpenGoals}
          hitSlop={8}
        >
          <Text style={styles.linkText}>Gérer</Text>
        </Pressable>
      </View>
      {activeGoals.length === 0 ? (
        <Pressable
          testID="empty-goals-hint"
          style={styles.emptyGoalsCard}
          onPress={onOpenGoals}
        >
          <Ionicons name="flag" size={18} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.emptyGoalsTitle}>Aucun objectif actif</Text>
            <Text style={styles.emptyGoalsSub}>
              Fixe-toi une cible : perte de poids, 20 tractions, 10 km…
            </Text>
          </View>
          <Ionicons name="add-circle" size={20} color={colors.brand} />
        </Pressable>
      ) : (
        activeGoals.slice(0, 5).map((g) => (
          <GoalMiniCard
            key={g.id}
            goal={g}
            sessions={sessions}
            prs={prs}
            measurements={measurements}
            onPress={onOpenGoals}
          />
        ))
      )}

      {/* Détail du score */}
      <Text style={styles.sectionTitle}>Détail du score</Text>
      {score.breakdown.map((b) => {
        const pct = Math.round((b.value / b.max) * 100);
        return (
          <View key={b.key} style={styles.breakdownRowBox}>
            <View style={styles.brHeadRow}>
              <View style={styles.brIconBox}>
                <Ionicons name={b.icon} size={12} color={colors.brand} />
              </View>
              <Text style={styles.brLabelBig}>{b.label}</Text>
              <Text style={styles.brValue}>
                {b.value}/{b.max}
              </Text>
              <View style={styles.brPctBadge}>
                <Text style={styles.brPctText}>{pct}%</Text>
              </View>
            </View>
            <View style={styles.brBar}>
              <View style={[styles.brFill, { width: `${pct}%` }]} />
            </View>
            {b.hint ? <Text style={styles.brHint}>{b.hint}</Text> : null}
          </View>
        );
      })}

      {/* Résumé du jour — explains simply why the score moved */}
      {(score.gains.length > 0 || score.losses.length > 0) && (
        <>
          <Text style={styles.sectionTitle}>Résumé du jour</Text>
          <View style={styles.summaryBox}>
            {score.gains.map((g) => (
              <View key={g.label} style={styles.summaryRow}>
                <Text style={[styles.summaryPoints, { color: colors.success }]}>
                  +{g.points}
                </Text>
                <Text style={styles.summaryLabel}>{g.label}</Text>
              </View>
            ))}
            {score.losses.map((l) => (
              <View key={l.label} style={styles.summaryRow}>
                <Text style={[styles.summaryPoints, { color: colors.error }]}>
                  {l.points}
                </Text>
                <Text style={styles.summaryLabel}>{l.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Pressable
        testID="open-full-stats"
        style={styles.linkBtn}
        onPress={onOpenStats}
      >
        <Ionicons name="stats-chart" size={14} color={colors.brand} />
        <Text style={styles.linkBtnText}>
          Voir toutes les statistiques avancées
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.brand} />
      </Pressable>
    </View>
  );
}

function GoalMiniCard({
  goal,
  sessions,
  prs,
  measurements,
  onPress,
}: {
  goal: Goal;
  sessions: WorkoutSession[];
  prs: PersonalRecord[];
  measurements: Measurement[];
  onPress: () => void;
}) {
  const current = computeGoalCurrent(goal, { sessions, prs, measurements });
  const totalRange = goal.targetValue - goal.startValue;
  let pct = 0;
  if (Math.abs(totalRange) > 0.0001) {
    pct = (current - goal.startValue) / totalRange;
  }
  pct = Math.max(0, Math.min(1, pct));
  const done = pct >= 1;
  return (
    <Pressable
      testID={`overview-goal-${goal.id}`}
      style={styles.miniGoal}
      onPress={onPress}
    >
      <View style={styles.miniGoalHead}>
        <View style={styles.miniGoalIcon}>
          <Ionicons
            name={GOAL_CATEGORY_ICON[goal.category]}
            size={14}
            color={done ? colors.success : colors.brand}
          />
        </View>
        <Text style={styles.miniGoalTitle} numberOfLines={1}>
          {goal.title || GOAL_CATEGORY_LABEL[goal.category]}
        </Text>
        <Text
          style={[
            styles.miniGoalPct,
            done && { color: colors.success },
          ]}
        >
          {Math.round(pct * 100)}%
        </Text>
      </View>
      <View style={styles.brBar}>
        <View
          style={[
            styles.brFill,
            {
              width: `${pct * 100}%`,
              backgroundColor: done ? colors.success : colors.brand,
            },
          ]}
        />
      </View>
      <Text style={styles.miniGoalMeta}>
        {formatNum(current)} {goal.unit} · cible {formatNum(goal.targetValue)}{" "}
        {goal.unit}
      </Text>
    </Pressable>
  );
}

function formatNum(v: number): string {
  if (Math.abs(v) >= 100) return v.toFixed(0);
  return v.toFixed(1).replace(/\.0$/, "");
}

function computeGoalCurrent(
  goal: Goal,
  ctx: {
    sessions: WorkoutSession[];
    prs: PersonalRecord[];
    measurements: Measurement[];
  },
): number {
  switch (goal.category) {
    case "sessions_count":
      return ctx.sessions.length;
    case "streak": {
      const days = Array.from(
        new Set(
          ctx.sessions.map((s) =>
            new Date(s.startedAt).toISOString().slice(0, 10),
          ),
        ),
      ).sort();
      if (days.length === 0) return 0;
      let best = 1;
      let cur = 1;
      for (let i = 1; i < days.length; i++) {
        const prev = new Date(days[i - 1]);
        const nd = new Date(days[i]);
        const diff = Math.round((nd.getTime() - prev.getTime()) / 86400000);
        if (diff === 1) {
          cur++;
          if (cur > best) best = cur;
        } else cur = 1;
      }
      return best;
    }
    case "weight_pr": {
      const w = ctx.prs
        .filter((p) => (p.type ?? "weight") === "weight")
        .map((p) => p.weight_kg ?? 0);
      return w.length ? Math.max(...w) : goal.startValue;
    }
    case "reps_pr": {
      const r = ctx.prs
        .filter((p) => (p.type ?? "weight") === "reps")
        .map((p) => p.reps ?? 0);
      return r.length ? Math.max(...r) : goal.startValue;
    }
    case "run_distance": {
      const d = ctx.prs
        .filter((p) => p.type === "run")
        .map((p) => (p.distance_m ?? 0) / 1000);
      return d.length ? Math.max(...d) : goal.startValue;
    }
    case "body_weight": {
      const last = ctx.measurements.find((m) => m.weight_kg != null);
      return last?.weight_kg ?? goal.startValue;
    }
    case "body_fat": {
      const last = ctx.measurements.find((m) => m.body_fat_pct != null);
      return last?.body_fat_pct ?? goal.startValue;
    }
    default:
      return goal.startValue;
  }
}

function ExercisesView({
  exercises,
  router,
}: {
  exercises: { name: string; count: number }[];
  router: any;
}) {
  const [subTab, setSubTab] = useState<ExerciseCategory>("musculation");
  const [overrides, setOverridesState] = useState<Record<string, ExerciseCategory>>({});

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setOverridesState(await getOverrides());
      })();
    }, []),
  );

  // Merge library + user-done exercises, resolving each to a category
  const merged: {
    name: string;
    category: ExerciseCategory;
    count: number;
    emoji?: string;
    fromLibrary: boolean;
  }[] = [];

  const seenNames = new Set<string>();
  for (const lib of EXERCISE_LIBRARY) {
    const key = lib.name.toLowerCase().trim();
    seenNames.add(key);
    const done = exercises.find(
      (e) => e.name.toLowerCase().trim() === key,
    );
    merged.push({
      name: lib.name,
      category: lib.category,
      count: done?.count ?? 0,
      emoji: lib.emoji,
      fromLibrary: true,
    });
  }
  for (const e of exercises) {
    const key = e.name.toLowerCase().trim();
    if (seenNames.has(key)) continue;
    merged.push({
      name: e.name,
      category: resolveCategory(e.name, overrides),
      count: e.count,
      fromLibrary: false,
    });
  }

  const filtered = merged.filter((m) => m.category === subTab);
  // Sort: first user-active (count > 0), then library
  filtered.sort((a, b) => {
    if ((b.count > 0 ? 1 : 0) - (a.count > 0 ? 1 : 0)) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  const CATS: ExerciseCategory[] = ["musculation", "cardio_machine", "mobility"];

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.exSubtabs}
      >
        {CATS.map((c) => {
          const active = c === subTab;
          const color = EXERCISE_CATEGORY_COLOR[c];
          return (
            <Pressable
              key={c}
              testID={`ex-cat-${c}`}
              style={[
                styles.exSubtab,
                active && { backgroundColor: color + "26", borderColor: color },
              ]}
              onPress={() => setSubTab(c)}
            >
              <Ionicons
                name={EXERCISE_CATEGORY_ICON[c]}
                size={12}
                color={active ? color : colors.onSurfaceTertiary}
              />
              <Text
                style={[
                  styles.exSubtabText,
                  active && { color },
                ]}
              >
                {EXERCISE_CATEGORY_LABEL[c]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="barbell" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>Rien pour l&apos;instant</Text>
          <Text style={styles.emptySub}>Aucun exercice dans cette catégorie.</Text>
        </View>
      ) : (
        filtered.map((e) => {
          const color = EXERCISE_CATEGORY_COLOR[e.category];
          return (
            <Pressable
              key={e.name}
              testID={`ex-detail-${e.name}`}
              style={styles.exerciseCard}
              onPress={() =>
                router.push(`/exercise/${encodeURIComponent(e.name)}`)
              }
            >
              <View
                style={[styles.exIconBox, { backgroundColor: color + "26" }]}
              >
                {e.emoji ? (
                  <Text style={{ fontSize: 15 }}>{e.emoji}</Text>
                ) : (
                  <Ionicons
                    name={EXERCISE_CATEGORY_ICON[e.category]}
                    size={16}
                    color={color}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName} numberOfLines={1}>
                  {e.name}
                </Text>
                <Text style={styles.exMeta}>
                  {e.count > 0
                    ? `${e.count} séance${e.count > 1 ? "s" : ""}`
                    : "Pas encore pratiqué"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.onSurfaceTertiary}
              />
            </Pressable>
          );
        })
      )}
    </>
  );
}

function RecordsView({
  prs,
  router,
  onChanged,
}: {
  prs: PersonalRecord[];
  router: any;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  // Group PRs by exercise name (lowercased)
  const grouped: Record<string, { name: string; prs: PersonalRecord[] }> = {};
  for (const pr of prs) {
    const key = pr.exerciseName.toLowerCase().trim();
    if (!grouped[key])
      grouped[key] = { name: pr.exerciseName, prs: [] };
    grouped[key].prs.push(pr);
  }
  const groups = Object.values(grouped).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <>
      <Pressable
        testID="new-record-btn"
        style={styles.ctaFull}
        onPress={() => router.push("/pr/new")}
      >
        <Ionicons name="add-circle" size={18} color="#fff" />
        <Text style={styles.ctaFullText}>NOUVEAU RECORD</Text>
      </Pressable>

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trophy" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>Aucun record</Text>
          <Text style={styles.emptySub}>
            Enregistre tes performances (1RM développé couché, 5 km, max tractions…) pour suivre tes progrès.
          </Text>
        </View>
      ) : (
        groups.map((g) => {
          // Get best PR per type for this exercise
          const weightPRs = g.prs.filter((p) => (p.type ?? "weight") === "weight");
          const bestWeight = weightPRs
            .slice()
            .sort((a, b) => estimatedOneRM(b) - estimatedOneRM(a))[0];
          const isOpen = expanded === g.name;
          return (
            <View key={g.name} style={styles.recordGroup}>
              <Pressable
                testID={`record-group-${g.name}`}
                onPress={() => setExpanded(isOpen ? null : g.name)}
                style={styles.recordHead}
              >
                <View style={styles.recordIcon}>
                  <Ionicons name="trophy" size={16} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordName} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={styles.recordSub}>
                    {g.prs.length} record{g.prs.length > 1 ? "s" : ""}
                  </Text>
                </View>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.onSurfaceTertiary}
                />
              </Pressable>

              {isOpen && (
                <View style={styles.recordBody}>
                  {/* Progression chart for this exercise */}
                  <RecordProgressionChart prs={g.prs} />

                  {g.prs
                    .slice()
                    .sort((a, b) => (b.date < a.date ? -1 : 1))
                    .map((pr) => (
                      <RecordRow key={pr.id} pr={pr} onChanged={onChanged} />
                    ))}

                  {bestWeight && (
                    <OneRMCalculator
                      pr={bestWeight}
                      testID={`orm-calc-${g.name}`}
                    />
                  )}
                  {(() => {
                    const bestReps = g.prs
                      .filter((p) => p.type === "reps")
                      .slice()
                      .sort((a, b) => (b.reps ?? 0) - (a.reps ?? 0))[0];
                    return bestReps ? (
                      <RepsCalculator
                        pr={bestReps}
                        testID={`reps-calc-${g.name}`}
                      />
                    ) : null;
                  })()}
                  {(() => {
                    const bestRun = g.prs
                      .filter(
                        (p) =>
                          p.type === "run" &&
                          (p.time_seconds ?? 0) > 0 &&
                          (p.distance_m ?? 0) > 0,
                      )
                      .slice()
                      .sort(
                        (a, b) =>
                          (a.time_seconds ?? 1e9) / (a.distance_m ?? 1) -
                          (b.time_seconds ?? 1e9) / (b.distance_m ?? 1),
                      )[0];
                    return bestRun ? (
                      <CardioCalculator
                        pr={bestRun}
                        testID={`cardio-calc-${g.name}`}
                      />
                    ) : null;
                  })()}
                </View>
              )}
            </View>
          );
        })
      )}
    </>
  );
}

function LevelView({
  sessions,
  habits,
  habitLogs,
  prs,
}: {
  sessions: WorkoutSession[];
  habits: Habit[];
  habitLogs: HabitLog[];
  prs: PersonalRecord[];
}) {
  const xp = computeXPState({ sessions, habits, habitLogs, prs });
  const totalXPForMax = xpForLevel(MAX_LEVEL);
  const overallPct = Math.min(1, xp.xp / totalXPForMax);
  const nextThreshold = xpForLevel(xp.level + 1);
  const currentThreshold = xpForLevel(xp.level);
  const isMax = xp.level >= MAX_LEVEL;

  // Upcoming levels list: next 10 (or up to max)
  const upcoming: { level: number; xpTotal: number; xpDelta: number; badge?: any }[] = [];
  const from = xp.level + 1;
  const to = Math.min(MAX_LEVEL, from + 9);
  for (let lvl = from; lvl <= to; lvl++) {
    const total = xpForLevel(lvl);
    const prev = xpForLevel(lvl - 1);
    upcoming.push({
      level: lvl,
      xpTotal: total,
      xpDelta: total - prev,
      badge: BADGES.find((b) => b.level === lvl),
    });
  }

  return (
    <View style={{ gap: spacing.md }}>
      {/* Hero */}
      <View style={styles.levelHero}>
        <View style={styles.levelHeroLeft}>
          <View style={styles.levelBigBadge}>
            <Text style={styles.levelBigNum}>{xp.level}</Text>
            <Text style={styles.levelBigLbl}>NIVEAU</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.levelXPLabel}>XP TOTAL</Text>
          <Text style={styles.levelXPValue}>
            {xp.xp}
          </Text>
          {isMax ? (
            <Text style={styles.levelHint}>
              🏆 Niveau maximum atteint !
            </Text>
          ) : (
            <Text style={styles.levelHint}>
              {xp.xpToNext} XP → N{xp.level + 1}
            </Text>
          )}
        </View>
      </View>

      {/* Progress toward next level */}
      {!isMax && (
        <View style={styles.levelProgressBox}>
          <View style={styles.levelProgressHead}>
            <Text style={styles.levelProgressText}>
              N{xp.level}
              <Text style={{ color: colors.onSurfaceTertiary }}> ({currentThreshold})</Text>
            </Text>
            <Text style={styles.levelProgressPct}>
              {Math.round(xp.progress * 100)}%
            </Text>
            <Text style={styles.levelProgressText}>
              N{xp.level + 1}
              <Text style={{ color: colors.onSurfaceTertiary }}> ({nextThreshold})</Text>
            </Text>
          </View>
          <View style={styles.levelBigBar}>
            <View
              style={[
                styles.levelBigFill,
                { width: `${xp.progress * 100}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* Overall progress toward MAX_LEVEL */}
      <View style={styles.overallCard}>
        <View style={styles.overallHead}>
          <Ionicons name="trophy" size={14} color={colors.brand} />
          <Text style={styles.overallLabel}>PROGRESSION GLOBALE</Text>
          <Text style={styles.overallPct}>
            {Math.round(overallPct * 100)}%
          </Text>
        </View>
        <View style={styles.overallBar}>
          <View
            style={[
              styles.overallFill,
              { width: `${overallPct * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.overallHint}>
          Niveau {xp.level} / {MAX_LEVEL} · {xp.xp} XP / {totalXPForMax} XP
        </Text>
      </View>

      {/* XP sources */}
      <View style={styles.sourcesCard}>
        <Text style={styles.sourcesTitle}>Comment gagner de l&apos;XP</Text>
        <SourceRow icon="barbell" label="Séance terminée" xp="+50" />
        <SourceRow icon="trophy" label="Nouveau record" xp="+100" />
        <SourceRow icon="checkbox" label="Habitude complétée du jour" xp="+10" />
        <SourceRow icon="flame" label="Journée active (séance)" xp="+5" />
      </View>

      {/* Upcoming levels */}
      {upcoming.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Prochains niveaux</Text>
          {upcoming.map((u) => (
            <View
              key={u.level}
              style={[
                styles.upNext,
                u.badge && { borderLeftColor: u.badge.color, borderLeftWidth: 4 },
              ]}
              testID={`upcoming-${u.level}`}
            >
              <View style={styles.upBadge}>
                <Text style={styles.upBadgeNum}>{u.level}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upTitle}>
                  Niveau {u.level}
                  {u.badge ? ` · ${u.badge.emoji} ${u.badge.title}` : ""}
                </Text>
                <Text style={styles.upSub}>
                  {u.xpTotal} XP total · +{u.xpDelta} XP à gagner
                </Text>
              </View>
              {u.badge && (
                <View
                  style={[
                    styles.upBadgeChip,
                    { backgroundColor: u.badge.color + "30", borderColor: u.badge.color },
                  ]}
                >
                  <Text style={styles.upBadgeChipEmoji}>{u.badge.emoji}</Text>
                </View>
              )}
            </View>
          ))}
        </>
      )}

      {/* Unlocked badges */}
      {xp.unlockedBadges.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Badges débloqués</Text>
          <View style={styles.badgesGrid}>
            {xp.unlockedBadges.map((b) => (
              <View
                key={b.level}
                style={[
                  styles.bigBadgeItem,
                  { borderColor: b.color, backgroundColor: b.color + "20" },
                ]}
              >
                <Text style={{ fontSize: 26 }}>{b.emoji}</Text>
                <Text style={styles.bigBadgeTitle} numberOfLines={1}>
                  {b.title}
                </Text>
                <Text style={styles.bigBadgeLvl}>N{b.level}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function SourceRow({ icon, label, xp }: { icon: any; label: string; xp: string }) {
  return (
    <View style={styles.sourceRow}>
      <View style={styles.sourceIcon}>
        <Ionicons name={icon} size={13} color={colors.brand} />
      </View>
      <Text style={styles.sourceLabel}>{label}</Text>
      <Text style={styles.sourceXP}>{xp}</Text>
    </View>
  );
}

function estimatedOneRM(pr: PersonalRecord): number {
  const w = pr.weight_kg ?? 0;
  const r = pr.reps ?? 1;
  if (r <= 1) return w;
  return w * (1 + r / 30);
}

/** Derive a scalar value from a PR for chart plotting. */
function prScalar(pr: PersonalRecord): { value: number; unit: string } {
  const type = pr.type ?? "weight";
  if (type === "weight") return { value: estimatedOneRM(pr), unit: "kg" };
  if (type === "reps") return { value: pr.reps ?? 0, unit: "reps" };
  if (type === "run") {
    // Score = km/h speed to make “higher is better”.
    const d = pr.distance_m ?? 0;
    const t = pr.time_seconds ?? 0;
    const speedKmh = t > 0 ? (d / 1000) / (t / 3600) : 0;
    return { value: Number(speedKmh.toFixed(2)), unit: "km/h" };
  }
  return { value: 0, unit: "" };
}

function RecordProgressionChart({ prs }: { prs: PersonalRecord[] }) {
  // Group by type and pick the dominant one (max count)
  const byType: Record<string, PersonalRecord[]> = {};
  for (const pr of prs) {
    const t = pr.type ?? "weight";
    if (!byType[t]) byType[t] = [];
    byType[t].push(pr);
  }
  const dominant = Object.entries(byType).sort(
    (a, b) => b[1].length - a[1].length,
  )[0];
  if (!dominant) return null;
  const list = dominant[1]
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (list.length < 2) {
    return (
      <View style={styles.chartHintMini}>
        <Ionicons name="analytics" size={12} color={colors.brand} />
        <Text style={styles.chartHintText}>
          Ajoute un 2ᵉ record pour voir la progression.
        </Text>
      </View>
    );
  }
  const points = list.map((pr) => {
    const s = prScalar(pr);
    return { value: s.value, label: shortDate(pr.date) };
  });
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const delta = last - first;
  const pct = first > 0 ? (delta / first) * 100 : 0;
  const unit = prScalar(list[0]).unit;
  const chartW = Dimensions.get("window").width - spacing.lg * 2 - 48;

  return (
    <View style={styles.recordChartWrap}>
      <View style={styles.recordChartHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.recordChartLabel}>PROGRESSION</Text>
          <Text style={styles.recordChartValue}>
            {first.toFixed(1)} → {last.toFixed(1)} {unit}
          </Text>
        </View>
        <View
          style={[
            styles.deltaPill,
            {
              backgroundColor:
                delta >= 0 ? colors.success + "30" : colors.error + "30",
            },
          ]}
        >
          <Ionicons
            name={delta >= 0 ? "trending-up" : "trending-down"}
            size={12}
            color={delta >= 0 ? colors.success : colors.error}
          />
          <Text
            style={[
              styles.deltaText,
              { color: delta >= 0 ? colors.success : colors.error },
            ]}
          >
            {delta >= 0 ? "+" : ""}
            {pct.toFixed(1)}%
          </Text>
        </View>
      </View>
      <LineChart
        data={points}
        color={colors.brand}
        thickness={3}
        areaChart
        startFillColor={colors.brand}
        startOpacity={0.35}
        endFillColor={colors.brand}
        endOpacity={0.05}
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisTextStyle={{ color: colors.onSurfaceTertiary, fontSize: 9 }}
        xAxisLabelTextStyle={{
          color: colors.onSurfaceTertiary,
          fontSize: 8,
        }}
        hideRules
        width={chartW}
        height={110}
        isAnimated
        curved
        dataPointsColor={colors.brand}
        dataPointsRadius={3}
      />
    </View>
  );
}

function RecordRow({
  pr,
  onChanged,
}: {
  pr: PersonalRecord;
  onChanged: () => void;
}) {
  const type = pr.type ?? "weight";
  let main = "—";
  let sub = "";
  if (type === "weight") {
    main = `${pr.weight_kg} kg × ${pr.reps}`;
    sub = `1RM estimé : ${estimatedOneRM(pr).toFixed(1)} kg`;
  } else if (type === "reps") {
    main = `${pr.reps} reps`;
    sub = "au poids du corps";
  } else if (type === "run") {
    const km = (pr.distance_m ?? 0) / 1000;
    const t = pr.time_seconds ?? 0;
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    const time =
      h > 0
        ? `${h}h${String(m).padStart(2, "0")}`
        : `${m}:${String(s).padStart(2, "0")}`;
    main = `${km.toFixed(1)} km`;
    sub = time;
  }
  return (
    <SwipeableRow
      testID={`record-row-${pr.id}`}
      onDelete={async () => {
        await deletePR(pr.id);
        onChanged();
      }}
      deleteConfirm={{
        title: "Supprimer ce record ?",
        message: `${main} — cette action est définitive.`,
        confirmLabel: "SUPPRIMER",
        destructive: true,
      }}
    >
      <View style={styles.recordRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.recordRowMain}>{main}</Text>
          {sub ? <Text style={styles.recordRowSub}>{sub}</Text> : null}
        </View>
        <Text style={styles.recordRowDate}>{formatDateShort(pr.date)}</Text>
      </View>
    </SwipeableRow>
  );
}

function OneRMCalculator({
  pr,
  testID,
}: {
  pr: PersonalRecord;
  testID?: string;
}) {
  const [pct, setPct] = useState(70);
  const oneRM = estimatedOneRM(pr);
  const load = (oneRM * pct) / 100;
  // Round to nearest 2.5 kg
  const roundedLoad = Math.round(load / 2.5) * 2.5;
  return (
    <View style={styles.calcCard} testID={testID}>
      <View style={styles.calcHead}>
        <Ionicons name="calculator" size={14} color={colors.brand} />
        <Text style={styles.calcTitle}>Calculateur % de 1RM</Text>
      </View>
      <Text style={styles.calcSub}>
        1RM estimé : <Text style={styles.calcAccent}>{oneRM.toFixed(1)} kg</Text>
      </Text>
      <View style={styles.calcRow}>
        {[50, 60, 70, 80, 90, 95].map((p) => {
          const active = p === pct;
          return (
            <Pressable
              key={p}
              testID={`${testID}-pct-${p}`}
              style={[
                styles.pctChip,
                active && { backgroundColor: colors.brand, borderColor: colors.brand },
              ]}
              onPress={() => setPct(p)}
            >
              <Text
                style={[
                  styles.pctChipText,
                  active && { color: "#fff" },
                ]}
              >
                {p}%
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.calcResult}>
        <Text style={styles.calcResultVal}>{roundedLoad.toFixed(1)} kg</Text>
        <Text style={styles.calcResultHint}>à {pct}% de 1RM</Text>
      </View>
    </View>
  );
}

function RepsCalculator({
  pr,
  testID,
}: {
  pr: PersonalRecord;
  testID?: string;
}) {
  const [pct, setPct] = useState(70);
  const maxReps = pr.reps ?? 0;
  const target = Math.round((maxReps * pct) / 100);
  return (
    <View style={styles.calcCard} testID={testID}>
      <View style={styles.calcHead}>
        <Ionicons name="repeat" size={14} color={colors.brand} />
        <Text style={styles.calcTitle}>Calculateur % du record reps</Text>
      </View>
      <Text style={styles.calcSub}>
        Max reps : <Text style={styles.calcAccent}>{maxReps} reps</Text>
      </Text>
      <View style={styles.calcRow}>
        {[50, 60, 70, 80, 90, 95].map((p) => {
          const active = p === pct;
          return (
            <Pressable
              key={p}
              testID={`${testID}-pct-${p}`}
              style={[
                styles.pctChip,
                active && { backgroundColor: colors.brand, borderColor: colors.brand },
              ]}
              onPress={() => setPct(p)}
            >
              <Text
                style={[styles.pctChipText, active && { color: "#fff" }]}
              >
                {p}%
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.calcResult}>
        <Text style={styles.calcResultVal}>{target} reps</Text>
        <Text style={styles.calcResultHint}>à {pct}% du max</Text>
      </View>
    </View>
  );
}

function CardioCalculator({
  pr,
  testID,
}: {
  pr: PersonalRecord;
  testID?: string;
}) {
  // At X% intensity, an athlete typically runs slower (=> higher pace/time)
  // Pace scale: target_pace = ref_pace * 100 / pct
  const [pct, setPct] = useState(80);
  const distanceM = pr.distance_m ?? 0;
  const timeS = pr.time_seconds ?? 0;
  const refPace = timeS / (distanceM / 1000); // seconds per km
  const targetPace = pct > 0 ? refPace * (100 / pct) : 0;
  const targetTime = (targetPace * distanceM) / 1000;
  const formatSec = (s: number) => {
    if (!s || !isFinite(s)) return "—";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.round(s % 60);
    if (h > 0)
      return `${h}h${String(m).padStart(2, "0")}min${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };
  const formatPace = (s: number) =>
    !s || !isFinite(s) ? "—" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}/km`;

  return (
    <View style={styles.calcCard} testID={testID}>
      <View style={styles.calcHead}>
        <Ionicons name="speedometer" size={14} color={colors.brand} />
        <Text style={styles.calcTitle}>Calculateur % du record cardio</Text>
      </View>
      <Text style={styles.calcSub}>
        Record :{" "}
        <Text style={styles.calcAccent}>
          {(distanceM / 1000).toFixed(1)} km en {formatSec(timeS)} (
          {formatPace(refPace)})
        </Text>
      </Text>
      <View style={styles.calcRow}>
        {[50, 60, 70, 80, 90, 95].map((p) => {
          const active = p === pct;
          return (
            <Pressable
              key={p}
              testID={`${testID}-pct-${p}`}
              style={[
                styles.pctChip,
                active && { backgroundColor: colors.brand, borderColor: colors.brand },
              ]}
              onPress={() => setPct(p)}
            >
              <Text
                style={[styles.pctChipText, active && { color: "#fff" }]}
              >
                {p}%
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.calcResult}>
        <Text style={styles.calcResultVal}>{formatPace(targetPace)}</Text>
        <Text style={styles.calcResultHint}>
          ≈ {formatSec(targetTime)} pour {(distanceM / 1000).toFixed(1)} km à {pct}%
        </Text>
      </View>
    </View>
  );
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function TransformationView({
  measurements,
  router,
  onChanged,
}: {
  measurements: Measurement[];
  router: any;
  onChanged: () => void;
}) {
  const withPhotos = measurements.filter((m) => m.photoBase64);
  return (
    <>
      <View style={styles.summaryGrid}>
        <SummaryTile
          icon="camera"
          value={String(withPhotos.length)}
          label="Photos"
          onPress={() => withPhotos.length >= 2 && router.push("/compare")}
        />
        <SummaryTile
          icon="resize"
          value={String(measurements.length)}
          label="Mesures"
          onPress={() => router.push("/measurement/new")}
        />
      </View>

      <Pressable
        testID="add-measurement-btn"
        style={styles.ctaFull}
        onPress={() => router.push("/measurement/new")}
      >
        <Ionicons name="add-circle" size={18} color="#fff" />
        <Text style={styles.ctaFullText}>NOUVELLE MESURE</Text>
      </Pressable>

      {withPhotos.length >= 2 && (
        <Pressable
          testID="open-compare"
          style={styles.linkBtn}
          onPress={() => router.push("/compare")}
        >
          <Ionicons name="images" size={14} color={colors.brand} />
          <Text style={styles.linkBtnText}>Comparer avant/après</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brand} />
        </Pressable>
      )}

      {measurements.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="body" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>Aucune mesure</Text>
          <Text style={styles.emptySub}>
            Ajoute ta première mesure pour suivre ta transformation.
          </Text>
        </View>
      ) : (
        <>
          <BodyStatsChart measurements={measurements} />
          <Text style={styles.sectionTitle}>Historique</Text>
          {measurements.slice(0, 20).map((m) => (
            <SwipeableRow
              key={m.id}
              testID={`m-item-${m.id}`}
              onDelete={async () => {
                await deleteMeasurement(m.id);
                onChanged();
              }}
              deleteConfirm={{
                title: "Supprimer cette mesure ?",
                message: `Mesure du ${formatDate(m.date)} — cette action est définitive.`,
                confirmLabel: "SUPPRIMER",
                destructive: true,
              }}
              onEdit={() => router.push(`/measurement/${m.id}`)}
            >
              <Pressable
                testID={`m-item-${m.id}`}
                style={styles.mCard}
                onPress={() => router.push(`/measurement/${m.id}`)}
              >
                <Text style={styles.mDate}>{formatDate(m.date)}</Text>
                <View style={styles.mMetrics}>
                  {m.weight_kg != null && (
                    <MetricChip label={`${m.weight_kg} kg`} />
                  )}
                  {m.body_fat_pct != null && (
                    <MetricChip label={`${m.body_fat_pct}% MG`} />
                  )}
                  {m.waist_cm != null && (
                    <MetricChip label={`Taille ${m.waist_cm}`} />
                  )}
                </View>
              </Pressable>
            </SwipeableRow>
          ))}
        </>
      )}
    </>
  );
}

function BodyStatsChart({ measurements }: { measurements: Measurement[] }) {
  type StatKey =
    | "weight_kg"
    | "body_fat_pct"
    | "waist_cm"
    | "chest_cm"
    | "hips_cm"
    | "arm_cm"
    | "thigh_cm"
    | "neck_cm";

  const STAT_META: Record<StatKey, { label: string; icon: any; unit: string }> = {
    weight_kg: { label: "Poids", icon: "body", unit: "kg" },
    body_fat_pct: { label: "Masse grasse", icon: "pulse", unit: "%" },
    waist_cm: { label: "Taille", icon: "resize", unit: "cm" },
    chest_cm: { label: "Poitrine", icon: "shirt", unit: "cm" },
    hips_cm: { label: "Hanches", icon: "resize", unit: "cm" },
    arm_cm: { label: "Bras", icon: "barbell", unit: "cm" },
    thigh_cm: { label: "Cuisses", icon: "walk", unit: "cm" },
    neck_cm: { label: "Cou", icon: "man", unit: "cm" },
  };

  const PERIODS: PeriodKey[] = ["7d", "30d", "6m", "1y", "all"];

  // Detect which stats have at least 1 recorded value
  const availableStats = (Object.keys(STAT_META) as StatKey[]).filter((k) =>
    measurements.some((m) => (m as any)[k] != null),
  );

  const [stat, setStat] = useState<StatKey>(
    (availableStats[0] ?? "weight_kg") as StatKey,
  );
  const [period, setPeriod] = useState<PeriodKey>("6m");

  if (availableStats.length === 0) return null;
  // Ensure current stat is available
  const effectiveStat = availableStats.includes(stat) ? stat : availableStats[0];

  const now = new Date();
  let cutoff = new Date(0);
  if (period === "7d") cutoff = new Date(now.getTime() - 7 * 86400000);
  else if (period === "30d") cutoff = new Date(now.getTime() - 30 * 86400000);
  else if (period === "6m") {
    cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 6);
  } else if (period === "1y") {
    cutoff = new Date(now);
    cutoff.setFullYear(cutoff.getFullYear() - 1);
  }

  // Build sorted asc list of points for that stat in period
  const points = measurements
    .filter((m) => (m as any)[effectiveStat] != null)
    .filter((m) => new Date(m.date) >= cutoff)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((m) => ({
      value: Number((m as any)[effectiveStat]),
      label: shortDate(m.date),
    }));

  const chartW = Dimensions.get("window").width - spacing.lg * 2 - 32;
  const meta = STAT_META[effectiveStat];
  const first = points[0]?.value ?? 0;
  const last = points[points.length - 1]?.value ?? 0;
  const delta = last - first;

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.sectionTitle}>Graphique de progression</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bodyChipRow}
      >
        {availableStats.map((s) => {
          const active = s === effectiveStat;
          const m = STAT_META[s];
          return (
            <Pressable
              key={s}
              testID={`body-stat-${s}`}
              style={[styles.bodyChip, active && styles.bodyChipActive]}
              onPress={() => setStat(s)}
            >
              <Ionicons
                name={m.icon}
                size={11}
                color={active ? "#fff" : colors.onSurfaceTertiary}
              />
              <Text
                style={[
                  styles.bodyChipText,
                  active && { color: "#fff" },
                ]}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bodyChipRow}
      >
        {PERIODS.map((p) => {
          const active = p === period;
          return (
            <Pressable
              key={p}
              testID={`body-period-${p}`}
              style={[styles.bodyChipMini, active && styles.bodyChipMiniActive]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.bodyChipMiniText,
                  active && { color: colors.brand },
                ]}
              >
                {PERIOD_LABEL[p]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {points.length >= 2 ? (
        <View style={styles.chartWrap}>
          <View style={styles.chartHeadRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.chartTitleBody}>
                {meta.label} ({meta.unit})
              </Text>
              <Text style={styles.chartDelta}>
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)} {meta.unit} sur la période
              </Text>
            </View>
            <View style={styles.chartCurrentBox}>
              <Text style={styles.chartCurrentVal}>{last}</Text>
              <Text style={styles.chartCurrentUnit}>{meta.unit}</Text>
            </View>
          </View>
          <LineChart
            data={points}
            color={colors.brand}
            thickness={3}
            areaChart
            startFillColor={colors.brand}
            startOpacity={0.4}
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
        </View>
      ) : (
        <View style={styles.hintBanner}>
          <Ionicons name="information-circle" size={14} color={colors.brand} />
          <Text style={styles.hintBannerText}>
            Enregistre au moins 2 mesures de {meta.label.toLowerCase()} sur cette période.
          </Text>
        </View>
      )}
    </View>
  );
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function HabitsView({
  habits,
  reminders,
  goals,
  router,
  onChanged,
}: {
  habits: Habit[];
  reminders: Reminder[];
  goals: Goal[];
  router: any;
  onChanged: () => void;
}) {
  const [sub, setSub] = useState<"habits" | "reminders" | "goals">("habits");
  return (
    <>
      <View style={styles.subTabRow}>
        {[
          { key: "habits", label: "Habitudes", icon: "checkbox" },
          { key: "reminders", label: "Rappels", icon: "alarm" },
          { key: "goals", label: "Objectifs", icon: "flag" },
        ].map((s) => {
          const active = sub === s.key;
          return (
            <Pressable
              key={s.key}
              testID={`sub-${s.key}`}
              style={[styles.subTab, active && styles.subTabActive]}
              onPress={() => setSub(s.key as any)}
            >
              <Ionicons
                name={s.icon as any}
                size={13}
                color={active ? "#fff" : colors.onSurfaceTertiary}
              />
              <Text
                style={[
                  styles.subTabLabel,
                  active && { color: "#fff" },
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {sub === "habits" && (
        <>
          <Pressable
            testID="add-habit-btn"
            style={styles.ctaFull}
            onPress={() => router.push("/habit/new")}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.ctaFullText}>AJOUTER UNE HABITUDE</Text>
          </Pressable>
          {habits.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkbox" size={40} color={colors.brand} />
              <Text style={styles.emptyTitle}>Aucune habitude</Text>
              <Text style={styles.emptySub}>
                Ajoute des habitudes (eau, marche, sommeil…) pour renforcer ton score.
              </Text>
            </View>
          ) : (
            habits.map((h) => (
              <SwipeableRow
                key={h.id}
                testID={`habit-${h.id}`}
                onDelete={async () => {
                  await deleteHabit(h.id);
                  onChanged();
                }}
                deleteConfirm={{
                  title: "Supprimer cette habitude ?",
                  message: `"${h.title}" — cette action est définitive.`,
                  confirmLabel: "SUPPRIMER",
                  destructive: true,
                }}
                onEdit={() => router.push(`/habit/${h.id}`)}
              >
                <Pressable
                  testID={`habit-${h.id}`}
                  style={styles.habitCard}
                  onPress={() => router.push(`/habit/${h.id}`)}
                >
                  <View style={[styles.habitIcon, { backgroundColor: colors.brandTertiary }]}>
                    <Ionicons name="checkbox" size={16} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.habitTitle}>{h.title}</Text>
                    <Text style={styles.habitMeta}>
                      Cible : {h.target ?? 1} {h.unit ?? ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
                </Pressable>
              </SwipeableRow>
            ))
          )}
        </>
      )}

      {sub === "reminders" && (
        <>
          <Pressable
            testID="add-reminder-btn"
            style={styles.ctaFull}
            onPress={() => router.push("/reminder/new")}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.ctaFullText}>AJOUTER UN RAPPEL</Text>
          </Pressable>
          <View style={styles.hintBanner}>
            <Ionicons name="information-circle" size={14} color={colors.brand} />
            <Text style={styles.hintBannerText}>
              Les rappels s&apos;activent après publication de l&apos;app avec les notifications push.
            </Text>
          </View>
          {reminders.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="alarm" size={40} color={colors.brand} />
              <Text style={styles.emptyTitle}>Aucun rappel</Text>
              <Text style={styles.emptySub}>
                Crée des rappels pour tes séances, ton hydratation, tes mesures…
              </Text>
            </View>
          ) : (
            reminders.map((r) => (
              <SwipeableRow
                key={r.id}
                testID={`reminder-${r.id}`}
                onDelete={async () => {
                  await deleteReminder(r.id);
                  onChanged();
                }}
                deleteConfirm={{
                  title: "Supprimer ce rappel ?",
                  message: `"${r.title || REMINDER_KIND_LABEL[r.kind]}" — cette action est définitive.`,
                  confirmLabel: "SUPPRIMER",
                  destructive: true,
                }}
                onEdit={() => router.push(`/reminder/${r.id}`)}
              >
                <Pressable
                  testID={`reminder-${r.id}`}
                  style={styles.habitCard}
                  onPress={() => router.push(`/reminder/${r.id}`)}
                >
                  <View style={[styles.habitIcon, { backgroundColor: colors.brandTertiary }]}>
                    <Ionicons
                      name={REMINDER_KIND_ICON[r.kind]}
                      size={16}
                      color={colors.brand}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.habitTitle}>{r.title || REMINDER_KIND_LABEL[r.kind]}</Text>
                    <Text style={styles.habitMeta}>
                      {r.time} · {formatDaysOfWeek(r.daysOfWeek)} ·{" "}
                      {r.enabled ? "actif" : "désactivé"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
                </Pressable>
              </SwipeableRow>
            ))
          )}
        </>
      )}

      {sub === "goals" && (
        <>
          <Pressable
            testID="open-goals-full"
            style={styles.ctaFull}
            onPress={() => router.push("/goals")}
          >
            <Ionicons name="flag" size={18} color="#fff" />
            <Text style={styles.ctaFullText}>GÉRER LES OBJECTIFS</Text>
          </Pressable>
          {goals.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="flag" size={40} color={colors.brand} />
              <Text style={styles.emptyTitle}>Aucun objectif</Text>
              <Text style={styles.emptySub}>
                Fixe-toi une cible : 20 tractions, 10 km, 12% de masse grasse…
              </Text>
            </View>
          ) : (
            goals.slice(0, 10).map((g) => (
              <Pressable
                key={g.id}
                testID={`goal-preview-${g.id}`}
                style={styles.habitCard}
                onPress={() => router.push("/goals")}
              >
                <View style={[styles.habitIcon, { backgroundColor: colors.brandTertiary }]}>
                  <Ionicons name="flag" size={16} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.habitTitle} numberOfLines={1}>
                    {g.title || g.category}
                  </Text>
                  <Text style={styles.habitMeta}>
                    Cible : {g.targetValue} {g.unit}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
              </Pressable>
            ))
          )}
        </>
      )}
    </>
  );
}

function formatDaysOfWeek(days: number[]): string {
  if (days.length === 7) return "Tous les jours";
  if (days.length === 0) return "—";
  const names = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return days.map((d) => names[d]).join(", ");
}

function JournalView({
  router,
  onChanged,
}: {
  router: any;
  onChanged: () => void;
}) {
  const [entries, setEntries] = useState<DailyJournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const list = await getDailyJournal();
    setEntries(list.sort((a, b) => (a.date < b.date ? 1 : -1)));
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <>
      <Pressable
        testID="open-daily-journal"
        style={styles.ctaFull}
        onPress={() => router.push("/daily-journal")}
      >
        <Ionicons name="book" size={18} color="#fff" />
        <Text style={styles.ctaFullText}>NOTE DU JOUR</Text>
      </Pressable>

      {loaded && entries.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>Journal quotidien</Text>
          <Text style={styles.emptySub}>
            Note ton énergie, ton stress, tes douleurs. Revois ton évolution jour après jour.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Historique</Text>
          {entries.map((e) => (
            <SwipeableRow
              key={e.date}
              testID={`journal-entry-${e.date}`}
              onDelete={async () => {
                await deleteDailyJournalEntry(e.date);
                await reload();
                onChanged();
              }}
              deleteConfirm={{
                title: "Supprimer cette entrée ?",
                message: `Journal du ${formatJournalDate(e.date)} — cette action est définitive.`,
                confirmLabel: "SUPPRIMER",
                destructive: true,
              }}
            >
              <Pressable
                testID={`journal-entry-${e.date}`}
                style={styles.journalEntryCard}
                onPress={() => router.push("/daily-journal")}
              >
                <View style={styles.pastHead}>
                  <Text style={styles.pastDate}>{formatJournalDate(e.date)}</Text>
                  <View style={styles.pastRatings}>
                    {e.energy != null && <MiniBadge label="⚡" value={e.energy} />}
                    {e.mood != null && <MiniBadge label="🙂" value={e.mood} />}
                    {e.stress != null && <MiniBadge label="⚠️" value={e.stress} />}
                  </View>
                </View>
                {e.sleep_hours != null && (
                  <Text style={styles.journalEntryMeta}>
                    😴 {e.sleep_hours.toFixed(1)}h de sommeil
                  </Text>
                )}
                {e.pain_zones && e.pain_zones.length > 0 ? (
                  <Text style={styles.journalEntryMeta} numberOfLines={2}>
                    🩹{" "}
                    {e.pain_zones
                      .map((z) => `${PAIN_ZONE_LABEL[z.zone]} ${z.intensity}/10`)
                      .join(" · ")}
                  </Text>
                ) : null}
                {e.notes ? (
                  <Text style={styles.pastNotes} numberOfLines={3}>
                    {e.notes}
                  </Text>
                ) : null}
              </Pressable>
            </SwipeableRow>
          ))}
        </>
      )}
    </>
  );
}

function formatJournalDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function SummaryTile({
  icon,
  value,
  label,
  onPress,
}: {
  icon: any;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.sumTile} onPress={onPress}>
      <Ionicons name={icon} size={16} color={colors.brand} />
      <Text style={styles.sumValue}>{value}</Text>
      <Text style={styles.sumLabel}>{label}</Text>
    </Pressable>
  );
}

function MetricChip({ label }: { label: string }) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipText}>{label}</Text>
    </View>
  );
}

function MiniBadge({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.miniJournalBadge}>
      <Text style={styles.miniJournalBadgeText}>
        {label} {value}
      </Text>
    </View>
  );
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  segWrap: { maxHeight: 48 },
  segRow: {
    paddingHorizontal: spacing.lg,
    gap: 6,
    paddingBottom: spacing.sm,
    alignItems: "center",
  },
  segChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  segLabel: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 60 },
  overviewCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: spacing.md,
  },
  overLabel: {
    color: colors.brand,
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: "800",
  },
  overQualitative: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
  },
  overDeltaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  overDeltaText: { fontSize: 12, fontWeight: "700" },
  summaryBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryPoints: { fontWeight: "800", fontSize: 13, minWidth: 34 },
  summaryLabel: { color: colors.onSurfaceSecondary, fontSize: 12, flex: 1 },
  scoreValueBig: { color: colors.onSurface, fontSize: 42, fontWeight: "800" },
  scoreOn100: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "600" },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: spacing.md,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
  },
  breakdownRowBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  brHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  brLabel: { width: 110, color: colors.onSurfaceSecondary, fontSize: 12 },
  brLabelBig: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "700",
  },
  brHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  linkText: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  emptyGoalsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    padding: spacing.md,
  },
  emptyGoalsTitle: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 13,
  },
  emptyGoalsSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  miniGoal: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
  },
  miniGoalHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniGoalIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  miniGoalTitle: {
    flex: 1,
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 13,
  },
  miniGoalPct: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 13,
  },
  miniGoalMeta: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "600",
  },
  brBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 4,
    overflow: "hidden",
  },
  brFill: { height: "100%", backgroundColor: colors.brand },
  brValue: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
    width: 50,
    textAlign: "right",
  },
  brPctBadge: {
    backgroundColor: colors.brand,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginLeft: 6,
    minWidth: 46,
    alignItems: "center",
  },
  brPctText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    marginTop: spacing.md,
  },
  linkBtnText: {
    flex: 1,
    color: colors.brand,
    fontWeight: "700",
    fontSize: 13,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  exName: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 14,
    textTransform: "capitalize",
  },
  exMeta: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  exSubtabs: {
    gap: 6,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  exSubtab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  exSubtabText: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  summaryGrid: { flexDirection: "row", gap: 8 },
  sumTile: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  sumValue: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
  sumLabel: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "600" },
  ctaFull: {
    backgroundColor: colors.brand,
    padding: 14,
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  ctaFullText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  mCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  mDate: {
    color: colors.brand,
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  mMetrics: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  metricChip: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  metricChipText: { color: colors.onSurface, fontSize: 11, fontWeight: "700" },
  journalEntryCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  journalEntryMeta: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
  },
  pastHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pastDate: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "capitalize",
  },
  pastRatings: { flexDirection: "row", gap: 4 },
  pastNotes: { color: colors.onSurfaceSecondary, fontSize: 12, lineHeight: 16 },
  miniJournalBadge: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniJournalBadgeText: {
    color: colors.onSurface,
    fontSize: 10,
    fontWeight: "700",
  },
  recordGroup: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  recordHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  recordName: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 14,
    textTransform: "capitalize",
  },
  recordSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  recordBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordRowMain: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 14,
  },
  recordRowSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  recordRowDate: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "700",
  },
  calcCard: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
    marginTop: 4,
  },
  calcHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calcTitle: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  calcSub: {
    color: colors.onSurfaceSecondary,
    fontSize: 11,
  },
  calcAccent: {
    color: colors.onSurface,
    fontWeight: "800",
  },
  calcRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  pctChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pctChipText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "800",
    fontSize: 11,
  },
  calcResult: {
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    marginTop: 4,
  },
  calcResultVal: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 26,
  },
  calcResultHint: {
    color: "#fff",
    opacity: 0.9,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  recordChartWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordChartHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recordChartLabel: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  recordChartValue: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  deltaText: {
    fontWeight: "800",
    fontSize: 12,
  },
  chartHintMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
  },
  chartHintText: {
    color: colors.brandSecondary,
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  levelHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
  },
  levelHeroLeft: {
    alignItems: "center",
  },
  levelBigBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#ffffff40",
  },
  levelBigNum: { color: colors.brand, fontSize: 32, fontWeight: "800" },
  levelBigLbl: {
    color: colors.brand,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  levelXPLabel: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    opacity: 0.9,
  },
  levelXPValue: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
  },
  levelHint: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
    fontWeight: "700",
  },
  levelProgressBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
  },
  levelProgressHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelProgressText: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
  },
  levelProgressPct: {
    color: colors.brand,
    fontSize: 15,
    fontWeight: "800",
  },
  levelBigBar: {
    height: 10,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 5,
    overflow: "hidden",
  },
  levelBigFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
  overallCard: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.brand + "50",
  },
  overallHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overallLabel: {
    flex: 1,
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  overallPct: {
    color: colors.brand,
    fontSize: 15,
    fontWeight: "800",
  },
  overallBar: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: "hidden",
  },
  overallFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  overallHint: {
    color: colors.brandSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  sourcesCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
  },
  sourcesTitle: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
  },
  sourceIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceLabel: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: "700",
  },
  sourceXP: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  upNext: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 6,
  },
  upBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  upBadgeNum: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
  },
  upTitle: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "800",
  },
  upSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  upBadgeChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  upBadgeChipEmoji: { fontSize: 16 },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bigBadgeItem: {
    width: "48%",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  bigBadgeTitle: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center",
  },
  bigBadgeLvl: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "700",
  },
  empty: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  emptyTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  emptySub: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  habitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  habitTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
  habitMeta: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  subTabRow: {
    flexDirection: "row",
    gap: 6,
    padding: 4,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  subTabActive: { backgroundColor: colors.brand },
  subTabLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    fontWeight: "700",
  },
  hintBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brandTertiary,
    padding: 10,
    borderRadius: radius.sm,
  },
  hintBannerText: {
    flex: 1,
    color: colors.brandSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  bodyChipRow: { gap: 6, paddingVertical: 2 },
  bodyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bodyChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  bodyChipText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 11,
  },
  bodyChipMini: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bodyChipMiniActive: {
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brand,
  },
  bodyChipMiniText: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  chartWrap: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  chartHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  chartTitleBody: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
  },
  chartDelta: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  chartCurrentBox: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  chartCurrentVal: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: "800",
  },
  chartCurrentUnit: {
    color: colors.brandSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
});
