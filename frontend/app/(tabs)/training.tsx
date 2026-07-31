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
import { colors, motion, radius, spacing } from "@/src/theme";
import PressableScale from "@/src/components/ui/PressableScale";
import SwipeableRow from "@/src/components/SwipeableRow";
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
import { findProgram } from "@/src/utils/programs";
import { Program } from "@/src/data/programs";
import { MUSCLE_GROUPS } from "@/src/utils/muscle-groups";

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

const TYPE_COLORS: Record<Plan["type"], string> = {
  musculation: colors.brand,
  cardio: "#00B0FF",
  hiit: colors.warning,
  mixte: "#E040FB",
  stretch: colors.success,
};

/** Cascade d'entrée décalée par carte, même pattern que le Dashboard. */
function EnterItem({ index, children }: { index: number; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(motion.base)}>
      {children}
    </Animated.View>
  );
}

export default function TrainingHub() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("program");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [actives, setActives] = useState<
    { active: ActiveProgram; program: Program }[]
  >([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setPlans(await getPlans());
        setSessions(await getSessions());
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Entraînements</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
                style={[styles.segChip, active && styles.segChipActive]}
                onPress={() => setTab(t.key)}
              >
                <Ionicons
                  name={t.icon}
                  size={14}
                  color={active ? "#fff" : colors.onSurfaceTertiary}
                />
                <Text
                  style={[styles.segLabel, active && { color: "#fff" }]}
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
          <ProgramView actives={workoutActives} router={router} />
        )}
        {tab === "cardio" && (
          <CardioView actives={cardioActives} router={router} />
        )}
        {tab === "mobility" && (
          <MobilityView actives={stretchActives} router={router} />
        )}
        {tab === "sessions" && (
          <SessionsView
            sessions={sessions}
            router={router}
            onDeleted={async () => {
              setSessions(await getSessions());
            }}
          />
        )}
        {tab === "individual" && (
          <IndividualView
            plans={plans}
            router={router}
            onDeleted={async () => {
              setPlans(await getPlans());
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Carte héroïque pour le programme actif — remplace l'ancienne rangée
 * compacte identique à toutes les autres cartes de l'écran ; teintée de la
 * couleur du programme pour devenir le vrai point focal de chaque onglet. */
function ProgramHeroCard({
  testID,
  program,
  today,
  done,
  total,
  onPress,
  index = 0,
}: {
  testID: string;
  program: Program;
  today: number;
  done?: number;
  total?: number;
  onPress: () => void;
  index?: number;
}) {
  const hasProgress = total !== undefined && total > 0;
  const pct = hasProgress ? (done ?? 0) / total! : 0;
  return (
    <EnterItem index={index}>
      <PressableScale
        testID={testID}
        style={[
          styles.heroProgCard,
          { backgroundColor: `${program.color}1A`, borderColor: `${program.color}55` },
        ]}
        onPress={onPress}
      >
        <View style={styles.heroProgHead}>
          <View style={[styles.heroProgEmoji, { backgroundColor: `${program.color}30` }]}>
            <Text style={{ fontSize: 40 }}>{program.coverEmoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroProgTitle} numberOfLines={1}>
              {program.title}
            </Text>
            <Text style={styles.heroProgMeta}>
              Jour {today}/{program.durationDays}
              {hasProgress ? ` · ${done}/${total} séances` : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceTertiary} />
        </View>
        {hasProgress && (
          <View style={styles.heroProgBarRow}>
            <View style={styles.heroProgBar}>
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
    </EnterItem>
  );
}

function ProgramView({
  actives,
  router,
}: {
  actives: { active: ActiveProgram; program: Program }[];
  router: any;
}) {
  if (actives.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="calendar" size={40} color={colors.brand} />
        <Text style={styles.emptyTitle}>Aucun programme actif</Text>
        <PressableScale
          style={styles.ctaBtn}
          onPress={() => router.push("/programs")}
          testID="browse-programs"
        >
          <Text style={styles.ctaText}>PARCOURIR LES PROGRAMMES</Text>
        </PressableScale>
        <PressableScale
          onPress={() => router.push("/custom-program/new")}
          testID="create-program-training"
          style={styles.ctaBtnSecondary}
        >
          <Text style={styles.ctaTextSecondary}>Créer mon programme</Text>
        </PressableScale>
      </View>
    );
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
            today={today}
            done={done}
            total={total}
            onPress={() => router.push(`/program/${program.id}`)}
          />
        );
      })}
      <PressableScale
        style={styles.linkBtn}
        onPress={() => router.push("/programs")}
        testID="all-programs"
      >
        <Ionicons name="library" size={14} color={colors.brand} />
        <Text style={styles.linkBtnText}>Parcourir tous les programmes</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.brand} />
      </PressableScale>
    </>
  );
}

