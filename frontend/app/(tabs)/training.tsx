import { useState, useCallback, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { coloredShadow, motion, shadow, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { Theme } from "@/src/themes/types";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";

/** Chip actif — même recette "Active Glass" que `progression.tsx`/
 * `ExerciseFilterChips.tsx` : fond translucide + bordure teintée + lueur
 * douce sous Sunset, pavé plein sous Classique. `accentColor` permet de
 * garder les teintes déjà sémantiques du fichier (TYPE_COLORS, couleur de
 * programme) plutôt que de tout forcer sur `theme.colors.brand`. */
function activeChipStyle(theme: Theme, active: boolean, inactiveBg: string, accentColor?: string) {
  const accent = accentColor ?? theme.colors.brand;
  if (!active) return { backgroundColor: inactiveBg, borderColor: theme.colors.border };
  if (theme.card.mode !== "glass") return { backgroundColor: accent, borderColor: accent };
  return [
    { backgroundColor: withAlpha(accent, 20), borderColor: withAlpha(accent, 50) },
    coloredShadow(accent, { offsetY: 0, opacity: 0.28, radius: 6, elevation: 2 }),
  ];
}
function activeChipColor(theme: Theme, active: boolean, inactiveColor: string, accentColor?: string) {
  if (!active) return inactiveColor;
  const accent = accentColor ?? theme.colors.brand;
  return theme.card.mode === "glass" ? accent : "#fff";
}
import PressableScale from "@/src/components/ui/PressableScale";
import CTAButton from "@/src/components/ui/CTAButton";
import Card from "@/src/components/ui/Card";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";
import SwipeableRow from "@/src/components/SwipeableRow";
import { programIconFor } from "@/src/utils/program-goal-icon";
import {
  ActiveProgram,
  currentDayIndex,
  deletePlan,
  deleteSession,
  getActivePrograms,
  getPlans,
  getSessions,
  Plan,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import { launchProgramDay } from "@/src/utils/program-launch";
import { pickRandomWod } from "@/src/utils/wod-random";
import { findProgram } from "@/src/utils/programs";
import { Program, ProgramDay, ProgramSession } from "@/src/data/programs";
import { MUSCLE_GROUPS } from "@/src/utils/muscle-groups";
import { ExerciseRecord, getExerciseRecords } from "@/src/utils/exercise-records";
import { plannedDateForDayIndex } from "@/src/utils/session-estimate";
import SegmentedTabRow from "@/src/components/ui/SegmentedTabRow";
import FilterSheet, { FilterCountBadge } from "@/src/components/ui/FilterSheet";
import ProgramWeekTabs from "@/src/components/ProgramWeekTabs";
import ProgramDayCardFull, {
  PROGRAM_DAY_CARD_FULL_GAP,
  PROGRAM_DAY_CARD_FULL_WIDTH,
} from "@/src/components/ProgramDayCardFull";
import {
  nonRestDaysInRange,
  weekDayRange,
  weekIndexForDay,
} from "@/src/utils/program-week-grouping";
import { getPlanTypeColors } from "@/src/utils/plan-type-colors";
import ProgramBrowseList from "@/src/components/ProgramBrowseList";

type Tab = "program" | "cardio" | "mobility" | "sessions" | "individual";
type IndCat = "all" | "musculation" | "cardio" | "wod" | "stretch";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "program", label: "Musculation", icon: "barbell" },
  { key: "cardio", label: "Cardio", icon: "stopwatch" },
  { key: "mobility", label: "Mobilité", icon: "body" },
  { key: "individual", label: "Séances", icon: "list" },
  { key: "sessions", label: "Historique", icon: "time" },
];

const IND_CATS: { key: IndCat; label: string; icon: any }[] = [
  { key: "all", label: "Toutes", icon: "apps" },
  { key: "musculation", label: "Musculation", icon: "barbell" },
  { key: "cardio", label: "Cardio", icon: "stopwatch" },
  { key: "wod", label: "WOD", icon: "flame" },
  { key: "stretch", label: "Mobilité", icon: "body" },
];

/** Cascade d'entrée décalée par carte, même pattern que le Dashboard. */
function EnterItem({ index, children }: { index: number; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(motion.base)}>
      {children}
    </Animated.View>
  );
}

