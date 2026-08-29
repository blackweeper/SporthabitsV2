import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { solidColor } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { RingColor } from "@/src/themes/types";
import { HealthMetricKey } from "@/src/utils/health-metric-config";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";

/** Formatte l'ancienneté de la dernière synchro Health Auto Export — jamais
 * un faux "temps réel" si la source n'en fournit pas (voir
 * `useHealthDashboardData`/`getHealthSyncState`, qui reflète la vraie
 * dernière synchro, silencieuse ou manuelle). */
function relativeFreshness(lastSyncedAt: string | null): string | null {
  if (!lastSyncedAt) return null;
  const mins = Math.round((Date.now() - new Date(lastSyncedAt).getTime()) / 60000);
  if (mins < 1) return "Mis à jour à l'instant";
  if (mins < 60) return `Mis à jour il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Mis à jour il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `Mis à jour il y a ${days} j`;
}

function formatSleep(hours: number | null): string {
  const h = Math.floor(hours ?? 0);
  const m = Math.round(((hours ?? 0) - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

/** Chaque tuile navigue vers `/health-metric/[key]` (vue détaillée avec
 * historique 7j/1m/6m/1a) — auparavant ces 4 widgets n'étaient pas
 * cliquables du tout malgré une route de détail déjà fonctionnelle pour
 * d'autres métriques (voir le brief "Pas/Distance/Sommeil cliquables"). */
function Widget({
  icon,
  color,
  value,
  label,
  metricKey,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: RingColor;
  value: string;
  label: string;
  metricKey: HealthMetricKey;
  testID?: string;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const accent = solidColor(color);
  return (
    <PressableScale
      testID={testID}
      style={styles.widgetPress}
      onPress={() => router.push({ pathname: "/health-metric/[key]", params: { key: metricKey } })}
    >
      <GlassCard
        level="subtle"
        style={[
          styles.widget,
          {
            borderRadius: theme.radius.lg,
            backgroundColor: theme.card.mode === "flat" ? theme.colors.surfaceSecondary : undefined,
            borderColor: theme.colors.border,
            borderWidth: theme.card.mode === "flat" ? StyleSheet.hairlineWidth : undefined,
          },
        ]}
      >
        <Ionicons name={icon} size={16} color={accent} />
        <Text style={[styles.widgetValue, { color: theme.colors.onSurface }]}>{value}</Text>
        <Text style={[styles.widgetLabel, { color: theme.colors.onSurfaceTertiary }]}>{label}</Text>
      </GlassCard>
    </PressableScale>
  );
}

/**
 * "Aujourd'hui" — 4 widgets individuels (Pas/Distance/Calories actives/
 * Sommeil) en grille 2×2, toujours visibles même sans donnée (affiche "0"
 * plutôt que de masquer le widget — jamais un état vide surprenant, juste
 * une valeur neutre honnête). "Exercice" (minutes) remplacé par "Calories
 * actives" — `apple_exercise_time` n'a jamais été reçu sur un vrai payload
 * Health Auto Export inspecté (toujours 0, indiscernable d'une vraie donnée
 * "0 min"), alors que `active_energy` a des milliers d'échantillons réels.
 */
export default function TodayActivityCard({
  steps,
  distanceKm,
  activeCalories,
  sleepHours,
  lastSyncedAt,
}: {
  steps: number;
  distanceKm: number;
  activeCalories: number;
  sleepHours: number | null;
  lastSyncedAt: string | null;
}) {
  const { theme } = useTheme();
  const freshness = relativeFreshness(lastSyncedAt);

  return (
    <View style={{ gap: 10 }}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>AUJOURD&apos;HUI</Text>
      <View style={styles.grid}>
        <Widget
          testID="today-widget-steps"
          icon="footsteps"
          color={theme.colors.metricColors.steps}
          value={Math.round(steps).toLocaleString("fr-FR")}
          label="Pas"
          metricKey="steps"
        />
        <Widget
          testID="today-widget-distance"
          icon="navigate"
          color={theme.colors.info}
          value={`${distanceKm.toFixed(1)} km`}
          label="Distance"
          metricKey="walkingDistance"
        />
        <Widget
          testID="today-widget-calories"
          icon="flame"
          color={theme.colors.metricColors.caloriesBurn}
          value={`${Math.round(activeCalories)} kcal`}
          label="Calories actives"
          metricKey="activeCalories"
        />
        <Widget
          testID="today-widget-sleep"
          icon="moon"
          color={theme.colors.metricColors.sleep}
          value={formatSleep(sleepHours)}
          label="Sommeil"
          metricKey="sleep"
        />
      </View>
      {freshness && <Text style={[styles.freshness, { color: theme.colors.onSurfaceTertiary }]}>{freshness}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  widgetPress: { width: "48%" },
  widget: { padding: 14, gap: 6, alignItems: "flex-start" },
  widgetValue: { fontSize: 19, fontWeight: "800" },
  widgetLabel: { fontSize: 10.5, letterSpacing: 0.3 },
  freshness: { fontSize: 10 },
});
