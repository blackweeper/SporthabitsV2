import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { spacing, shadow } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { LevelState } from "@/src/utils/xp";
import { rankAccentColor } from "@/src/utils/rank-colors";
import { progressionHref } from "@/src/utils/progression-nav";
import AnimatedNumber from "@/src/components/ui/AnimatedNumber";
import PressableScale from "@/src/components/ui/PressableScale";
import GlassCard from "@/src/components/ui/GlassCard";

/**
 * Carte "cockpit" Niveau/XP/Streak/Trophées — aucune donnée nouvelle à
 * calculer, tout (progression XP, prochain badge, streak actuel/record,
 * trophées débloqués) est déjà exposé par xp.ts/stats.ts/achievements.ts.
 * Partagée entre le Profil (destination permanente de ce bloc) et, si
 * besoin, tout autre écran qui voudrait le même résumé.
 */
export default function CockpitCard({
  levelState,
  currentStreakDays,
  bestStreakDays,
  unlockedAchievements,
  totalAchievements,
  onPress,
  testID,
}: {
  levelState: LevelState;
  currentStreakDays: number;
  bestStreakDays: number;
  unlockedAchievements: number;
  totalAchievements: number;
  onPress?: () => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const accent = rankAccentColor(theme, levelState.rank.rank.colorKey);

  const content = (
    <GlassCard
      testID={onPress ? undefined : testID}
      style={[
        styles.cockpitCard,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
        },
        shadow.card,
      ]}
    >
      <View style={styles.cockpitTop}>
        <View style={[styles.cockpitLevelBadge, { backgroundColor: accent }]}>
          <Text style={styles.cockpitLevelBadgeNum}>{levelState.level}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cockpitLevelLabel, { color: theme.colors.onSurfaceTertiary }]}>
            NIVEAU {levelState.level} · {levelState.rank.label}
          </Text>
          <View style={[styles.cockpitXpBar, { backgroundColor: theme.colors.surfaceTertiary }]}>
            <View
              style={[
                styles.cockpitXpFill,
                { width: `${levelState.progress * 100}%`, backgroundColor: accent },
              ]}
            />
          </View>
          <Text style={[styles.cockpitXpCaption, { color: theme.colors.onSurface }]}>
            {levelState.isMaxLevel
              ? "Niveau maximum atteint"
              : `${levelState.xpToNext} XP → niveau ${levelState.level + 1}`}
          </Text>
        </View>
      </View>
      <View style={[styles.cockpitDivider, { backgroundColor: theme.colors.divider }]} />
      <View style={styles.cockpitBottom}>
        <View style={styles.cockpitStat}>
          <Ionicons name="flame-outline" size={14} color={theme.colors.onSurfaceTertiary} />
          <AnimatedNumber
            value={currentStreakDays}
            formatter={(n) => `${Math.round(n)} j`}
            style={[styles.cockpitStatValue, { color: theme.colors.onSurface }]}
          />
          <Text style={[styles.cockpitStatLabel, { color: theme.colors.onSurfaceTertiary }]}>Streak</Text>
        </View>
        <View style={styles.cockpitStat}>
          <Ionicons name="trophy-outline" size={14} color={theme.colors.onSurfaceTertiary} />
          <AnimatedNumber
            value={bestStreakDays}
            formatter={(n) => `${Math.round(n)} j`}
            style={[styles.cockpitStatValue, { color: theme.colors.onSurface }]}
          />
          <Text style={[styles.cockpitStatLabel, { color: theme.colors.onSurfaceTertiary }]}>Record</Text>
        </View>
        <Pressable
          testID={testID ? `${testID}-achievements` : "cockpit-achievements-link"}
          style={styles.cockpitStat}
          onPress={(e) => {
            e.stopPropagation?.();
            router.push(progressionHref("defis") as any);
          }}
        >
          <Ionicons name="ribbon-outline" size={14} color={theme.colors.onSurfaceTertiary} />
          <Text style={[styles.cockpitStatValue, { color: theme.colors.onSurface }]}>
            {unlockedAchievements}/{totalAchievements}
          </Text>
          <Text style={[styles.cockpitStatLabel, { color: theme.colors.onSurfaceTertiary }]}>Trophées</Text>
        </Pressable>
      </View>
    </GlassCard>
  );

  if (!onPress) return content;
  return (
    <PressableScale testID={testID} onPress={onPress}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  cockpitCard: {
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cockpitTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cockpitLevelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cockpitLevelBadgeNum: { color: "#fff", fontWeight: "800", fontSize: 12 },
  cockpitLevelLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  cockpitXpBar: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  cockpitXpFill: { height: "100%", borderRadius: 3 },
  cockpitXpCaption: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  cockpitDivider: { height: 1 },
  cockpitBottom: { flexDirection: "row" },
  cockpitStat: { flex: 1, alignItems: "center", gap: 2 },
  cockpitStatValue: { fontSize: 13, fontWeight: "800" },
  cockpitStatLabel: {
    fontSize: 9,
    fontWeight: "700",
  },
});
