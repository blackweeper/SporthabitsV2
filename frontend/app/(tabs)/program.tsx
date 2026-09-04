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
import { spacing, withAlpha } from "@/src/theme";
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

export default function ProgramTabScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const actives = await getActivePrograms();
    const workouts: Loaded[] = [];
    for (const a of actives) {
      const p = await findProgram(a.programId);
      if (p && (p.category ?? "workout") === "workout") {
        workouts.push({ active: a, program: p });
      }
    }
    setLoaded(workouts);
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
            <Text style={styles.title}>Programme</Text>
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
        <Text style={styles.title}>Programme</Text>
        <Pressable
          testID="add-program-btn"
          onPress={() => router.push("/programs")}
          hitSlop={12}
        >
          <Ionicons name="add-circle" size={22} color={theme.colors.brand} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loaded.length >= 2 ? (
          <View style={styles.dualBanner}>
            <Ionicons name="layers" size={14} color={theme.colors.brand} />
            <Text style={styles.dualText}>
              Tu suis 2 programmes en parallèle
            </Text>
          </View>
        ) : (
          <Pressable
            testID="parallel-invite"
            style={styles.dualInvite}
            onPress={() => router.push("/programs")}
          >
            <Ionicons name="add-circle-outline" size={16} color={theme.colors.brand} />
            <Text style={styles.dualInviteText}>
              Suivre un 2ᵉ programme en parallèle
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.brand} />
          </Pressable>
        )}

        {loaded.map(({ active, program }) => (
          <ProgramTracker
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
                  type: "mixte",
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
        <Text style={styles.title}>Programme</Text>
      </View>
      <ScrollView contentContainerStyle={styles.emptyScroll}>
        <View style={styles.emptyIcon}>
          <Ionicons name="calendar" size={40} color={theme.colors.brand} />
        </View>
        <Text style={styles.emptyTitle}>Aucun programme actif</Text>
        <Text style={styles.emptyText}>
          Choisis un programme parmi ceux inclus, ou crée le tien. Tu peux même suivre 2 programmes en parallèle.
        </Text>
        <Pressable
          testID="empty-browse"
          style={styles.ctaBtn}
          onPress={() => router.push("/programs")}
        >
          <Ionicons name="library" size={18} color="#fff" />
          <Text style={styles.ctaText}>PARCOURIR LES PROGRAMMES</Text>
        </Pressable>
        <Pressable
          testID="empty-create"
          style={styles.ctaBtnSecondary}
          onPress={() => router.push("/custom-program/new")}
        >
          <Ionicons name="add-circle" size={18} color={theme.colors.brand} />
          <Text style={styles.ctaTextSecondary}>CRÉER MON PROGRAMME</Text>
        </Pressable>
        <Pressable
          testID="empty-import-pdf"
          style={styles.ctaBtnSecondary}
          onPress={() => router.push("/ai-pdf-import")}
        >
          <Ionicons name="document-text-outline" size={18} color={theme.colors.brand} />
          <Text style={styles.ctaTextSecondary}>IMPORTER UN PROGRAMME PDF</Text>
        </Pressable>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ProgramTracker({
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
          <View
            style={[styles.emojiBox, { backgroundColor: `${program.color}30` }]}
          >
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
              {doneCount}/{totalSessions} séances ·{" "}
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
      </Pressable>

      <Text style={styles.sectionTitle}>À venir</Text>
      {upcoming.map(({ dayIndex, day }) => {
        const isToday = dayIndex === today;
        const label = dayLabel(dayIndex, today);
        if (day.rest) {
          return (
            <View
              key={dayIndex}
              style={[styles.dayBlock, styles.dayBlockRest]}
              testID={`upcoming-${program.id}-${dayIndex}`}
            >
              <View style={styles.dayHead}>
                <Text style={styles.dayLabel}>{label}</Text>
                <Text style={styles.dayIdxText}>J{dayIndex}</Text>
              </View>
              <View style={styles.restRow}>
                <Ionicons name="bed" size={16} color={theme.colors.onSurfaceTertiary} />
                <Text style={styles.restText}>Repos</Text>
              </View>
            </View>
          );
        }
        return (
          <View
            key={dayIndex}
            style={[
              styles.dayBlock,
              isToday && { borderColor: program.color, borderWidth: 2 },
            ]}
            testID={`upcoming-${program.id}-${dayIndex}`}
          >
            <View style={styles.dayHead}>
              <Text
                style={[
                  styles.dayLabel,
                  isToday && { color: program.color },
                ]}
              >
                {label}
              </Text>
              <Text style={styles.dayIdxText}>J{dayIndex}</Text>
            </View>
            {day.sessions.map((s, si) => {
              const done = isSessionDone(dayIndex, si);
              return (
                <Pressable
                  key={si}
                  testID={`upcoming-${program.id}-${dayIndex}-session-${si}`}
                  style={[styles.sessRow, done && styles.sessRowDone]}
                  onPress={() => onLaunch(dayIndex, si, s)}
                >
                  <View style={styles.sessLeft}>
                    {s.label ? (
                      <View
                        style={[
                          styles.sessBadge,
                          { backgroundColor: program.color },
                        ]}
                      >
                        <Text style={styles.sessBadgeText}>
                          {s.label.toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessTitle} numberOfLines={1}>
                        {s.title}
                      </Text>
                      <Text style={styles.sessMeta}>
                        {s.exercises.length} exercice
                        {s.exercises.length > 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  {done ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={theme.colors.success}
                    />
                  ) : (
                    <Ionicons
                      name="play-circle"
                      size={22}
                      color={program.color}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        );
      })}
      <Pressable
        style={styles.viewAll}
        onPress={onOpen}
        testID={`view-all-${program.id}`}
      >
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
  const isGlass = theme.card.mode === "glass";
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
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  ctaBtn: {
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ctaText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  ctaBtnSecondary: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  ctaTextSecondary: { color: colors.brand, fontWeight: "800", letterSpacing: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  dualBanner: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: colors.brandTertiary,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  dualText: {
    color: colors.brandSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  dualInvite: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  dualInviteText: {
    flex: 1,
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
  },
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
    letterSpacing: 0.4,
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
  dayBlockRest: { backgroundColor: colors.surface },
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
  restRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  restText: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    fontStyle: "italic",
  },
  sessRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  sessRowDone: { opacity: 0.7 },
  sessLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sessBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sessBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  sessTitle: { color: colors.onSurface, fontWeight: "600", fontSize: 12 },
  sessMeta: { color: colors.onSurfaceTertiary, fontSize: 10, marginTop: 1 },
  viewAll: { padding: spacing.sm, alignItems: "flex-end" },
  viewAllText: {
    fontWeight: "800",
    letterSpacing: 0.5,
    fontSize: 12,
  },
  });
}