function SessionsView({
  sessions,
  router,
  onDeleted,
}: {
  sessions: WorkoutSession[];
  router: any;
  onDeleted: () => void;
}) {
  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="time" size={40} color={colors.brand} />
        <Text style={styles.emptyTitle}>Aucune séance</Text>
        <Text style={styles.emptySub}>
          Termine ta première séance pour la voir ici.
        </Text>
      </View>
    );
  }
  return (
    <>
      <Text style={styles.hintText}>
        <Ionicons name="hand-left" size={11} color={colors.onSurfaceTertiary} />
        {"  "}Glisse vers la gauche pour supprimer une séance
      </Text>
      {sessions.slice(0, 30).map((s, i) => (
        <EnterItem key={s.id} index={i}>
          <SwipeableSessionRow
            session={s}
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
  onPress,
  onDeleted,
}: {
  session: WorkoutSession;
  onPress: () => void;
  onDeleted: () => void;
}) {
  const accent = TYPE_COLORS[s.planType] ?? colors.brand;
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
      <PressableScale
        testID={`session-item-${s.id}`}
        style={[styles.sessionCard, { borderLeftColor: accent }]}
        onPress={onPress}
      >
        <Text style={styles.sessionTitle} numberOfLines={1}>
          {s.planTitle}
        </Text>
        <Text style={styles.sessionDate}>{formatDate(s.startedAt)}</Text>
        <View style={styles.sessionStatsRow}>
          <Stat icon="time" value={formatDuration(s.durationSeconds)} />
          <Stat icon="flame" value={`${s.caloriesBurned} kcal`} />
          <Stat icon="barbell" value={`${s.exercises.length} ex.`} />
        </View>
      </PressableScale>
    </SwipeableRow>
  );
}

function IndividualView({
  plans,
  router,
  onDeleted,
}: {
  plans: Plan[];
  router: any;
  onDeleted: () => void;
}) {
  const [cat, setCat] = useState<IndCat>("all");
  const [muscle, setMuscle] = useState<string | null>(null);

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
      {/* Category filter */}
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
              style={[styles.catChip, active && styles.catChipActive]}
              onPress={() => setCat(c.key)}
            >
              <Ionicons
                name={c.icon}
                size={12}
                color={active ? "#fff" : colors.brand}
              />
              <Text
                style={[styles.catLabel, active && { color: "#fff" }]}
              >
                {c.label}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      {/* Muscle groups filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 42 }}
        contentContainerStyle={styles.catRow}
      >
        <PressableScale
          testID="muscle-all"
          style={[styles.muscleChip, !muscle && styles.muscleChipActive]}
          onPress={() => setMuscle(null)}
        >
          <Text style={[styles.muscleText, !muscle && { color: "#fff" }]}>
            Tous groupes
          </Text>
        </PressableScale>
        {MUSCLE_GROUPS.map((mg) => {
          const active = muscle === mg.key;
          return (
            <PressableScale
              key={mg.key}
              testID={`muscle-${mg.key}`}
              style={[styles.muscleChip, active && styles.muscleChipActive]}
              onPress={() => setMuscle(active ? null : mg.key)}
            >
              <Text style={styles.muscleEmoji}>{mg.emoji}</Text>
              <Text style={[styles.muscleText, active && { color: "#fff" }]}>
                {mg.label}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="barbell" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>
            {plans.length === 0 ? "Aucune séance individuelle" : "Aucune séance dans ce filtre"}
          </Text>
          <PressableScale
            style={styles.ctaBtn}
            onPress={() => router.push("/plan/new")}
            testID="create-plan"
          >
            <Text style={styles.ctaText}>CRÉER UNE SÉANCE</Text>
          </PressableScale>
        </View>
      ) : (
        <>
          <Text style={styles.hintText}>
            <Ionicons name="hand-left" size={11} color={colors.onSurfaceTertiary} />
            {"  "}Glisse vers la gauche pour supprimer une séance
          </Text>
          {filtered.map((p, i) => (
            <EnterItem key={p.id} index={i}>
              <SwipeablePlanRow
                plan={p}
                onPress={() => router.push(`/plan/${p.id}`)}
                onStart={() => router.push(`/workout/${p.id}`)}
                onDeleted={onDeleted}
              />
            </EnterItem>
          ))}
          <PressableScale
            style={styles.linkBtn}
            onPress={() => router.push("/plan/new")}
            testID="new-plan"
          >
            <Ionicons name="add-circle" size={14} color={colors.brand} />
            <Text style={styles.linkBtnText}>Créer une nouvelle séance</Text>
          </PressableScale>
        </>
      )}
    </>
  );
}

function SwipeablePlanRow({
  plan: p,
  onPress,
  onStart,
  onDeleted,
}: {
  plan: Plan;
  onPress: () => void;
  onStart: () => void;
  onDeleted: () => void;
}) {
  const typeColor = TYPE_COLORS[p.type] ?? colors.brand;
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
      <PressableScale
        testID={`plan-item-${p.id}`}
        style={styles.planCard}
        onPress={onPress}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.planTagsRow}>
            <View style={[styles.planTypeTag, { backgroundColor: `${typeColor}26` }]}>
              <Text style={[styles.planTypeText, { color: typeColor }]}>
                {planTypeLabel(p.type)}
              </Text>
            </View>
          </View>
          <Text style={styles.planTitle}>{p.title}</Text>
          <Text style={styles.planMeta}>
            {p.exercises.length} exercice{p.exercises.length > 1 ? "s" : ""}
          </Text>
        </View>
        <PressableScale
          testID={`plan-start-${p.id}`}
          style={[styles.startBtn, { backgroundColor: typeColor }]}
          onPress={onStart}
        >
          <Ionicons name="play" size={13} color="#fff" />
          <Text style={styles.startBtnText}>Lancer</Text>
        </PressableScale>
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
}: {
  actives: { active: ActiveProgram; program: Program }[];
  router: any;
}) {
  const CARDIO_COLOR = "#00B0FF";
  if (actives.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="stopwatch" size={40} color={CARDIO_COLOR} />
        <Text style={styles.emptyTitle}>Aucun programme cardio</Text>
        <Text style={styles.emptySub}>
          Crée un programme cardio personnalisé pour tes runs, séances de vélo, HIIT ou natation.
        </Text>
        <PressableScale
          style={[styles.ctaBtn, { backgroundColor: CARDIO_COLOR }]}
          onPress={() => router.push("/programs?category=cardio")}
          testID="browse-cardio"
        >
          <Text style={styles.ctaText}>PARCOURIR</Text>
        </PressableScale>
        <PressableScale
          onPress={() =>
            router.push("/custom-program/new?category=cardio")
          }
          testID="create-cardio-program"
          style={[styles.ctaBtnSecondary, { borderColor: CARDIO_COLOR }]}
        >
          <Text style={[styles.ctaTextSecondary, { color: CARDIO_COLOR }]}>
            Créer mon programme cardio
          </Text>
        </PressableScale>
      </View>
    );
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
            today={today}
            done={done}
            total={total}
            onPress={() => router.push(`/program/${program.id}`)}
          />
        );
      })}
      <PressableScale
        style={styles.linkBtn}
        onPress={() => router.push("/programs?category=cardio")}
        testID="all-cardio"
      >
        <Ionicons name="library" size={14} color={CARDIO_COLOR} />
        <Text style={[styles.linkBtnText, { color: CARDIO_COLOR }]}>
          Parcourir les programmes cardio
        </Text>
        <Ionicons name="chevron-forward" size={14} color={CARDIO_COLOR} />
      </PressableScale>
      <PressableScale
        onPress={() =>
          router.push("/custom-program/new?category=cardio")
        }
        testID="create-cardio-program-2"
        style={[styles.ctaBtnSecondary, { borderColor: CARDIO_COLOR }]}
      >
        <Text style={[styles.ctaTextSecondary, { color: CARDIO_COLOR }]}>
          Créer mon programme cardio
        </Text>
      </PressableScale>
    </>
  );
}

function MobilityView({
  actives,
  router,
}: {
  actives: { active: ActiveProgram; program: Program }[];
  router: any;
}) {
  if (actives.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="body" size={40} color="#00E676" />
        <Text style={styles.emptyTitle}>Pas de routine mobilité</Text>
        <Text style={styles.emptySub}>
          Découvre les programmes d&apos;étirements et de récupération.
        </Text>
        <PressableScale
          style={[styles.ctaBtn, { backgroundColor: "#00E676" }]}
          onPress={() => router.push("/programs?category=stretch")}
          testID="browse-stretch"
        >
          <Text style={[styles.ctaText, { color: "#000" }]}>
            PARCOURIR LES ÉTIREMENTS
          </Text>
        </PressableScale>
        <PressableScale
          onPress={() =>
            router.push("/custom-program/new?category=stretch")
          }
          testID="create-mobility-program"
          style={[styles.ctaBtnSecondary, { borderColor: "#00E676" }]}
        >
          <Text style={[styles.ctaTextSecondary, { color: "#00E676" }]}>
            Créer mon programme
          </Text>
        </PressableScale>
      </View>
    );
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
            today={today}
            onPress={() => router.push(`/program/${program.id}`)}
          />
        );
      })}
      <PressableScale
        style={styles.linkBtn}
        onPress={() => router.push("/programs?category=stretch")}
        testID="all-mobility"
      >
        <Ionicons name="library" size={14} color="#00E676" />
        <Text style={[styles.linkBtnText, { color: "#00E676" }]}>
          Parcourir les étirements
        </Text>
        <Ionicons name="chevron-forward" size={14} color="#00E676" />
      </PressableScale>
      <PressableScale
        onPress={() =>
          router.push("/custom-program/new?category=stretch")
        }
        testID="create-mobility-program-2"
        style={[styles.ctaBtnSecondary, { borderColor: "#00E676" }]}
      >
        <Text style={[styles.ctaTextSecondary, { color: "#00E676" }]}>
          Créer mon programme
        </Text>
      </PressableScale>
    </>
  );
}

function Stat({ icon, value }: { icon: any; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={12} color={colors.brand} />
      <Text style={styles.statText}>{value}</Text>
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
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  subtitle: {
    color: colors.onSurfaceTertiary,
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
  empty: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  emptySub: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  ctaBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  ctaText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  ctaBtnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  ctaTextSecondary: { color: colors.brand, fontWeight: "800", letterSpacing: 0.5 },
  heroProgCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  heroProgHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroProgEmoji: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  heroProgTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  heroProgMeta: { color: colors.onSurfaceSecondary, fontSize: 12, marginTop: 3, fontWeight: "600" },
  heroProgBarRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heroProgBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceTertiary,
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
  sessionCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    gap: 4,
  },
  swipeContainer: {
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: 0,
  },
  swipeAction: {
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
    width: 96,
    flexDirection: "column",
    gap: 4,
  },
  swipeActionText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  hintText: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 4,
  },
  sessionTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 15 },
  sessionDate: { color: colors.onSurfaceTertiary, fontSize: 11 },
  sessionStatsRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: {
    color: colors.onSurfaceSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
  planMeta: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  planTagsRow: { flexDirection: "row", gap: 4, marginBottom: 4 },
  planTypeTag: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planTypeText: {
    color: colors.brandSecondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
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
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  catLabel: {
    color: colors.onSurfaceSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  muscleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  muscleEmoji: { fontSize: 12 },
  muscleText: {
    color: colors.onSurfaceSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    justifyContent: "center",
  },
  startBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
