import { ReactNode, useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
} from "react-native";
import { useConfirmDialog } from "@/src/hooks/use-confirm-dialog";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { LineChart } from "react-native-gifted-charts";
import { coloredShadow, motion, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { Theme } from "@/src/themes/types";
import ThemedBackground from "@/src/themes/ThemedBackground";
import Card from "@/src/components/ui/Card";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";
import { getExerciseRecords, ExerciseRecord } from "@/src/utils/exercise-records";
import {
  EXERCISE_CATEGORY_COLOR,
  EXERCISE_CATEGORY_ICON,
  EXERCISE_CATEGORY_LABEL,
  ExerciseCategory,
  getOverrides,
  resolveCategory,
} from "@/src/utils/exercise-category";
import {
  checkLevelUp,
  computeLevelState,
  getXPLedger,
  LevelState,
  RANKS,
  rankForLevel,
  syncXPLedger,
  xpForLevel,
  XP_PER_ACHIEVEMENT,
  XPEventType,
  XPLedgerEntry,
} from "@/src/utils/xp";
import { rankAccentColor } from "@/src/utils/rank-colors";
import {
  awardWeeklyChallengeXPIfComplete,
  computeWeeklyChallengeProgress,
  daysRemainingInWeek,
  formatWeeklyChallengeValue,
  getOrCreateWeeklyChallenge,
  weeklyChallengeLedgerId,
  weeklyStageMessage,
  WeeklyChallengeDef,
} from "@/src/utils/weekly-challenge";
import { subscribeHealthDataChanged } from "@/src/utils/health-data-storage";
import {
  deleteMeasurement,
  deletePR,
  getGoals,
  getMeasurements,
  getPlans,
  getPRs,
  getSessions,
  Goal,
  PersonalRecord,
  Plan,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import SwipeableRow from "@/src/components/SwipeableRow";
import { computeAdvancedStats } from "@/src/utils/stats";
import { computeHighlights, Highlight } from "@/src/utils/highlights";
import { listAllExercises } from "@/src/utils/exercise-detail";
import { expandWorkoutSessionsForExerciseStats } from "@/src/utils/wod-result-normalizer";
import { computeAmrapWodHistory } from "@/src/utils/wod-history";
import { Achievement, computeAchievements } from "@/src/utils/achievements";
import { ProgressionTab } from "@/src/utils/progression-nav";

type Tab = ProgressionTab;

/** Performance a exactement 3 sections — voir la refonte "Évolution →
 * Performance" : Score IronFlow supprimé, Habitudes/Objectifs/Journal
 * retirés (déjà gérables ailleurs), Records intégré dans Exercices plutôt
 * que d'être un onglet séparé. */
const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "exercises", label: "EXERCICES", icon: "barbell" },
  { key: "level", label: "NIVEAU", icon: "star" },
  { key: "defis", label: "DÉFIS", icon: "trophy" },
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
    isProgressionTab(tabParam) ? tabParam : "exercises",
  );
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Re-sync the active tab whenever we're pushed here with a `?tab=...`
  // param — this screen stays mounted across tab-bar switches, so a plain
  // useState initializer alone wouldn't react to a later navigation.
  useFocusEffect(
    useCallback(() => {
      if (isProgressionTab(tabParam)) setTab(tabParam);
    }, [tabParam]),
  );

  const reload = useCallback(async () => {
    const [s, p, g] = await Promise.all([getSessions(), getPRs(), getGoals()]);
    setSessions(s);
    setPRs(p);
    setGoals(g);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const advancedStats = computeAdvancedStats(sessions);
  // Le Score IronFlow (`scoring.ts`) a été supprimé de l'app — l'ancien
  // signal "tendance du score sur 7 jours" n'a plus de sens et n'est pas
  // remplacé (voir `highlights.ts`, qui n'accepte plus ce paramètre).
  const highlights = computeHighlights({
    prs,
    goals,
    streakDays: advancedStats.currentStreakDays,
  });

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
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Performance</Text>
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
                style={[
                  styles.segChip,
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
                  size={13}
                  color={active ? theme.colors.onSurface : theme.colors.onSurfaceTertiary}
                />
                <Text
                  style={[
                    styles.segLabel,
                    { color: active ? theme.colors.onSurface : theme.colors.onSurfaceSecondary },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "exercises" && (
          <ExercisesView sessions={sessions} prs={prs} highlights={highlights} router={router} onChanged={reload} />
        )}
        {tab === "level" && <LevelView />}
        {tab === "defis" && <DefisView />}
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/**
 * EXERCICES — cœur du nouvel onglet Performance. Remplace les anciens
 * onglets séparés "Exercices" (parcourait toute la bibliothèque) et
 * "Records" : n'affiche désormais QUE les exercices réellement pratiqués
 * (séance loguée) ou pour lesquels un record existe — jamais le catalogue
 * complet. Chaque ligne dépliée réutilise tel quel le système de Records
 * existant (graphique de progression, liste de PR avec swipe/menu,
 * calculateurs adaptés au type de record) — rien n'est réécrit, juste
 * réorganisé par exercice plutôt que d'être une section à part.
 */
function ExercisesView({
  sessions,
  prs,
  highlights,
  router,
  onChanged,
}: {
  sessions: WorkoutSession[];
  prs: PersonalRecord[];
  highlights: Highlight[];
  router: any;
  onChanged: () => void;
}) {
  const { theme } = useTheme();
  const [subTab, setSubTab] = useState<ExerciseCategory>("musculation");
  const [overrides, setOverridesState] = useState<Record<string, ExerciseCategory>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [wodPlans, setWodPlans] = useState<Plan[]>([]);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setOverridesState(await getOverrides());
        setWodPlans(await getPlans());
        setRecords(await getExerciseRecords());
      })();
    }, []),
  );

  // Progression par WOD nommé (Best/Dernier/Précédent) — jamais "as-tu fait
  // un AMRAP", mais "as-tu progressé SUR CE WOD précis" (voir wod-history.ts).
  const wodHistory = computeAmrapWodHistory(sessions, wodPlans);

  // Expansion normalisée : un AMRAP/For Time composite ("5 Traction → 10
  // Pompe → 15 Squats") ne doit jamais apparaître comme son propre
  // pseudo-exercice — voir `expandWorkoutSessionsForExerciseStats`.
  const doneExercises = listAllExercises(expandWorkoutSessionsForExerciseStats(sessions));
  const prsByExercise: Record<string, { name: string; prs: PersonalRecord[] }> = {};
  for (const pr of prs) {
    const key = pr.exerciseName.toLowerCase().trim();
    if (!prsByExercise[key]) prsByExercise[key] = { name: pr.exerciseName, prs: [] };
    prsByExercise[key].prs.push(pr);
  }

  // Union pratiqué (séance loguée) OU record enregistré — jamais toute la
  // bibliothèque (contrairement à l'ancien onglet Exercices).
  type Row = { name: string; category: ExerciseCategory; count: number; prs: PersonalRecord[] };
  const byKey = new Map<string, Row>();
  for (const e of doneExercises) {
    const key = e.name.toLowerCase().trim();
    byKey.set(key, {
      name: e.name,
      category: resolveCategory(e.name, overrides),
      count: e.count,
      prs: prsByExercise[key]?.prs ?? [],
    });
  }
  for (const key of Object.keys(prsByExercise)) {
    if (byKey.has(key)) continue;
    byKey.set(key, {
      name: prsByExercise[key].name,
      category: resolveCategory(prsByExercise[key].name, overrides),
      count: 0,
      prs: prsByExercise[key].prs,
    });
  }
  const all = Array.from(byKey.values());
  const filtered = all.filter((r) => r.category === subTab);
  filtered.sort((a, b) => {
    if ((b.count > 0 ? 1 : 0) - (a.count > 0 ? 1 : 0)) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  const CATS: ExerciseCategory[] = ["musculation", "cardio_machine", "mobility"];

  return (
    <>
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

      {wodHistory.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.wodHistoryRow}
        >
          {wodHistory.map((w) => (
            <Pressable
              key={w.planId}
              testID={`wod-history-${w.planId}`}
              style={[
                styles.wodHistoryCard,
                {
                  backgroundColor: withAlpha(theme.colors.data.workout, 10),
                  borderColor: withAlpha(theme.colors.data.workout, 35),
                  borderRadius: theme.radius.md,
                },
              ]}
              onPress={() => router.push(`/plan/${w.planId}`)}
            >
              <Text style={[styles.wodHistoryTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {w.planTitle.toUpperCase()}
              </Text>
              <Text style={[styles.wodHistoryFormat, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
                {w.format}
              </Text>
              <View style={styles.wodHistoryStatsRow}>
                <View style={styles.wodHistoryStat}>
                  <Text style={[styles.wodHistoryStatVal, { color: theme.colors.data.workout }]}>{w.best}</Text>
                  <Text style={[styles.wodHistoryStatLbl, { color: theme.colors.onSurfaceTertiary }]}>Best</Text>
                </View>
                <View style={styles.wodHistoryStat}>
                  <Text style={[styles.wodHistoryStatVal, { color: theme.colors.onSurface }]}>{w.last}</Text>
                  <Text style={[styles.wodHistoryStatLbl, { color: theme.colors.onSurfaceTertiary }]}>Dernier</Text>
                </View>
                {w.progressDelta != null && (
                  <View style={styles.wodHistoryStat}>
                    <Text
                      style={[
                        styles.wodHistoryStatVal,
                        { color: w.progressDelta >= 0 ? theme.colors.success : theme.colors.error },
                      ]}
                    >
                      {w.progressDelta >= 0 ? "+" : ""}
                      {w.progressDelta}
                    </Text>
                    <Text style={[styles.wodHistoryStatLbl, { color: theme.colors.onSurfaceTertiary }]}>
                      vs précédent
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {all.length > 0 && (
        <Text style={[styles.exercisesSummary, { color: theme.colors.onSurfaceTertiary }]}>
          {all.length} exercice{all.length > 1 ? "s" : ""} pratiqué{all.length > 1 ? "s" : ""}
        </Text>
      )}

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
            Pratique un exercice de cette catégorie ou enregistre un record pour le voir apparaître ici.
          </Text>
        </View>
      ) : (
        filtered.map((e, i) => {
          const isOpen = expanded === e.name;
          const weightPRs = e.prs.filter((p) => (p.type ?? "weight") === "weight");
          const bestWeight = weightPRs.slice().sort((a, b) => estimatedOneRM(b) - estimatedOneRM(a))[0];
          const bestReps = e.prs
            .filter((p) => p.type === "reps")
            .slice()
            .sort((a, b) => (b.reps ?? 0) - (a.reps ?? 0))[0];
          const bestRun = e.prs
            .filter((p) => p.type === "run" && (p.time_seconds ?? 0) > 0 && (p.distance_m ?? 0) > 0)
            .slice()
            .sort(
              (a, b) =>
                (a.time_seconds ?? 1e9) / (a.distance_m ?? 1) - (b.time_seconds ?? 1e9) / (b.distance_m ?? 1),
            )[0];
          const summary = bestWeight
            ? `${bestWeight.weight_kg} kg × ${bestWeight.reps} · 1RM ${estimatedOneRM(bestWeight).toFixed(1)} kg`
            : bestReps
              ? `${bestReps.reps} reps · meilleure série`
              : bestRun
                ? `${((bestRun.distance_m ?? 0) / 1000).toFixed(1)} km · meilleure perf`
                : e.count > 0
                  ? `${e.count} séance${e.count > 1 ? "s" : ""}`
                  : "Aucun record";
          return (
            <EnterItem key={e.name} index={i}>
              <Card padding={0} style={styles.recordGroup}>
                <Pressable
                  testID={`ex-row-${e.name}`}
                  onPress={() => setExpanded(isOpen ? null : e.name)}
                  style={styles.recordHead}
                >
                  <ExerciseThumbnail name={e.name} records={records} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recordName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                      {e.name}
                    </Text>
                    <Text style={[styles.recordSub, { color: theme.colors.onSurfaceTertiary }]}>{summary}</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={theme.colors.onSurfaceTertiary}
                  />
                </Pressable>

                {isOpen && (
                  <View style={styles.recordBody}>
                    {e.prs.length >= 2 && <RecordProgressionChart prs={e.prs} />}
                    {e.prs.length > 0 ? (
                      e.prs
                        .slice()
                        .sort((a, b) => (b.date < a.date ? -1 : 1))
                        .map((pr, pi) => (
                          <RecordRow
                            key={pr.id}
                            pr={pr}
                            onChanged={onChanged}
                            accent={pi === 0 && e.prs.length > 1}
                            badge={pi === 0 && e.prs.length > 1 ? "RÉCENT" : undefined}
                          />
                        ))
                    ) : (
                      <Text
                        style={[
                          styles.recordSub,
                          { color: theme.colors.onSurfaceTertiary, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
                        ]}
                      >
                        Aucun record enregistré pour cet exercice.
                      </Text>
                    )}
                    {bestWeight && <OneRMCalculator pr={bestWeight} testID={`orm-calc-${e.name}`} />}
                    {bestReps && <RepsCalculator pr={bestReps} testID={`reps-calc-${e.name}`} />}
                    {bestRun && <CardioCalculator pr={bestRun} testID={`cardio-calc-${e.name}`} />}
                    <Pressable
                      testID={`ex-advanced-stats-${e.name}`}
                      style={[styles.linkBtn, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
                      onPress={() => router.push(`/exercise/${encodeURIComponent(e.name)}`)}
                    >
                      <Ionicons name="stats-chart" size={14} color={theme.colors.brand} />
                      <Text style={[styles.linkBtnText, { color: theme.colors.brand }]}>
                        Voir les statistiques avancées
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={theme.colors.brand} />
                    </Pressable>
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

/**
 * NIVEAU — la carrière sportive IRONFLOW de l'utilisateur. Écran
 * entièrement autonome (charge lui-même séances/records/mesures/défis,
 * comme `DefisView`) plutôt que de dépendre des props de `ProgressionHub` :
 * `syncXPLedger` doit tourner à chaque focus pour détecter et créditer les
 * nouveaux événements, ce qui en fait naturellement le propriétaire de son
 * propre chargement de données.
 *
 * Boucle affichée : NIVEAU (hero) → pourquoi il a bougé (progression
 * récente) → où j'en suis cette semaine → ce qu'il reste à atteindre
 * (prochain palier) → d'où je viens (jalons déjà franchis). Une animation
 * de montée de niveau/rang vient ponctuer les vraies progressions, jamais
 * l'historique rétroactif du premier chargement.
 */
function LevelView() {
  const { theme } = useTheme();
  const [levelState, setLevelState] = useState<LevelState | null>(null);
  const [ledger, setLedger] = useState<XPLedgerEntry[]>([]);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [sessions, prs, measurements] = await Promise.all([
          getSessions(),
          getPRs(),
          getMeasurements(),
        ]);
        const achievements = computeAchievements({ sessions, prs, measurements });
        const newLedger = await syncXPLedger({ sessions, prs, achievements });
        const totalXP = newLedger.reduce((sum, e) => sum + e.amount, 0);
        const state = computeLevelState(totalXP);
        const up = await checkLevelUp(state.level);
        setLedger(newLedger);
        setLevelState(state);
        if (up) setLevelUp(up);
      })();
    }, []),
  );

  if (!levelState) return null;

  const accent = rankAccentColor(theme, levelState.rank.rank.colorKey);
  const recent = ledger
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);

  const now = Date.now();
  const monday = new Date(now - ((new Date().getDay() + 6) % 7) * 86400000);
  monday.setHours(0, 0, 0, 0);
  const weekEntries = ledger.filter((e) => new Date(e.date).getTime() >= monday.getTime());
  const weekXP = weekEntries.reduce((sum, e) => sum + e.amount, 0);
  const weekSessions = weekEntries.filter((e) => e.type === 'session').length;
  const weekPRs = weekEntries.filter((e) => e.type === 'pr').length;
  const weekAchievements = weekEntries.filter((e) => e.type === 'achievement').length;

  // "Meilleure semaine depuis N semaines" — uniquement si les données le
  // confirment réellement (jamais de phrase fabriquée, voir §10 du brief).
  let weekSentence: string | null = null;
  if (weekXP > 0) {
    const weekOf = (d: Date) => {
      const m = new Date(d);
      m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
      m.setHours(0, 0, 0, 0);
      return m.getTime();
    };
    const byWeek = new Map<number, number>();
    for (const e of ledger) {
      const wk = weekOf(new Date(e.date));
      byWeek.set(wk, (byWeek.get(wk) ?? 0) + e.amount);
    }
    const priorWeeks = Array.from(byWeek.entries())
      .filter(([wk]) => wk < monday.getTime())
      .sort((a, b) => b[0] - a[0]);
    let weeksBack = 0;
    let isBest = true;
    for (const [, xp] of priorWeeks) {
      weeksBack++;
      if (xp >= weekXP) {
        isBest = false;
        break;
      }
      if (weeksBack >= 12) break; // pas besoin de remonter indéfiniment
    }
    if (isBest && weeksBack >= 1) {
      weekSentence = `Ta meilleure semaine depuis ${weeksBack} semaine${weeksBack > 1 ? 's' : ''}.`;
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <LevelHeroCard levelState={levelState} accent={accent} />

      {recent.length > 0 && (
        <Card title="Progression récente" icon="flash">
          <View style={{ gap: spacing.xs }}>
            {recent.map((e, i) => (
              <EnterItem key={e.id} index={i}>
                <RecentXPRow entry={e} />
              </EnterItem>
            ))}
          </View>
        </Card>
      )}

      <Card title="Cette semaine" icon="calendar">
        <View style={styles.weekStatsRow}>
          <WeekStat value={`+${weekXP}`} label="XP" color={accent} />
          <WeekStat value={String(weekSessions)} label={weekSessions > 1 ? 'séances' : 'séance'} />
          <WeekStat value={String(weekPRs)} label="PR" />
          <WeekStat value={String(weekAchievements)} label={weekAchievements > 1 ? 'défis' : 'défi'} />
        </View>
        {weekSentence && (
          <Text style={[styles.weekSentence, { color: theme.colors.onSurfaceSecondary }]}>{weekSentence}</Text>
        )}
      </Card>

      <NextMilestoneCard levelState={levelState} theme={theme} />

      <MilestoneTimeline currentLevel={levelState.level} theme={theme} />

      {levelUp && (
        <LevelUpOverlay
          from={levelUp.from}
          to={levelUp.to}
          onDismiss={() => setLevelUp(null)}
        />
      )}
    </View>
  );
}

/** Barre de progression horizontale animée — même technique que
 * `MultiRingGauge` (un `useSharedValue` par instance, `ringFill` du thème
 * pour choisir timing/spring), généralisée à une largeur en % plutôt qu'un
 * `strokeDashoffset` SVG. */
function XPBar({ progress, color, trackColor, height = 10 }: { progress: number; color: string; trackColor: string; height?: number }) {
  const { theme } = useTheme();
  const fill = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useAnimatedStyleSync(fill, progress, theme.ringFill, reducedMotion);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={[styles.xpBarTrack, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
      <Animated.View style={[styles.xpBarFill, { height, borderRadius: height / 2, backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

/** Petit hook maison (pas un vrai hook réutilisable ailleurs, juste pour
 * garder `XPBar` lisible) qui pousse `progress` dans le shared value dès
 * qu'il change, en respectant `reduceMotion` (saut direct, sans animation,
 * quand le système le demande). */
function useAnimatedStyleSync(
  shared: ReturnType<typeof useSharedValue<number>>,
  target: number,
  ringFill: Theme['ringFill'],
  reducedMotion: boolean,
) {
  const t = Math.max(0, Math.min(1, target));
  if (reducedMotion) {
    shared.value = t;
    return;
  }
  shared.value =
    ringFill.type === 'spring'
      ? withSpring(t, { damping: ringFill.damping, stiffness: ringFill.stiffness })
      : withTiming(t, { duration: ringFill.duration, easing: Easing.out(Easing.cubic) });
}

function LevelHeroCard({ levelState, accent }: { levelState: LevelState; accent: string }) {
  const { theme } = useTheme();
  return (
    <GlassCard
      level="elevated"
      style={[
        styles.levelHero,
        { borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
      ]}
    >
      <LinearGradient
        colors={[withAlpha(accent, 16), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={[styles.levelHeroEyebrow, { color: theme.colors.onSurfaceTertiary }]}>NIVEAU {levelState.level}</Text>
      <Text style={[styles.levelHeroRank, { color: accent }]} numberOfLines={1}>
        {levelState.rank.label}
      </Text>
      <View style={{ marginTop: spacing.md }}>
        <XPBar progress={levelState.progress} color={accent} trackColor={theme.colors.surfaceTertiary} />
        <Text style={[styles.levelHeroCaption, { color: theme.colors.onSurface }]}>
          {levelState.isMaxLevel ? (
            'Niveau maximum atteint'
          ) : (
            <>
              <Text style={{ fontWeight: '800' }}>{Math.round(levelState.xpIntoLevel)}</Text> / {levelState.xpForThisLevel} XP
            </>
          )}
        </Text>
        {!levelState.isMaxLevel && (
          <Text style={[styles.levelHeroSub, { color: theme.colors.onSurfaceTertiary }]}>
            Encore {levelState.xpToNext} XP pour le niveau {levelState.level + 1}
          </Text>
        )}
      </View>
    </GlassCard>
  );
}

const XP_EVENT_ICON: Record<XPEventType, keyof typeof Ionicons.glyphMap> = {
  session: 'barbell',
  pr: 'trophy',
  regularity: 'flame',
  achievement: 'ribbon',
  challenge: 'flag',
};

function RecentXPRow({ entry }: { entry: XPLedgerEntry }) {
  const { theme } = useTheme();
  const colorByType: Record<XPEventType, string> = {
    session: theme.colors.brand,
    pr: theme.colors.data.achievement,
    regularity: theme.colors.data.energy,
    achievement: theme.colors.data.success,
    challenge: theme.colors.data.performance,
  };
  const color = colorByType[entry.type];
  return (
    <View style={styles.recentXPRow}>
      <View style={[styles.recentXPIcon, { backgroundColor: withAlpha(color, 15) }]}>
        <Ionicons name={XP_EVENT_ICON[entry.type]} size={14} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.recentXPLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {entry.label}
        </Text>
        {entry.detail && (
          <Text style={[styles.recentXPDetail, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
            {entry.detail}
          </Text>
        )}
      </View>
      <Text style={[styles.recentXPAmount, { color }]}>+{entry.amount} XP</Text>
    </View>
  );
}

function WeekStat({ value, label, color }: { value: string; label: string; color?: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.weekStat}>
      <Text style={[styles.weekStatValue, { color: color ?? theme.colors.onSurface }]}>{value}</Text>
      <Text style={[styles.weekStatLabel, { color: theme.colors.onSurfaceTertiary }]}>{label}</Text>
    </View>
  );
}

function NextMilestoneCard({ levelState, theme }: { levelState: LevelState; theme: Theme }) {
  if (!levelState.milestone) {
    return (
      <Card title="Prochain palier" icon="flag">
        <Text style={{ color: theme.colors.onSurfaceSecondary, fontSize: 13 }}>
          Tu as atteint IRONFLOW, le rang le plus élevé. Il n&apos;y a rien au-dessus.
        </Text>
      </Card>
    );
  }
  const milestoneRank = rankForLevel(levelState.milestone.level);
  const accent = rankAccentColor(theme, milestoneRank.rank.colorKey);
  return (
    <Card title="Prochain palier" icon="flag">
      <View style={styles.milestoneRow}>
        <View style={[styles.milestoneChip, { backgroundColor: withAlpha(accent, 15), borderColor: withAlpha(accent, 40) }]}>
          <Text style={[styles.milestoneChipText, { color: accent }]}>{levelState.milestone.label}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.milestoneLevel, { color: theme.colors.onSurface }]}>
            Niveau {levelState.milestone.level}
          </Text>
          <Text style={[styles.milestoneXp, { color: theme.colors.onSurfaceTertiary }]}>
            {levelState.milestone.xpNeeded} XP restants
          </Text>
        </View>
      </View>
    </Card>
  );
}

/** Jalons = le premier niveau de chaque rang IRONFLOW (voir `RANKS`) —
 * jamais tous les niveaux, seulement les vraies étapes de carrière. */
function MilestoneTimeline({ currentLevel, theme }: { currentLevel: number; theme: Theme }) {
  return (
    <Card title="Ta carrière IRONFLOW" icon="trending-up" collapsible defaultCollapsed>
      <View>
        {RANKS.map((r, i) => {
          const reached = currentLevel >= r.minLevel;
          const accent = rankAccentColor(theme, r.colorKey);
          return (
            <View key={r.key} style={styles.timelineRow}>
              <View style={styles.timelineMarkerCol}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor: reached ? accent : theme.colors.surfaceTertiary,
                      borderColor: reached ? accent : theme.colors.border,
                    },
                  ]}
                />
                {i < RANKS.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: reached ? withAlpha(accent, 40) : theme.colors.border }]} />
                )}
              </View>
              <View style={{ flex: 1, paddingBottom: spacing.md }}>
                <Text
                  style={[
                    styles.timelineRankLabel,
                    { color: reached ? theme.colors.onSurface : theme.colors.onSurfaceTertiary },
                  ]}
                >
                  {r.name}
                </Text>
                <Text style={[styles.timelineLevelLabel, { color: theme.colors.onSurfaceTertiary }]}>
                  Niveau {r.minLevel} · {xpForLevel(r.minLevel)} XP
                </Text>
              </View>
              {reached && <Ionicons name="checkmark-circle" size={18} color={accent} />}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/**
 * Animation de montée de niveau/rang — modal plein écran sobre (pas de
 * confettis), respecte `reduceMotion` (apparition directe, sans zoom/fade).
 * Le rang est comparé avant/après pour savoir si on doit marquer le moment
 * comme un simple niveau supérieur ou un vrai changement de rang (traitement
 * plus marqué).
 */
function LevelUpOverlay({ from, to, onDismiss }: { from: number; to: number; onDismiss: () => void }) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const fromRank = rankForLevel(from);
  const toRank = rankForLevel(to);
  const isRankUp = fromRank.label !== toRank.label;
  const accent = rankAccentColor(theme, toRank.rank.colorKey);
  const EnterAnim = reducedMotion ? FadeIn.duration(1) : ZoomIn.duration(420).easing(Easing.out(Easing.back(1.2)));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={[styles.levelUpBackdrop, { backgroundColor: 'rgba(0,0,0,0.75)' }]} onPress={onDismiss}>
        <Animated.View entering={EnterAnim} style={[styles.levelUpCard, { backgroundColor: theme.colors.surfaceSecondary, borderColor: withAlpha(accent, 50) }]}>
          <LinearGradient
            colors={[withAlpha(accent, 22), 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Ionicons name={isRankUp ? 'ribbon' : 'trending-up'} size={34} color={accent} />
          <Text style={[styles.levelUpTitle, { color: theme.colors.onSurfaceTertiary }]}>
            {isRankUp ? 'NOUVEAU RANG' : 'NIVEAU SUPÉRIEUR'}
          </Text>
          {isRankUp ? (
            <Text style={[styles.levelUpBig, { color: accent }]} numberOfLines={1}>
              {fromRank.label} → {toRank.label}
            </Text>
          ) : (
            <Text style={[styles.levelUpBig, { color: accent }]}>
              {from} → {to}
            </Text>
          )}
          <Text style={[styles.levelUpSub, { color: theme.colors.onSurfaceSecondary }]}>
            Niveau {to} · {toRank.label}
          </Text>
          <Pressable testID="level-up-dismiss" style={[styles.levelUpBtn, { backgroundColor: accent }]} onPress={onDismiss}>
            <Text style={styles.levelUpBtnText}>CONTINUER</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
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

export function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
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
export function ctaGlassStyle(theme: Theme) {
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
export function ctaGlassColor(theme: Theme) {
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
  const insets = useSafeAreaInsets();
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
          blur={false}
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
              {
                backgroundColor: theme.colors.surfaceSecondary,
                borderTopLeftRadius: theme.radius.lg,
                borderTopRightRadius: theme.radius.lg,
                borderColor: theme.colors.border,
                paddingBottom: spacing.lg + insets.bottom,
              },
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

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * DÉFIS — "ce que je cherche à accomplir", pas une collection de badges.
 * Écran autonome (comme `LevelView`) : charge ses propres données à chaque
 * focus, génère/relit le défi de la semaine, recalcule sa progression en
 * direct, et synchronise le même journal XP que Niveau (`syncXPLedger` +
 * `awardWeeklyChallengeXPIfComplete`) — aucune logique parallèle, la même
 * source de vérité que le reste de l'app.
 */
function DefisView() {
  const { theme } = useTheme();
  const [weekly, setWeekly] = useState<WeeklyChallengeDef | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  const [weeklyCompleted, setWeeklyCompleted] = useState(false);
  const [active, setActive] = useState<Achievement[]>([]);
  const [upcoming, setUpcoming] = useState<Achievement[]>([]);
  const [history, setHistory] = useState<XPLedgerEntry[]>([]);
  const [hasAnySession, setHasAnySession] = useState(true);

  const load = useCallback(async () => {
    const [sessions, prs, measurements] = await Promise.all([
      getSessions(),
      getPRs(),
      getMeasurements(),
    ]);
    setHasAnySession(sessions.length > 0);
    const achievements = computeAchievements({ sessions, prs, measurements });
    await syncXPLedger({ sessions, prs, achievements });

    const def = await getOrCreateWeeklyChallenge(sessions);
    const progress = await computeWeeklyChallengeProgress(def, sessions, prs);
    await awardWeeklyChallengeXPIfComplete(def, progress);
    setWeekly(def);
    setWeeklyProgress(progress);

    const notUnlocked = achievements.filter((a) => !a.unlocked);
    setActive(
      notUnlocked
        .filter((a) => a.progress > 0)
        .sort((a, b) => b.progress / b.target - a.progress / a.target)
        .slice(0, 4),
    );
    setUpcoming(
      notUnlocked
        .filter((a) => a.progress === 0)
        .sort((a, b) => a.target - b.target)
        .slice(0, 3),
    );

    // État "terminé" lu depuis le journal XP (pas depuis `progress >= target`
    // en direct) : un défi santé suit la valeur du jour, qui redescend à 0 le
    // lendemain — sans ce garde-fou, "Terminé" disparaîtrait le jour suivant
    // alors que l'XP a bien été créditée une seule fois pour de bon (§8/§11).
    const ledger = await getXPLedger();
    setWeeklyCompleted(ledger.some((e) => e.id === weeklyChallengeLedgerId(def.weekKey)));
    setHistory(
      ledger
        .filter((e) => e.type === "achievement" || e.type === "challenge")
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 10),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Rafraîchit le défi dès qu'une synchro Health Auto Export apporte de
  // nouvelles données (même signal que le Dashboard, `notifyHealthDataChanged`
  // dans `health-data-storage.ts`) — un défi santé doit évoluer sans que
  // l'utilisateur ait besoin de changer d'onglet puis d'y revenir (§6/§14).
  useEffect(() => {
    return subscribeHealthDataChanged(() => {
      load();
    });
  }, [load]);

  if (!weekly) return null;

  return (
    <View style={{ gap: spacing.md }}>
      <WeeklyChallengeHero def={weekly} progress={weeklyProgress} completed={weeklyCompleted} theme={theme} />

      <Card title="Défis actifs" icon="flame">
        {active.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceSecondary, fontSize: 13 }}>
            {hasAnySession
              ? "Continue à t'entraîner pour faire progresser de nouveaux défis."
              : "Commence à t'entraîner pour débloquer tes premiers défis."}
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {active.map((a, i) => (
              <EnterItem key={a.id} index={i}>
                <AchievementProgressRow achievement={a} theme={theme} />
              </EnterItem>
            ))}
          </View>
        )}
      </Card>

      {upcoming.length > 0 && (
        <Card title="À relever" icon="lock-closed" collapsible defaultCollapsed>
          <View style={{ gap: spacing.xs }}>
            {upcoming.map((a) => (
              <View key={a.id} style={styles.upcomingRow}>
                <Text style={styles.upcomingEmoji}>{a.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.upcomingTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {a.title}
                  </Text>
                  <Text style={[styles.upcomingTarget, { color: theme.colors.onSurfaceTertiary }]}>
                    Objectif : {a.progressLabel?.split("/")[1]?.trim() ?? a.target}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}

      {history.length > 0 && (
        <Card title="Historique" icon="time" collapsible defaultCollapsed>
          <View style={{ gap: 2 }}>
            {history.map((e, i) => (
              <EnterItem key={e.id} index={i}>
                <HistoryRow entry={e} theme={theme} />
              </EnterItem>
            ))}
          </View>
        </Card>
      )}
    </View>
  );
}

function WeeklyChallengeHero({
  def,
  progress,
  completed,
  theme,
}: {
  def: WeeklyChallengeDef;
  progress: number;
  completed: boolean;
  theme: Theme;
}) {
  const accent = completed ? theme.colors.success : theme.colors.data.performance;
  const pct = def.target > 0 ? Math.min(1, progress / def.target) : 0;
  const overshoot = progress > def.target;
  const message = completed ? null : weeklyStageMessage(def, progress);
  const daysLeft = daysRemainingInWeek(def.weekKey);

  // Petit pulse au moment précis où le défi passe à "terminé" — jamais à
  // chaque render (voir §8/§18 : une animation ponctuelle et discrète, pas
  // un effet permanent). `wasCompleted` retient l'état précédent entre deux
  // rendus pour détecter la transition false → true.
  const scale = useSharedValue(1);
  const wasCompleted = useRef(completed);
  useEffect(() => {
    if (completed && !wasCompleted.current) {
      scale.value = withSequence(withSpring(1.04, { damping: 9, stiffness: 180 }), withSpring(1, { damping: 12 }));
    }
    wasCompleted.current = completed;
  }, [completed, scale]);
  const animatedCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedCardStyle}>
      <GlassCard
        level="elevated"
        style={[styles.levelHero, { borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}
      >
        <LinearGradient
          colors={[withAlpha(accent, completed ? 22 : 10 + pct * 16), "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.weeklyHeroHead}>
          <Text style={[styles.levelHeroEyebrow, { color: theme.colors.onSurfaceTertiary }]}>
            {completed ? "✓ DÉFI DE LA SEMAINE TERMINÉ" : "DÉFI DE LA SEMAINE"}
          </Text>
          {!completed && (
            <Text style={[styles.weeklyDaysLeft, { color: theme.colors.onSurfaceTertiary }]}>
              {daysLeft} j restant{daysLeft > 1 ? "s" : ""}
            </Text>
          )}
        </View>
        <Text style={[styles.levelHeroRank, { color: accent, fontSize: 22 }]} numberOfLines={2}>
          {def.title}
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <XPBar progress={pct} color={accent} trackColor={theme.colors.surfaceTertiary} height={12} />
          <View style={styles.weeklyValueRow}>
            <Text style={[styles.levelHeroCaption, { color: theme.colors.onSurface }]}>
              {formatWeeklyChallengeValue(def, progress)} / {formatWeeklyChallengeValue(def, def.target)}
            </Text>
            <Text style={[styles.weeklyPct, { color: accent }]}>{Math.round(pct * 100)}%</Text>
          </View>
          <Text style={[styles.levelHeroSub, { color: theme.colors.onSurfaceTertiary }]}>
            {completed
              ? overshoot
                ? `Objectif dépassé — ${formatWeeklyChallengeValue(def, progress)} réalisés. Nouveau défi lundi.`
                : "Défi terminé. Nouveau défi lundi."
              : message ?? " "}
          </Text>
          <View style={styles.weeklyXpRow}>
            <Ionicons name={completed ? "checkmark-circle" : "flash"} size={13} color={accent} />
            <Text style={[styles.weeklyXpText, { color: accent }]}>+{def.xp} XP</Text>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function AchievementProgressRow({ achievement, theme }: { achievement: Achievement; theme: Theme }) {
  const pct = achievement.target > 0 ? Math.min(1, achievement.progress / achievement.target) : 0;
  return (
    <View>
      <View style={styles.achievementRowHead}>
        <Text style={styles.upcomingEmoji}>{achievement.emoji}</Text>
        <Text style={[styles.upcomingTitle, { color: theme.colors.onSurface, flex: 1 }]} numberOfLines={1}>
          {achievement.title}
        </Text>
        <Text style={[styles.recentXPAmount, { color: theme.colors.data.achievement }]}>+{XP_PER_ACHIEVEMENT} XP</Text>
      </View>
      <View style={{ marginTop: 4 }}>
        <XPBar progress={pct} color={theme.colors.data.achievement} trackColor={theme.colors.surfaceTertiary} height={6} />
        <Text style={[styles.upcomingTarget, { color: theme.colors.onSurfaceTertiary, marginTop: 3 }]}>
          {achievement.progressLabel}
        </Text>
      </View>
    </View>
  );
}

function HistoryRow({ entry, theme }: { entry: XPLedgerEntry; theme: Theme }) {
  const color = entry.type === "challenge" ? theme.colors.data.performance : theme.colors.data.achievement;
  const d = new Date(entry.date);
  const dateLabel = isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  return (
    <View style={styles.recentXPRow}>
      <View style={[styles.recentXPIcon, { backgroundColor: withAlpha(color, 15) }]}>
        <Ionicons name="checkmark" size={13} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.recentXPLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {entry.detail ?? entry.label}
        </Text>
        <Text style={[styles.recentXPDetail, { color: theme.colors.onSurfaceTertiary }]}>{dateLabel}</Text>
      </View>
      <Text style={[styles.recentXPAmount, { color }]}>+{entry.amount} XP</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  container: { flex: 1 },
  exercisesSummary: { fontSize: 12.5, fontWeight: "700", marginBottom: -4 },
  // ---------- DÉFIS ----------
  weeklyHeroHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  weeklyDaysLeft: { fontSize: 11, fontWeight: "700" },
  weeklyValueRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 8 },
  weeklyPct: { fontSize: 15, fontWeight: "800" },
  weeklyXpRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  weeklyXpText: { fontSize: 12.5, fontWeight: "800" },
  achievementRowHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  upcomingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  upcomingEmoji: { fontSize: 16 },
  upcomingTitle: { fontSize: 13, fontWeight: "700" },
  upcomingTarget: { fontSize: 11 },
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
  wodHistoryRow: { gap: spacing.sm, paddingRight: spacing.md },
  wodHistoryCard: {
    width: 168,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 4,
  },
  wodHistoryTitle: { fontWeight: "800", fontSize: 13, letterSpacing: 0.3 },
  wodHistoryFormat: { fontSize: 10.5, fontWeight: "600" },
  wodHistoryStatsRow: { flexDirection: "row", gap: spacing.md, marginTop: 4 },
  wodHistoryStat: { alignItems: "flex-start" },
  wodHistoryStatVal: { fontWeight: "800", fontSize: 16 },
  wodHistoryStatLbl: { fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },
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
  // ---------- NIVEAU (carrière IRONFLOW) ----------
  levelHero: {
    padding: spacing.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  levelHeroEyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  levelHeroRank: { fontSize: 30, fontWeight: "800", letterSpacing: 0.4, marginTop: 2 },
  levelHeroCaption: { fontSize: 13, fontWeight: "700", marginTop: 8 },
  levelHeroSub: { fontSize: 12, marginTop: 3 },
  xpBarTrack: { width: "100%", overflow: "hidden" },
  xpBarFill: { position: "absolute", left: 0, top: 0 },
  recentXPRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6 },
  recentXPIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  recentXPLabel: { fontSize: 13, fontWeight: "700" },
  recentXPDetail: { fontSize: 11, marginTop: 1 },
  recentXPAmount: { fontSize: 13, fontWeight: "800" },
  weekStatsRow: { flexDirection: "row" },
  weekStat: { flex: 1, alignItems: "center", gap: 2 },
  weekStatValue: { fontSize: 18, fontWeight: "800" },
  weekStatLabel: { fontSize: 10.5, fontWeight: "700" },
  weekSentence: { fontSize: 12.5, fontStyle: "italic", marginTop: spacing.sm, textAlign: "center" },
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  milestoneChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  milestoneChipText: { fontSize: 13, fontWeight: "800" },
  milestoneLevel: { fontSize: 14, fontWeight: "800" },
  milestoneXp: { fontSize: 12, marginTop: 2 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  timelineMarkerCol: { alignItems: "center", width: 16 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginTop: 2 },
  timelineLine: { width: 2, flex: 1, marginTop: 2, minHeight: 24 },
  timelineRankLabel: { fontSize: 13.5, fontWeight: "800", letterSpacing: 0.3 },
  timelineLevelLabel: { fontSize: 11.5, marginTop: 1 },
  levelUpBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  levelUpCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
  },
  levelUpTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 1.4, marginTop: 4 },
  levelUpBig: { fontSize: 30, fontWeight: "800" },
  levelUpSub: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  levelUpBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 999, marginTop: 8 },
  levelUpBtnText: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 0.6 },
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
