import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import { useHealthRecommendation } from "@/src/hooks/useHealthRecommendation";
import { HealthRecommendation } from "@/src/utils/health-recommendation";

const LEVEL_ICON: Record<HealthRecommendation["level"], keyof typeof Ionicons.glyphMap> = {
  light: "leaf",
  moderate: "walk",
  intense: "flame",
};

/**
 * Résumé sommeil/FC repos/VFC + recommandation d'intensité — autonome (son
 * propre chargement + abonnement `subscribeHealthDataChanged`), rendu `null`
 * proprement tant qu'aucune donnée de santé n'a encore été importée.
 */
export default function HealthRecommendationCard() {
  const { theme } = useTheme();
  const rec = useHealthRecommendation();

  if (!rec) return null;

  const levelColor: Record<HealthRecommendation["level"], string> = {
    light: theme.colors.warning,
    moderate: theme.colors.info,
    intense: theme.colors.success,
  };
  const color = levelColor[rec.level];

  return (
    <GlassCard style={styles.card} testID="health-recommendation-card">
      <View style={styles.headRow}>
        <Ionicons name={LEVEL_ICON[rec.level]} size={14} color={color} />
        <Text style={[styles.label, { color: theme.colors.onSurfaceTertiary }]}>RECOMMANDATION DU JOUR</Text>
      </View>
      <Text style={[styles.title, { color }]}>{rec.title}</Text>
      <Text style={[styles.message, { color: theme.colors.onSurfaceSecondary }]}>{rec.message}</Text>
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
    gap: 4,
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  title: { fontSize: 15, fontWeight: "800" },
  message: { fontSize: 12, lineHeight: 17 },
});
