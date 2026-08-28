import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { coloredShadow, shadow, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { programIconFor } from "@/src/utils/program-goal-icon";
import { LEVEL_LABEL, Program } from "@/src/data/programs";
import { deleteCustomProgram, getCustomPrograms, getProfile, UserProfile } from "@/src/utils/gym-storage";
import { scoreProgramForProfile } from "@/src/utils/programs";
import { getPlanTypeColors } from "@/src/utils/plan-type-colors";
import SwipeableRow from "@/src/components/SwipeableRow";
import GlassCard from "@/src/components/ui/GlassCard";

/**
 * Contenu "parcourir/créer/importer un programme" — extrait de
 * `app/programs.tsx` pour être réutilisable à la fois par cet écran modal
 * (avec sa barre d'en-tête) et directement dans chaque onglet de catégorie
 * du hub Entraînements (`training.tsx`) quand aucun programme de cette
 * catégorie n'est actif : évite le détour par un état vide qui n'offrait
 * qu'un bouton "Parcourir" menant à cet écran, en affichant directement ce
 * même contenu (Coach IronFlow, Créer, Importer, liste "MES PROGRAMMES").
 */
export default function ProgramBrowseList({
  category,
  router,
}: {
  category?: "cardio" | "stretch";
  router: any;
}) {
  const { theme } = useTheme();
  const isGlass = theme.card.mode === "glass";
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

  return (
    <View style={{ gap: spacing.md }}>
      <Pressable testID="coach-new-program" onPress={() => router.push("/coach/new" as any)}>
        <GlassCard
          accent={isGlass ? theme.colors.brand : undefined}
          style={[
            styles.coachCard,
            { borderRadius: theme.radius.md },
            !isGlass && { backgroundColor: theme.colors.brand },
          ]}
        >
          <View
            style={[
              styles.coachIcon,
              { borderRadius: theme.radius.md, backgroundColor: withAlpha(isGlass ? theme.colors.brand : "#FFFFFF", isGlass ? 16 : 20) },
            ]}
          >
            <Ionicons name="sparkles" size={26} color={isGlass ? theme.colors.brand : "#fff"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.coachTitle, isGlass && { color: theme.colors.onSurface }]}>Coach IronFlow</Text>
            <Text style={[styles.coachSub, isGlass && { color: theme.colors.onSurfaceSecondary }]}>
              Réponds à quelques questions, le moteur IronFlow construit ton plan — sans IA
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isGlass ? theme.colors.brand : "#fff"} />
        </GlassCard>
      </Pressable>

      <Pressable testID="create-program" onPress={() => router.push(createHref as any)}>
        <GlassCard
          level="subtle"
          style={[
            styles.createCard,
            { borderRadius: theme.radius.md, borderColor: theme.colors.brand },
            !isGlass && { backgroundColor: theme.colors.surfaceSecondary },
          ]}
        >
          <View style={[styles.createIcon, { borderRadius: theme.radius.md, backgroundColor: theme.colors.brandTertiary }]}>
            <Ionicons name="add" size={28} color={theme.colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.createTitle, { color: theme.colors.onSurface }]}>
              {isStretch
                ? "Créer mon programme d'étirement"
                : isCardio
                  ? "Créer mon programme cardio"
                  : "Créer mon programme"}
            </Text>
            <Text style={[styles.createSub, { color: theme.colors.onSurfaceTertiary }]}>
              {isStretch
                ? "Étirements sur mesure avec durées personnalisées"
                : isCardio
                  ? "Séances cardio, HIIT ou intervalles sur plusieurs jours"
                  : "Programme personnalisé avec 1 ou plusieurs séances par jour"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.brand} />
        </GlassCard>
      </Pressable>

      <Pressable testID="import-program" onPress={() => router.push("/program-import" as any)}>
        <GlassCard
          level="subtle"
          style={[
            styles.importCard,
            { borderRadius: theme.radius.md },
            !isGlass && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
          ]}
        >
          <View style={[styles.importIcon, { borderRadius: theme.radius.md, backgroundColor: theme.colors.brandTertiary }]}>
            <Ionicons name="sparkles" size={22} color={theme.colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.createTitle, { color: theme.colors.onSurface }]}>Importer un programme</Text>
            <Text style={[styles.createSub, { color: theme.colors.onSurfaceTertiary }]}>
              Colle un programme (texte) — reconnaissance automatique des jours et exercices
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.brand} />
        </GlassCard>
      </Pressable>

      {customs.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceTertiary }]}>MES PROGRAMMES</Text>
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
            color={
              isCardio
                ? getPlanTypeColors(theme).cardio
                : isStretch
                  ? getPlanTypeColors(theme).stretch
                  : getPlanTypeColors(theme).musculation
            }
          />
          <Text style={[styles.emptyCardioTitle, { color: theme.colors.onSurface }]}>
            {isCardio
              ? "Pas encore de programme cardio"
              : isStretch
                ? "Pas encore de programme d'étirement"
                : "Pas encore de programme"}
          </Text>
          <Text style={[styles.emptyCardioSub, { color: theme.colors.onSurfaceTertiary }]}>
            {isCardio
              ? "Crée un programme personnalisé pour structurer tes runs, séances de vélo, HIIT ou natation."
              : isStretch
                ? "Crée un programme d'étirement sur mesure, avec des durées personnalisées."
                : "Crée ton programme, importe-en un, ou laisse le Coach IronFlow en générer un pour toi."}
          </Text>
        </View>
      )}
    </View>
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
  const { theme } = useTheme();
  const isGlass = theme.card.mode === "glass";
  const sessions = program.days.reduce(
    (a, d) => a + (d.rest ? 0 : d.sessions.length),
    0,
  );
  const rests = program.days.filter((d) => d.rest).length;
  const card = (
    <Pressable testID={`program-card-${program.id}`} onPress={onPress}>
      <GlassCard
        level="card"
        style={[
          styles.card,
          { borderRadius: theme.radius.md, borderLeftColor: program.color },
          !isGlass && {
            backgroundColor: theme.colors.surfaceSecondary,
            borderTopColor: theme.colors.border,
            borderRightColor: theme.colors.border,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
      <View style={[styles.coverEmoji, { borderRadius: theme.radius.md, backgroundColor: withAlpha(program.color, 13) }]}>
        <Ionicons name={programIconFor(program.coverEmoji)} size={26} color={program.color} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.tagRow}>
          {recommended && (
            <View style={[styles.recommendedTag, { borderRadius: theme.radius.sm, backgroundColor: theme.colors.progress }]}>
              <Ionicons name="sparkles" size={9} color="#fff" />
              <Text style={styles.tagText}>RECOMMANDÉ</Text>
            </View>
          )}
          <View style={[styles.tag, { borderRadius: theme.radius.sm, backgroundColor: program.color }]}>
            <Text style={styles.tagText}>{LEVEL_LABEL[program.level]}</Text>
          </View>
          <View style={[styles.tagOutline, { borderRadius: theme.radius.sm, borderColor: theme.colors.border }]}>
            <Text style={[styles.tagOutlineText, { color: theme.colors.onSurfaceTertiary }]}>
              {program.durationDays} jours
            </Text>
          </View>
          {program.isCustom && (
            <View style={[styles.tagOutline, { borderRadius: theme.radius.sm, borderColor: theme.colors.border }]}>
              <Text style={[styles.tagOutlineText, { color: theme.colors.onSurfaceTertiary }]}>PERSO</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{program.title}</Text>
        <Text style={[styles.cardGoal, { color: theme.colors.brand }]}>{program.goal}</Text>
        <Text style={[styles.cardMeta, { color: theme.colors.onSurfaceTertiary }]}>
          {sessions} séances · {rests} jours de repos
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceTertiary} />
      </GlassCard>
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
  coachCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    ...shadow.elevated,
  },
  coachIcon: {
    width: 52,
    height: 52,
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
    padding: spacing.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  createIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  importCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  importIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  createTitle: { fontSize: 15, fontWeight: "800" },
  createSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  sectionLabel: {
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
    padding: spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  coverEmoji: {
    width: 60,
    height: 60,
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
  },
  tag: { paddingHorizontal: 8, paddingVertical: 2 },
  tagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  tagOutline: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  tagOutlineText: {
    fontSize: 9,
    fontWeight: "700",
  },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  cardGoal: { fontSize: 12, fontWeight: "600" },
  cardMeta: { fontSize: 11, marginTop: 2 },
  emptyCardio: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  emptyCardioTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  emptyCardioSub: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
});
