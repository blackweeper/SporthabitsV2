import { useEffect, useState } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";
import { getPlans, Plan } from "@/src/utils/gym-storage";
import { pickRandomWod } from "@/src/utils/wod-random";

/**
 * Bouton principal du Dashboard — pioche un WOD au hasard parmi les séances
 * déjà sauvegardées (`p.wodSource` truthy) et le lance directement, même
 * sélection que "WOD aléatoire" dans l'onglet Entraînements (`pickRandomWod`,
 * partagé, aucune deuxième logique de tirage). Remplace l'ancien CTA
 * "Démarrer une séance" — un seul point d'accès au WOD aléatoire (avant :
 * ce widget existait ET dans la grille des programmes, en double). Autonome
 * (charge sa propre liste au montage), rendu `null` si l'utilisateur n'a
 * aucun WOD sauvegardé — jamais un bouton qui ne mène nulle part.
 */
export default function RandomWodWidget({ style }: { style?: StyleProp<ViewStyle> } = {}) {
  const router = useRouter();
  const { theme } = useTheme();
  const [wodPlans, setWodPlans] = useState<Plan[]>([]);

  useEffect(() => {
    getPlans().then((plans) => setWodPlans(plans.filter((p) => p.wodSource)));
  }, []);

  if (wodPlans.length === 0) return null;

  const color = theme.colors.data.workout;

  const onLaunch = () => {
    const chosen = pickRandomWod(wodPlans);
    if (chosen) router.push(`/workout/${chosen.id}` as any);
  };

  return (
    <GlassCard testID="random-wod-widget" level="elevated" accent={color} style={[styles.card, style]}>
      <PressableScale style={styles.inner} onPress={onLaunch}>
        <View style={[styles.iconSquare, { borderColor: withAlpha(color, 45) }]}>
          <LinearGradient
            colors={[withAlpha(color, 35), withAlpha(color, 65)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Ionicons name="shuffle" size={26} color={color} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>WOD ALÉATOIRE</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceTertiary }]}>
            {wodPlans.length} séance{wodPlans.length > 1 ? "s" : ""} disponible{wodPlans.length > 1 ? "s" : ""}
          </Text>
        </View>
        <View style={[styles.launchBadge, { backgroundColor: withAlpha(color, 20) }]}>
          <Ionicons name="play" size={16} color={color} />
        </View>
      </PressableScale>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  iconSquare: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  textBlock: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", letterSpacing: 0.4 },
  subtitle: { fontSize: 12, fontWeight: "600" },
  launchBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
