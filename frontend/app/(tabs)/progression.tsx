import { ReactNode, useState, useCallback } from "react";
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
import Animated, { FadeInDown } from "react-native-reanimated";
import { LineChart } from "react-native-gifted-charts";
import { coloredShadow, motion, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { Theme } from "@/src/themes/types";
import ThemedBackground from "@/src/themes/ThemedBackground";
import Card from "@/src/components/ui/Card";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";
import {
  EXERCISE_CATEGORY_COLOR,
  EXERCISE_CATEGORY_ICON,
  EXERCISE_CATEGORY_LABEL,
  ExerciseCategory,
  getOverrides,
  resolveCategory,
} from "@/src/utils/exercise-category";
import {
  BADGES,
  computeXPState,
  MAX_LEVEL,
  xpForLevel,
} from "@/src/utils/xp";
import {
  deleteMeasurement,
  deletePR,
  getGoals,
  getHabits,
  getHabitLogs,
  getMeasurements,
  getPRs,
  getSessions,
  Goal,
  Habit,
  HabitLog,
  PersonalRecord,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import SwipeableRow from "@/src/components/SwipeableRow";
import { computeAdvancedStats } from "@/src/utils/stats";
import { computeHighlights, Highlight } from "@/src/utils/highlights";
import { listAllExercises } from "@/src/utils/exercise-detail";
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
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
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
    const [s, p, h, hl, g] = await Promise.all([
      getSessions(),
      getPRs(),
      getHabits(),
      getHabitLogs(),
      getGoals(),
    ]);
    setSessions(s);
    setPRs(p);
    setHabits(h);
    setLogs(hl);
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
        {tab === "level" && (
          <LevelView sessions={sessions} habits={habits} habitLogs={logs} prs={prs} />
        )}
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

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setOverridesState(await getOverrides());
      })();
    }, []),
  );

  const doneExercises = listAllExercises(sessions);
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

      {all.length > 0 && (
        <Text style={[styles.exercisesSummary, { color: theme.colors.onSurfaceTertiary }]}>
          {all.length} exercice{all.length > 1 ? "s" : ""} pratiqué{all.length > 1 ? "s" : ""}
        </Text>
      )}

      <Pressable
        testID="new-record-btn"
        style={[styles.ctaFull, { borderRadius: theme.radius.md }, ctaGlassStyle(theme)]}
        onPress={() => router.push("/pr/new")}
      >
        <Ionicons name="add-circle" size={18} color={ctaGlassColor(theme)} />
        <Text style={[styles.ctaFullText, { color: ctaGlassColor(theme) }]}>NOUVEAU RECORD</Text>
      </Pressable>

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
          const color = EXERCISE_CATEGORY_COLOR[e.category];
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
                  <View style={[styles.exIconBox, { backgroundColor: withAlpha(color, 15) }]}>
                    <Ionicons name={EXERCISE_CATEGORY_ICON[e.category]} size={16} color={color} />
                  </View>
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

const DEFI_CATEGORIES: { key: Achievement["category"] | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "debut", label: "Séances" },
  { key: "volume", label: "Volume" },
  { key: "cardio", label: "Cardio" },
  { key: "streak", label: "Streak" },
  { key: "discipline", label: "Discipline" },
  { key: "record", label: "Records" },
  { key: "special", label: "Spécial" },
];

/**
 * DÉFIS — migration de l'ancien écran "Succès" (accessible depuis Profil),
 * fonctionnalité et logique inchangées (`computeAchievements`, 29 succès) :
 * seule la présentation change (vit maintenant en tant que sous-onglet de
 * Performance plutôt qu'un écran modal séparé, donc plus de header/back
 * propre à cet écran).
 */
