import { useCallback, useMemo, useState } from "react";
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
import { spacing } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import { LEVEL_LABEL, Program, ProgramSession } from "@/src/data/programs";
import { findProgram } from "@/src/utils/programs";
import {
  ActiveProgram,
  currentDayIndex,
  findOrCreateProgramPlan,
  getActivePrograms,
  uid,
} from "@/src/utils/gym-storage";

type Loaded = { active: ActiveProgram; program: Program };

export default function StretchingTabScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const actives = await getActivePrograms();
    const stretchList: Loaded[] = [];
    for (const a of actives) {
      const p = await findProgram(a.programId);
      if (p && p.category === "stretch") {
        stretchList.push({ active: a, program: p });
      }
    }
    setLoaded(stretchList);
    setReady(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!ready) {
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
            <Text style={styles.title}>Étirements</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (loaded.length === 0) return <EmptyState router={router} />;

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
        <Text style={styles.title}>Étirements</Text>
        <Pressable
          testID="add-stretch-btn"
          onPress={() => router.push("/programs?category=stretch")}
          hitSlop={12}
        >
          <Ionicons name="add-circle" size={22} color={theme.colors.brand} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loaded.map(({ active, program }) => (
          <StretchTracker
            key={program.id}
            active={active}
            program={program}
            onOpen={() => router.push(`/program/${program.id}`)}
            onLaunch={async (dayIndex, sessionIndex, session) => {
              const plan = await findOrCreateProgramPlan(
                program.id,
                dayIndex,
                sessionIndex,
                () => ({
                  title: `${program.title} · J${dayIndex}${
                    session.label ? " · " + session.label : ""
                  }`,
                  type: "stretch",
                  category: "stretch",
                  createdAt: new Date().toISOString(),
                  programSource: {
                    programId: program.id,
                    dayIndex,
                    sessionIndex,
                  },
                  exercises: session.exercises.map((e) => ({ ...e, id: uid() })),
                }),
              );
              router.push(`/workout/${plan.id}`);
            }}
          />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function EmptyState({ router }: { router: any }) {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
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
        <Text style={styles.title}>Étirements</Text>
      </View>
      <ScrollView contentContainerStyle={styles.emptyScroll}>
        <View style={styles.emptyIcon}>
          <Ionicons name="body" size={40} color="#00E676" />
        </View>
        <Text style={styles.emptyTitle}>Aucun programme d&apos;étirement actif</Text>
        <Text style={styles.emptyText}>
          Récupère mieux, gagne en souplesse et améliore ta mobilité. Choisis un programme inclus ou crée le tien.
        </Text>
        <Pressable
          testID="empty-browse-stretch"
          style={styles.ctaBtn}
          onPress={() => router.push("/programs?category=stretch")}
        >
          <Ionicons name="library" size={18} color="#fff" />
          <Text style={styles.ctaText}>PARCOURIR LES ÉTIREMENTS</Text>
        </Pressable>
        <Pressable
          testID="empty-create-stretch"
          style={styles.ctaBtnSecondary}
          onPress={() => router.push("/custom-program/new?category=stretch")}
        >
          <Ionicons name="add-circle" size={18} color="#00E676" />
          <Text style={styles.ctaTextSecondary}>CRÉER MON PROGRAMME</Text>
        </Pressable>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StretchTracker({
  active,
  program,
  onOpen,
  onLaunch,
}: {
  active: ActiveProgram;
  program: Program;
  onOpen: () => void;
  onLaunch: (dayIndex: number, sessionIndex: number, s: ProgramSession) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const today = currentDayIndex(active, program.durationDays);
  const doneCount = active.completedSessions.length;
  const totalSessions = program.days.reduce(
    (a, d) => a + (d.rest ? 0 : d.sessions.length),
    0,
  );
  const progress = totalSessions ? doneCount / totalSessions : 0;

  const isSessionDone = (di: number, si: number) =>
    active.completedSessions.some(
      (s) => s.dayIndex === di && s.sessionIndex === si,
    );

  const upcoming = useMemo(() => {
    const items: { dayIndex: number; day: (typeof program.days)[number] }[] = [];
    for (
      let d = today;
      d <= Math.min(today + 4, program.durationDays);
      d++
    ) {
      items.push({ dayIndex: d, day: program.days[d - 1] });
    }
    return items;
  }, [today, program]);

  return (
    <View style={styles.trackerWrap}>
      <Pressable onPress={onOpen}>
        <View style={[styles.hero, { borderLeftColor: program.color }]}>
          <View style={[styles.emojiBox, { backgroundColor: `${program.color}30` }]}>
            <Text style={{ fontSize: 38 }}>{program.coverEmoji}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.heroTags}>
              <View style={[styles.tag, { backgroundColor: program.color }]}>
                <Text style={styles.tagText}>{LEVEL_LABEL[program.level]}</Text>
              </View>
              <View style={styles.tagOutline}>
                <Text style={styles.tagOutlineText}>
                  J {today}/{program.durationDays}
                </Text>
              </View>
            </View>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {program.title}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: program.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {doneCount}/{totalSessions} séances · {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
      </Pressable>

      <Text style={styles.sectionTitle}>À venir</Text>
      {upcoming.map(({ dayIndex, day }) => {
        const isToday = dayIndex === today;
        if (day.rest) return null;
        return (
          <View
            key={dayIndex}
            style={[
              styles.dayBlock,
              isToday && { borderColor: program.color, borderWidth: 2 },
            ]}
          >
            <View style={styles.dayHead}>
              <Text style={[styles.dayLabel, isToday && { color: program.color }]}>
                {dayLabel(dayIndex, today)}
              </Text>
              <Text style={styles.dayIdxText}>J{dayIndex}</Text>
            </View>
            {day.sessions.map((s, si) => {
              const done = isSessionDone(dayIndex, si);
              return (
                <Pressable
                  key={si}
                  testID={`stretch-${program.id}-${dayIndex}-${si}`}
                  style={[styles.sessRow, done && styles.sessRowDone]}
                  onPress={() => onLaunch(dayIndex, si, s)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessTitle} numberOfLines={1}>
                      {s.title}
                    </Text>
                    <Text style={styles.sessMeta}>
                      {s.exercises.length} étirement
                      {s.exercises.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                  {done ? (
                    <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                  ) : (
                    <Ionicons name="play-circle" size={22} color={program.color} />
                  )}
                </Pressable>
              );
            })}
          </View>
        );
      })}
      <Pressable style={styles.viewAll} onPress={onOpen}>
        <Text style={[styles.viewAllText, { color: program.color }]}>
          Voir tout le programme →
        </Text>
      </Pressable>
    </View>
  );
}

function dayLabel(dayIndex: number, today: number): string {
  if (dayIndex === today) return "Aujourd'hui";
  if (dayIndex === today + 1) return "Demain";
  const daysAhead = dayIndex - today;
  const target = new Date();
  target.setDate(target.getDate() + daysAhead);
  return target.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}

function buildStyles(theme: Theme) {
  const { colors, radius } = theme;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  emptyScroll: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(0,230,118,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "800",
    marginTop: spacing.md,
    textAlign: "center",
  },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  ctaBtn: {
    backgroundColor: "#00E676",
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ctaText: { color: "#000", fontWeight: "800", letterSpacing: 1 },
  ctaBtnSecondary: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: "#00E676",
  },
  ctaTextSecondary: { color: "#00E676", fontWeight: "800", letterSpacing: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  trackerWrap: { gap: spacing.sm },
  hero: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderTopColor: colors.border,
    borderRightColor: colors.border,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  emojiBox: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTags: { flexDirection: "row", gap: 6, marginBottom: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  tagText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  tagOutline: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagOutlineText: {
    color: colors.onSurfaceTertiary,
    fontSize: 9,
    fontWeight: "700",
  },
  heroTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: { height: "100%" },
  progressText: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: spacing.sm,
  },
  dayBlock: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  dayHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayLabel: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 13,
    textTransform: "capitalize",
  },
  dayIdxText: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  sessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  sessRowDone: { opacity: 0.7 },
  sessTitle: { color: colors.onSurface, fontWeight: "600", fontSize: 12 },
  sessMeta: { color: colors.onSurfaceTertiary, fontSize: 10, marginTop: 1 },
  viewAll: { padding: spacing.sm, alignItems: "flex-end" },
  viewAllText: { fontWeight: "800", letterSpacing: 0.5, fontSize: 12 },
  });
}
