import { ReactNode, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Image,
  Modal,
} from "react-native";
import { useConfirmDialog } from "@/src/hooks/use-confirm-dialog";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { LineChart } from "react-native-gifted-charts";
import { coloredShadow, motion, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { Theme } from "@/src/themes/types";
import ThemedBackground from "@/src/themes/ThemedBackground";
import Card from "@/src/components/ui/Card";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";
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
import { computeAdvancedStats } from "@/src/utils/stats";
import { computeHighlights, Highlight } from "@/src/utils/highlights";
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
  { key: "goals", label: "Objectifs", icon: "flag" },
  { key: "journal", label: "Journal", icon: "book" },
];

/** The 4 sub-tabs grouped visually under the "Performances sportives" section. */
const PERFORMANCE_TABS: Tab[] = ["overview", "exercises", "records", "level"];

/** 5 top-level sections shown to the user: Transformation physique,
 * Performances sportives (groups score/exercices/records/niveau),
 * Habitudes, Objectifs, Journal. Purely a display grouping — the
 * underlying `Tab` values (and progressionHref deep links) are unchanged. */
const OUTER_GROUPS: { key: string; label: string; icon: any; tabs: Tab[] }[] = [
  { key: "transformation", label: "Corps", icon: "body", tabs: ["transformation"] },
  { key: "performance", label: "Performances", icon: "trophy", tabs: PERFORMANCE_TABS },
  { key: "habits", label: "Habitudes", icon: "checkbox", tabs: ["habits"] },
  { key: "goals", label: "Objectifs", icon: "flag", tabs: ["goals"] },
  { key: "journal", label: "Journal", icon: "book", tabs: ["journal"] },
];

function isProgressionTab(v: unknown): v is Tab {
  return typeof v === "string" && TABS.some((t) => t.key === v);
}

/** Cascade d'entrée en fondu — même patron que le Dashboard/Entraînements
 * (`FadeInDown.delay(index*30)`), absent de cet écran jusqu'ici (listes
 * Exercices/Records/Niveau qui "popaient" sans transition). */
function EnterItem({ index, children }: { index: number; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(motion.base)}>
      {children}
    </Animated.View>
  );
}

