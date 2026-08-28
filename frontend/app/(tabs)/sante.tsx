import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import { SUNSET_BAR_HEIGHT, SUNSET_BAR_MARGIN } from "@/src/utils/tab-bar-metrics";
import GlassCard from "@/src/components/ui/GlassCard";
import { getMeasurements, getProfile, Measurement, UserProfile } from "@/src/utils/gym-storage";
import { useHealthDashboardData } from "@/src/hooks/useHealthDashboardData";
import HealthScoreCard, { RecoverySummary } from "@/src/components/health/HealthScoreCard";
import HealthMetricGrid from "@/src/components/health/HealthMetricGrid";
import TodayActivityCard from "@/src/components/health/TodayActivityCard";
import MeasurementsCard from "@/src/components/health/MeasurementsCard";

/**
 * IRONFLOW HEALTH & RECOVERY CENTER — hub Santé, entre Bibliothèque et
 * Évolution dans la barre d'onglets. L'anneau de récupération (`HealthScoreCard`)
 * est un élément visuel autonome posé directement sur l'Aurora — pas dans
 * une carte — pour rester le point focal de l'écran ; le texte qualitatif
 * et les 5 indicateurs (`RecoverySummary`/`HealthMetricGrid`) vivent juste
 * en dessous dans UNE grande surface Glass. Ordre : Récupération → Aujourd'hui
 * → Mesurations. Fond global partagé (`ThemedBackground`, pas de fond
 * spécifique à cet écran), même patron de montage par écran que
 * Dashboard/`/day-detail`/Mon évolution.
 */
export default function SanteScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const health = useHealthDashboardData();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const reload = useCallback(async () => {
    const [m, p] = await Promise.all([getMeasurements(), getProfile()]);
    setMeasurements(m);
    setProfile(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface },
        ]}
        edges={["top"]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Santé</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scroll,
            // Sous Sunset, la barre d'onglets flotte en `position:"absolute"`
            // par-dessus le contenu (voir `_layout.tsx`) — sans ce padding
            // supplémentaire, le dernier élément (bouton "Ajouter une
            // mesure") reste caché derrière elle même une fois le scroll
            // arrivé à sa position maximale réelle (pas un vrai blocage du
            // scroll, mais perçu comme tel). Classique n'a pas ce problème
            // (barre non flottante, déjà prise en compte par la navigation).
            theme.background.mode === "gradient" && { paddingBottom: SUNSET_BAR_MARGIN + SUNSET_BAR_HEIGHT + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* L'anneau reste un élément visuel autonome, posé directement sur
              l'Aurora — pas dans la carte ci-dessous, qui ne porte plus que
              le texte qualitatif et la liste d'indicateurs. */}
          <HealthScoreCard recovery={health.recovery} />

          <GlassCard
            level="elevated"
            style={[
              styles.heroCard,
              {
                borderRadius: theme.radius.lg,
                backgroundColor: theme.card.mode === "flat" ? theme.colors.surfaceSecondary : undefined,
                borderColor: theme.colors.border,
                borderWidth: theme.card.mode === "flat" ? StyleSheet.hairlineWidth : undefined,
              },
            ]}
          >
            <RecoverySummary recovery={health.recovery} />
            <View style={[styles.heroDivider, { backgroundColor: theme.colors.divider }]} />
            <HealthMetricGrid
              sleepHours={health.sleepHours}
              sleepAvg7d={health.sleepAvg7d}
              hrv={health.hrv}
              hrvAvg7d={health.hrvAvg7d}
              restingHr={health.restingHr}
              restingHrAvg7d={health.restingHrAvg7d}
              respiratoryRate={health.respiratoryRate}
              respiratoryRateAvg7d={health.respiratoryRateAvg7d}
              spo2={health.spo2}
              spo2Avg7d={health.spo2Avg7d}
            />
          </GlassCard>

          <TodayActivityCard
            steps={health.steps}
            distanceKm={health.distanceKm}
            exerciseMinutes={health.exerciseMinutes}
            sleepHours={health.sleepHours}
            lastSyncedAt={health.lastSyncedAt}
          />

          <MeasurementsCard measurements={measurements} profile={profile} router={router} onChanged={reload} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: "800" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl3, gap: spacing.lg },
  heroCard: { padding: 18 },
  heroDivider: { height: StyleSheet.hairlineWidth, marginBottom: 2 },
});
