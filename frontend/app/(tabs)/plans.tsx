import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import {
  COVER_COLORS,
  Program,
} from "@/src/data/programs";
import {
  deletePlan,
  getPlans,
  Plan,
  saveCustomProgram,
  uid,
} from "@/src/utils/gym-storage";

export default function PlansScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);

  const load = useCallback(async () => {
    setPlans(await getPlans());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = (id: string) => {
    Alert.alert("Supprimer le plan ?", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await deletePlan(id);
          load();
        },
      },
    ]);
  };

  const duplicateToProgram = async (p: Plan) => {
    // Create a new custom program pre-filled with this plan as day 1 session 1.
    const newProgram: Program = {
      id: uid(),
      title: `${p.title} (programme)`,
      description: `Programme construit depuis le plan « ${p.title} ».`,
      durationDays: 7,
      level: "debutant",
      goal: "",
      coverEmoji: p.type === "stretch" ? "🧘" : "💪",
      color: COVER_COLORS[0],
      days: Array.from({ length: 7 }, (_, i) => {
        if (i === 0) {
          return {
            rest: false,
            title: p.title,
            sessions: [
              {
                label: "",
                title: p.title,
                exercises: p.exercises.map((ex) => ({
                  name: ex.name,
                  mode: ex.mode,
                  sets: ex.sets,
                  reps: ex.reps,
                  weight: ex.weight,
                  rest_seconds: ex.rest_seconds,
                  duration_seconds: ex.duration_seconds,
                  notes: ex.notes,
                  photoBase64: ex.photoBase64 ?? null,
                  iconKey: ex.iconKey ?? null,
                })),
              },
            ],
          };
        }
        return { rest: true, title: `Jour ${i + 1} — Repos actif`, sessions: [] };
      }),
      isCustom: true,
      category: p.type === "stretch" ? "stretch" : "workout",
    };
    await saveCustomProgram(newProgram);
    Alert.alert(
      "Programme créé",
      "Ouvre-le pour compléter les autres jours et l'ajuster.",
    );
    router.push(`/custom-program/${newProgram.id}`);
  };

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
        <Text style={styles.title}>Mes plans</Text>
        <Pressable
          testID="create-plan-btn"
          style={styles.headerBtn}
          onPress={() => router.push("/plan/new")}
        >
          <Ionicons name="add" size={20} color={theme.colors.brand} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {plans.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="barbell"
                size={40}
                color={theme.colors.brand}
              />
            </View>
            <Text style={styles.emptyTitle}>Aucun plan</Text>
            <Text style={styles.emptySub}>
              Crée ton premier plan d&apos;entraînement{"\n"}manuellement.
            </Text>
            <Pressable
              testID="empty-create-btn"
              style={styles.ctaBtn}
              onPress={() => router.push("/plan/new")}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.ctaText}>CRÉER UN PLAN</Text>
            </Pressable>
          </View>
        ) : (
          plans.map((p) => (
            <Pressable
              key={p.id}
              testID={`plan-${p.id}`}
              style={styles.card}
              onPress={() => router.push(`/plan/${p.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{p.title}</Text>
                  <Text style={styles.cardMeta}>
                    {p.exercises.length} exercice
                    {p.exercises.length > 1 ? "s" : ""} · {p.type.toUpperCase()}
                  </Text>
                </View>
                <Pressable
                  hitSlop={10}
                  testID={`delete-plan-${p.id}`}
                  onPress={() => remove(p.id)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.colors.onSurfaceTertiary}
                  />
                </Pressable>
              </View>
              <View style={styles.exercisePreview}>
                {p.exercises.slice(0, 3).map((ex, i) => (
                  <Text key={i} style={styles.exerciseLine} numberOfLines={1}>
                    • {ex.name} — {ex.sets}×{ex.reps}
                  </Text>
                ))}
                {p.exercises.length > 3 && (
                  <Text style={styles.moreText}>
                    +{p.exercises.length - 3} autres
                  </Text>
                )}
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  testID={`duplicate-plan-${p.id}`}
                  style={styles.dupBtn}
                  onPress={() => duplicateToProgram(p)}
                >
                  <Ionicons name="copy" size={14} color={theme.colors.brand} />
                  <Text style={styles.dupBtnText}>PROGRAMME</Text>
                </Pressable>
                <Pressable
                  testID={`start-plan-${p.id}`}
                  style={styles.startBtn}
                  onPress={() => router.push(`/workout/${p.id}`)}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.startText}>DÉMARRER</Text>
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
        <View style={{ height: spacing.xl2 }} />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
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
  title: {
    color: colors.onSurface,
    fontSize: 24,
    fontWeight: "800",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  scroll: { padding: spacing.lg, gap: spacing.md },
  empty: {
    alignItems: "center",
    padding: spacing.xl,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "700",
  },
  emptySub: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.lg,
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
  secondaryBtn: { padding: spacing.md },
  secondaryText: {
    color: colors.onSurfaceSecondary,
    textDecorationLine: "underline",
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  cardTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "700",
  },
  cardMeta: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  exercisePreview: { gap: 4 },
  exerciseLine: {
    color: colors.onSurfaceSecondary,
    fontSize: 13,
  },
  moreText: { color: colors.brand, fontSize: 12, marginTop: 2 },
  startBtn: {
    flex: 1,
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    paddingVertical: 12,
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  startText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dupBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  dupBtnText: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  });
}
