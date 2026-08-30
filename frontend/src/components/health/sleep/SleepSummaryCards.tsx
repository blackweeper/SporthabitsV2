import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, solidColor } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import { formatHealthMetricValue } from "@/src/utils/health-metric-config";
import { formatHealthTime } from "@/src/utils/health-data-storage";

type SummaryCard = { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; value: string; caption?: string };

/**
 * Bandeau de 3 mini-cartes Liquid Glass sous le hero — chaque carte n'existe
 * que si sa donnée est réellement disponible (jamais un "—" décoratif) ;
 * `flex:1` partagé équitablement, donc 1 ou 2 cartes manquantes ne cassent
 * pas l'équilibre visuel de la rangée.
 */
export default function SleepSummaryCards({
  totalSleepHours,
  inBedHours,
  efficiencyPct,
  bedTimeRaw,
}: {
  totalSleepHours: number | null;
  inBedHours: number | null;
  efficiencyPct: number | null;
  bedTimeRaw: string | null;
}) {
  const { theme } = useTheme();
  const accent = solidColor(theme.colors.metricColors.sleep);

  const cards: SummaryCard[] = [];
  if (totalSleepHours != null) {
    cards.push({
      key: "duration",
      icon: "bed-outline",
      label: "DURÉE DE SOMMEIL",
      value: formatHealthMetricValue("sleep", totalSleepHours),
      caption: bedTimeRaw ? `${formatHealthTime(bedTimeRaw)} · coucher` : undefined,
    });
  }
  if (inBedHours != null) {
    cards.push({
      key: "inbed",
      icon: "moon-outline",
      label: "TEMPS AU LIT",
      value: formatHealthMetricValue("sleep", inBedHours),
    });
  }
  if (efficiencyPct != null) {
    cards.push({
      key: "efficiency",
      icon: "sparkles-outline",
      label: "EFFICACITÉ",
      value: `${Math.round(efficiencyPct)}%`,
    });
  }

  if (cards.length === 0) return null;

  return (
    <View style={styles.row}>
      {cards.map((c) => (
        <GlassCard key={c.key} level="subtle" style={styles.card}>
          <Ionicons name={c.icon} size={16} color={accent} />
          <Text style={[styles.value, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {c.value}
          </Text>
          <Text style={[styles.label, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
            {c.label}
          </Text>
          {c.caption && (
            <Text style={[styles.caption, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
              {c.caption}
            </Text>
          )}
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  card: { flex: 1, padding: spacing.sm, gap: 3, alignItems: "flex-start" },
  value: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  label: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  caption: { fontSize: 9.5, fontWeight: "600" },
});
