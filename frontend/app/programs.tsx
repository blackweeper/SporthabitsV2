import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  BUNDLED_PROGRAMS,
  BUNDLED_STRETCH_PROGRAMS,
  LEVEL_LABEL,
  Program,
} from "@/src/data/programs";
import { getCustomPrograms } from "@/src/utils/gym-storage";

export default function ProgramsScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const isStretch = category === "stretch";
  const [customs, setCustoms] = useState<Program[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const all = (await getCustomPrograms()) as Program[];
        setCustoms(
          all.filter((p) =>
            isStretch ? p.category === "stretch" : (p.category ?? "workout") === "workout",
          ),
        );
      })();
    }, [isStretch]),
  );

  const bundled = isStretch ? BUNDLED_STRETCH_PROGRAMS : BUNDLED_PROGRAMS;
  const createHref = isStretch
    ? "/custom-program/new?category=stretch"
    : "/custom-program/new";
  const title = isStretch ? "Programmes d'étirement" : "Programmes";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="close-programs"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          testID="create-program"
          style={styles.createCard}
          onPress={() => router.push(createHref as any)}
        >
          <View style={styles.createIcon}>
            <Ionicons name="add" size={28} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.createTitle}>
              {isStretch ? "Créer mon programme d'étirement" : "Créer mon programme"}
            </Text>
            <Text style={styles.createSub}>
              {isStretch
                ? "Étirements sur mesure avec durées personnalisées"
                : "Programme personnalisé avec 1 ou plusieurs séances par jour"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.brand} />
        </Pressable>

        {customs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>MES PROGRAMMES</Text>
            {customs.map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                onPress={() => router.push(`/program/${p.id}`)}
              />
            ))}
          </>
        )}

        <Text style={styles.sectionLabel}>
          {isStretch ? "PROGRAMMES INCLUS" : "PROGRAMMES INCLUS"}
        </Text>
        {bundled.map((p) => (
          <ProgramCard
            key={p.id}
            program={p}
            onPress={() => router.push(`/program/${p.id}`)}
          />
        ))}
        <View style={{ height: spacing.xl2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgramCard({
  program,
  onPress,
}: {
  program: Program;
  onPress: () => void;
}) {
  const sessions = program.days.reduce(
    (a, d) => a + (d.rest ? 0 : d.sessions.length),
    0,
  );
  const rests = program.days.filter((d) => d.rest).length;
  return (
    <Pressable
      testID={`program-card-${program.id}`}
      style={[styles.card, { borderLeftColor: program.color }]}
      onPress={onPress}
    >
      <View style={[styles.coverEmoji, { backgroundColor: `${program.color}22` }]}>
        <Text style={styles.emojiText}>{program.coverEmoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: program.color }]}>
            <Text style={styles.tagText}>{LEVEL_LABEL[program.level]}</Text>
          </View>
          <View style={styles.tagOutline}>
            <Text style={styles.tagOutlineText}>
              {program.durationDays} jours
            </Text>
          </View>
          {program.isCustom && (
            <View style={styles.tagOutline}>
              <Text style={styles.tagOutlineText}>PERSO</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardTitle}>{program.title}</Text>
        <Text style={styles.cardGoal}>{program.goal}</Text>
        <Text style={styles.cardMeta}>
          {sessions} séances · {rests} jours de repos
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceTertiary} />
    </Pressable>
  );
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
  title: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  createCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: "dashed",
  },
  createIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  createTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  createSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  sectionLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: 2,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderTopColor: colors.border,
    borderRightColor: colors.border,
    borderBottomColor: colors.border,
  },
  coverEmoji: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 30 },
  tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  tagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
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
  cardTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  cardGoal: { color: colors.brand, fontSize: 12, fontWeight: "600" },
  cardMeta: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
});
