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
import { colors, radius, spacing } from "@/src/theme";
import { LEVEL_LABEL, Program, ProgramSession } from "@/src/data/programs";
import { findProgram } from "@/src/utils/programs";
import {
  ActiveProgram,
  currentDayIndex,
  findOrCreateProgramPlan,
  getActiveProgram,
  uid,
} from "@/src/utils/gym-storage";

export default function ProgramTabScreen() {
  const router = useRouter();
  const [active, setActive] = useState<ActiveProgram | null>(null);
  const [program, setProgram] = useState<Program | null>(null);

  const load = useCallback(async () => {
    const a = await getActiveProgram();
    setActive(a);
    setProgram(a ? await findProgram(a.programId) : null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!active || !program) return <EmptyState router={router} />;

  return (
    <ProgramTracker
      active={active}
      program={program}
      onOpen={() => router.push(`/program/${program.id}`)}
      onLaunch={async (dayIndex, sessionIndex, session) => {
        const plan = await findOrCreateProgramPlan(
          program.id,
          dayIndex,
          sessionIndex,
          () => ({
            title: `${program.title} · J${dayIndex}${session.label ? " · " + session.label : ""}`,
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
  );
}

function EmptyState({ router }: { router: any }) {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Programme</Text>
      </View>
      <ScrollView contentContainerStyle={styles.emptyScroll}>
        <View style={styles.emptyIcon}>
          <Ionicons name="calendar" size={40} color={colors.brand} />
        </View>
        <Text style={styles.emptyTitle}>Aucun programme actif</Text>
        <Text style={styles.emptyText}>
          Choisis un programme parmi ceux inclus, ou crée le tien avec plusieurs séances par jour si tu veux.
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
          <Ionicons name="add-circle" size={18} color={colors.brand} />
          <Text style={styles.ctaTextSecondary}>CRÉER MON PROGRAMME</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
    // Next 7 days including today
    const items: { dayIndex: number; day: (typeof program.days)[number] }[] = [];
    for (
      let d = today;
      d <= Math.min(today + 6, program.durationDays);
      d++
    ) {
      items.push({ dayIndex: d, day: program.days[d - 1] });
    }
    return items;
  }, [today, program]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Programme</Text>
        <Pressable
          testID="open-active-program"
          onPress={onOpen}
          hitSlop={12}
        >
          <Ionicons name="expand" size={20} color={colors.brand} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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
            <Text style={styles.heroTitle}>{program.title}</Text>
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

        <Text style={styles.sectionTitle}>À venir (7 jours)</Text>
        {upcoming.map(({ dayIndex, day }) => {
          const isToday = dayIndex === today;
          const label = dayLabel(dayIndex, today);
          if (day.rest) {
            return (
              <View
                key={dayIndex}
                style={[styles.dayBlock, styles.dayBlockRest]}
                testID={`upcoming-${dayIndex}`}
              >
                <View style={styles.dayHead}>
                  <Text style={styles.dayLabel}>{label}</Text>
                  <Text style={styles.dayIdxText}>J{dayIndex}</Text>
                </View>
                <View style={styles.restRow}>
                  <Ionicons name="bed" size={16} color={colors.onSurfaceTertiary} />
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
              testID={`upcoming-${dayIndex}`}
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
                    testID={`upcoming-${dayIndex}-session-${si}`}
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
                        color={colors.success}
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

        <Pressable style={styles.viewAll} onPress={onOpen} testID="view-all-days">
          <Text style={styles.viewAllText}>Voir tout le programme →</Text>
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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

const styles = StyleSheet.create({
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
    backgroundColor: colors.brand,
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
  scroll: { padding: spacing.lg, gap: spacing.md },
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
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: spacing.md,
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
  viewAll: { padding: spacing.md, alignItems: "center" },
  viewAllText: {
    color: colors.brand,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontSize: 12,
  },
});