export default function TrainingHub() {
  const { theme } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("program");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [actives, setActives] = useState<
    { active: ActiveProgram; program: Program }[]
  >([]);
  const [exerciseRecords, setExerciseRecords] = useState<ExerciseRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setPlans(await getPlans());
        setSessions(await getSessions());
        setExerciseRecords(await getExerciseRecords());
        const list = await getActivePrograms();
        const resolved = [];
        for (const a of list) {
          const p = await findProgram(a.programId);
          if (p) resolved.push({ active: a, program: p });
        }
        setActives(resolved);
      })();
    }, []),
  );

  const workoutActives = actives.filter(
    (a) => (a.program.category ?? "workout") === "workout",
  );
  const cardioActives = actives.filter(
    (a) => a.program.category === "cardio",
  );
  const stretchActives = actives.filter(
    (a) => a.program.category === "stretch",
  );

  const now = new Date();
  const sessionsThisMonth = sessions.filter((s) => {
    const d = new Date(s.startedAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const subtitle =
    sessionsThisMonth > 0
      ? `${sessionsThisMonth} séance${sessionsThisMonth > 1 ? "s" : ""} ce mois-ci`
      : actives.length > 0
        ? "Prêt·e pour ta prochaine séance ?"
        : "Choisis un programme pour commencer";

  // Une carte-jour du hub lance toujours directement, quel que soit le jour
  // — un programme n'est qu'un modèle, rien n'empêche de lancer la séance
  // d'un autre jour à la demande (`findOrCreateProgramPlan` est déjà
  // agnostique du jour). Corrige aussi le bug de l'ancien `DayColumnsRow`
  // où chaque colonne menait systématiquement à la même page programme,
  // quel que soit le jour tapé.
  // Extrait dans `program-launch.ts` pour que le Dashboard réutilise
  // exactement le même mécanisme de lancement, pas une réimplémentation.
  const handlePressDay = (
    program: Program,
    active: ActiveProgram,
    dayIndex: number,
    day: ProgramDay,
    sessionIndex: number,
    session: ProgramSession,
  ) => launchProgramDay(program, active, dayIndex, day, sessionIndex, session, router);

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
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Entraînements</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceTertiary }]}>{subtitle}</Text>
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
              <PressableScale
                key={t.key}
                testID={`seg-${t.key}`}
                style={[
                  styles.segChip,
                  { borderRadius: theme.radius.pill },
                  activeChipStyle(theme, active, theme.colors.surfaceSecondary),
                ]}
                onPress={() => setTab(t.key)}
              >
                <Ionicons
                  name={t.icon}
                  size={14}
                  color={activeChipColor(theme, active, theme.colors.onSurfaceTertiary)}
                />
                <Text
                  style={[
                    styles.segLabel,
                    { color: activeChipColor(theme, active, theme.colors.onSurfaceSecondary) },
                  ]}
                >
                  {t.label}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "program" && (
          <ProgramView
            actives={workoutActives}
            router={router}
            records={exerciseRecords}
            plans={plans}
            sessions={sessions}
            onPressDay={handlePressDay}
          />
        )}
        {tab === "cardio" && (
          <CardioView
            actives={cardioActives}
            router={router}
            records={exerciseRecords}
            plans={plans}
            sessions={sessions}
            onPressDay={handlePressDay}
          />
        )}
        {tab === "mobility" && (
          <MobilityView
            actives={stretchActives}
            router={router}
            records={exerciseRecords}
            plans={plans}
            sessions={sessions}
            onPressDay={handlePressDay}
          />
        )}
        {tab === "sessions" && (
          <SessionsView
            sessions={sessions}
            router={router}
            records={exerciseRecords}
            onDeleted={async () => {
              setSessions(await getSessions());
            }}
          />
        )}
        {tab === "individual" && (
          <IndividualView
            plans={plans}
            router={router}
            records={exerciseRecords}
            onDeleted={async () => {
              setPlans(await getPlans());
            }}
          />
        )}
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** Carte héroïque pour le programme actif — le vrai point focal de chaque
 * onglet, teintée de la couleur du programme, avec relief (`shadow.elevated`,
 * seule carte de l'écran à en avoir — c'est la carte "hero" que `theme.ts`
 * réserve à ce traitement). Affiche en plus une bande "Cette semaine" des
 * prochains jours réels du programme (voir `UpcomingDaysStrip`). */
