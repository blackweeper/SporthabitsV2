import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, radius, spacing, shadow } from "@/src/theme";
import { XPState } from "@/src/utils/xp";
import AnimatedNumber from "@/src/components/ui/AnimatedNumber";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Carte "cockpit" Niveau/XP/Streak/Trophées — aucune donnée nouvelle à
 * calculer, tout (progression XP, prochain badge, streak actuel/record,
 * trophées débloqués) est déjà exposé par xp.ts/stats.ts/achievements.ts.
 * Partagée entre le Profil (destination permanente de ce bloc) et, si
 * besoin, tout autre écran qui voudrait le même résumé.
 */
export default function CockpitCard({
  xpState,
  currentStreakDays,
  bestStreakDays,
  unlockedAchievements,
  totalAchievements,
  onPress,
  testID,
}: {
  xpState: XPState;
  currentStreakDays: number;
  bestStreakDays: number;
  unlockedAchievements: number;
  totalAchievements: number;
  onPress?: () => void;
  testID?: string;
}) {
  const router = useRouter();
  const Wrapper = onPress ? PressableScale : View;
  const wrapperProps = onPress ? { testID, onPress } : {};

  return (
    <Wrapper style={styles.cockpitCard} {...wrapperProps}>
      <View style={styles.cockpitTop}>
        <View style={styles.cockpitLevelBadge}>
          <Text style={styles.cockpitLevelBadgeNum}>{xpState.level}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cockpitLevelLabel}>NIVEAU {xpState.level}</Text>
          <View style={styles.cockpitXpBar}>
            <View style={[styles.cockpitXpFill, { width: `${xpState.progress * 100}%` }]} />
          </View>
          <Text style={styles.cockpitXpCaption}>
            {xpState.xpToNext} XP → N{xpState.level + 1}
            {xpState.nextBadge
              ? ` · Prochain badge : ${xpState.nextBadge.emoji} ${xpState.nextBadge.title}`
              : ""}
          </Text>
        </View>
      </View>
      <View style={styles.cockpitDivider} />
      <View style={styles.cockpitBottom}>
        <View style={styles.cockpitStat}>
          <Ionicons name="flame-outline" size={14} color={colors.onSurfaceTertiary} />
          <AnimatedNumber
            value={currentStreakDays}
            formatter={(n) => `${Math.round(n)} j`}
            style={styles.cockpitStatValue}
          />
          <Text style={styles.cockpitStatLabel}>Streak</Text>
        </View>
        <View style={styles.cockpitStat}>
          <Ionicons name="trophy-outline" size={14} color={colors.onSurfaceTertiary} />
          <AnimatedNumber
            value={bestStreakDays}
            formatter={(n) => `${Math.round(n)} j`}
            style={styles.cockpitStatValue}
          />
          <Text style={styles.cockpitStatLabel}>Record</Text>
        </View>
        <Pressable
          testID={testID ? `${testID}-achievements` : "cockpit-achievements-link"}
          style={styles.cockpitStat}
          onPress={(e) => {
            e.stopPropagation?.();
            router.push("/achievements");
          }}
        >
          <Ionicons name="ribbon-outline" size={14} color={colors.onSurfaceTertiary} />
          <Text style={styles.cockpitStatValue}>
            {unlockedAchievements}/{totalAchievements}
          </Text>
          <Text style={styles.cockpitStatLabel}>Trophées</Text>
        </Pressable>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  cockpitCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  cockpitTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cockpitLevelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.progress,
    alignItems: "center",
    justifyContent: "center",
  },
  cockpitLevelBadgeNum: { color: "#fff", fontWeight: "800", fontSize: 12 },
  cockpitLevelLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  cockpitXpBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  cockpitXpFill: { height: "100%", borderRadius: 3, backgroundColor: colors.progress },
  cockpitXpCaption: {
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  cockpitDivider: { height: 1, backgroundColor: colors.divider },
  cockpitBottom: { flexDirection: "row" },
  cockpitStat: { flex: 1, alignItems: "center", gap: 2 },
  cockpitStatValue: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  cockpitStatLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 9,
    fontWeight: "700",
  },
});
