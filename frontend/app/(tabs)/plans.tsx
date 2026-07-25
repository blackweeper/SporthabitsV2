import { useCallback, useState } from "react";
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
import { colors, radius, spacing } from "@/src/theme";
import { deletePlan, getPlans, Plan } from "@/src/utils/gym-storage";

export default function PlansScreen() {
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes plans</Text>
        <Pressable
          testID="import-plan-btn"
          style={styles.headerBtn}
          onPress={() => router.push("/import")}
        >
          <Ionicons name="camera" size={18} color={colors.brand} />
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
                color={colors.brand}
              />
            </View>
            <Text style={styles.emptyTitle}>Aucun plan</Text>
            <Text style={styles.emptySub}>
              Importe ton plan depuis une photo ou{"\n"}crée-en un manuellement.
            </Text>
            <Pressable
              testID="empty-import-btn"
              style={styles.ctaBtn}
              onPress={() => router.push("/import")}
            >
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.ctaText}>IMPORTER DEPUIS UNE PHOTO</Text>
            </Pressable>
            <Pressable
              testID="empty-create-btn"
              style={styles.secondaryBtn}
              onPress={() => router.push("/plan/new")}
            >
              <Text style={styles.secondaryText}>Créer manuellement</Text>
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
                    color={colors.onSurfaceTertiary}
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
              <Pressable
                testID={`start-plan-${p.id}`}
                style={styles.startBtn}
                onPress={() => router.push(`/workout/${p.id}`)}
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.startText}>DÉMARRER</Text>
              </Pressable>
            </Pressable>
          ))
        )}
        <View style={{ height: spacing.xl2 }} />
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: colors.brand,
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
    backgroundColor: colors.brand,
    paddingVertical: 12,
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  startText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
});