function ProgramHeroCard({
  testID,
  program,
  active,
  records,
  today,
  done,
  total,
  onPress,
  onPressDay,
  index = 0,
  programSessions = [],
  router,
}: {
  testID: string;
  program: Program;
  active?: ActiveProgram;
  records: ExerciseRecord[];
  today: number;
  done?: number;
  total?: number;
  onPress: () => void;
  onPressDay: PressDayHandler;
  index?: number;
  programSessions?: WorkoutSession[];
  router?: any;
}) {
  const { theme } = useTheme();
  const hasProgress = total !== undefined && total > 0;
  const pct = hasProgress ? (done ?? 0) / total! : 0;
  return (
    <EnterItem index={index}>
      <PressableScale
        testID={testID}
        style={[
          styles.heroProgCard,
          {
            borderRadius: theme.radius.lg,
            backgroundColor: withAlpha(program.color, 10),
            borderColor: withAlpha(program.color, 33),
          },
        ]}
        onPress={onPress}
      >
        <View style={styles.heroProgHead}>
          <View
            style={[
              styles.heroProgEmoji,
              { borderRadius: theme.radius.md, backgroundColor: withAlpha(program.color, 19) },
            ]}
          >
            <Ionicons name={programIconFor(program.coverEmoji)} size={30} color={program.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroProgTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {program.title}
            </Text>
            <Text style={[styles.heroProgMeta, { color: theme.colors.onSurfaceSecondary }]}>
              Jour {today}/{program.durationDays}
              {hasProgress ? ` · ${done}/${total} séances` : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceTertiary} />
        </View>
        {hasProgress && (
          <View style={styles.heroProgBarRow}>
            <View style={[styles.heroProgBar, { backgroundColor: theme.colors.surfaceTertiary }]}>
              <View
                style={[
                  styles.heroProgFill,
                  { width: `${pct * 100}%`, backgroundColor: program.color },
                ]}
              />
            </View>
            <Text style={[styles.heroProgPct, { color: program.color }]}>
              {Math.round(pct * 100)}%
            </Text>
          </View>
        )}
      </PressableScale>
      {active && (
        <ProgramSubTabs
          program={program}
          active={active}
          records={records}
          programSessions={programSessions}
          onPressDay={(dayIndex, day, sessionIndex, session) =>
            onPressDay(program, active, dayIndex, day, sessionIndex, session)
          }
          router={router}
        />
      )}
    </EnterItem>
  );
}

/** 3 sous-onglets sous la carte héros d'un programme actif : Cette
 * semaine (vrais prochains jours non-repos, esprit de la référence
 * visuelle fournie) / Semaines à venir (même présentation, paginée plus
 * loin dans le programme) / Historique (séances déjà faites pour CE
 * programme). `Program` n'a ni jour de semaine ni cadence hebdomadaire
 * fixe, donc jamais de libellé Lundi/Mercredi inventé — toujours de
 * vraies dates calculées. */
function ProgramSubTabs({
  program,
  active,
  records,
  programSessions,
  onPressDay,
  router,
}: {
  program: Program;
  active: ActiveProgram;
  records: ExerciseRecord[];
  programSessions: WorkoutSession[];
  onPressDay: DayPressHandler;
  router: any;
}) {
  const [subTab, setSubTab] = useState<"week" | "ahead" | "history">("week");
  return (
    <View style={styles.weekWrap}>
      <SegmentedTabRow
        testIDPrefix={`program-subtabs-${program.id}`}
        options={[
          { key: "week", label: "Cette semaine" },
          { key: "ahead", label: "Semaines à venir" },
          { key: "history", label: "Historique" },
        ]}
        value={subTab}
        onChange={setSubTab}
      />
      <View style={{ marginTop: spacing.sm }}>
        {subTab === "week" && (
          <ThisWeekPanel program={program} active={active} records={records} onPressDay={onPressDay} router={router} />
        )}
        {subTab === "ahead" && (
          <WeeksAheadPanel program={program} active={active} records={records} onPressDay={onPressDay} router={router} />
        )}
        {subTab === "history" && (
          <ProgramHistoryPanel sessions={programSessions} records={records} router={router} />
        )}
      </View>
    </View>
  );
}

/** Rangée horizontale de cartes-jour pleines (mêmes composants que la vue
 * Semaine de program/[id].tsx) — "même visualisation partout où c'est
 * possible" dans les menus d'entraînements. */
function DayCardFullRow({
  columns,
  program,
  active,
  records,
  todayIndex,
  onPressDay,
  router,
}: {
  columns: { dayIndex: number; day: ProgramDay }[];
  program: Program;
  active: ActiveProgram;
  records: ExerciseRecord[];
  todayIndex: number;
  onPressDay: DayPressHandler;
  router: any;
}) {
  const { theme } = useTheme();
  if (columns.length === 0) {
    return <Text style={[styles.weekEmptyHint, { color: theme.colors.onSurfaceTertiary }]}>Aucun jour prévu.</Text>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={PROGRAM_DAY_CARD_FULL_WIDTH + PROGRAM_DAY_CARD_FULL_GAP}
      snapToAlignment="start"
      decelerationRate="fast"
      contentContainerStyle={{ gap: PROGRAM_DAY_CARD_FULL_GAP, paddingRight: spacing.lg }}
    >
      {columns.map(({ dayIndex, day }) => {
        const isToday = dayIndex === todayIndex;
        const doneSessionIndices = new Set(
          day.sessions
            .map((_, si) => si)
            .filter((si) =>
              active.completedSessions.some((s) => s.dayIndex === dayIndex && s.sessionIndex === si),
            ),
        );
        const done = day.sessions.length > 0 && day.sessions.every((_, si) => doneSessionIndices.has(si));
        return (
          <ProgramDayCardFull
            key={dayIndex}
            dayIndex={dayIndex}
            day={day}
            color={program.color}
            records={records}
            plannedDate={plannedDateForDayIndex(active.startedAt, dayIndex)}
            isToday={isToday}
            done={done}
            doneSessionIndices={doneSessionIndices}
            onLaunch={(si, s) => onPressDay(dayIndex, day, si, s)}
            onPressExercise={(name) => router.push(`/exercise-detail/${encodeURIComponent(name)}`)}
          />
        );
      })}
    </ScrollView>
  );
}

function ThisWeekPanel({
  program,
  active,
  records,
  onPressDay,
  router,
}: {
  program: Program;
  active: ActiveProgram;
  records: ExerciseRecord[];
  onPressDay: DayPressHandler;
  router: any;
}) {
  const today = currentDayIndex(active, program.durationDays);
  const columns = nonRestDaysInRange(program, today, today + 13).slice(0, 4);
  return (
    <DayCardFullRow
      columns={columns}
      program={program}
      active={active}
      records={records}
      todayIndex={today}
      onPressDay={onPressDay}
      router={router}
    />
  );
}

/** Semaines suivant celle d'"aujourd'hui" (déjà couverte par l'onglet
 * "Cette semaine"), accès direct par onglet plutôt que chevrons — cohérent
 * avec la vue Semaine de program/[id].tsx. */
function WeeksAheadPanel({
  program,
  active,
  records,
  onPressDay,
  router,
}: {
  program: Program;
  active: ActiveProgram;
  records: ExerciseRecord[];
  onPressDay: DayPressHandler;
  router: any;
}) {
  const today = currentDayIndex(active, program.durationDays);
  const currentWeekIdx = weekIndexForDay(today);
  const totalWeeks = Math.ceil(program.durationDays / 7);
  const aheadWeeks = Array.from(
    { length: Math.max(0, totalWeeks - currentWeekIdx - 1) },
    (_, i) => currentWeekIdx + 1 + i,
  );
  const { theme } = useTheme();
  const [weekIdx, setWeekIdx] = useState(aheadWeeks[0] ?? currentWeekIdx + 1);

  if (aheadWeeks.length === 0) {
    return (
      <Text style={[styles.weekEmptyHint, { color: theme.colors.onSurfaceTertiary }]}>
        Aucune semaine supplémentaire — c&apos;est la dernière.
      </Text>
    );
  }

  const { start, end } = weekDayRange(weekIdx);
  const columns = nonRestDaysInRange(program, start, end);

  return (
    <View style={{ gap: spacing.sm }}>
      <ProgramWeekTabs
        weeks={aheadWeeks}
        activeWeek={weekIdx}
        onSelectWeek={setWeekIdx}
        color={program.color}
      />
      <DayCardFullRow
        columns={columns}
        program={program}
        active={active}
        records={records}
        todayIndex={today}
        onPressDay={onPressDay}
        router={router}
      />
    </View>
  );
}

function ProgramHistoryPanel({
  sessions,
  records,
  router,
}: {
  sessions: WorkoutSession[];
  records: ExerciseRecord[];
  router: any;
}) {
  const { theme } = useTheme();
  if (sessions.length === 0) {
    return (
      <Text style={[styles.weekEmptyHint, { color: theme.colors.onSurfaceTertiary }]}>
        Aucune séance de ce programme terminée pour l&apos;instant.
      </Text>
    );
  }
  return (
    <View style={{ gap: spacing.sm }}>
      {sessions.slice(0, 5).map((s) => (
        <PressableScale
          key={s.id}
          testID={`program-history-${s.id}`}
          onPress={() => router.push(`/session/${s.id}`)}
        >
          <Card padding={spacing.sm}>
            <View style={styles.historyRowInner}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.historyRowTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {s.planTitle}
                </Text>
                <Text style={[styles.historyRowDate, { color: theme.colors.onSurfaceTertiary }]}>
                  {formatDate(s.startedAt)}
                </Text>
              </View>
              {s.exercises.length > 0 && (
                <View style={styles.sessionThumbRow}>
                  {s.exercises.slice(0, 3).map((ex, i) => (
                    <ExerciseThumbnail
                      key={i}
                      name={ex.name}
                      records={records}
                      exerciseRecordId={ex.libraryExerciseId}
                      size={24}
                      square
                    />
                  ))}
                </View>
              )}
            </View>
          </Card>
        </PressableScale>
      ))}
    </View>
  );
}

function getSessionsForProgram(
  program: Program,
  plans: Plan[],
  sessions: WorkoutSession[],
): WorkoutSession[] {
  const planIds = new Set(
    plans.filter((p) => p.programSource?.programId === program.id).map((p) => p.id),
  );
  return sessions
    .filter((s) => planIds.has(s.planId))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

type PressDayHandler = (
  program: Program,
  active: ActiveProgram,
  dayIndex: number,
  day: ProgramDay,
  sessionIndex: number,
  session: ProgramSession,
) => void;
type DayPressHandler = (
  dayIndex: number,
  day: ProgramDay,
  sessionIndex: number,
  session: ProgramSession,
) => void;

function ProgramView({
  actives,
  router,
  records,
  plans,
  sessions,
  onPressDay,
}: {
  actives: { active: ActiveProgram; program: Program }[];
  router: any;
  records: ExerciseRecord[];
  plans: Plan[];
  sessions: WorkoutSession[];
  onPressDay: PressDayHandler;
}) {
  const { theme } = useTheme();
  if (actives.length === 0) {
    return <ProgramBrowseList router={router} />;
  }
  return (
    <>
      {actives.map(({ active, program }, i) => {
        const today = currentDayIndex(active, program.durationDays);
        const done = active.completedSessions.length;
        const total = program.days.reduce(
          (a, d) => a + (d.rest ? 0 : d.sessions.length),
          0,
        );
        return (
          <ProgramHeroCard
            key={program.id}
            index={i}
            testID={`training-prog-${program.id}`}
            program={program}
            active={active}
            records={records}
            today={today}
            done={done}
            total={total}
            programSessions={getSessionsForProgram(program, plans, sessions)}
            router={router}
            onPress={() => router.push(`/program/${program.id}`)}
            onPressDay={onPressDay}
          />
        );
      })}
      <PressableScale
        style={[styles.linkBtn, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
        onPress={() => router.push("/programs")}
        testID="all-programs"
      >
        <Ionicons name="library" size={14} color={theme.colors.brand} />
        <Text style={[styles.linkBtnText, { color: theme.colors.brand }]}>Parcourir tous les programmes</Text>
        <Ionicons name="chevron-forward" size={14} color={theme.colors.brand} />
      </PressableScale>
    </>
  );
}

function SessionsView({
  sessions,
  router,
  records,
  onDeleted,
}: {
  sessions: WorkoutSession[];
  router: any;
  records: ExerciseRecord[];
  onDeleted: () => void;
}) {
  const { theme } = useTheme();
  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="time" size={40} color={theme.colors.brand} />
        <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Aucune séance</Text>
        <Text style={[styles.emptySub, { color: theme.colors.onSurfaceTertiary }]}>
          Termine ta première séance pour la voir ici.
        </Text>
      </View>
    );
  }
  return (
    <>
      <Text style={[styles.hintText, { color: theme.colors.onSurfaceTertiary }]}>
        <Ionicons name="hand-left" size={11} color={theme.colors.onSurfaceTertiary} />
        {"  "}Glisse vers la gauche pour supprimer une séance
      </Text>
      {sessions.slice(0, 30).map((s, i) => (
        <EnterItem key={s.id} index={i}>
          <SwipeableSessionRow
            session={s}
            records={records}
            onPress={() => router.push(`/session/${s.id}`)}
            onDeleted={onDeleted}
          />
        </EnterItem>
      ))}
    </>
  );
}

function SwipeableSessionRow({
  session: s,
  records,
  onPress,
  onDeleted,
}: {
  session: WorkoutSession;
  records: ExerciseRecord[];
  onPress: () => void;
  onDeleted: () => void;
}) {
  const { theme } = useTheme();
  const accent = getPlanTypeColors(theme)[s.planType] ?? theme.colors.brand;
  return (
    <SwipeableRow
      testID={`session-item-${s.id}`}
      style={styles.swipeContainer}
      onDelete={async () => {
        await deleteSession(s.id);
        onDeleted();
      }}
      deleteConfirm={{
        title: "Supprimer cette séance ?",
        message: `"${s.planTitle}" — cette action est définitive.`,
        confirmLabel: "SUPPRIMER",
        destructive: true,
      }}
    >
      <PressableScale testID={`session-item-${s.id}`} onPress={onPress}>
        <GlassCard
          level="subtle"
          style={[
            styles.sessionCard,
            { borderRadius: theme.radius.lg, borderLeftColor: accent },
            theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
          ]}
        >
        <Text style={[styles.sessionTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {s.planTitle}
        </Text>
        <Text style={[styles.sessionDate, { color: theme.colors.onSurfaceTertiary }]}>
          {formatDate(s.startedAt)}
        </Text>
        <View style={styles.sessionStatsRow}>
          <Stat icon="time" value={formatDuration(s.durationSeconds)} />
          <Stat icon="flame" value={`${s.caloriesBurned} kcal`} />
          <Stat icon="barbell" value={`${s.exercises.length} ex.`} />
        </View>
        {s.exercises.length > 0 && (
          <View style={styles.sessionThumbRow}>
            {s.exercises.slice(0, 4).map((ex, i) => (
              <ExerciseThumbnail
                key={i}
                name={ex.name}
                records={records}
                exerciseRecordId={ex.libraryExerciseId}
                size={24}
                square
              />
            ))}
          </View>
        )}
        </GlassCard>
      </PressableScale>
    </SwipeableRow>
  );
}

type SeancesSubTab = "custom" | "wod";

function IndividualView({
  plans,
  router,
  records,
  onDeleted,
}: {
  plans: Plan[];
  router: any;
  records: ExerciseRecord[];
  onDeleted: () => void;
}) {
  const [subTab, setSubTab] = useState<SeancesSubTab>("custom");
  const customPlans = plans.filter((p) => !p.wodSource);
  const wodPlans = plans.filter((p) => p.wodSource);

  return (
    <>
      <SegmentedTabRow
        testIDPrefix="seances-subtabs"
        options={[
          { key: "custom", label: "Mes séances" },
          { key: "wod", label: "WOD" },
        ]}
        value={subTab}
        onChange={setSubTab}
      />
      {subTab === "custom" ? (
        <CustomSessionsView
          plans={customPlans}
          router={router}
          records={records}
          onDeleted={onDeleted}
        />
      ) : (
        <WodLibraryView
          plans={wodPlans}
          router={router}
          records={records}
          onDeleted={onDeleted}
        />
      )}
    </>
  );
}

function CustomSessionsView({
  plans,
  router,
  records,
  onDeleted,
}: {
  plans: Plan[];
  router: any;
  records: ExerciseRecord[];
  onDeleted: () => void;
}) {
  const { theme } = useTheme();
  const [cat, setCat] = useState<IndCat>("all");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const activeFilterCount = (cat !== "all" ? 1 : 0) + (muscle ? 1 : 0);

  const filtered = plans.filter((p) => {
    if (cat !== "all") {
      const type = p.type;
      const matches =
        cat === type ||
        (cat === "cardio" && (type === "cardio" || type === "hiit")) ||
        (cat === "wod" && type === "mixte");
      if (!matches) return false;
    }
    if (muscle) {
      const hasMuscle = p.exercises.some(
        (ex) => (ex as any).muscle_groups?.includes(muscle),
      );
      if (!hasMuscle) return false;
    }
    return true;
  });

  return (
    <>
      <View style={styles.indFilterRow}>
        <PressableScale testID="ind-open-filters" onPress={() => setFilterSheetOpen(true)}>
          <GlassCard
            level="subtle"
            style={[
              styles.indFilterBtn,
              { borderRadius: theme.radius.pill },
              theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
            ]}
          >
            <Ionicons name="options-outline" size={16} color={theme.colors.onSurface} />
            <Text style={[styles.indFilterBtnText, { color: theme.colors.onSurface }]}>Filtres</Text>
            <FilterCountBadge count={activeFilterCount} />
          </GlassCard>
        </PressableScale>
      </View>

      <FilterSheet visible={filterSheetOpen} onClose={() => setFilterSheetOpen(false)}>
        <Text style={[styles.indFilterSectionLabel, { color: theme.colors.onSurfaceTertiary }]}>Catégorie</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 42 }}
          contentContainerStyle={styles.catRow}
        >
          {IND_CATS.map((c) => {
            const active = cat === c.key;
            return (
              <PressableScale
                key={c.key}
                testID={`ind-cat-${c.key}`}
                style={[
                  styles.catChip,
                  { borderRadius: theme.radius.pill },
                  activeChipStyle(theme, active, theme.colors.surfaceSecondary),
                ]}
                onPress={() => setCat(c.key)}
              >
                <Ionicons name={c.icon} size={12} color={activeChipColor(theme, active, theme.colors.brand)} />
                <Text
                  style={[styles.catLabel, { color: activeChipColor(theme, active, theme.colors.onSurfaceSecondary) }]}
                >
                  {c.label}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        <Text style={[styles.indFilterSectionLabel, { color: theme.colors.onSurfaceTertiary }]}>Groupe musculaire</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 42 }}
          contentContainerStyle={styles.catRow}
        >
          <PressableScale
            testID="muscle-all"
            style={[
              styles.muscleChip,
              { borderRadius: theme.radius.pill },
              activeChipStyle(theme, !muscle, theme.colors.surfaceTertiary),
            ]}
            onPress={() => setMuscle(null)}
          >
            <Text style={[styles.muscleText, { color: activeChipColor(theme, !muscle, theme.colors.onSurfaceSecondary) }]}>
              Tous groupes
            </Text>
          </PressableScale>
          {MUSCLE_GROUPS.map((mg) => {
            const active = muscle === mg.key;
            return (
              <PressableScale
                key={mg.key}
                testID={`muscle-${mg.key}`}
                style={[
                  styles.muscleChip,
                  { borderRadius: theme.radius.pill },
                  activeChipStyle(theme, active, theme.colors.surfaceTertiary),
                ]}
                onPress={() => setMuscle(active ? null : mg.key)}
              >
                <Text style={[styles.muscleText, { color: activeChipColor(theme, active, theme.colors.onSurfaceSecondary) }]}>
                  {mg.label}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </FilterSheet>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="barbell" size={40} color={theme.colors.brand} />
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
            {plans.length === 0 ? "Aucune séance individuelle" : "Aucune séance dans ce filtre"}
          </Text>
          <CTAButton
            testID="create-plan"
            variant="primary"
            label="Créer une séance"
            onPress={() => router.push("/plan/new")}
          />
        </View>
      ) : (
        <>
          <Text style={[styles.hintText, { color: theme.colors.onSurfaceTertiary }]}>
            <Ionicons name="hand-left" size={11} color={theme.colors.onSurfaceTertiary} />
            {"  "}Glisse vers la gauche pour supprimer une séance
          </Text>
          {filtered.map((p, i) => (
            <EnterItem key={p.id} index={i}>
              <SwipeablePlanRow
                plan={p}
                records={records}
                onPress={() => router.push(`/plan/${p.id}`)}
                onStart={() => router.push(`/workout/${p.id}`)}
                onDeleted={onDeleted}
              />
            </EnterItem>
          ))}
          <PressableScale
            style={[styles.linkBtn, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
            onPress={() => router.push("/plan/new")}
            testID="new-plan"
          >
            <Ionicons name="add-circle" size={14} color={theme.colors.brand} />
            <Text style={[styles.linkBtnText, { color: theme.colors.brand }]}>Créer une nouvelle séance</Text>
          </PressableScale>
        </>
      )}
    </>
  );
}

const WOD_COLLECTION_LABEL: Record<"home" | "hyrox" | "classics", string> = {
  home: "Home WODs",
  hyrox: "Hyrox",
  classics: "Classiques",
};

function IntensityFlames({ level, size = 12 }: { level: number; size?: number }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {Array.from({ length: level }).map((_, i) => (
        <Ionicons key={i} name="flame" size={size} color={theme.colors.data.workout} />
      ))}
    </View>
  );
}

function WodLibraryView({
  plans,
  router,
  records,
  onDeleted,
}: {
  plans: Plan[];
  router: any;
  records: ExerciseRecord[];
  onDeleted: () => void;
}) {
  const { theme } = useTheme();
  const [collection, setCollection] = useState<"all" | "home" | "hyrox" | "classics">("all");
  const [intensity, setIntensity] = useState<number | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [randomSheetOpen, setRandomSheetOpen] = useState(false);
  const activeFilterCount = (collection !== "all" ? 1 : 0) + (intensity != null ? 1 : 0);

  const intensityLevels = Array.from(
    new Set(plans.map((p) => p.wodSource!.intensity)),
  ).sort((a, b) => a - b);

  const filtered = plans
    .filter((p) => {
      if (collection !== "all" && p.wodSource!.collection !== collection) return false;
      if (intensity != null && p.wodSource!.intensity !== intensity) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.wodSource!.collection !== b.wodSource!.collection) {
        return a.wodSource!.collection.localeCompare(b.wodSource!.collection);
      }
      return a.wodSource!.number - b.wodSource!.number;
    });

  function launchRandom(desired: number | null) {
    const chosen = pickRandomWod(plans, desired);
    if (!chosen) return;
    setRandomSheetOpen(false);
    router.push(`/workout/${chosen.id}`);
  }

  return (
    <>
      <PressableScale
        testID="wod-random-open"
        style={[
          styles.randomWodBtn,
          { borderRadius: theme.radius.pill },
          activeChipStyle(theme, true, theme.colors.surfaceSecondary, theme.colors.data.workout),
        ]}
        onPress={() => setRandomSheetOpen(true)}
      >
        <Ionicons name="shuffle" size={16} color={activeChipColor(theme, true, "#fff", theme.colors.data.workout)} />
        <Text
          style={[
            styles.randomWodBtnText,
            { color: activeChipColor(theme, true, "#fff", theme.colors.data.workout) },
          ]}
        >
          WOD aléatoire
        </Text>
      </PressableScale>

      <View style={styles.indFilterRow}>
        <PressableScale testID="wod-open-filters" onPress={() => setFilterSheetOpen(true)}>
          <GlassCard
            level="subtle"
            style={[
              styles.indFilterBtn,
              { borderRadius: theme.radius.pill },
              theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
            ]}
          >
            <Ionicons name="options-outline" size={16} color={theme.colors.onSurface} />
            <Text style={[styles.indFilterBtnText, { color: theme.colors.onSurface }]}>Filtres</Text>
            <FilterCountBadge count={activeFilterCount} />
          </GlassCard>
        </PressableScale>
      </View>

      <FilterSheet visible={filterSheetOpen} onClose={() => setFilterSheetOpen(false)}>
        <Text style={[styles.indFilterSectionLabel, { color: theme.colors.onSurfaceTertiary }]}>Collection</Text>
        <View style={styles.catRow}>
          {(["all", "home", "hyrox", "classics"] as const).map((c) => {
            const active = collection === c;
            return (
              <PressableScale
                key={c}
                testID={`wod-collection-${c}`}
                style={[
                  styles.catChip,
                  { borderRadius: theme.radius.pill },
                  activeChipStyle(theme, active, theme.colors.surfaceSecondary),
                ]}
                onPress={() => setCollection(c)}
              >
                <Text style={[styles.catLabel, { color: activeChipColor(theme, active, theme.colors.onSurfaceSecondary) }]}>
                  {c === "all" ? "Toutes" : WOD_COLLECTION_LABEL[c]}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <Text style={[styles.indFilterSectionLabel, { color: theme.colors.onSurfaceTertiary }]}>Intensité</Text>
        <View style={styles.catRow}>
          <PressableScale
            testID="wod-intensity-all"
            style={[
              styles.catChip,
              { borderRadius: theme.radius.pill },
              activeChipStyle(theme, intensity == null, theme.colors.surfaceSecondary),
            ]}
            onPress={() => setIntensity(null)}
          >
            <Text style={[styles.catLabel, { color: activeChipColor(theme, intensity == null, theme.colors.onSurfaceSecondary) }]}>
              Toutes
            </Text>
          </PressableScale>
          {intensityLevels.map((lvl) => {
            const active = intensity === lvl;
            return (
              <PressableScale
                key={lvl}
                testID={`wod-intensity-${lvl}`}
                style={[
                  styles.catChip,
                  { borderRadius: theme.radius.pill },
                  activeChipStyle(theme, active, theme.colors.surfaceSecondary),
                ]}
                onPress={() => setIntensity(lvl)}
              >
                <IntensityFlames level={lvl} size={11} />
              </PressableScale>
            );
          })}
        </View>
      </FilterSheet>

      <FilterSheet visible={randomSheetOpen} onClose={() => setRandomSheetOpen(false)}>
        <Text style={[styles.indFilterSectionLabel, { color: theme.colors.onSurfaceTertiary }]}>Quelle intensité ?</Text>
        <PressableScale
          testID="wod-random-any"
          style={[styles.randomIntensityRow, { borderBottomColor: theme.colors.border }]}
          onPress={() => launchRandom(null)}
        >
          <Text style={[styles.randomIntensityText, { color: theme.colors.onSurface }]}>Peu importe — surprends-moi</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
        </PressableScale>
        {intensityLevels.map((lvl) => (
          <PressableScale
            key={lvl}
            testID={`wod-random-${lvl}`}
            style={[styles.randomIntensityRow, { borderBottomColor: theme.colors.border }]}
            onPress={() => launchRandom(lvl)}
          >
            <IntensityFlames level={lvl} size={14} />
            <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
          </PressableScale>
        ))}
      </FilterSheet>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="flame" size={40} color={theme.colors.brand} />
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Aucun WOD dans ce filtre</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.hintText, { color: theme.colors.onSurfaceTertiary }]}>
            <Ionicons name="hand-left" size={11} color={theme.colors.onSurfaceTertiary} />
            {"  "}Glisse vers la gauche pour supprimer un WOD de ta liste
          </Text>
          {filtered.map((p, i) => (
            <WodRow
              key={p.id}
              plan={p}
              records={records}
              onPress={() => router.push(`/plan/${p.id}`)}
              onStart={() => router.push(`/workout/${p.id}`)}
              onDeleted={onDeleted}
            />
          ))}
        </>
      )}
    </>
  );
}

function WodRow({
  plan: p,
  records,
  onPress,
  onStart,
  onDeleted,
}: {
  plan: Plan;
  records: ExerciseRecord[];
  onPress: () => void;
  onStart: () => void;
  onDeleted: () => void;
}) {
  const { theme } = useTheme();
  const wod = p.wodSource!;
  const firstEx = p.exercises[0];
  return (
    <SwipeableRow
      testID={`wod-item-${p.id}`}
      style={styles.swipeContainer}
      onDelete={async () => {
        await deletePlan(p.id);
        onDeleted();
      }}
      deleteConfirm={{
        title: "Supprimer ce WOD de ta liste ?",
        message: `"${p.title}" — cette action est définitive.`,
        confirmLabel: "SUPPRIMER",
        destructive: true,
      }}
      onEdit={onPress}
    >
      <PressableScale testID={`wod-item-${p.id}`} onPress={onPress}>
        <GlassCard
          level="subtle"
          style={[
            styles.planCard,
            { borderRadius: theme.radius.lg },
            theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
          ]}
        >
        {firstEx && (
          <ExerciseThumbnail
            name={firstEx.name}
            records={records}
            photoBase64={firstEx.photoBase64}
            iconKey={firstEx.iconKey}
            exerciseRecordId={firstEx.exerciseRecordId}
            size={48}
          />
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.planTagsRow}>
            <View style={[styles.planTypeTag, { backgroundColor: withAlpha(theme.colors.data.workout, 15) }]}>
              <Text style={[styles.planTypeText, { color: theme.colors.data.workout }]}>
                {WOD_COLLECTION_LABEL[wod.collection]}
              </Text>
            </View>
            <IntensityFlames level={wod.intensity} size={10} />
          </View>
          <Text style={[styles.planTitle, { color: theme.colors.onSurface }]}>{p.title}</Text>
          <Text style={[styles.planMeta, { color: theme.colors.onSurfaceTertiary }]}>{wod.format}</Text>
        </View>
        <PressableScale
          testID={`wod-start-${p.id}`}
          style={[
            styles.startBtn,
            { borderRadius: theme.radius.pill },
            activeChipStyle(theme, true, theme.colors.surfaceSecondary, theme.colors.data.workout),
          ]}
          onPress={onStart}
        >
          <Ionicons name="play" size={13} color={activeChipColor(theme, true, "#fff", theme.colors.data.workout)} />
          <Text style={[styles.startBtnText, { color: activeChipColor(theme, true, "#fff", theme.colors.data.workout) }]}>
            Lancer
          </Text>
        </PressableScale>
        </GlassCard>
      </PressableScale>
    </SwipeableRow>
  );
}

function SwipeablePlanRow({
  plan: p,
  records,
  onPress,
  onStart,
  onDeleted,
}: {
  plan: Plan;
  records: ExerciseRecord[];
  onPress: () => void;
  onStart: () => void;
  onDeleted: () => void;
}) {
  const { theme } = useTheme();
  const typeColor = getPlanTypeColors(theme)[p.type] ?? theme.colors.brand;
  const firstEx = p.exercises[0];
  return (
    <SwipeableRow
      testID={`plan-item-${p.id}`}
      style={styles.swipeContainer}
      onDelete={async () => {
        await deletePlan(p.id);
        onDeleted();
      }}
      deleteConfirm={{
        title: "Supprimer cette séance ?",
        message: `"${p.title}" — cette action est définitive.`,
        confirmLabel: "SUPPRIMER",
        destructive: true,
      }}
      onEdit={onPress}
    >
      <PressableScale testID={`plan-item-${p.id}`} onPress={onPress}>
        <GlassCard
          level="subtle"
          style={[
            styles.planCard,
            { borderRadius: theme.radius.lg },
            theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
          ]}
        >
        {firstEx && (
          <ExerciseThumbnail
            name={firstEx.name}
            records={records}
            photoBase64={firstEx.photoBase64}
            iconKey={firstEx.iconKey}
            exerciseRecordId={firstEx.exerciseRecordId}
            size={48}
          />
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.planTagsRow}>
            <View style={[styles.planTypeTag, { backgroundColor: withAlpha(typeColor, 15) }]}>
              <Text style={[styles.planTypeText, { color: typeColor }]}>
                {planTypeLabel(p.type)}
              </Text>
            </View>
          </View>
          <Text style={[styles.planTitle, { color: theme.colors.onSurface }]}>{p.title}</Text>
          <Text style={[styles.planMeta, { color: theme.colors.onSurfaceTertiary }]}>
            {p.exercises.length} exercice{p.exercises.length > 1 ? "s" : ""}
          </Text>
        </View>
        <PressableScale
          testID={`plan-start-${p.id}`}
          style={[
            styles.startBtn,
            { borderRadius: theme.radius.pill },
            activeChipStyle(theme, true, theme.colors.surfaceSecondary, typeColor),
          ]}
          onPress={onStart}
        >
          <Ionicons name="play" size={13} color={activeChipColor(theme, true, "#fff", typeColor)} />
          <Text style={[styles.startBtnText, { color: activeChipColor(theme, true, "#fff", typeColor) }]}>
            Lancer
          </Text>
        </PressableScale>
        </GlassCard>
      </PressableScale>
    </SwipeableRow>
  );
}

function planTypeLabel(t: Plan["type"]): string {
  switch (t) {
    case "musculation":
      return "MUSCULATION";
    case "cardio":
      return "CARDIO";
    case "hiit":
      return "HIIT";
    case "mixte":
      return "WOD";
    case "stretch":
      return "MOBILITÉ";
    default:
      return "SÉANCE";
  }
}

function CardioView({
  actives,
  router,
  records,
  plans,
  sessions,
  onPressDay,
}: {
  actives: { active: ActiveProgram; program: Program }[];
  router: any;
  records: ExerciseRecord[];
  plans: Plan[];
  sessions: WorkoutSession[];
  onPressDay: PressDayHandler;
}) {
  const { theme } = useTheme();
  const CARDIO_COLOR = getPlanTypeColors(theme).cardio;
  if (actives.length === 0) {
    return <ProgramBrowseList category="cardio" router={router} />;
  }
  return (
    <>
      {actives.map(({ active, program }, i) => {
        const today = currentDayIndex(active, program.durationDays);
        const done = active.completedSessions.length;
        const total = program.days.reduce(
          (a, d) => a + (d.rest ? 0 : d.sessions.length),
          0,
        );
        return (
          <ProgramHeroCard
            key={program.id}
            index={i}
            testID={`cardio-${program.id}`}
            program={program}
            active={active}
            records={records}
            today={today}
            done={done}
            total={total}
            programSessions={getSessionsForProgram(program, plans, sessions)}
            router={router}
            onPress={() => router.push(`/program/${program.id}`)}
            onPressDay={onPressDay}
          />
        );
      })}
      <PressableScale
        style={[styles.linkBtn, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
        onPress={() => router.push("/programs?category=cardio")}
        testID="all-cardio"
      >
        <Ionicons name="library" size={14} color={CARDIO_COLOR} />
        <Text style={[styles.linkBtnText, { color: CARDIO_COLOR }]}>
          Parcourir les programmes cardio
        </Text>
        <Ionicons name="chevron-forward" size={14} color={CARDIO_COLOR} />
      </PressableScale>
      <CTAButton
        testID="create-cardio-program-2"
        variant="secondary"
        tint={CARDIO_COLOR}
        label="Créer mon programme cardio"
        onPress={() => router.push("/custom-program/new?category=cardio")}
      />
    </>
  );
}

function MobilityView({
  actives,
  router,
  records,
  plans,
  sessions,
  onPressDay,
}: {
  actives: { active: ActiveProgram; program: Program }[];
  router: any;
  records: ExerciseRecord[];
  plans: Plan[];
  sessions: WorkoutSession[];
  onPressDay: PressDayHandler;
}) {
  const { theme } = useTheme();
  if (actives.length === 0) {
    return <ProgramBrowseList category="stretch" router={router} />;
  }
  return (
    <>
      {actives.map(({ active, program }, i) => {
        const today = currentDayIndex(active, program.durationDays);
        return (
          <ProgramHeroCard
            key={program.id}
            index={i}
            testID={`mobility-${program.id}`}
            program={program}
            active={active}
            records={records}
            today={today}
            programSessions={getSessionsForProgram(program, plans, sessions)}
            router={router}
            onPress={() => router.push(`/program/${program.id}`)}
            onPressDay={onPressDay}
          />
        );
      })}
      <PressableScale
        style={[styles.linkBtn, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
        onPress={() => router.push("/programs?category=stretch")}
        testID="all-mobility"
      >
        <Ionicons name="library" size={14} color={theme.colors.success} />
        <Text style={[styles.linkBtnText, { color: theme.colors.success }]}>
          Parcourir les étirements
        </Text>
        <Ionicons name="chevron-forward" size={14} color={theme.colors.success} />
      </PressableScale>
      <CTAButton
        testID="create-mobility-program-2"
        variant="secondary"
        tint={theme.colors.success}
        label="Créer mon programme"
        onPress={() => router.push("/custom-program/new?category=stretch")}
      />
    </>
  );
}

function Stat({ icon, value }: { icon: any; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={12} color={theme.colors.brand} />
      <Text style={[styles.statText, { color: theme.colors.onSurfaceSecondary }]}>{value}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m${s}s`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
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
  empty: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  emptySub: {
    textAlign: "center",
    lineHeight: 20,
  },
  heroProgCard: {
    borderWidth: 1.5,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.elevated,
  },
  weekWrap: { marginTop: spacing.sm, marginBottom: spacing.sm },
  weekEmptyHint: {
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: spacing.sm,
  },
  historyRowInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  historyRowTitle: { fontWeight: "800", fontSize: 12 },
  historyRowDate: { fontSize: 10, marginTop: 2 },
  heroProgHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroProgEmoji: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  heroProgTitle: { fontSize: 18, fontWeight: "800" },
  heroProgMeta: { fontSize: 12, marginTop: 3, fontWeight: "600" },
  heroProgBarRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heroProgBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  heroProgFill: { height: "100%", borderRadius: 4 },
  heroProgPct: { fontSize: 13, fontWeight: "800", width: 38, textAlign: "right" },
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
  sessionCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 4,
  },
  sessionThumbRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  swipeContainer: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 0,
  },
  hintText: {
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 4,
  },
  sessionTitle: { fontWeight: "800", fontSize: 15 },
  sessionDate: { fontSize: 11 },
  sessionStatsRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: {
    fontSize: 11,
    fontWeight: "600",
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  planTitle: { fontWeight: "800", fontSize: 14 },
  planMeta: { fontSize: 11, marginTop: 2 },
  planTagsRow: { flexDirection: "row", gap: 4, marginBottom: 4 },
  planTypeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planTypeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  indFilterRow: { alignItems: "flex-start", marginBottom: spacing.sm },
  indFilterBtn: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
  },
  indFilterBtnText: { fontWeight: "800", fontSize: 12 },
  indFilterSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  catRow: {
    gap: 6,
    paddingRight: spacing.md,
    alignItems: "center",
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  muscleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  muscleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    justifyContent: "center",
  },
  startBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  randomWodBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 12,
    marginBottom: spacing.sm,
  },
  randomWodBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  randomIntensityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  randomIntensityText: { fontWeight: "700", fontSize: 13 },
});
