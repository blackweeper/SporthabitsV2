import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, withAlpha } from "@/src/theme";
import TimerCircle from "@/src/components/TimerCircle";
import CompositeExerciseImage from "@/src/components/CompositeExerciseImage";
import { ExerciseRecord } from "@/src/utils/exercise-records";

/**
 * Contenu de l'overlay "en direct" — affichage riche de l'exercice/reps/
 * consignes en cours + transition automatique (gérée par l'appelant,
 * `app/workout/[id].tsx`, qui reste seul propriétaire de la state machine du
 * timer). Rendu à l'intérieur du même `Modal`/sheet que le timer historique.
 * Généralisé depuis l'ancien `EmomLiveOverlay` (EMOM uniquement) pour couvrir
 * aussi AMRAP et For Time — même présentation, seul l'`eyebrow` (libellé
 * d'en-tête) et le `stepper` (compteur de tours) changent par variante.
 */
export default function ExerciseLiveOverlay({
  variant,
  eyebrow,
  accentColor,
  exerciseName,
  targetReps,
  notes,
  remaining,
  total,
  thumbnailSource,
  compositeItems,
  records,
  stepper,
  onAddTime,
  onSkip,
}: {
  variant: "emom" | "amrap" | "for_time";
  eyebrow: string;
  /** Couleur d'accent (timer, libellé, note) — fournie par l'appelant
   * (`theme.colors.data.workout`, identité WOD partagée avec Entraînements/
   * Dashboard) plutôt que codée en dur ici, même patron que `TimerCircle`. */
  accentColor: string;
  exerciseName: string;
  targetReps?: string | null;
  notes?: string | null;
  remaining: number;
  total: number;
  thumbnailSource?: ImageSourcePropType | null;
  /** Segments d'un exercice composite (AMRAP/For Time à plusieurs
   * mouvements) — quand présent (≥2 segments), remplace `thumbnailSource`
   * par le montage multi-panneaux (mêmes mini-photos que l'écran principal)
   * au lieu d'une vignette unique qui ne peut résoudre aucune image pour un
   * nom composite complet. */
  compositeItems?: string[] | null;
  records?: ExerciseRecord[];
  stepper?: React.ReactNode;
  onAddTime: (sec: number) => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.wrap} testID="exercise-live-overlay">
      <Text style={[styles.eyebrow, { color: accentColor }]}>{eyebrow}</Text>

      <Text style={styles.exerciseName} numberOfLines={2}>
        {exerciseName}
      </Text>
      {!!targetReps && (
        <Text style={styles.targetReps}>{targetReps}</Text>
      )}

      {compositeItems && compositeItems.length >= 2 ? (
        <View style={styles.compositeThumbWrap}>
          <CompositeExerciseImage items={compositeItems} records={records ?? []} compact showLabel={false} />
        </View>
      ) : (
        thumbnailSource && (
          <Image source={thumbnailSource} style={styles.thumb} resizeMode="contain" />
        )
      )}

      <TimerCircle remaining={remaining} total={Math.max(1, total)} color={accentColor} />

      {!!notes && (
        <View style={[styles.notesBox, { backgroundColor: withAlpha(accentColor, 12) }]}>
          <Ionicons name="information-circle" size={14} color={accentColor} />
          <Text style={styles.notesText}>{notes}</Text>
        </View>
      )}

      {stepper}

      <View style={styles.ctlRow}>
        <Pressable testID="live-overlay-minus" style={styles.ctl} onPress={() => onAddTime(-15)}>
          <Text style={styles.ctlText}>-15s</Text>
        </Pressable>
        <Pressable testID="live-overlay-plus" style={styles.ctl} onPress={() => onAddTime(15)}>
          <Text style={styles.ctlText}>+15s</Text>
        </Pressable>
      </View>
      <Pressable testID="live-overlay-skip" style={styles.skipBtn} onPress={onSkip}>
        <Ionicons name="checkmark-done" size={18} color="#fff" />
        <Text style={styles.skipText}>TERMINER</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.md },
  compositeThumbWrap: { width: "100%", paddingHorizontal: spacing.lg },
  eyebrow: {
    fontWeight: "800",
    letterSpacing: 2,
    fontSize: 12,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  exerciseName: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 26,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  targetReps: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 16,
    marginTop: -spacing.sm,
  },
  notesBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    maxWidth: "100%",
  },
  notesText: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    flex: 1,
  },
  ctlRow: { flexDirection: "row", gap: spacing.md },
  ctl: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  ctlText: { color: colors.onSurface, fontWeight: "800", letterSpacing: 0.5 },
  skipBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl2,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  skipText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
});
