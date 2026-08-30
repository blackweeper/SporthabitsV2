import { View, Text, StyleSheet } from "react-native";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import { HealthMetricSample } from "@/src/utils/health-data-storage";

function normalize(v: number): number {
  return v <= 1 ? v * 100 : v;
}

/**
 * "OXYGÉNATION PENDANT LE SOMMEIL" — uniquement les échantillons SpO2 dont
 * l'horodatage RÉEL tombe dans la fenêtre de sommeil de cette nuit
 * (`getNocturnalSpo2Samples`, filtré par timestamp réel, jamais par une
 * plage horaire devinée) — distinct de la moyenne générale déjà affichée
 * sous "Oxygénation sanguine" ailleurs dans Santé (voir §14 du brief : ne
 * jamais confondre les deux). Masquée si aucune mesure nocturne réelle.
 */
export default function SleepSpo2Section({ samples }: { samples: HealthMetricSample[] }) {
  const { theme } = useTheme();
  const values = samples.map((s) => normalize(s.qty!));
  if (values.length === 0) return null;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>OXYGÉNATION PENDANT LE SOMMEIL</Text>
      <GlassCard level="card" style={styles.card}>
        <Stat label="Moyenne" value={avg} color={theme.colors.onSurface} />
        <View style={[styles.sep, { backgroundColor: theme.colors.divider }]} />
        <Stat label="Minimum" value={min} color={theme.colors.error} />
        <View style={[styles.sep, { backgroundColor: theme.colors.divider }]} />
        <Stat label="Maximum" value={max} color={theme.colors.success} />
      </GlassCard>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{Math.round(value)}%</Text>
      <Text style={[styles.statLabel, { color: theme.colors.onSurfaceTertiary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  card: { flexDirection: "row", alignItems: "center", padding: spacing.md },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 17, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "700" },
  sep: { width: 1, height: 30 },
});
