import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, solidColor, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import { formatHealthMetricValue } from "@/src/utils/health-metric-config";

/** Feedback de bien-être calculé à partir des vraies données (durée vs
 * objectif, part de sommeil profond) — jamais un diagnostic médical, un seul
 * texte court et positif/neutre. Masquée si `totalSleepHours` est absent
 * (rien à commenter sans donnée réelle). */
export default function SleepInsightCard({
  totalSleepHours,
  targetHours,
  deepHours,
  totalStagesHours,
}: {
  totalSleepHours: number | null;
  targetHours: number;
  deepHours: number | null;
  /** Somme réelle profond+léger+REM+éveil (pour le % de sommeil profond) —
   * distincte de `totalSleepHours` (peut légèrement diverger selon la
   * source), passée explicitement plutôt que recalculée ici. */
  totalStagesHours: number | null;
}) {
  const { theme } = useTheme();
  if (totalSleepHours == null) return null;

  const diffMin = Math.round((targetHours - totalSleepHours) * 60);
  let base: string;
  if (diffMin <= 0) {
    base = `Tu as dormi ${formatHealthMetricValue("sleep", totalSleepHours)} cette nuit — objectif atteint.`;
  } else if (diffMin <= 30) {
    base = `Tu as dormi ${formatHealthMetricValue("sleep", totalSleepHours)} cette nuit, tu es proche de ton objectif de ${formatHealthMetricValue("sleep", targetHours)}.`;
  } else {
    base = `Tu as dormi ${formatHealthMetricValue("sleep", totalSleepHours)} cette nuit. Il te manque ${diffMin} min pour atteindre ton objectif de ${formatHealthMetricValue("sleep", targetHours)}.`;
  }

  const deepPct = deepHours != null && totalStagesHours != null && totalStagesHours > 0 ? (deepHours / totalStagesHours) * 100 : null;
  const addendum = deepPct != null && deepPct >= 15 ? ` Bon sommeil profond (${Math.round(deepPct)}%).` : null;

  const accent = solidColor(theme.colors.metricColors.sleep);

  return (
    <GlassCard level="subtle" style={styles.card}>
      <View style={[styles.iconBadge, { backgroundColor: withAlpha(accent, 16) }]}>
        <Ionicons name="moon" size={16} color={accent} />
      </View>
      <Text style={[styles.text, { color: theme.colors.onSurfaceSecondary }]}>
        {base}
        {addendum}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md },
  iconBadge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, fontSize: 12.5, fontWeight: "600", lineHeight: 18 },
});
