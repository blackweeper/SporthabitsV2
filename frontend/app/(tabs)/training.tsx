import { useState, useCallback } from "react";
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
import { colors, radius, spacing } from "@/src/theme";
import {
  ActiveProgram,
  currentDayIndex,
  getActivePrograms,
  getPlans,
  getSessions,
  Plan,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import { findProgram } from "@/src/utils/programs";
import { Program } from "@/src/data/programs";

type Tab = "program" | "mobility" | "sessions" | "individual";
type IndCat = "all" | "musculation" | "cardio" | "wod" | "stretch";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "program", label: "Musculation", icon: "barbell" },
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

const MUSCLE_GROUPS: { key: string; label: string; emoji: string }[] = [
  { key: "chest", label: "Pectoraux", emoji: "💪" },
  { key: "back", label: "Dos", emoji: "🦵" },
  { key: "shoulders", label: "Épaules", emoji: "🙆" },
  { key: "arms", label: "Bras", emoji: "💪" },
  { key: "legs", label: "Jambes", emoji: "🦵" },
  { key: "glutes", label: "Fessiers", emoji: "🍑" },
  { key: "core", label: "Abdos", emoji: "🌀" },
  { key: "cardio", label: "Cardio", emoji: "🏃" },
  { key: "full_body", label: "Full body", emoji: "🔥" },
];

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
  const stretchActives = actives.filter(
    (a) => a.program.category === "stretch",
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Entraînements</Text>
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
                testID={`seg-${t.key}`}
                style={[styles.segChip, active && styles.segChipActive]}
                onPress={() => setTab(t.key)}
              >
                <Ionicons
                  name={t.icon}
                  size={13}
                  color={active ? "#fff" : colors.onSurfaceTertiary}
                />
                <Text
                  style={[styles.segLabel, active && { color: "#fff" }]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "program" && (
          <ProgramView actives={workoutActives} router={router} />
        )}
        {tab === "mobility" && (
          <MobilityView actives={stretchActives} router={router} />
        )}
        {tab === "sessions" && (
          <SessionsView sessions={sessions} router={router} />
        )}
        {tab === "individual" && (
          <IndividualView plans={plans} router={router} />
        )}
      </ScrollView>
    </SafeAreaView>
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
        <Pressable
          style={styles.ctaBtn}
          onPress={() => router.push("/programs")}
          testID="browse-programs"
        >
          <Text style={styles.ctaText}>PARCOURIR LES PROGRAMMES</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/custom-program/new")}
          testID="create-program-training"
          style={styles.ctaBtnSecondary}
        >
          <Text style={styles.ctaTextSecondary}>Créer mon programme</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <>
      {actives.map(({ active, program }) => {
        const today = currentDayIndex(active, program.durationDays);
        const done = active.completedSessions.length;
        const total = program.days.reduce(
          (a, d) => a + (d.rest ? 0 : d.sessions.length),
          0,
        );
        return (
          <Pressable
            key={program.id}
            testID={`training-prog-${program.id}`}
            style={[styles.progCard, { borderLeftColor: program.color }]}
            onPress={() => router.push(`/program/${program.id}`)}
          >
            <View
              style={[
                styles.progEmoji,
                { backgroundColor: `${program.color}30` },
              ]}
            >
              <Text style={{ fontSize: 30 }}>{program.coverEmoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.progTitle} numberOfLines={1}>
                {program.title}
              </Text>
              <Text style={styles.progMeta}>
                Jour {today}/{program.durationDays} · {done}/{total} séances
              </Text>
              <View style={styles.progBar}>
                <View
                  style={[
                    styles.progFill,
                    {
                      width: `${(done / Math.max(1, total)) * 100}%`,
                      backgroundColor: program.color,
                    },
                  ]}
                />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
          </Pressable>
        );
      })}
      <Pressable
        style={styles.linkBtn}
        onPress={() => router.push("/programs")}
        testID="all-programs"
      >
        <Ionicons name="library" size={14} color={colors.brand} />
        <Text style={styles.linkBtnText}>Parcourir tous les programmes</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.brand} />
      </Pressable>
    </>
  );
}

function SessionsView({
  sessions,
  router,
}: {
  sessions: WorkoutSession[];
  router: any;
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
      {sessions.slice(0, 30).map((s) => (
        <Pressable
          key={s.id}
          testID={`session-item-${s.id}`}
          style={styles.sessionCard}
          onPress={() => router.push(`/session/${s.id}`)}
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
        </Pressable>
      ))}
    </>
  );
}

