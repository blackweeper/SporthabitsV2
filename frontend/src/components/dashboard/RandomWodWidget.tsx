import { useEffect, useState } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, radius, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import ProgramActionCard from "@/src/components/dashboard/ProgramActionCard";
import { getPlans, Plan } from "@/src/utils/gym-storage";
import { pickRandomWod } from "@/src/utils/wod-random";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Pioche un WOD au hasard parmi les séances déjà sauvegardées (`p.wodSource`
 * truthy) et le lance directement — même sélection que "WOD aléatoire" dans
 * l'onglet Entraînements (`pickRandomWod`, partagé). Autonome (charge sa
 * propre liste au montage), rendu `null` si l'utilisateur n'a aucun WOD.
 * Sous Sunset, reprend exactement le format `ProgramActionCard` (carte
 * "Ginásio/Cardio") pour cohabiter dans la même grille que les widgets
 * programme — `style` permet à l'appelant de contrôler la largeur de tuile.
 */
export default function RandomWodWidget({ style }: { style?: StyleProp<ViewStyle> } = {}) {
  const router = useRouter();
  const { theme } = useTheme();
  const [wodPlans, setWodPlans] = useState<Plan[]>([]);

  useEffect(() => {
    getPlans().then((plans) => setWodPlans(plans.filter((p) => p.wodSource)));
  }, []);

  if (wodPlans.length === 0) return null;

  const onLaunch = () => {
    const chosen = pickRandomWod(wodPlans);
    if (chosen) router.push(`/workout/${chosen.id}` as any);
  };

  if (theme.id === "sunset") {
    return (
      <ProgramActionCard
        testID="random-wod-widget"
        icon="shuffle"
        iconColor={theme.colors.brand}
        title="WOD aléatoire"
        subtitle={`${wodPlans.length} séance${wodPlans.length > 1 ? "s" : ""}`}
        onPress={onLaunch}
        style={style}
      />
    );
  }

  return (
    <GlassCard testID="random-wod-widget" style={styles.card}>
      <PressableScale style={styles.cardInner} onPress={onLaunch}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(theme.colors.brand, 18) }]}>
          <Ionicons name="shuffle" size={18} color={theme.colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>WOD aléatoire</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceTertiary }]}>
            {wodPlans.length} séance{wodPlans.length > 1 ? "s" : ""} disponible
            {wodPlans.length > 1 ? "s" : ""}
          </Text>
        </View>
        <Ionicons name="play-circle" size={22} color={theme.colors.brand} />
      </PressableScale>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontWeight: "800", fontSize: 14 },
  subtitle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
});