function DefisView() {
  const { theme } = useTheme();
  const [items, setItems] = useState<Achievement[]>([]);
  const [cat, setCat] = useState<Achievement["category"] | "all">("all");
  const isGlass = theme.card.mode === "glass";

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [sessions, prs, measurements] = await Promise.all([
          getSessions(),
          getPRs(),
          getMeasurements(),
        ]);
        setItems(computeAchievements({ sessions, prs, measurements }));
      })();
    }, []),
  );

  const filtered = cat === "all" ? items : items.filter((i) => i.category === cat);
  const unlocked = items.filter((i) => i.unlocked).length;

  return (
    <>
      <View
        style={[
          styles.defisSummary,
          { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.defisSummaryLeft}>
          <Text style={[styles.defisSummaryTitle, { color: theme.colors.onSurface }]}>Progression</Text>
          <Text style={[styles.defisSummarySub, { color: theme.colors.onSurfaceTertiary }]}>
            {unlocked}/{items.length} défis débloqués
          </Text>
        </View>
        <View
          style={[
            styles.defisSummaryBadge,
            { borderRadius: theme.radius.md, backgroundColor: isGlass ? withAlpha(theme.colors.brand, 20) : theme.colors.brand },
          ]}
        >
          <Text style={styles.defisSummaryBadgeText}>
            {Math.round((unlocked / Math.max(1, items.length)) * 100)}%
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.defisCatRow}>
        {DEFI_CATEGORIES.map((c) => {
          const active = cat === c.key;
          return (
            <Pressable
              key={c.key}
              testID={`defi-cat-${c.key}`}
              style={[
                styles.defisCatChip,
                {
                  borderRadius: theme.radius.pill,
                  backgroundColor: active ? (isGlass ? withAlpha(theme.colors.brand, 20) : theme.colors.brand) : theme.colors.surfaceSecondary,
                  borderColor: active ? theme.colors.brand : theme.colors.border,
                },
              ]}
              onPress={() => setCat(c.key)}
            >
              <Text
                style={[
                  styles.defisCatChipText,
                  { color: active ? (isGlass ? theme.colors.brand : "#fff") : theme.colors.onSurfaceTertiary },
                ]}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.defisGrid}>
        {filtered.map((a, i) => (
          <EnterItem key={a.id} index={i}>
            <View
              testID={`defi-${a.id}`}
              style={[
                styles.defisCard,
                { borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
                a.unlocked && { borderColor: theme.colors.success, backgroundColor: withAlpha(theme.colors.success, 12) },
              ]}
            >
              <Text style={[styles.defisEmoji, !a.unlocked && { opacity: 0.35 }]}>{a.emoji}</Text>
              <Text
                style={[styles.defisCardTitle, { color: a.unlocked ? theme.colors.onSurface : theme.colors.onSurfaceTertiary }]}
                numberOfLines={2}
              >
                {a.title}
              </Text>
              <Text style={[styles.defisCardDesc, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={2}>
                {a.description}
              </Text>
              <View style={[styles.defisProgressTrack, { backgroundColor: theme.colors.surfaceTertiary }]}>
                <View
                  style={[
                    styles.defisProgressFill,
                    {
                      width: `${Math.min(100, (a.progress / a.target) * 100)}%`,
                      backgroundColor: a.unlocked ? theme.colors.success : theme.colors.brand,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.defisProgressLabel, { color: theme.colors.onSurfaceTertiary }]}>
                {a.progressLabel}
              </Text>
              {a.unlocked && (
                <View style={[styles.defisUnlockedTag, { backgroundColor: theme.colors.success }]}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                  <Text style={styles.defisUnlockedTagText}>DÉBLOQUÉ</Text>
                </View>
              )}
            </View>
          </EnterItem>
        ))}
      </View>
    </>
  );
}

export const styles = StyleSheet.create({
  container: { flex: 1 },
  exercisesSummary: { fontSize: 12.5, fontWeight: "700", marginBottom: -4 },
  defisSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  defisSummaryLeft: { flex: 1 },
  defisSummaryTitle: { fontSize: 15, fontWeight: "800" },
  defisSummarySub: { fontSize: 12, marginTop: 2 },
  defisSummaryBadge: { paddingHorizontal: 14, paddingVertical: 8 },
  defisSummaryBadgeText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  defisCatRow: { gap: 6, paddingBottom: spacing.sm },
  defisCatChip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  defisCatChipText: { fontSize: 11, fontWeight: "700" },
  defisGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  defisCard: { width: "48%", borderWidth: 1, padding: spacing.md, gap: 6, position: "relative" },
  defisEmoji: { fontSize: 32 },
  defisCardTitle: { fontWeight: "800", fontSize: 13 },
  defisCardDesc: { fontSize: 11, lineHeight: 14, minHeight: 28 },
  defisProgressTrack: { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 4 },
  defisProgressFill: { height: "100%" },
  defisProgressLabel: { fontSize: 10, fontWeight: "600" },
  defisUnlockedTag: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defisUnlockedTagText: { color: "#fff", fontSize: 8, fontWeight: "800", letterSpacing: 0.4 },
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
