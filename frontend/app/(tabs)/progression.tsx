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
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { LineChart } from "react-native-gifted-charts";
import { colors, radius, spacing } from "@/src/theme";
import {
  PERIOD_LABEL,
  PeriodKey,
} from "@/src/utils/exercise-category";
import {
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
  UserProfile,
  WellnessLog,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import { computeIronflowScore, IronflowScore } from "@/src/utils/scoring";
import { listAllExercises } from "@/src/utils/exercise-detail";

type Tab = "overview" | "exercises" | "records" | "transformation" | "habits" | "journal";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Score", icon: "speedometer" },
  { key: "exercises", label: "Exercices", icon: "barbell" },
  { key: "records", label: "Records", icon: "trophy" },
  { key: "transformation", label: "Corps", icon: "body" },
  { key: "habits", label: "Habitudes", icon: "checkbox" },
  { key: "journal", label: "Journal", icon: "book" },
];

export default function ProgressionHub() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [wellness, setWellness] = useState<WellnessLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [s, p, m, h, hl, r, g, w, pr] = await Promise.all([
          getSessions(),
          getPRs(),
          getMeasurements(),
          getHabits(),
          getHabitLogs(),
          getReminders(),
          getGoals(),
          getWellnessLogs(),
          getProfile(),
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
      })();
    }, []),
  );

  const score = computeIronflowScore(
    sessions,
    habits,
    logs,
    wellness,
    profile ?? {
      weight_kg: null,
      height_cm: null,
      sex: null,
      age: null,
    },
  );
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
          <RecordsView prs={prs} router={router} />
        )}
        {tab === "transformation" && (
          <TransformationView
            measurements={measurements}
            router={router}
          />
        )}
        {tab === "habits" && (
          <HabitsView
            habits={habits}
            reminders={reminders}
            goals={goals}
            router={router}
          />
        )}
        {tab === "journal" && <JournalView router={router} />}
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
  goals,
  sessions,
  prs,
  measurements,
  onOpenStats,
  onOpenGoals,
}: {
  score: IronflowScore;
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
        <Text style={styles.overLabel}>SCORE IRONFLOW</Text>
        <ScoreCircle score={score.score} />
        <Text style={styles.overHint}>
          Basé sur régularité, sommeil, nutrition, hydratation, activité et habitudes.
        </Text>
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
      {score.breakdown.map((b) => (
        <View key={b.key} style={styles.breakdownRowBox}>
          <View style={styles.brHeadRow}>
            <View style={styles.brIconBox}>
              <Ionicons name={b.icon} size={12} color={colors.brand} />
            </View>
            <Text style={styles.brLabelBig}>{b.label}</Text>
            <Text style={styles.brValue}>
              {b.value}/{b.max}
            </Text>
          </View>
          <View style={styles.brBar}>
            <View
              style={[
                styles.brFill,
                { width: `${(b.value / b.max) * 100}%` },
              ]}
            />
          </View>
          {b.hint ? <Text style={styles.brHint}>{b.hint}</Text> : null}
        </View>
      ))}

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
  if (exercises.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="barbell" size={40} color={colors.brand} />
        <Text style={styles.emptyTitle}>Aucun exercice</Text>
        <Text style={styles.emptySub}>
          Fais une séance pour analyser tes performances par exercice.
        </Text>
      </View>
    );
  }
  return (
    <>
      {exercises.map((e) => (
        <Pressable
          key={e.name}
          testID={`ex-detail-${e.name}`}
          style={styles.exerciseCard}
          onPress={() => router.push(`/exercise/${encodeURIComponent(e.name)}`)}
        >
          <View style={styles.exIconBox}>
            <Ionicons name="barbell" size={16} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.exName} numberOfLines={1}>
              {e.name}
            </Text>
            <Text style={styles.exMeta}>
              {e.count} séance{e.count > 1 ? "s" : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
        </Pressable>
      ))}
    </>
  );
}

function RecordsView({
  prs,
  router,
}: {
  prs: PersonalRecord[];
  router: any;
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
                  {g.prs
                    .slice()
                    .sort((a, b) => (b.date < a.date ? -1 : 1))
                    .map((pr) => (
                      <RecordRow key={pr.id} pr={pr} />
                    ))}

                  {bestWeight && (
                    <OneRMCalculator
                      pr={bestWeight}
                      testID={`orm-calc-${g.name}`}
                    />
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
    </>
  );
}

function estimatedOneRM(pr: PersonalRecord): number {
  const w = pr.weight_kg ?? 0;
  const r = pr.reps ?? 1;
  if (r <= 1) return w;
  return w * (1 + r / 30);
}

function RecordRow({ pr }: { pr: PersonalRecord }) {
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
    <View style={styles.recordRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.recordRowMain}>{main}</Text>
        {sub ? <Text style={styles.recordRowSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.recordRowDate}>{formatDateShort(pr.date)}</Text>
    </View>
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

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function TransformationView({
  measurements,
  router,
}: {
  measurements: Measurement[];
  router: any;
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
            <Pressable
              key={m.id}
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
}: {
  habits: Habit[];
  reminders: Reminder[];
  goals: Goal[];
  router: any;
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
              <Pressable
                key={h.id}
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
              <Pressable
                key={r.id}
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

function JournalView({ router }: { router: any }) {
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
      <View style={styles.empty}>
        <Ionicons name="calendar" size={40} color={colors.brand} />
        <Text style={styles.emptyTitle}>Journal quotidien</Text>
        <Text style={styles.emptySub}>
          Note ton énergie, ton stress, tes douleurs. Revois ton évolution jour après jour.
        </Text>
      </View>
    </>
  );
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
  overHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },
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
