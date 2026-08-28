import { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import { useLibraryUpdate, UpdateStep } from "@/src/hooks/useLibraryUpdate";

const STEPS: UpdateStep[] = ["downloading", "validating", "merging", "finalizing"];

const STEP_LABEL: Record<UpdateStep, string> = {
  checking: "Vérification…",
  downloading: "Téléchargement de la bibliothèque…",
  validating: "Analyse et validation des données…",
  merging: "Nettoyage et fusion…",
  finalizing: "Finalisation…",
};

export default function ExerciseLibraryUpdateScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const { phase, progress, report, error, runUpdate, cancel, reset } = useLibraryUpdate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runUpdate();
  }, [runUpdate]);

  const stepIndex = progress ? STEPS.indexOf(progress.step) : 0;
  const stepFraction =
    progress && progress.total > 0 ? progress.processed / progress.total : 0;
  const overallPct = Math.min(
    100,
    Math.round(((Math.max(0, stepIndex) + stepFraction) / STEPS.length) * 100),
  );

  const onCancel = () => {
    cancel();
    router.back();
  };

  const onRetry = () => {
    reset();
    started.current = false;
    setTimeout(() => {
      started.current = true;
      runUpdate();
    }, 0);
  };

  const inProgress = phase !== "done" && phase !== "error" && phase !== "idle";

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface },
        ]}
        edges={["top", "bottom"]}
      >
      <View style={styles.header}>
        <Text style={styles.title}>
          {phase === "done"
            ? "Mise à jour terminée"
            : phase === "error"
              ? "Échec de la mise à jour"
              : "Mise à jour de la bibliothèque"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {inProgress && (
          <>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${overallPct}%` }]} />
            </View>
            <Text style={styles.stepLabel}>
              {progress ? STEP_LABEL[progress.step] : "Préparation…"}
            </Text>
            {progress && progress.total > 1 && (
              <Text style={styles.stepCount}>
                {progress.processed} / {progress.total} exercices traités
              </Text>
            )}
            <Pressable testID="cancel-library-update" style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>ANNULER</Text>
            </Pressable>
          </>
        )}

        {phase === "error" && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={32} color={theme.colors.error} />
            <Text style={styles.errorTitle}>La mise à jour a échoué</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Text style={styles.errorHint}>
              Ta bibliothèque actuelle n&apos;a pas été modifiée.
            </Text>
            <View style={styles.errorActions}>
              <Pressable testID="retry-library-update" style={styles.ctaFull} onPress={onRetry}>
                <Ionicons name="refresh" size={16} color={theme.card.mode === "glass" ? theme.colors.brand : "#fff"} />
                <Text style={styles.ctaFullText}>RÉESSAYER</Text>
              </Pressable>
              <Pressable
                testID="back-from-library-update"
                style={styles.backBtn}
                onPress={() => router.back()}
              >
                <Text style={styles.backBtnText}>RETOUR</Text>
              </Pressable>
            </View>
          </View>
        )}

        {phase === "done" && report && (
          <>
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={40} color={theme.colors.success} />
              <Text style={styles.successTitle}>Bibliothèque mise à jour</Text>
            </View>

            <View style={styles.kpiGrid}>
              <KpiBox icon="add-circle" value={report.addedCount} label="Nouveaux exercices" />
              <KpiBox icon="swap-horizontal" value={report.replacedCount} label="Remplacés" />
              <KpiBox icon="refresh-circle" value={report.updatedCount} label="Mis à jour" />
              <KpiBox
                icon="shield-checkmark"
                value={report.unmatchedExistingKept + report.totalCustomKept}
                label="Conservés"
              />
              <KpiBox icon="copy" value={report.duplicatesSkipped} label="Doublons ignorés" />
              <KpiBox icon="warning" value={report.warnings.length} label="Anomalies" />
            </View>

            {report.warnings.length > 0 && (
              <View style={styles.warningsBox}>
                <Text style={styles.warningsTitle}>Anomalies détectées</Text>
                {report.warnings.map((w, i) => (
                  <Text key={i} style={styles.warningLine}>
                    • {w}
                  </Text>
                ))}
              </View>
            )}

            {report.possibleMatches.length > 0 && (
              <View style={styles.warningsBox}>
                <Text style={styles.warningsTitle}>Correspondances possibles (à confirmer)</Text>
                {report.possibleMatches.map((m, i) => (
                  <Text key={i} style={styles.warningLine}>
                    • &quot;{m.systemName}&quot; ≈ &quot;{m.candidateName}&quot; ({Math.round(m.score * 100)}%)
                  </Text>
                ))}
              </View>
            )}

            <Pressable testID="done-library-update" style={styles.ctaFull} onPress={() => router.back()}>
              <Text style={styles.ctaFullText}>TERMINER</Text>
            </Pressable>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function KpiBox({ icon, value, label }: { icon: any; value: number; label: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  return (
    <View style={styles.kpiBox}>
      <Ionicons name={icon} size={14} color={theme.colors.brand} />
      <Text style={styles.kpiVal}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function buildStyles(theme: Theme) {
  const { colors, radius } = theme;
  const isGlass = theme.card.mode === "glass";
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
    marginTop: spacing.lg,
  },
  progressFill: { height: "100%", backgroundColor: colors.brand, borderRadius: 3 },
  stepLabel: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: spacing.lg,
  },
  stepCount: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  cancelBtn: { alignSelf: "center", marginTop: spacing.xl, padding: spacing.sm },
  cancelBtnText: { color: colors.onSurfaceTertiary, fontWeight: "700", fontSize: 12 },
  errorBox: { alignItems: "center", gap: 8, marginTop: spacing.xl },
  errorTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  errorMessage: { color: colors.onSurfaceSecondary, fontSize: 13, textAlign: "center" },
  errorHint: { color: colors.onSurfaceTertiary, fontSize: 12, textAlign: "center", marginBottom: spacing.md },
  errorActions: { flexDirection: "row", gap: spacing.sm, width: "100%" },
  successBox: { alignItems: "center", gap: 8 },
  successTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.md },
  kpiBox: {
    width: "31%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    alignItems: "flex-start",
  },
  kpiVal: { color: colors.onSurface, fontSize: 18, fontWeight: "800", marginTop: 4 },
  kpiLabel: { color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "600" },
  warningsBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  warningsTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 12, marginBottom: 4 },
  warningLine: { color: colors.onSurfaceTertiary, fontSize: 11, lineHeight: 16 },
  ctaFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: isGlass ? withAlpha(colors.brand, 18) : colors.brand,
    padding: spacing.md,
    borderRadius: radius.md,
    flex: 1,
  },
  ctaFullText: { color: isGlass ? colors.brand : "#fff", fontWeight: "800", letterSpacing: 1 },
  backBtn: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  backBtnText: { color: colors.onSurfaceSecondary, fontWeight: "800", letterSpacing: 1 },
  });
}
