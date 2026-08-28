import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { coloredShadow, motion, solidColor, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import MultiRingGauge from "@/src/components/ui/MultiRingGauge";
import { RecoveryScoreResult } from "@/src/utils/health-recovery-score";

/**
 * L'anneau de récupération + son texte qualitatif (bande/conseil/note) —
 * élément visuel autonome, posé directement sur l'Aurora (pas de
 * `GlassCard`), au-dessus du rectangle Glass qui ne contient plus, lui, que
 * les 5 données vitales (`HealthMetricGrid`, montée séparément par
 * `sante.tsx`). Le rectangle "données" ne doit jamais porter de texte de
 * recommandation — c'est ce bloc-ci qui en a la charge, à côté de l'anneau
 * dont il est la lecture qualitative directe. `recovery: null`/
 * `recovery.score: null` affiche un état honnête plutôt qu'un chiffre
 * inventé.
 */
export default function HealthScoreCard({ recovery }: { recovery: RecoveryScoreResult | null }) {
  const { theme } = useTheme();
  const ringColor = theme.card.mode === "glass" ? ([theme.colors.brand, theme.colors.info] as [string, string]) : theme.colors.brand;
  const accent = solidColor(ringColor);
  const pct = recovery?.score != null ? recovery.score / 100 : 0;

  return (
    <Animated.View entering={FadeIn.duration(motion.slow)} style={styles.wrap}>
      <Text style={[styles.eyebrow, { color: theme.colors.onSurface }]}>RÉCUPÉRATION</Text>

      <View style={styles.ringZone}>
        {theme.card.mode === "glass" && (
          <View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                backgroundColor: withAlpha(accent, 14),
                ...coloredShadow(accent, { offsetY: 0, opacity: 0.35, radius: 34, elevation: 0 }),
              },
            ]}
          />
        )}
        <MultiRingGauge rings={[{ pct, color: ringColor }]} size={158} strokeWidth={12} ringFill={theme.ringFill}>
          <Text style={[styles.scoreValue, { color: theme.colors.onSurface }]}>{recovery?.score ?? "—"}</Text>
          <Text style={[styles.scoreOutOf, { color: theme.colors.onSurfaceTertiary }]}>/ 100</Text>
        </MultiRingGauge>
      </View>

      <Text style={[styles.band, { color: accent }]}>{recovery?.bandLabel ?? "DONNÉES INSUFFISANTES"}</Text>
      <Text style={[styles.advice, { color: theme.colors.onSurfaceSecondary }]}>
        {recovery?.advice ?? "Pas assez de données santé pour calculer ta récupération aujourd'hui."}
      </Text>
      {recovery?.partial && recovery.score != null && (
        <Text style={[styles.note, { color: theme.colors.onSurfaceTertiary }]}>Score partiel — certaines données manquent aujourd'hui.</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 4, paddingBottom: 4 },
  eyebrow: { fontSize: 14, fontWeight: "800", letterSpacing: 1, marginBottom: 18 },
  ringZone: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 130, height: 130, borderRadius: 65 },
  scoreValue: { fontSize: 44, fontWeight: "800", letterSpacing: -1 },
  scoreOutOf: { fontSize: 11, fontWeight: "600", marginTop: -2, letterSpacing: 0.5 },
  band: { fontSize: 15, fontWeight: "800", letterSpacing: 1.2, marginTop: 20 },
  advice: { fontSize: 13.5, lineHeight: 20, textAlign: "center", maxWidth: 300, marginTop: 8 },
  note: { fontSize: 10.5, fontStyle: "italic", marginTop: 8 },
});
