import { View, Text, StyleSheet } from "react-native";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import MultiRingGauge, { innerContentDiameter } from "@/src/components/ui/MultiRingGauge";
import StatHero from "@/src/components/ui/StatHero";
import { formatHealthMetricValue } from "@/src/utils/health-metric-config";

/**
 * Zone de synthèse en tête de la fiche Sommeil — durée réelle + objectif à
 * gauche, anneau de progression (durée/objectif) à droite. Réutilise
 * `MultiRingGauge` (un seul anneau — déjà l'implémentation animée
 * Classique/Sunset commune à tout le Dashboard) plutôt qu'un nouveau tracé
 * SVG. Le pourcentage est plafonné visuellement à 100% (`Math.min`) mais la
 * durée affichée reste toujours la vraie valeur — jamais l'inverse.
 */
export default function SleepHero({
  totalSleepHours,
  targetHours,
}: {
  totalSleepHours: number | null;
  targetHours: number;
}) {
  const { theme } = useTheme();
  const hasData = totalSleepHours != null;
  const pct = hasData ? Math.max(0, Math.min(1, totalSleepHours! / targetHours)) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[styles.duration, { color: theme.colors.onSurface }]}>
          {hasData ? formatHealthMetricValue("sleep", totalSleepHours!) : "—"}
        </Text>
        <Text style={[styles.durationCaption, { color: theme.colors.onSurfaceTertiary }]}>Durée de sommeil</Text>
        <Text style={[styles.goal, { color: theme.colors.onSurfaceSecondary }]}>
          Objectif · {formatHealthMetricValue("sleep", targetHours)}
        </Text>
      </View>
      <MultiRingGauge rings={[{ pct, color: theme.colors.metricColors.sleep }]} size={128} strokeWidth={11}>
        {/* `StatHero`+`fitDiameter` — jamais une taille fixe dans un anneau
            (voir le correctif du bug de débordement des anneaux). */}
        <StatHero
          value={hasData ? Math.round(pct * 100) : 0}
          formatter={(v) => (hasData ? `${Math.round(v)}%` : "—")}
          unit="de l'objectif"
          color={theme.colors.onSurface}
          fitDiameter={innerContentDiameter(128, 11, 4, 1)}
        />
      </MultiRingGauge>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  left: { flex: 1, gap: 2 },
  duration: { fontSize: 34, fontWeight: "800" },
  durationCaption: { fontSize: 12, fontWeight: "600", marginTop: -2 },
  goal: { fontSize: 13, fontWeight: "700", marginTop: spacing.sm },
});
