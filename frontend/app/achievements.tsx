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
import {
  getMeasurements,
  getPRs,
  getSessions,
} from "@/src/utils/gym-storage";
import {
  Achievement,
  computeAchievements,
} from "@/src/utils/achievements";

const CATEGORIES: {
  key: Achievement["category"] | "all";
  label: string;
}[] = [
  { key: "all", label: "Tous" },
  { key: "debut", label: "Séances" },
  { key: "volume", label: "Volume" },
  { key: "cardio", label: "Cardio" },
  { key: "streak", label: "Streak" },
  { key: "discipline", label: "Discipline" },
  { key: "record", label: "Records" },
  { key: "special", label: "Spécial" },
];

export default function AchievementsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const [items, setItems] = useState<Achievement[]>([]);
  const [cat, setCat] = useState<any>("all");

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const sessions = await getSessions();
        const prs = await getPRs();
        const measurements = await getMeasurements();
        setItems(computeAchievements({ sessions, prs, measurements }));
      })();
    }, []),
  );

  const filtered = cat === "all" ? items : items.filter((i) => i.category === cat);
  const unlocked = items.filter((i) => i.unlocked).length;

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface },
        ]}
        edges={["top", "bottom"]}
      >
      <View style={styles.header}>
        <Pressable
          testID="close-achievements"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Succès</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryTitle}>Progression</Text>
          <Text style={styles.summarySub}>
            {unlocked}/{items.length} succès débloqués
          </Text>
        </View>
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryBadgeText}>
            {Math.round((unlocked / Math.max(1, items.length)) * 100)}%
          </Text>
        </View>
      </View>

      <View style={styles.catWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {CATEGORIES.map((c) => {
            const active = cat === c.key;
            return (
              <Pressable
                key={c.key}
                testID={`cat-${c.key}`}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => setCat(c.key)}
              >
                <Text
                  style={[
                    styles.catChipText,
                    active && { color: "#fff" },
                  ]}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {filtered.map((a) => (
          <View
            key={a.id}
            style={[styles.card, a.unlocked && styles.cardUnlocked]}
            testID={`ach-${a.id}`}
          >
            <Text style={[styles.emoji, !a.unlocked && { opacity: 0.35 }]}>
              {a.emoji}
            </Text>
            <Text
              style={[
                styles.cardTitle,
                !a.unlocked && { color: theme.colors.onSurfaceTertiary },
              ]}
              numberOfLines={2}
            >
              {a.title}
            </Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {a.description}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (a.progress / a.target) * 100)}%`,
                    backgroundColor: a.unlocked ? theme.colors.success : theme.colors.brand,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>{a.progressLabel}</Text>
            {a.unlocked && (
              <View style={styles.unlockedTag}>
                <Ionicons name="checkmark" size={10} color="#fff" />
                <Text style={styles.unlockedTagText}>DÉBLOQUÉ</Text>
              </View>
            )}
          </View>
        ))}
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
  title: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  summary: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  summaryLeft: { flex: 1 },
  summaryTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 15 },
  summarySub: { color: colors.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
  summaryBadge: {
    backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  summaryBadgeText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  catWrap: { maxHeight: 44 },
  catRow: {
    paddingHorizontal: spacing.lg,
    gap: 6,
    paddingBottom: spacing.sm,
    alignItems: "center",
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: isGlass
    ? { backgroundColor: withAlpha(colors.brand, 20), borderColor: withAlpha(colors.brand, 50) }
    : { backgroundColor: colors.brand, borderColor: colors.brand },
  catChipText: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "700",
  },
  grid: {
    padding: spacing.lg,
    gap: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  card: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
    position: "relative",
  },
  cardUnlocked: {
    borderColor: colors.success,
    backgroundColor: "#0F2F1A",
  },
  emoji: { fontSize: 32 },
  cardTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 13 },
  cardDesc: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    lineHeight: 14,
    minHeight: 28,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: { height: "100%" },
  progressLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "600",
  },
  unlockedTag: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unlockedTagText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  });
}