export default function ProgressionHub() {
  const { theme } = useTheme();
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
  const score = computeDailyIronflowScore(
    today,
    sessions,
    habits,
    logs,
    wellness,
    dailyJournal,
    scoreProfile,
  );
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const score7dAgo = computeDailyIronflowScore(
    sevenDaysAgo,
    sessions,
    habits,
    logs,
    wellness,
    dailyJournal,
    scoreProfile,
  );
  const advancedStats = computeAdvancedStats(sessions);
  const highlights = computeHighlights({
    prs,
    goals,
    streakDays: advancedStats.currentStreakDays,
    scoreTrendPts: score.score - score7dAgo.score,
  });
  const exercises = listAllExercises(sessions);

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
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Mon évolution</Text>
      </View>

      <View style={styles.segWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segRow}
        >
          {OUTER_GROUPS.map((g) => {
            const active = g.tabs.includes(tab);
            return (
              <Pressable
                key={g.key}
                testID={`prog-seg-${g.key}`}
                style={[
                  styles.segChip,
                  {
                    borderRadius: theme.radius.pill,
                    backgroundColor: active ? theme.colors.brand : theme.colors.surfaceSecondary,
                    borderColor: active ? theme.colors.brand : theme.colors.border,
                  },
                ]}
                onPress={() => setTab(active ? tab : g.tabs[0])}
              >
                <Ionicons
                  name={g.icon}
                  size={13}
                  color={active ? theme.colors.onSurface : theme.colors.onSurfaceTertiary}
                />
                <Text
                  style={[
                    styles.segLabel,
                    { color: active ? theme.colors.onSurface : theme.colors.onSurfaceSecondary },
                  ]}
                >
                  {g.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {PERFORMANCE_TABS.includes(tab) && (
        <View style={styles.segWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segRow}
          >
            {TABS.filter((t) => PERFORMANCE_TABS.includes(t.key)).map((t) => {
              const active = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  testID={`prog-seg-inner-${t.key}`}
                  style={[
                    styles.subTab,
                    {
                      borderRadius: theme.radius.pill,
                      backgroundColor: active ? theme.colors.brand : theme.colors.surfaceSecondary,
                      borderColor: active ? theme.colors.brand : theme.colors.border,
                    },
                  ]}
                  onPress={() => setTab(t.key)}
                >
                  <Ionicons
                    name={t.icon}
                    size={12}
                    color={active ? theme.colors.onSurface : theme.colors.onSurfaceTertiary}
                  />
                  <Text
                    style={[
                      styles.subTabLabel,
                      { color: active ? theme.colors.onSurface : theme.colors.onSurfaceTertiary },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "overview" && (
          <OverviewView
            score={score}
            highlights={highlights}
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
            router={router}
            onChanged={reload}
          />
        )}
        {tab === "goals" && <GoalsView goals={goals} router={router} />}
        {tab === "journal" && <JournalView router={router} onChanged={reload} />}
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Même traitement que le ScoreCircle du Dashboard (Phase 1) : violet,
 * remplissage animé — la même donnée affichée à deux endroits doit se
 * comporter et se colorer de façon identique. */
function ScoreCircle({ score }: { score: number }) {
  const { theme } = useTheme();
  const size = 140;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(100, Math.max(0, score)) / 100, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c - progress.value * c,
  }));

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
          stroke={theme.colors.surfaceTertiary}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.colors.progress}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={c}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={[styles.scoreValueBig, { color: theme.colors.onSurface }]}>{score}</Text>
        <Text style={[styles.scoreOn100, { color: theme.colors.onSurfaceTertiary }]}>/100</Text>
      </View>
    </View>
  );
}

function OverviewView({
  score,
  highlights,
  goals,
  sessions,
  prs,
  measurements,
  onOpenStats,
  onOpenGoals,
}: {
  score: DailyIronflowScore;
  highlights: Highlight[];
  goals: Goal[];
  sessions: WorkoutSession[];
  prs: PersonalRecord[];
  measurements: Measurement[];
  onOpenStats: () => void;
  onOpenGoals: () => void;
}) {
  const { theme } = useTheme();
  const activeGoals = goals.filter((g) => !g.achievedAt);
  return (
    <View style={{ gap: spacing.md }}>
      {/* L'app doit raconter l'évolution, pas seulement l'afficher — une
          rangée de moments marquants (record, série, tendance, objectif
          atteint) avant même le score du jour. Masquée s'il n'y a rien à
          célébrer, plutôt qu'une section vide. */}
      {highlights.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.highlightsRow}
        >
          {highlights.map((h) => (
            <View
              key={h.key}
              style={[
                styles.highlightCard,
                { backgroundColor: theme.colors.progressTertiary, borderRadius: theme.radius.md, borderColor: theme.colors.progress },
              ]}
            >
              <Text style={styles.highlightEmoji}>{h.emoji}</Text>
              <Text style={[styles.highlightTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {h.title}
              </Text>
              {h.subtitle && (
                <Text style={[styles.highlightSubtitle, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
                  {h.subtitle}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <Card elevated style={styles.overviewCard}>
        <Text style={[styles.overLabel, { color: theme.colors.onSurfaceTertiary }]}>IRONFLOW SCORE</Text>
        <ScoreCircle score={score.score} />
        <Text style={[styles.overQualitative, { color: theme.colors.onSurface }]}>
          {scoreQualitativeLabel(score.score)}
        </Text>
      </Card>

      {/* Objectifs en cours */}
      <View style={styles.sectionHeadRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Objectifs en cours</Text>
        <Pressable
          testID="open-goals-shortcut"
          onPress={onOpenGoals}
          hitSlop={8}
        >
          <Text style={[styles.linkText, { color: theme.colors.brand }]}>Gérer</Text>
        </Pressable>
      </View>
      {activeGoals.length === 0 ? (
        <PressableScale testID="empty-goals-hint" onPress={onOpenGoals}>
          <Card style={styles.emptyGoalsCard}>
            <Ionicons name="flag" size={18} color={theme.colors.progress} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.emptyGoalsTitle, { color: theme.colors.onSurface }]}>Aucun objectif actif</Text>
              <Text style={[styles.emptyGoalsSub, { color: theme.colors.onSurfaceTertiary }]}>
                Fixe-toi une cible : perte de poids, 20 tractions, 10 km…
              </Text>
            </View>
            <Ionicons name="add-circle" size={20} color={theme.colors.brand} />
          </Card>
        </PressableScale>
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
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Détail du score</Text>
      {score.breakdown.map((b) => {
        const pct = Math.round((b.value / b.max) * 100);
        return (
          <Card key={b.key} style={styles.breakdownRowBox}>
            <View style={styles.brHeadRow}>
              <View style={[styles.brIconBox, { backgroundColor: theme.colors.brandTertiary }]}>
                <Ionicons name={b.icon} size={12} color={theme.colors.brand} />
              </View>
              <Text style={[styles.brLabelBig, { color: theme.colors.onSurface }]}>{b.label}</Text>
              <Text style={[styles.brValue, { color: theme.colors.onSurfaceTertiary }]}>
                {b.value}/{b.max}
              </Text>
              <View style={[styles.brPctBadge, { backgroundColor: theme.colors.surfaceTertiary }]}>
                <Text style={[styles.brPctText, { color: theme.colors.onSurface }]}>{pct}%</Text>
              </View>
            </View>
            <View style={[styles.brBar, { backgroundColor: theme.colors.surfaceTertiary }]}>
              <View style={[styles.brFill, { width: `${pct}%`, backgroundColor: theme.colors.brand }]} />
            </View>
            {b.hint ? <Text style={[styles.brHint, { color: theme.colors.onSurfaceTertiary }]}>{b.hint}</Text> : null}
          </Card>
        );
      })}

      {/* Résumé du jour — explains simply why the score moved */}
      {(score.gains.length > 0 || score.losses.length > 0) && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Résumé du jour</Text>
          <View style={[styles.summaryBox, { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, borderColor: theme.colors.border }]}>
            {score.gains.map((g) => (
              <View key={g.label} style={styles.summaryRow}>
                <Text style={[styles.summaryPoints, { color: theme.colors.success }]}>
                  +{g.points}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceSecondary }]}>{g.label}</Text>
              </View>
            ))}
            {score.losses.map((l) => (
              <View key={l.label} style={styles.summaryRow}>
                <Text style={[styles.summaryPoints, { color: theme.colors.error }]}>
                  {l.points}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceSecondary }]}>{l.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Pressable
        testID="open-full-stats"
        style={[styles.linkBtn, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
        onPress={onOpenStats}
      >
        <Ionicons name="stats-chart" size={14} color={theme.colors.brand} />
        <Text style={[styles.linkBtnText, { color: theme.colors.brand }]}>
          Voir toutes les statistiques avancées
        </Text>
        <Ionicons name="chevron-forward" size={14} color={theme.colors.brand} />
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
  const { theme } = useTheme();
  const current = computeGoalCurrent(goal, { sessions, prs, measurements });
  const totalRange = goal.targetValue - goal.startValue;
  let pct = 0;
  if (Math.abs(totalRange) > 0.0001) {
    pct = (current - goal.startValue) / totalRange;
  }
  pct = Math.max(0, Math.min(1, pct));
  const done = pct >= 1;
  return (
    <PressableScale testID={`overview-goal-${goal.id}`} onPress={onPress}>
      <Card style={styles.miniGoal}>
        <View style={styles.miniGoalHead}>
          <View style={[styles.miniGoalIcon, { backgroundColor: theme.colors.surfaceTertiary }]}>
            <Ionicons
              name={GOAL_CATEGORY_ICON[goal.category]}
              size={14}
              color={done ? theme.colors.success : theme.colors.progress}
            />
          </View>
          <Text style={[styles.miniGoalTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {goal.title || GOAL_CATEGORY_LABEL[goal.category]}
          </Text>
          <Text
            style={[
              styles.miniGoalPct,
              // progressSecondary : progress échoue le contraste AA à cette
              // taille sur surfaceSecondary (vérifié, 4.1:1 < 4.5:1).
              { color: done ? theme.colors.success : theme.colors.progressSecondary },
            ]}
          >
            {Math.round(pct * 100)}%
          </Text>
        </View>
        <View style={[styles.brBar, { backgroundColor: theme.colors.surfaceTertiary }]}>
          <View
            style={[
              styles.brFill,
              {
                width: `${pct * 100}%`,
                backgroundColor: done ? theme.colors.success : theme.colors.progress,
              },
            ]}
          />
        </View>
        <Text style={[styles.miniGoalMeta, { color: theme.colors.onSurfaceTertiary }]}>
          {formatNum(current)} {goal.unit} · cible {formatNum(goal.targetValue)}{" "}
          {goal.unit}
        </Text>
      </Card>
    </PressableScale>
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
  const { theme } = useTheme();
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
                {
                  backgroundColor: active ? withAlpha(color, 15) : theme.colors.surfaceSecondary,
                  borderColor: active ? color : theme.colors.border,
                },
              ]}
              onPress={() => setSubTab(c)}
            >
              <Ionicons
                name={EXERCISE_CATEGORY_ICON[c]}
                size={12}
                color={active ? color : theme.colors.onSurfaceTertiary}
              />
              <Text
                style={[
                  styles.exSubtabText,
                  { color: active ? color : theme.colors.onSurfaceSecondary },
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
          <Ionicons name="barbell" size={40} color={theme.colors.brand} />
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Rien pour l&apos;instant</Text>
          <Text style={[styles.emptySub, { color: theme.colors.onSurfaceTertiary }]}>
            Aucun exercice dans cette catégorie.
          </Text>
        </View>
      ) : (
        filtered.map((e, i) => {
          const color = EXERCISE_CATEGORY_COLOR[e.category];
          return (
            <EnterItem key={e.name} index={i}>
              <PressableScale
                testID={`ex-detail-${e.name}`}
                onPress={() =>
                  router.push(`/exercise/${encodeURIComponent(e.name)}`)
                }
              >
                <Card style={styles.exerciseCard}>
                  <View
                    style={[styles.exIconBox, { backgroundColor: withAlpha(color, 15) }]}
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
                    <Text style={[styles.exName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                      {e.name}
                    </Text>
                    <Text style={[styles.exMeta, { color: theme.colors.onSurfaceTertiary }]}>
                      {e.count > 0
                        ? `${e.count} séance${e.count > 1 ? "s" : ""}`
                        : "Pas encore pratiqué"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.colors.onSurfaceTertiary}
                  />
                </Card>
              </PressableScale>
            </EnterItem>
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
  const { theme } = useTheme();
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
        style={[styles.ctaFull, { borderRadius: theme.radius.md }, ctaGlassStyle(theme)]}
        onPress={() => router.push("/pr/new")}
      >
        <Ionicons name="add-circle" size={18} color={ctaGlassColor(theme)} />
        <Text style={[styles.ctaFullText, { color: ctaGlassColor(theme) }]}>NOUVEAU RECORD</Text>
      </Pressable>

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trophy" size={40} color={theme.colors.brand} />
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Aucun record</Text>
          <Text style={[styles.emptySub, { color: theme.colors.onSurfaceTertiary }]}>
            Enregistre tes performances (1RM développé couché, 5 km, max tractions…) pour suivre tes progrès.
          </Text>
        </View>
      ) : (
        groups.map((g, gi) => {
          // Get best PR per type for this exercise
          const weightPRs = g.prs.filter((p) => (p.type ?? "weight") === "weight");
          const bestWeight = weightPRs
            .slice()
            .sort((a, b) => estimatedOneRM(b) - estimatedOneRM(a))[0];
          const isOpen = expanded === g.name;
          return (
            <EnterItem key={g.name} index={gi}>
            <Card padding={0} style={styles.recordGroup}>
              <Pressable
                testID={`record-group-${g.name}`}
                onPress={() => setExpanded(isOpen ? null : g.name)}
                style={styles.recordHead}
              >
                <View style={[styles.recordIcon, { backgroundColor: theme.colors.brandTertiary }]}>
                  <Ionicons name="trophy" size={16} color={theme.colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recordName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={[styles.recordSub, { color: theme.colors.onSurfaceTertiary }]}>
                    {g.prs.length} record{g.prs.length > 1 ? "s" : ""}
                  </Text>
                </View>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.colors.onSurfaceTertiary}
                />
              </Pressable>

              {isOpen && (
                <View style={styles.recordBody}>
                  {/* Progression chart for this exercise */}
                  <RecordProgressionChart prs={g.prs} />

                  {g.prs
                    .slice()
                    .sort((a, b) => (b.date < a.date ? -1 : 1))
                    .map((pr, pi) => (
                      <RecordRow
                        key={pr.id}
                        pr={pr}
                        onChanged={onChanged}
                        accent={pi === 0 && g.prs.length > 1}
                        badge={pi === 0 && g.prs.length > 1 ? "RÉCENT" : undefined}
                      />
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
            </Card>
            </EnterItem>
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
  const { theme } = useTheme();
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
      {/* Hero — Card elevated (même traitement que le module héros du
          Dashboard) : jusqu'ici un View brut sans ombre malgré le
          commentaire plus bas prétendant une parité visuelle. */}
      <Card elevated style={[styles.levelHero, { borderRadius: theme.radius.md, backgroundColor: theme.colors.progress }]}>
        <View style={styles.levelHeroLeft}>
          <View style={[styles.levelBigBadge, { backgroundColor: theme.colors.onSurface }]}>
            <Text style={[styles.levelBigNum, { color: theme.colors.progress }]}>{xp.level}</Text>
            <Text style={[styles.levelBigLbl, { color: theme.colors.progress }]}>NIVEAU</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.levelXPLabel, { color: theme.colors.onSurface }]}>XP TOTAL</Text>
          <Text style={[styles.levelXPValue, { color: theme.colors.onSurface }]}>
            {xp.xp}
          </Text>
          {isMax ? (
            <Text style={[styles.levelHint, { color: theme.colors.onSurface }]}>
              🏆 Niveau maximum atteint !
            </Text>
          ) : (
            <Text style={[styles.levelHint, { color: theme.colors.onSurface }]}>
              {xp.xpToNext} XP → N{xp.level + 1}
            </Text>
          )}
        </View>
      </Card>

      {/* Progress toward next level */}
      {!isMax && (
        <View style={styles.levelProgressBox}>
          <View style={styles.levelProgressHead}>
            <Text style={[styles.levelProgressText, { color: theme.colors.onSurface }]}>
              N{xp.level}
              <Text style={{ color: theme.colors.onSurfaceTertiary }}> ({currentThreshold})</Text>
            </Text>
            <Text style={[styles.levelProgressPct, { color: theme.colors.progress }]}>
              {Math.round(xp.progress * 100)}%
            </Text>
            <Text style={[styles.levelProgressText, { color: theme.colors.onSurface }]}>
              N{xp.level + 1}
              <Text style={{ color: theme.colors.onSurfaceTertiary }}> ({nextThreshold})</Text>
            </Text>
          </View>
          <View style={[styles.levelBigBar, { backgroundColor: theme.colors.surfaceTertiary }]}>
            <View
              style={[
                styles.levelBigFill,
                { width: `${xp.progress * 100}%`, backgroundColor: theme.colors.progress },
              ]}
            />
          </View>
        </View>
      )}

      {/* Overall progress toward MAX_LEVEL */}
      <Card
        style={[
          styles.overallCard,
          { backgroundColor: theme.colors.progressTertiary, borderColor: withAlpha(theme.colors.progress, 31.5) },
        ]}
      >
        <View style={styles.overallHead}>
          <Ionicons name="trophy" size={14} color={theme.colors.progress} />
          <Text style={[styles.overallLabel, { color: theme.colors.onSurfaceTertiary }]}>PROGRESSION GLOBALE</Text>
          <Text style={[styles.overallPct, { color: theme.colors.onSurface }]}>
            {Math.round(overallPct * 100)}%
          </Text>
        </View>
        <View style={[styles.overallBar, { backgroundColor: theme.colors.surfaceTertiary }]}>
          <View
            style={[
              styles.overallFill,
              { width: `${overallPct * 100}%`, backgroundColor: theme.colors.progress },
            ]}
          />
        </View>
        <Text style={[styles.overallHint, { color: theme.colors.onSurfaceTertiary }]}>
          Niveau {xp.level} / {MAX_LEVEL} · {xp.xp} XP / {totalXPForMax} XP
        </Text>
      </Card>

      {/* XP sources */}
      <Card style={styles.sourcesCard}>
        <Text style={[styles.sourcesTitle, { color: theme.colors.onSurface }]}>Comment gagner de l&apos;XP</Text>
        <SourceRow icon="barbell" label="Séance terminée" xp="+50" />
        <SourceRow icon="trophy" label="Nouveau record" xp="+100" />
        <SourceRow icon="checkbox" label="Habitude complétée du jour" xp="+10" />
        <SourceRow icon="flame" label="Journée active (séance)" xp="+5" />
      </Card>

      {/* Upcoming levels */}
      {upcoming.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Prochains niveaux</Text>
          {upcoming.map((u) => (
            <Card
              key={u.level}
              style={[
                styles.upNext,
                u.badge && { borderLeftColor: u.badge.color, borderLeftWidth: 4 },
              ]}
              testID={`upcoming-${u.level}`}
            >
              <View style={[styles.upBadge, { backgroundColor: theme.colors.surfaceTertiary }]}>
                <Text style={[styles.upBadgeNum, { color: theme.colors.onSurface }]}>{u.level}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.upTitle, { color: theme.colors.onSurface }]}>
                  Niveau {u.level}
                  {u.badge ? ` · ${u.badge.emoji} ${u.badge.title}` : ""}
                </Text>
                <Text style={[styles.upSub, { color: theme.colors.onSurfaceTertiary }]}>
                  {u.xpTotal} XP total · +{u.xpDelta} XP à gagner
                </Text>
              </View>
              {u.badge && (
                <View
                  style={[
                    styles.upBadgeChip,
                    { backgroundColor: withAlpha(u.badge.color, 19), borderColor: u.badge.color },
                  ]}
                >
                  <Text style={styles.upBadgeChipEmoji}>{u.badge.emoji}</Text>
                </View>
              )}
            </Card>
          ))}
        </>
      )}

      {/* Unlocked badges */}
      {xp.unlockedBadges.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Badges débloqués</Text>
          <View style={styles.badgesGrid}>
            {xp.unlockedBadges.map((b) => (
              <View
                key={b.level}
                style={[
                  styles.bigBadgeItem,
                  { borderRadius: theme.radius.md, borderColor: b.color, backgroundColor: withAlpha(b.color, 12.5) },
                ]}
              >
                <Text style={{ fontSize: 26 }}>{b.emoji}</Text>
                <Text style={[styles.bigBadgeTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {b.title}
                </Text>
                <Text style={[styles.bigBadgeLvl, { color: theme.colors.onSurfaceTertiary }]}>N{b.level}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function SourceRow({ icon, label, xp }: { icon: any; label: string; xp: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sourceRow}>
      <View style={[styles.sourceIcon, { backgroundColor: theme.colors.brandTertiary }]}>
        <Ionicons name={icon} size={13} color={theme.colors.brand} />
      </View>
      <Text style={[styles.sourceLabel, { color: theme.colors.onSurface }]}>{label}</Text>
      <Text style={[styles.sourceXP, { color: theme.colors.brand }]}>{xp}</Text>
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
  const { theme } = useTheme();
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
      <View style={[styles.chartHintMini, { backgroundColor: theme.colors.brandTertiary }]}>
        <Ionicons name="analytics" size={12} color={theme.colors.brand} />
        <Text style={[styles.chartHintText, { color: theme.colors.brandSecondary }]}>
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
    <View
      style={[
        styles.recordChartWrap,
        { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.recordChartHead}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.recordChartLabel, { color: theme.colors.data.performance }]}>PROGRESSION</Text>
          <Text style={[styles.recordChartValue, { color: theme.colors.onSurface }]}>
            {first.toFixed(1)} → {last.toFixed(1)} {unit}
          </Text>
        </View>
        <View
          style={[
            styles.deltaPill,
            {
              backgroundColor:
                delta >= 0 ? withAlpha(theme.colors.success, 19) : withAlpha(theme.colors.error, 19),
            },
          ]}
        >
          <Ionicons
            name={delta >= 0 ? "trending-up" : "trending-down"}
            size={12}
            color={delta >= 0 ? theme.colors.success : theme.colors.error}
          />
          <Text
            style={[
              styles.deltaText,
              { color: delta >= 0 ? theme.colors.success : theme.colors.error },
            ]}
          >
            {delta >= 0 ? "+" : ""}
            {pct.toFixed(1)}%
          </Text>
        </View>
      </View>
      <LineChart
        data={points}
        color={theme.colors.data.performance}
        thickness={3}
        areaChart
        startFillColor={theme.colors.data.performance}
        startOpacity={0.35}
        endFillColor={theme.colors.data.performance}
        endOpacity={0.05}
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 9 }}
        xAxisLabelTextStyle={{
          color: theme.colors.onSurfaceTertiary,
          fontSize: 8,
        }}
        hideRules
        width={chartW}
        height={110}
        isAnimated
        curved
        dataPointsColor={theme.colors.data.performance}
        dataPointsRadius={3}
      />
    </View>
  );
}

/** CTA plein-largeur (6 sites d'appel dans ce fichier) — sous Sunset, "Active
 * Glass" (fond Sunset translucide + bordure + lueur douce) plutôt qu'un pavé
 * orange plein (§7 du brief Liquid Glass : "le Sunset comme lumière, pas
 * comme fond de bouton"). Sous Classique, rendu inchangé (pavé `brand` plein,
 * texte/icône blancs). */
function ctaGlassStyle(theme: Theme) {
  if (theme.card.mode !== "glass") {
    return { backgroundColor: theme.colors.brand };
  }
  return [
    {
      backgroundColor: withAlpha(theme.colors.brand, 18),
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.brand, 50),
    },
    coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
  ];
}
function ctaGlassColor(theme: Theme) {
  return theme.card.mode === "glass" ? theme.colors.brand : "#fff";
}

/** Chip de pourcentage des calculateurs 1RM/reps/allure — même logique
 * "Active Glass" pour l'état sélectionné. */
function pctChipStyle(theme: Theme, active: boolean) {
  if (!active) {
    return { backgroundColor: theme.colors.surface, borderColor: theme.colors.border };
  }
  if (theme.card.mode !== "glass") {
    return { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand };
  }
  return [
    { backgroundColor: withAlpha(theme.colors.brand, 20), borderColor: withAlpha(theme.colors.brand, 50) },
    coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.28, radius: 6, elevation: 2 }),
  ];
}
function pctChipTextColor(theme: Theme, active: boolean) {
  if (!active) return theme.colors.onSurfaceSecondary;
  return theme.card.mode === "glass" ? theme.colors.brand : theme.colors.onSurface;
}

/** Bandeau résultat des calculateurs — même traitement "Active Glass" que les
 * chips ci-dessus, jamais un pavé orange plein sous Sunset. */
function calcResultStyle(theme: Theme) {
  if (theme.card.mode !== "glass") {
    return { backgroundColor: theme.colors.brand };
  }
  return [
    {
      backgroundColor: withAlpha(theme.colors.brand, 16),
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.brand, 45),
    },
    coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.25, radius: 10, elevation: 3 }),
  ];
}
function calcResultTextColor(theme: Theme) {
  return theme.card.mode === "glass" ? theme.colors.brand : "#fff";
}

function RecordRow({
  pr,
  onChanged,
  accent,
  badge,
}: {
  pr: PersonalRecord;
  onChanged: () => void;
  /** Record le plus significatif d'un groupe (le plus récent) — bordure +
   * lueur Sunset douces (§8.3 du brief : "MEILLEUR RECORD" ressort, les
   * autres restent neutres). */
  accent?: boolean;
  badge?: string;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { confirm, ConfirmModal } = useConfirmDialog();
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
      onEdit={() => router.push(`/pr/${pr.id}` as any)}
    >
      <PressableScale testID={`record-row-${pr.id}-body`} onPress={() => router.push(`/pr/${pr.id}` as any)}>
        <GlassCard
          level="subtle"
          accent={accent ? theme.colors.brand : undefined}
          style={[
            styles.recordRow,
            { borderRadius: theme.radius.sm },
            !accent && { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.recordRowMainRow}>
              <Text style={[styles.recordRowMain, { color: theme.colors.onSurface }]}>{main}</Text>
              {accent && badge ? (
                <View
                  style={[
                    styles.recordBadge,
                    {
                      borderRadius: theme.radius.pill,
                      backgroundColor:
                        theme.card.mode === "glass" ? withAlpha(theme.colors.brand, 22) : theme.colors.brand,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.recordBadgeText,
                      { color: theme.card.mode === "glass" ? theme.colors.brand : "#fff" },
                    ]}
                  >
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
            {sub ? <Text style={[styles.recordRowSub, { color: theme.colors.onSurfaceTertiary }]}>{sub}</Text> : null}
          </View>
          <Text style={[styles.recordRowDate, { color: theme.colors.onSurfaceTertiary }]}>
            {formatDateShort(pr.date)}
          </Text>
          <PressableScale
            testID={`record-row-${pr.id}-menu`}
            hitSlop={10}
            style={styles.recordMenuBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              setMenuOpen(true);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.onSurfaceTertiary} />
          </PressableScale>
        </GlassCard>
      </PressableScale>

      {/* Menu "⋯" — même actions que le swipe (Modifier/Supprimer), mais
          toujours accessible par un simple tap : le swipe seul s'est avéré
          peu découvrable en usage réel. */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[
              styles.menuSheet,
              { backgroundColor: theme.colors.surfaceSecondary, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg, borderColor: theme.colors.border },
            ]}
          >
            <View style={[styles.menuHandle, { backgroundColor: theme.colors.border }]} />
            <PressableScale
              testID={`record-row-${pr.id}-menu-edit`}
              style={styles.menuRow}
              onPress={() => {
                setMenuOpen(false);
                router.push(`/pr/${pr.id}` as any);
              }}
            >
              <Ionicons name="pencil" size={18} color={theme.colors.onSurface} />
              <Text style={[styles.menuRowText, { color: theme.colors.onSurface }]}>Modifier</Text>
            </PressableScale>
            <PressableScale
              testID={`record-row-${pr.id}-menu-delete`}
              style={styles.menuRow}
              onPress={async () => {
                setMenuOpen(false);
                const ok = await confirm({
                  title: "Supprimer ce record ?",
                  message: `${main} — cette action est définitive.`,
                  confirmLabel: "SUPPRIMER",
                  destructive: true,
                });
                if (!ok) return;
                await deletePR(pr.id);
                onChanged();
              }}
            >
              <Ionicons name="trash" size={18} color={theme.colors.error} />
              <Text style={[styles.menuRowText, { color: theme.colors.error }]}>Supprimer</Text>
            </PressableScale>
          </Pressable>
        </Pressable>
      </Modal>
      {ConfirmModal}
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
  const { theme } = useTheme();
  const [pct, setPct] = useState(70);
  const oneRM = estimatedOneRM(pr);
  const load = (oneRM * pct) / 100;
  // Round to nearest 2.5 kg
  const roundedLoad = Math.round(load / 2.5) * 2.5;
  return (
    <Card style={[styles.calcCard, { backgroundColor: theme.colors.brandTertiary }]} testID={testID}>
      <View style={styles.calcHead}>
        <Ionicons name="calculator" size={14} color={theme.colors.brand} />
        <Text style={[styles.calcTitle, { color: theme.colors.brand }]}>Calculateur % de 1RM</Text>
      </View>
      <Text style={[styles.calcSub, { color: theme.colors.onSurfaceSecondary }]}>
        1RM estimé : <Text style={[styles.calcAccent, { color: theme.colors.onSurface }]}>{oneRM.toFixed(1)} kg</Text>
      </Text>
      <View style={styles.calcRow}>
        {[50, 60, 70, 80, 90, 95].map((p) => {
          const active = p === pct;
          return (
            <Pressable
              key={p}
              testID={`${testID}-pct-${p}`}
              style={[styles.pctChip, pctChipStyle(theme, active)]}
              onPress={() => setPct(p)}
            >
              <Text style={[styles.pctChipText, { color: pctChipTextColor(theme, active) }]}>
                {p}%
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.calcResult, { borderRadius: theme.radius.md }, calcResultStyle(theme)]}>
        <Text style={[styles.calcResultVal, { color: calcResultTextColor(theme) }]}>{roundedLoad.toFixed(1)} kg</Text>
        <Text style={[styles.calcResultHint, { color: calcResultTextColor(theme) }]}>à {pct}% de 1RM</Text>
      </View>
    </Card>
  );
}

function RepsCalculator({
  pr,
  testID,
}: {
  pr: PersonalRecord;
  testID?: string;
}) {
  const { theme } = useTheme();
  const [pct, setPct] = useState(70);
  const maxReps = pr.reps ?? 0;
  const target = Math.round((maxReps * pct) / 100);
  return (
    <Card style={[styles.calcCard, { backgroundColor: theme.colors.brandTertiary }]} testID={testID}>
      <View style={styles.calcHead}>
        <Ionicons name="repeat" size={14} color={theme.colors.brand} />
        <Text style={[styles.calcTitle, { color: theme.colors.brand }]}>Calculateur % du record reps</Text>
      </View>
      <Text style={[styles.calcSub, { color: theme.colors.onSurfaceSecondary }]}>
        Max reps : <Text style={[styles.calcAccent, { color: theme.colors.onSurface }]}>{maxReps} reps</Text>
      </Text>
      <View style={styles.calcRow}>
        {[50, 60, 70, 80, 90, 95].map((p) => {
          const active = p === pct;
          return (
            <Pressable
              key={p}
              testID={`${testID}-pct-${p}`}
              style={[styles.pctChip, pctChipStyle(theme, active)]}
              onPress={() => setPct(p)}
            >
              <Text style={[styles.pctChipText, { color: pctChipTextColor(theme, active) }]}>
                {p}%
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.calcResult, { borderRadius: theme.radius.md }, calcResultStyle(theme)]}>
        <Text style={[styles.calcResultVal, { color: calcResultTextColor(theme) }]}>{target} reps</Text>
        <Text style={[styles.calcResultHint, { color: calcResultTextColor(theme) }]}>à {pct}% du max</Text>
      </View>
    </Card>
  );
}

function CardioCalculator({
  pr,
  testID,
}: {
  pr: PersonalRecord;
  testID?: string;
}) {
  const { theme } = useTheme();
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
    <Card style={[styles.calcCard, { backgroundColor: theme.colors.brandTertiary }]} testID={testID}>
      <View style={styles.calcHead}>
        <Ionicons name="speedometer" size={14} color={theme.colors.brand} />
        <Text style={[styles.calcTitle, { color: theme.colors.brand }]}>Calculateur % du record cardio</Text>
      </View>
      <Text style={[styles.calcSub, { color: theme.colors.onSurfaceSecondary }]}>
        Record :{" "}
        <Text style={[styles.calcAccent, { color: theme.colors.onSurface }]}>
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
              style={[styles.pctChip, pctChipStyle(theme, active)]}
              onPress={() => setPct(p)}
            >
              <Text style={[styles.pctChipText, { color: pctChipTextColor(theme, active) }]}>
                {p}%
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.calcResult, { borderRadius: theme.radius.md }, calcResultStyle(theme)]}>
        <Text style={[styles.calcResultVal, { color: calcResultTextColor(theme) }]}>{formatPace(targetPace)}</Text>
        <Text style={[styles.calcResultHint, { color: calcResultTextColor(theme) }]}>
          ≈ {formatSec(targetTime)} pour {(distanceM / 1000).toFixed(1)} km à {pct}%
        </Text>
      </View>
    </Card>
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
  const { theme } = useTheme();
  const withPhotos = measurements.filter((m) => m.photoBase64);
  const hasComparison = withPhotos.length >= 2;
  // measurements is sorted newest-first (getMeasurements) — same for the
  // withPhotos subset, so [0] is the latest photo and the last one is the
  // oldest, i.e. the true "avant" reference point.
  const latestPhoto = withPhotos[0];
  const firstPhoto = withPhotos[withPhotos.length - 1];
  const weightDelta =
    hasComparison && firstPhoto.weight_kg != null && latestPhoto.weight_kg != null
      ? latestPhoto.weight_kg - firstPhoto.weight_kg
      : null;

  return (
    <>
      {hasComparison ? (
        <PressableScale testID="transformation-hero" onPress={() => router.push("/compare")}>
          <Card style={styles.transformHero}>
            <View style={styles.transformPhotoRow}>
              <View style={styles.transformPhotoCol}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${firstPhoto.photoBase64}` }}
                  style={[styles.transformPhoto, { borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceTertiary }]}
                />
                <Text style={[styles.transformPhotoLabel, { color: theme.colors.onSurfaceTertiary }]}>
                  Avant · {formatDateShort(firstPhoto.date)}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={theme.colors.brand} />
              <View style={styles.transformPhotoCol}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${latestPhoto.photoBase64}` }}
                  style={[styles.transformPhoto, { borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceTertiary }]}
                />
                <Text style={[styles.transformPhotoLabel, { color: theme.colors.onSurfaceTertiary }]}>
                  Aujourd&apos;hui · {formatDateShort(latestPhoto.date)}
                </Text>
              </View>
            </View>
            {weightDelta != null && Math.abs(weightDelta) > 0.05 && (
              <View style={styles.transformDeltaRow}>
                <Ionicons
                  name={weightDelta <= 0 ? "trending-down" : "trending-up"}
                  size={14}
                  color={theme.colors.progress}
                />
                <Text style={[styles.transformDeltaText, { color: theme.colors.progressSecondary }]}>
                  {weightDelta > 0 ? "+" : ""}
                  {weightDelta.toFixed(1)} kg depuis le début
                </Text>
              </View>
            )}
            <View style={[styles.transformCta, { borderTopColor: theme.colors.border }]}>
              <Ionicons name="images" size={14} color={theme.colors.brand} />
              <Text style={[styles.transformCtaText, { color: theme.colors.brand }]}>Voir la comparaison complète</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.brand} />
            </View>
          </Card>
        </PressableScale>
      ) : (
        <PressableScale
          testID="transformation-empty-hero"
          onPress={() => router.push("/measurement/new")}
        >
          <Card style={styles.transformEmptyHero}>
            <Ionicons name="camera" size={32} color={theme.colors.brand} />
            <Text style={[styles.transformEmptyTitle, { color: theme.colors.onSurface }]}>
              {withPhotos.length === 0 ? "Commence ta transformation" : "Encore une photo pour comparer"}
            </Text>
            <Text style={[styles.transformEmptySub, { color: theme.colors.onSurfaceTertiary }]}>
              {withPhotos.length === 0
                ? "Ajoute une première photo pour visualiser ton évolution dans le temps."
                : "Ajoute une 2ᵉ photo pour voir un avant/après."}
            </Text>
          </Card>
        </PressableScale>
      )}

      <View style={styles.summaryGrid}>
        <SummaryTile
          icon="camera"
          value={String(withPhotos.length)}
          label="Photos"
          onPress={() => hasComparison && router.push("/compare")}
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
        style={[styles.ctaFull, { borderRadius: theme.radius.md }, ctaGlassStyle(theme)]}
        onPress={() => router.push("/measurement/new")}
      >
        <Ionicons name="add-circle" size={18} color={ctaGlassColor(theme)} />
        <Text style={[styles.ctaFullText, { color: ctaGlassColor(theme) }]}>NOUVELLE MESURE</Text>
      </Pressable>

      {measurements.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="body" size={40} color={theme.colors.brand} />
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Aucune mesure</Text>
          <Text style={[styles.emptySub, { color: theme.colors.onSurfaceTertiary }]}>
            Ajoute ta première mesure pour suivre ta transformation.
          </Text>
        </View>
      ) : (
        <>
          <BodyStatsChart measurements={measurements} />
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Historique</Text>
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
              <PressableScale
                testID={`m-item-${m.id}`}
                onPress={() => router.push(`/measurement/${m.id}`)}
              >
                <Card style={styles.mCard}>
                  <Text style={[styles.mDate, { color: theme.colors.brand }]}>{formatDate(m.date)}</Text>
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
                </Card>
              </PressableScale>
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

  const { theme } = useTheme();
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
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Graphique de progression</Text>
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
              style={[
                styles.bodyChip,
                {
                  backgroundColor: active ? theme.colors.brand : theme.colors.surfaceSecondary,
                  borderColor: active ? theme.colors.brand : theme.colors.border,
                },
              ]}
              onPress={() => setStat(s)}
            >
              <Ionicons
                name={m.icon}
                size={11}
                color={active ? theme.colors.onSurface : theme.colors.onSurfaceTertiary}
              />
              <Text
                style={[
                  styles.bodyChipText,
                  { color: active ? theme.colors.onSurface : theme.colors.onSurfaceSecondary },
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
              style={[
                styles.bodyChipMini,
                {
                  backgroundColor: active ? theme.colors.brandTertiary : theme.colors.surfaceSecondary,
                  borderColor: active ? theme.colors.brand : theme.colors.border,
                },
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.bodyChipMiniText,
                  { color: active ? theme.colors.brand : theme.colors.onSurfaceTertiary },
                ]}
              >
                {PERIOD_LABEL[p]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {points.length >= 2 ? (
        <View
          style={[
            styles.chartWrap,
            { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.chartHeadRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.chartTitleBody, { color: theme.colors.onSurface }]}>
                {meta.label} ({meta.unit})
              </Text>
              <Text style={[styles.chartDelta, { color: theme.colors.brand }]}>
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)} {meta.unit} sur la période
              </Text>
            </View>
            <View style={[styles.chartCurrentBox, { backgroundColor: theme.colors.brandTertiary, borderRadius: theme.radius.sm }]}>
              <Text style={[styles.chartCurrentVal, { color: theme.colors.brand }]}>{last}</Text>
              <Text style={[styles.chartCurrentUnit, { color: theme.colors.brandSecondary }]}>{meta.unit}</Text>
            </View>
          </View>
          <LineChart
            data={points}
            color={theme.colors.brand}
            thickness={3}
            areaChart
            startFillColor={theme.colors.brand}
            startOpacity={0.4}
            endFillColor={theme.colors.brand}
            endOpacity={0.05}
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 10 }}
            xAxisLabelTextStyle={{
              color: theme.colors.onSurfaceTertiary,
              fontSize: 9,
            }}
            hideRules
            width={chartW}
            isAnimated
            curved
            dataPointsColor={theme.colors.brand}
            dataPointsRadius={3}
          />
        </View>
      ) : (
        <View style={[styles.hintBanner, { backgroundColor: theme.colors.brandTertiary, borderRadius: theme.radius.sm }]}>
          <Ionicons name="information-circle" size={14} color={theme.colors.brand} />
          <Text style={[styles.hintBannerText, { color: theme.colors.brandSecondary }]}>
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
  router,
  onChanged,
}: {
  habits: Habit[];
  reminders: Reminder[];
  router: any;
  onChanged: () => void;
}) {
  const { theme } = useTheme();
  const [sub, setSub] = useState<"habits" | "reminders">("habits");
  return (
    <>
      <View
        style={[
          styles.subTabRow,
          { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, borderColor: theme.colors.border },
        ]}
      >
        {[
          { key: "habits", label: "Habitudes", icon: "checkbox" },
          { key: "reminders", label: "Rappels", icon: "alarm" },
        ].map((s) => {
          const active = sub === s.key;
          return (
            <Pressable
              key={s.key}
              testID={`sub-${s.key}`}
              style={[
                styles.subTab,
                {
                  borderRadius: theme.radius.pill,
                  backgroundColor: active ? theme.colors.brand : theme.colors.surfaceSecondary,
                  borderColor: active ? theme.colors.brand : theme.colors.border,
                },
              ]}
              onPress={() => setSub(s.key as any)}
            >
              <Ionicons
                name={s.icon as any}
                size={13}
                color={active ? theme.colors.onSurface : theme.colors.onSurfaceTertiary}
              />
              <Text
                style={[
                  styles.subTabLabel,
                  { color: active ? theme.colors.onSurface : theme.colors.onSurfaceTertiary },
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
            style={[styles.ctaFull, { borderRadius: theme.radius.md }, ctaGlassStyle(theme)]}
            onPress={() => router.push("/habit/new")}
          >
            <Ionicons name="add-circle" size={18} color={ctaGlassColor(theme)} />
            <Text style={[styles.ctaFullText, { color: ctaGlassColor(theme) }]}>AJOUTER UNE HABITUDE</Text>
          </Pressable>
          {habits.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkbox" size={40} color={theme.colors.brand} />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Aucune habitude</Text>
              <Text style={[styles.emptySub, { color: theme.colors.onSurfaceTertiary }]}>
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
                <PressableScale
                  testID={`habit-${h.id}`}
                  onPress={() => router.push(`/habit/${h.id}`)}
                >
                  <Card style={styles.habitCard}>
                    <View style={[styles.habitIcon, { backgroundColor: theme.colors.brandTertiary }]}>
                      <Ionicons name="checkbox" size={16} color={theme.colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.habitTitle, { color: theme.colors.onSurface }]}>{h.title}</Text>
                      <Text style={[styles.habitMeta, { color: theme.colors.onSurfaceTertiary }]}>
                        Cible : {h.target ?? 1} {h.unit ?? ""}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
                  </Card>
                </PressableScale>
              </SwipeableRow>
            ))
          )}
        </>
      )}

      {sub === "reminders" && (
        <>
          <Pressable
            testID="add-reminder-btn"
            style={[styles.ctaFull, { borderRadius: theme.radius.md }, ctaGlassStyle(theme)]}
            onPress={() => router.push("/reminder/new")}
          >
            <Ionicons name="add-circle" size={18} color={ctaGlassColor(theme)} />
            <Text style={[styles.ctaFullText, { color: ctaGlassColor(theme) }]}>AJOUTER UN RAPPEL</Text>
          </Pressable>
          <View style={[styles.hintBanner, { backgroundColor: theme.colors.brandTertiary, borderRadius: theme.radius.sm }]}>
            <Ionicons name="information-circle" size={14} color={theme.colors.brand} />
            <Text style={[styles.hintBannerText, { color: theme.colors.brandSecondary }]}>
              Les rappels s&apos;activent après publication de l&apos;app avec les notifications push.
            </Text>
          </View>
          {reminders.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="alarm" size={40} color={theme.colors.brand} />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Aucun rappel</Text>
              <Text style={[styles.emptySub, { color: theme.colors.onSurfaceTertiary }]}>
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
                <PressableScale
                  testID={`reminder-${r.id}`}
                  onPress={() => router.push(`/reminder/${r.id}`)}
                >
                  <Card style={styles.habitCard}>
                    <View style={[styles.habitIcon, { backgroundColor: theme.colors.brandTertiary }]}>
                      <Ionicons
                        name={REMINDER_KIND_ICON[r.kind]}
                        size={16}
                        color={theme.colors.brand}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.habitTitle, { color: theme.colors.onSurface }]}>
                        {r.title || REMINDER_KIND_LABEL[r.kind]}
                      </Text>
                      <Text style={[styles.habitMeta, { color: theme.colors.onSurfaceTertiary }]}>
                        {r.time} · {formatDaysOfWeek(r.daysOfWeek)} ·{" "}
                        {r.enabled ? "actif" : "désactivé"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
                  </Card>
                </PressableScale>
              </SwipeableRow>
            ))
          )}
        </>
      )}

    </>
  );
}

function GoalsView({ goals, router }: { goals: Goal[]; router: any }) {
  const { theme } = useTheme();
  return (
    <>
      <Pressable
        testID="open-goals-full"
        style={[styles.ctaFull, { borderRadius: theme.radius.md }, ctaGlassStyle(theme)]}
        onPress={() => router.push("/goals")}
      >
        <Ionicons name="flag" size={18} color={ctaGlassColor(theme)} />
        <Text style={[styles.ctaFullText, { color: ctaGlassColor(theme) }]}>GÉRER LES OBJECTIFS</Text>
      </Pressable>
      {goals.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="flag" size={40} color={theme.colors.progress} />
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Aucun objectif</Text>
          <Text style={[styles.emptySub, { color: theme.colors.onSurfaceTertiary }]}>
            Fixe-toi une cible : 20 tractions, 10 km, 12% de masse grasse…
          </Text>
        </View>
      ) : (
        goals.slice(0, 10).map((g) => (
          <PressableScale
            key={g.id}
            testID={`goal-preview-${g.id}`}
            onPress={() => router.push("/goals")}
          >
            <Card style={styles.habitCard}>
              {/* Objectif = progression (comme "Objectifs" du profil), pas
                  une action à faire — violet, pas l'orange des habitudes. */}
              <View style={[styles.habitIcon, { backgroundColor: theme.colors.progressTertiary }]}>
                <Ionicons name="flag" size={16} color={theme.colors.progress} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.habitTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {g.title || g.category}
                </Text>
                <Text style={[styles.habitMeta, { color: theme.colors.onSurfaceTertiary }]}>
                  Cible : {g.targetValue} {g.unit}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
            </Card>
          </PressableScale>
        ))
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
  const { theme } = useTheme();
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
        style={[styles.ctaFull, { borderRadius: theme.radius.md }, ctaGlassStyle(theme)]}
        onPress={() => router.push("/daily-journal")}
      >
        <Ionicons name="book" size={18} color={ctaGlassColor(theme)} />
        <Text style={[styles.ctaFullText, { color: ctaGlassColor(theme) }]}>NOTE DU JOUR</Text>
      </Pressable>

      {loaded && entries.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar" size={40} color={theme.colors.brand} />
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Journal quotidien</Text>
          <Text style={[styles.emptySub, { color: theme.colors.onSurfaceTertiary }]}>
            Note ton énergie, ton stress, tes douleurs. Revois ton évolution jour après jour.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Historique</Text>
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
              <PressableScale
                testID={`journal-entry-${e.date}`}
                onPress={() => router.push("/daily-journal")}
              >
                <Card style={styles.journalEntryCard}>
                  <View style={styles.pastHead}>
                    <Text style={[styles.pastDate, { color: theme.colors.onSurface }]}>
                      {formatJournalDate(e.date)}
                    </Text>
                    <View style={styles.pastRatings}>
                      {e.energy != null && <MiniBadge label="⚡" value={e.energy} />}
                      {e.mood != null && <MiniBadge label="🙂" value={e.mood} />}
                      {e.stress != null && <MiniBadge label="⚠️" value={e.stress} />}
                    </View>
                  </View>
                  {e.sleep_hours != null && (
                    <Text style={[styles.journalEntryMeta, { color: theme.colors.onSurfaceSecondary }]}>
                      😴 {e.sleep_hours.toFixed(1)}h de sommeil
                    </Text>
                  )}
                  {e.pain_zones && e.pain_zones.length > 0 ? (
                    <Text
                      style={[styles.journalEntryMeta, { color: theme.colors.onSurfaceSecondary }]}
                      numberOfLines={2}
                    >
                      🩹{" "}
                      {e.pain_zones
                        .map((z) => `${PAIN_ZONE_LABEL[z.zone]} ${z.intensity}/10`)
                        .join(" · ")}
                    </Text>
                  ) : null}
                  {e.notes ? (
                    <Text style={[styles.pastNotes, { color: theme.colors.onSurfaceSecondary }]} numberOfLines={3}>
                      {e.notes}
                    </Text>
                  ) : null}
                </Card>
              </PressableScale>
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
  const { theme } = useTheme();
  return (
    <Pressable
      style={[styles.sumTile, { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={theme.colors.brand} />
      <Text style={[styles.sumValue, { color: theme.colors.onSurface }]}>{value}</Text>
      <Text style={[styles.sumLabel, { color: theme.colors.onSurfaceTertiary }]}>{label}</Text>
    </Pressable>
  );
}

function MetricChip({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.metricChip, { backgroundColor: theme.colors.surfaceTertiary }]}>
      <Text style={[styles.metricChipText, { color: theme.colors.onSurface }]}>{label}</Text>
    </View>
  );
}

function MiniBadge({ label, value }: { label: string; value: number }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.miniJournalBadge, { backgroundColor: theme.colors.surfaceTertiary }]}>
      <Text style={[styles.miniJournalBadgeText, { color: theme.colors.onSurface }]}>
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
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 26, fontWeight: "800" },
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
    borderWidth: 1,
  },
  segLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 60 },
  // Forme de carte déléguée au composant Card partagé — ne reste ici que
  // la mise en page interne (le padding par défaut de Card est spacing.md,
  // ce card veut un padding plus généreux, d'où le padding explicite malgré
  // le composant partagé).
  highlightsRow: { gap: spacing.sm, paddingRight: spacing.md },
  highlightCard: {
    width: 132,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 2,
  },
  highlightEmoji: { fontSize: 22 },
  highlightTitle: {
    fontWeight: "800",
    fontSize: 12.5,
    marginTop: 2,
  },
  highlightSubtitle: { fontSize: 11, fontWeight: "600" },
  overviewCard: { padding: spacing.lg, alignItems: "center", gap: spacing.md },
  // Même traitement que le Score du Dashboard (Phase 1) : le libellé reste
  // discret (gris), la mention qualitative ("Peut mieux faire"...) en violet.
  overLabel: {
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: "800",
  },
  // progressSecondary : à cette taille, progress tombe sous le seuil AA
  // (4.1:1, vérifié) sur surfaceSecondary — progressSecondary passe à 9.4:1.
  overQualitative: {
    fontSize: 14,
    fontWeight: "800",
  },
  summaryBox: {
    borderWidth: 1,
    padding: spacing.md,
    gap: 8,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryPoints: { fontWeight: "800", fontSize: 13, minWidth: 34 },
  summaryLabel: { fontSize: 12, flex: 1 },
  scoreValueBig: { fontSize: 42, fontWeight: "800" },
  scoreOn100: { fontSize: 12, fontWeight: "600" },
  sectionTitle: {
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
  breakdownRowBox: { gap: 6 },
  brHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  brLabel: { width: 110, fontSize: 12 },
  brLabelBig: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  brHint: {
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
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  emptyGoalsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderStyle: "dashed",
  },
  emptyGoalsTitle: {
    fontWeight: "800",
    fontSize: 13,
  },
  emptyGoalsSub: {
    fontSize: 11,
    marginTop: 2,
  },
  miniGoal: { gap: 8 },
  miniGoalHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniGoalIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  miniGoalTitle: {
    flex: 1,
    fontWeight: "800",
    fontSize: 13,
  },
  miniGoalPct: {
    fontWeight: "800",
    fontSize: 13,
  },
  miniGoalMeta: {
    fontSize: 11,
    fontWeight: "600",
  },
  brBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  brFill: { height: "100%" },
  brValue: {
    fontSize: 12,
    fontWeight: "800",
    width: 50,
    textAlign: "right",
  },
  brPctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
    minWidth: 46,
    alignItems: "center",
  },
  brPctText: {
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: spacing.md,
  },
  linkBtnText: {
    flex: 1,
    fontWeight: "700",
    fontSize: 13,
  },
  exerciseCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  exIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exName: {
    fontWeight: "800",
    fontSize: 14,
    textTransform: "capitalize",
  },
  exMeta: { fontSize: 11, marginTop: 2 },
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
    borderWidth: 1,
  },
  exSubtabText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  transformHero: { gap: spacing.sm },
  transformPhotoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  transformPhotoCol: { flex: 1, alignItems: "center", gap: 6 },
  transformPhoto: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  transformPhotoLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  transformDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  transformDeltaText: { fontSize: 13, fontWeight: "800" },
  transformCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  transformCtaText: { fontWeight: "800", fontSize: 13 },
  transformEmptyHero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  transformEmptyTitle: { fontSize: 16, fontWeight: "800" },
  transformEmptySub: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
  },
  summaryGrid: { flexDirection: "row", gap: 8 },
  sumTile: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    gap: 4,
  },
  sumValue: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
  sumLabel: { fontSize: 11, fontWeight: "600" },
  ctaFull: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  ctaFullText: { fontWeight: "800", letterSpacing: 1 },
  mCard: { gap: 4 },
  mDate: {
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  mMetrics: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  metricChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  metricChipText: { fontSize: 11, fontWeight: "700" },
  journalEntryCard: { gap: 6 },
  journalEntryMeta: {
    fontSize: 12,
  },
  pastHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pastDate: {
    fontWeight: "700",
    fontSize: 12,
    textTransform: "capitalize",
  },
  pastRatings: { flexDirection: "row", gap: 4 },
  pastNotes: { fontSize: 12, lineHeight: 16 },
  miniJournalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniJournalBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  recordGroup: { overflow: "hidden" },
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
    alignItems: "center",
    justifyContent: "center",
  },
  recordName: {
    fontWeight: "800",
    fontSize: 14,
    textTransform: "capitalize",
  },
  recordSub: {
    fontSize: 11,
    marginTop: 2,
  },
  recordBody: {
    borderTopWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
  },
  recordRowMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  recordRowMain: {
    fontWeight: "800",
    fontSize: 14,
  },
  recordBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recordBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  recordRowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  recordRowDate: {
    fontSize: 11,
    fontWeight: "700",
  },
  recordMenuBtn: { padding: 2, marginLeft: spacing.xs },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  menuHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  menuRowText: { fontSize: 15, fontWeight: "700" },
  // Pas de bordure d'origine (contrairement au Card partagé) — override
  // borderWidth:0 pour ne pas en faire apparaître une silencieusement.
  calcCard: {
    borderWidth: 0,
    gap: 8,
    marginTop: 4,
  },
  calcHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calcTitle: {
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  calcSub: {
    fontSize: 11,
  },
  calcAccent: {
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
    borderWidth: 1,
  },
  pctChipText: {
    fontWeight: "800",
    fontSize: 11,
  },
  calcResult: {
    alignItems: "center",
    padding: spacing.md,
    marginTop: 4,
  },
  calcResultVal: {
    fontWeight: "800",
    fontSize: 26,
  },
  calcResultHint: {
    opacity: 0.9,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  recordChartWrap: {
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
  },
  recordChartHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recordChartLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  recordChartValue: {
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
    borderRadius: 999,
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
    borderRadius: 6,
  },
  chartHintText: {
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  // Niveau/XP est de la "progression" (même famille que le Score/XP du
  // Dashboard) — violet, pas l'orange réservé aux actions.
  levelHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  levelHeroLeft: {
    alignItems: "center",
  },
  levelBigBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#ffffff40",
  },
  levelBigNum: { fontSize: 32, fontWeight: "800" },
  levelBigLbl: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  levelXPLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    opacity: 0.9,
  },
  levelXPValue: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
  },
  levelHint: {
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
    fontWeight: "700",
  },
  levelProgressBox: {
    borderWidth: 1,
    padding: spacing.md,
    gap: 8,
  },
  levelProgressHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelProgressText: {
    fontSize: 12,
    fontWeight: "800",
  },
  levelProgressPct: {
    fontSize: 15,
    fontWeight: "800",
  },
  levelBigBar: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  levelBigFill: {
    height: "100%",
    borderRadius: 5,
  },
  // Fond/bordure violets propres à cette carte (délibérément différents du
  // Card partagé par défaut) — d'où les overrides malgré le composant Card.
  overallCard: {
    gap: 8,
  },
  overallHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  // progressSecondary : progress tombe à 3.5:1 sur le fond progressTertiary
  // de cette carte (vérifié) — sous le seuil AA pour du texte de cette
  // taille. progressSecondary passe à 7.9:1.
  overallLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  overallPct: {
    fontSize: 15,
    fontWeight: "800",
  },
  overallBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  overallFill: {
    height: "100%",
    borderRadius: 3,
  },
  overallHint: {
    fontSize: 11,
    fontWeight: "700",
  },
  sourcesCard: { gap: 8 },
  sourcesTitle: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  sourceLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  sourceXP: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  upNext: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 6 },
  upBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  upBadgeNum: {
    fontSize: 12,
    fontWeight: "800",
  },
  upTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  upSub: {
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
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  bigBadgeTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center",
  },
  bigBadgeLvl: {
    fontSize: 11,
    fontWeight: "700",
  },
  empty: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  emptySub: {
    textAlign: "center",
    lineHeight: 20,
  },
  habitCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  habitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  habitTitle: { fontWeight: "800", fontSize: 14 },
  habitMeta: { fontSize: 11, marginTop: 2 },
  subTabRow: {
    flexDirection: "row",
    gap: 6,
    padding: 4,
    borderWidth: 1,
  },
  // `flex: 1` n'a pas de sens à l'intérieur d'un ScrollView horizontal (pas
  // de largeur bornée à répartir) — c'était la cause du "certaines options
  // deviennent difficiles voire impossibles à sélectionner" : les onglets
  // s'écrasaient à une largeur imprévisible. Même recette qu'un chip normal
  // (segChip), largeur intrinsèque au contenu.
  subTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  subTabLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  hintBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
  },
  hintBannerText: {
    flex: 1,
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
    borderWidth: 1,
  },
  bodyChipText: {
    fontWeight: "700",
    fontSize: 11,
  },
  bodyChipMini: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  bodyChipMiniText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  chartWrap: {
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  chartHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  chartTitleBody: {
    fontSize: 14,
    fontWeight: "800",
  },
  chartDelta: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  chartCurrentBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  chartCurrentVal: {
    fontSize: 20,
    fontWeight: "800",
  },
  chartCurrentUnit: {
    fontSize: 10,
    fontWeight: "700",
  },
});
