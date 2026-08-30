import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { spacing, withAlpha, coloredShadow } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { LevelState } from "@/src/utils/xp";
import { rankAccentColor } from "@/src/utils/rank-colors";
import AnimatedNumber from "@/src/components/ui/AnimatedNumber";
import PressableScale from "@/src/components/ui/PressableScale";
import GlassCard from "@/src/components/ui/GlassCard";

function pluralJours(n: number): string {
  return `${Math.round(n)} jour${Math.round(n) >= 2 ? "s" : ""}`;
}

function formatXP(n: number): string {
  return Math.round(n).toLocaleString("fr-FR");
}

/**
 * Panneau "Niveau + Streak" du Profil — identité de rang (badge + libellé
 * IronFlow existant, `xp.ts`/`rank-colors.ts` inchangés) et streak, dans UNE
 * seule composition Liquid Glass plutôt que des cartes empilées (le
 * précédent design "cockpit" compact a été retiré : trop dense, trop de
 * stats secondaires — voir le brief PASSE 7, "ne pas afficher 10 statistiques
 * inutiles"). Les Trophées/Défis ne sont plus résumés ici (hors périmètre de
 * cette passe, déjà accessibles depuis Performance) — un seul accent de
 * couleur (celui du rang) traverse tout le panneau pour rester sobre plutôt
 * que multicolore.
 */
export default function CockpitCard({
  levelState,
  currentStreakDays,
  bestStreakDays,
  onPress,
  testID,
}: {
  levelState: LevelState;
  currentStreakDays: number;
  bestStreakDays: number;
  onPress?: () => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  const accent = rankAccentColor(theme, levelState.rank.rank.colorKey);
  const fill = useSharedValue(0);

  useEffect(() => {
    const cfg = theme.ringFill;
    fill.value =
      cfg.type === "spring"
        ? withSpring(levelState.progress, { damping: cfg.damping, stiffness: cfg.stiffness })
        : withTiming(levelState.progress, { duration: cfg.duration, easing: Easing.out(Easing.cubic) });
  }, [levelState.progress, theme.ringFill, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  // "Encore N jours pour battre ton record" — uniquement quand un streak est
  // réellement en cours ET que le record est encore devant lui (jamais si le
  // streak est cassé ou déjà au niveau du record : rien à annoncer alors).
  const daysToBeatRecord =
    currentStreakDays > 0 && bestStreakDays > currentStreakDays ? bestStreakDays - currentStreakDays : null;

  const content = (
    <GlassCard testID={onPress ? undefined : testID} level="elevated" accent={accent} style={styles.card}>
      <View style={styles.levelRow}>
        <View
          style={[
            styles.levelBadge,
            { backgroundColor: withAlpha(accent, 16), borderColor: accent },
            coloredShadow(accent, { offsetY: 0, opacity: 0.3, radius: 14, elevation: 3 }),
          ]}
        >
          <Text style={[styles.levelBadgeNum, { color: accent }]}>{levelState.level}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.levelEyebrow, { color: theme.colors.onSurfaceTertiary }]}>
            NIVEAU {levelState.level}
          </Text>
          <Text style={[styles.rankName, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {levelState.rank.label}
          </Text>
        </View>
      </View>

      <View style={[styles.xpTrack, { backgroundColor: theme.colors.surfaceTertiary }]}>
        <Animated.View style={[styles.xpFill, fillStyle, { backgroundColor: accent }]} />
      </View>
      <View style={styles.xpCaptionRow}>
        <Text style={[styles.xpCaption, { color: theme.colors.onSurfaceSecondary }]}>
          <AnimatedNumber value={levelState.xpIntoLevel} formatter={formatXP} /> / {formatXP(levelState.xpForThisLevel)} XP
        </Text>
        <Text style={[styles.xpToNext, { color: accent }]}>
          {levelState.isMaxLevel ? "Niveau maximum atteint" : `+${formatXP(levelState.xpToNext)} XP avant le niveau ${levelState.level + 1}`}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

      <View style={styles.streakRow}>
        <View style={styles.streakItem}>
          <Text style={[styles.streakLabel, { color: theme.colors.onSurfaceTertiary }]}>STREAK ACTUEL</Text>
          <View style={styles.streakValueRow}>
            <Ionicons name="flame" size={18} color={theme.colors.warning} />
            <AnimatedNumber
              value={currentStreakDays}
              formatter={pluralJours}
              style={[styles.streakValue, { color: theme.colors.onSurface }]}
            />
          </View>
        </View>
        <View style={[styles.streakDivider, { backgroundColor: theme.colors.divider }]} />
        <View style={styles.streakItem}>
          <Text style={[styles.streakLabel, { color: theme.colors.onSurfaceTertiary }]}>MEILLEUR STREAK</Text>
          <View style={styles.streakValueRow}>
            <Ionicons name="flame" size={18} color={theme.colors.warning} />
            <AnimatedNumber
              value={bestStreakDays}
              formatter={pluralJours}
              style={[styles.streakValue, { color: theme.colors.onSurface }]}
            />
          </View>
        </View>
      </View>
      {daysToBeatRecord != null && (
        <Text style={[styles.streakHint, { color: theme.colors.onSurfaceTertiary }]}>
          Encore {pluralJours(daysToBeatRecord)} pour battre ton record
        </Text>
      )}
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
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  levelRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  levelBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadgeNum: { fontWeight: "800", fontSize: 20 },
  levelEyebrow: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  rankName: { fontSize: 21, fontWeight: "800", letterSpacing: 0.3 },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  xpFill: { height: "100%", borderRadius: 4 },
  xpCaptionRow: { gap: 2, marginTop: 2 },
  xpCaption: { fontSize: 13, fontWeight: "700" },
  xpToNext: { fontSize: 11.5, fontWeight: "700" },
  divider: { height: 1, marginVertical: spacing.xs },
  streakRow: { flexDirection: "row", alignItems: "center" },
  streakItem: { flex: 1, alignItems: "center", gap: 4 },
  streakDivider: { width: 1, height: 34 },
  streakLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  streakValueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  streakValue: { fontSize: 16, fontWeight: "800" },
  streakHint: {
    fontSize: 11.5,
    fontWeight: "600",
    textAlign: "center",
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
});
