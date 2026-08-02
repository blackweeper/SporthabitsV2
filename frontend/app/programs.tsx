import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, withAlpha } from "@/src/theme";
import { programIconFor } from "@/src/utils/program-goal-icon";
import { LEVEL_LABEL, Program } from "@/src/data/programs";
import { deleteCustomProgram, getCustomPrograms, getProfile, UserProfile } from "@/src/utils/gym-storage";
import { scoreProgramForProfile } from "@/src/utils/programs";
import { PLAN_TYPE_COLORS } from "@/src/utils/plan-type-colors";
import SwipeableRow from "@/src/components/SwipeableRow";

export default function ProgramsScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const isStretch = category === "stretch";
  const isCardio = category === "cardio";
  const [customs, setCustoms] = useState<Program[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const reload = useCallback(async () => {
    const all = (await getCustomPrograms()) as Program[];
    const filtered = all.filter((p) => {
      if (isStretch) return p.category === "stretch";
      if (isCardio) return p.category === "cardio";
      return (p.category ?? "workout") === "workout";
    });
    const currentProfile = await getProfile();
    // Tri par pertinence pour le profil (objectif/niveau) quand renseigné —
    // jamais un filtre, juste un ordre ; sans profil renseigné, ordre
    // d'origine inchangé (tri stable, tous les scores valent 0).
    filtered.sort(
      (a, b) => scoreProgramForProfile(b, currentProfile) - scoreProgramForProfile(a, currentProfile),
    );
    setCustoms(filtered);
    setProfile(currentProfile);
  }, [isStretch, isCardio]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const topScore = customs.length > 0 ? scoreProgramForProfile(customs[0], profile) : 0;
  const createHref = isStretch
    ? "/custom-program/new?category=stretch"
    : isCardio
      ? "/custom-program/new?category=cardio"
      : "/custom-program/new";
  const title = isStretch
    ? "Programmes d'étirement"
    : isCardio
      ? "Programmes cardio"
      : "Programmes";

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
          testID="coach-new-program"
          style={styles.coachCard}
          onPress={() => router.push("/coach/new" as any)}
        >
          <View style={styles.coachIcon}>
            <Ionicons name="sparkles" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.coachTitle}>Coach IronFlow</Text>
            <Text style={styles.coachSub}>
              Réponds à quelques questions, le moteur IronFlow construit ton plan — sans IA
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Pressable>

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
              {isStretch
                ? "Créer mon programme d'étirement"
                : isCardio
                  ? "Créer mon programme cardio"
                  : "Créer mon programme"}
            </Text>
            <Text style={styles.createSub}>
              {isStretch
                ? "Étirements sur mesure avec durées personnalisées"
                : isCardio
                  ? "Séances cardio, HIIT ou intervalles sur plusieurs jours"
                  : "Programme personnalisé avec 1 ou plusieurs séances par jour"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.brand} />
        </Pressable>

        <Pressable
          testID="import-program"
          style={styles.importCard}
          onPress={() => router.push("/program-import" as any)}
        >
          <View style={styles.importIcon}>
            <Ionicons name="sparkles" size={22} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.createTitle}>Importer un programme</Text>
            <Text style={styles.createSub}>
              Colle un programme (texte) — reconnaissance automatique des jours et exercices
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.brand} />
        </Pressable>

        {customs.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>MES PROGRAMMES</Text>
            {customs.map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                recommended={topScore > 0 && scoreProgramForProfile(p, profile) === topScore}
                onPress={() => router.push(`/program/${p.id}`)}
                onDelete={async () => {
                  await deleteCustomProgram(p.id);
                  reload();
                }}
              />
            ))}
          </>
        ) : (
          <View style={styles.emptyCardio}>
            <Ionicons
              name={isCardio ? "stopwatch" : isStretch ? "leaf" : "barbell"}
              size={40}
              color={isCardio ? PLAN_TYPE_COLORS.cardio : isStretch ? PLAN_TYPE_COLORS.stretch : PLAN_TYPE_COLORS.musculation}
            />
            <Text style={styles.emptyCardioTitle}>
              {isCardio
                ? "Pas encore de programme cardio"
                : isStretch
                  ? "Pas encore de programme d'étirement"
                  : "Pas encore de programme"}
            </Text>
            <Text style={styles.emptyCardioSub}>
              {isCardio
                ? "Crée un programme personnalisé pour structurer tes runs, séances de vélo, HIIT ou natation."
                : isStretch
                  ? "Crée un programme d'étirement sur mesure, avec des durées personnalisées."
                  : "Crée ton programme, importe-en un, ou laisse le Coach IronFlow en générer un pour toi."}
            </Text>
          </View>
        )}
        <View style={{ height: spacing.xl2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgramCard({
  program,
  onPress,
  onDelete,
  recommended = false,
}: {
  program: Program;
  onPress: () => void;
  onDelete?: () => void | Promise<void>;
  recommended?: boolean;
}) {
  const sessions = program.days.reduce(
    (a, d) => a + (d.rest ? 0 : d.sessions.length),
    0,
  );
  const rests = program.days.filter((d) => d.rest).length;
  const card = (
    <Pressable
      testID={`program-card-${program.id}`}
      style={[styles.card, { borderLeftColor: program.color }]}
      onPress={onPress}
    >
      <View style={[styles.coverEmoji, { backgroundColor: withAlpha(program.color, 13) }]}>
        <Ionicons name={programIconFor(program.coverEmoji)} size={26} color={program.color} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.tagRow}>
          {recommended && (
            <View style={styles.recommendedTag}>
              <Ionicons name="sparkles" size={9} color="#fff" />
              <Text style={styles.tagText}>RECOMMANDÉ</Text>
            </View>
          )}
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

  if (!onDelete) return card;

  return (
    <SwipeableRow
      testID={`program-card-${program.id}`}
      onDelete={onDelete}
      deleteConfirm={{
        title: "Supprimer ce programme ?",
        message: `"${program.title}" — cette action est définitive.`,
        confirmLabel: "SUPPRIMER",
        destructive: true,
      }}
      onEdit={onPress}
    >
      {card}
    </SwipeableRow>
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
  coachCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brand,
    padding: spacing.md,
    borderRadius: radius.md,
    ...shadow.elevated,
  },
  coachIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: withAlpha("#FFFFFF", 20),
    alignItems: "center",
    justifyContent: "center",
  },
  coachTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  coachSub: { color: withAlpha("#FFFFFF", 85), fontSize: 11, marginTop: 2, lineHeight: 15 },
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
  importCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  importIcon: {
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
  tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  recommendedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.progress,
  },
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
  emptyCardio: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  emptyCardioTitle: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "800",
  },
  emptyCardioSub: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
});