function IndividualView({ plans, router }: { plans: Plan[]; router: any }) {
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
            <Pressable
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
            </Pressable>
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
        <Pressable
          testID="muscle-all"
          style={[styles.muscleChip, !muscle && styles.muscleChipActive]}
          onPress={() => setMuscle(null)}
        >
          <Text style={[styles.muscleText, !muscle && { color: "#fff" }]}>
            Tous groupes
          </Text>
        </Pressable>
        {MUSCLE_GROUPS.map((mg) => {
          const active = muscle === mg.key;
          return (
            <Pressable
              key={mg.key}
              testID={`muscle-${mg.key}`}
              style={[styles.muscleChip, active && styles.muscleChipActive]}
              onPress={() => setMuscle(active ? null : mg.key)}
            >
              <Text style={styles.muscleEmoji}>{mg.emoji}</Text>
              <Text style={[styles.muscleText, active && { color: "#fff" }]}>
                {mg.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="barbell" size={40} color={colors.brand} />
          <Text style={styles.emptyTitle}>
            {plans.length === 0 ? "Aucune séance individuelle" : "Aucune séance dans ce filtre"}
          </Text>
          <Pressable
            style={styles.ctaBtn}
            onPress={() => router.push("/plan/new")}
            testID="create-plan"
          >
            <Text style={styles.ctaText}>CRÉER UNE SÉANCE</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {filtered.map((p) => (
            <Pressable
              key={p.id}
              testID={`plan-item-${p.id}`}
              style={styles.planCard}
              onPress={() => router.push(`/plan/${p.id}`)}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.planTagsRow}>
                  <View style={styles.planTypeTag}>
                    <Text style={styles.planTypeText}>
                      {planTypeLabel(p.type)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.planTitle}>{p.title}</Text>
                <Text style={styles.planMeta}>
                  {p.exercises.length} exercice{p.exercises.length > 1 ? "s" : ""}
                </Text>
              </View>
              <Pressable
                testID={`plan-start-${p.id}`}
                style={styles.startBtn}
                onPress={() => router.push(`/workout/${p.id}`)}
              >
                <Ionicons name="play" size={14} color="#fff" />
              </Pressable>
            </Pressable>
          ))}
          <Pressable
            style={styles.linkBtn}
            onPress={() => router.push("/plan/new")}
            testID="new-plan"
          >
            <Ionicons name="add-circle" size={14} color={colors.brand} />
            <Text style={styles.linkBtnText}>Créer une nouvelle séance</Text>
          </Pressable>
        </>
      )}
    </>
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
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: "#00E676" }]}
          onPress={() => router.push("/programs?category=stretch")}
          testID="browse-stretch"
        >
          <Text style={[styles.ctaText, { color: "#000" }]}>
            PARCOURIR LES ÉTIREMENTS
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push("/custom-program/new?category=stretch")
          }
          testID="create-mobility-program"
          style={[styles.ctaBtnSecondary, { borderColor: "#00E676" }]}
        >
          <Text style={[styles.ctaTextSecondary, { color: "#00E676" }]}>
            Créer mon programme
          </Text>
        </Pressable>
      </View>
    );
  }
  return (
    <>
      {actives.map(({ active, program }) => {
        const today = currentDayIndex(active, program.durationDays);
        return (
          <Pressable
            key={program.id}
            testID={`mobility-${program.id}`}
            style={[styles.progCard, { borderLeftColor: program.color }]}
            onPress={() => router.push(`/program/${program.id}`)}
          >
            <View
              style={[styles.progEmoji, { backgroundColor: `${program.color}30` }]}
            >
              <Text style={{ fontSize: 30 }}>{program.coverEmoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.progTitle}>{program.title}</Text>
              <Text style={styles.progMeta}>
                Jour {today}/{program.durationDays}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
          </Pressable>
        );
      })}
      <Pressable
        style={styles.linkBtn}
        onPress={() => router.push("/programs?category=stretch")}
        testID="all-mobility"
      >
        <Ionicons name="library" size={14} color="#00E676" />
        <Text style={[styles.linkBtnText, { color: "#00E676" }]}>
          Parcourir les étirements
        </Text>
        <Ionicons name="chevron-forward" size={14} color="#00E676" />
      </Pressable>
      <Pressable
        onPress={() =>
          router.push("/custom-program/new?category=stretch")
        }
        testID="create-mobility-program-2"
        style={[styles.ctaBtnSecondary, { borderColor: "#00E676" }]}
      >
        <Text style={[styles.ctaTextSecondary, { color: "#00E676" }]}>
          Créer mon programme
        </Text>
      </Pressable>
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
  progCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderTopColor: colors.border,
    borderRightColor: colors.border,
    borderBottomColor: colors.border,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  progEmoji: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  progTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  progMeta: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  progBar: {
    height: 4,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  progFill: { height: "100%" },
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
    gap: 4,
  },
  sessionTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
