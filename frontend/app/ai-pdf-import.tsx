import { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import Card from "@/src/components/ui/Card";
import { saveCustomProgram } from "@/src/utils/gym-storage";
import { getExerciseRecords } from "@/src/utils/exercise-records";
import { buildExerciseIndex, matchExercise } from "@/src/utils/exercise-matching";
import { pdfAnalysisToProgram } from "@/src/utils/pdf-analysis-to-program";
import {
  uploadPdf,
  analyzePdf,
  markDraftValidated,
  PdfImportConfigError,
  PdfImportApiError,
  PdfAnalysisResult,
  PickedPdfFile,
} from "@/src/utils/pdf-import-api";

type Phase = "idle" | "busy" | "preview" | "error";

function confidenceColor(theme: Theme, confidence: "high" | "medium" | "low"): string {
  if (confidence === "high") return theme.colors.success;
  if (confidence === "medium") return theme.colors.warning;
  return theme.colors.error;
}

function confidenceLabel(confidence: "high" | "medium" | "low"): string {
  if (confidence === "high") return "élevée";
  if (confidence === "medium") return "moyenne";
  return "faible";
}

function countExercises(analysis: PdfAnalysisResult): number {
  let n = 0;
  for (const week of analysis.program.weeks) for (const day of week.days) n += day.exercises.length;
  return n;
}

function countDays(analysis: PdfAnalysisResult): number {
  let n = 0;
  for (const week of analysis.program.weeks) n += week.days.length;
  return n;
}

/**
 * Écran d'import de programme depuis un PDF via analyse IA (backend
 * routers/pdf_import.py). Suit le même pipeline que program-import.tsx
 * (import texte) une fois l'analyse récupérée : conversion en Program
 * (pdf-analysis-to-program.ts) → auto-link exact/alias → saveCustomProgram
 * → écran de revue (import-review/[id].tsx) si des exercices restent
 * ambigus, sinon directement la fiche programme.
 *
 * "ANALYSE ≠ IMPORT" (voir backend/AI_PDF_IMPORT_README.md) : l'analyse
 * IA est montrée en aperçu (confiance, avertissements, informations
 * manquantes, ambiguïtés) avant que quoi que ce soit ne soit enregistré —
 * l'utilisateur confirme explicitement avec "IMPORTER CE PROGRAMME".
 */
export default function AiPdfImportScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();

  const [file, setFile] = useState<PickedPdfFile | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PdfAnalysisResult | null>(null);
  const [saving, setSaving] = useState(false);

  const pickFile = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFile({ uri: asset.uri, name: asset.name ?? "programme.pdf", webFile: asset.file });
    setPhase("idle");
    setAnalysis(null);
    setDraftId(null);
  };

  const runAnalysis = async () => {
    if (!file) return;
    setError(null);
    setPhase("busy");
    try {
      setBusyLabel("Envoi du PDF…");
      const upload = await uploadPdf(file);
      if (upload.needs_ocr) {
        throw new Error(
          "Ce PDF ne contient pas de texte exploitable (probablement un scan). L'OCR n'est pas encore pris en charge — essaie un export texte du programme, ou colle-le directement.",
        );
      }
      setDraftId(upload.draft_id);

      setBusyLabel("Analyse IA en cours…");
      const analyzed = await analyzePdf(upload.draft_id);
      if (!analyzed.analysis) throw new Error("L'IA n'a renvoyé aucune analyse exploitable.");

      setAnalysis(analyzed.analysis);
      setPhase("preview");
    } catch (err) {
      const message =
        err instanceof PdfImportConfigError || err instanceof PdfImportApiError || err instanceof Error
          ? err.message
          : "Erreur inattendue pendant l'analyse.";
      setError(message);
      setPhase("error");
    }
  };

  const confirmImport = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      const program = pdfAnalysisToProgram(analysis);

      // Même logique d'auto-link que program-import.tsx : seuls les matches
      // exact/alias sont appliqués automatiquement, jamais un fuzzy — voir
      // exercise-matching.ts.
      const records = await getExerciseRecords();
      const index = buildExerciseIndex(records);
      let autoLinked = 0;
      let needsReview = 0;
      for (const day of program.days) {
        for (const session of day.sessions) {
          for (const exercise of session.exercises) {
            const result = matchExercise(exercise.name, index);
            if (result.status === "exact" || result.status === "alias") {
              exercise.exerciseRecordId = result.exerciseRecordId;
              exercise.matchConfidence = result.status;
              autoLinked += 1;
            } else {
              exercise.matchConfidence = result.status === "fuzzy" ? "fuzzy" : "unmatched";
              needsReview += 1;
            }
          }
        }
      }

      await saveCustomProgram(program);
      if (draftId) await markDraftValidated(draftId);

      if (needsReview > 0) {
        router.replace(`/import-review/${program.id}?autoLinked=${autoLinked}` as any);
      } else {
        const params = new URLSearchParams({ linked: String(autoLinked), created: "0", toReview: "0" });
        router.replace(`/custom-program/${program.id}?${params.toString()}` as any);
      }
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setDraftId(null);
    setError(null);
    setPhase("idle");
  };

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
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Importer un PDF</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hintCard}>
            <Ionicons name="information-circle" size={14} color={theme.colors.brand} />
            <Text style={styles.hintText}>
              Choisis un PDF de programme d&apos;entraînement. Une IA l&apos;analyse pour en extraire
              la structure (séances, exercices, séries) — elle ne complète ni n&apos;invente rien : ce
              qui manque dans le PDF reste vide, à toi de le corriger juste après.
            </Text>
          </View>

          <Text style={styles.miniLabel}>Fichier PDF</Text>
          <Pressable
            testID="ai-pdf-import-pick"
            style={styles.pickBtn}
            onPress={pickFile}
            disabled={phase === "busy" || saving}
          >
            <Ionicons name="document-text-outline" size={18} color={theme.colors.brand} />
            <Text style={styles.pickBtnText} numberOfLines={1}>
              {file ? file.name : "Choisir un PDF…"}
            </Text>
          </Pressable>

          {phase !== "preview" && (
            <Pressable
              testID="ai-pdf-import-analyze"
              style={[styles.analyzeBtn, (!file || phase === "busy") && { opacity: 0.5 }]}
              onPress={runAnalysis}
              disabled={!file || phase === "busy"}
            >
              {phase === "busy" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="sparkles" size={16} color="#fff" />
              )}
              <Text style={styles.analyzeBtnText}>{phase === "busy" ? busyLabel : "ANALYSER LE PDF"}</Text>
            </Pressable>
          )}

          {error && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {phase === "preview" && analysis && (
            <View style={styles.previewSection}>
              <Card style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle} numberOfLines={2}>
                    {analysis.program.name}
                  </Text>
                  <View
                    style={[
                      styles.confidenceBadge,
                      { backgroundColor: withAlpha(confidenceColor(theme, analysis.confidence), 18) },
                    ]}
                  >
                    <Text style={[styles.confidenceBadgeText, { color: confidenceColor(theme, analysis.confidence) }]}>
                      Confiance {confidenceLabel(analysis.confidence)}
                    </Text>
                  </View>
                </View>

                {!!analysis.program.description && (
                  <Text style={styles.previewDescription}>{analysis.program.description}</Text>
                )}

                <Text style={styles.previewStat}>
                  {countExercises(analysis)} exercice{countExercises(analysis) > 1 ? "s" : ""} sur{" "}
                  {countDays(analysis)} jour{countDays(analysis) > 1 ? "s" : ""}
                  {analysis.program.duration_weeks ? ` · ${analysis.program.duration_weeks} semaine(s)` : ""}
                </Text>

                {analysis.warnings.length > 0 && (
                  <View style={styles.noteBlock}>
                    <Text style={styles.noteTitle}>Avertissements IA</Text>
                    {analysis.warnings.map((w, i) => (
                      <Text key={i} style={styles.noteText}>
                        • {w}
                      </Text>
                    ))}
                  </View>
                )}

                {analysis.missing_info.length > 0 && (
                  <View style={styles.noteBlock}>
                    <Text style={styles.noteTitle}>Informations manquantes dans le PDF</Text>
                    {analysis.missing_info.map((info, i) => (
                      <Text key={i} style={styles.noteText}>
                        • {info}
                      </Text>
                    ))}
                  </View>
                )}

                {analysis.ambiguities.length > 0 && (
                  <View style={styles.noteBlock}>
                    <Text style={styles.noteTitle}>Ambiguïtés à vérifier</Text>
                    {analysis.ambiguities.map((a, i) => (
                      <Text key={i} style={styles.noteText}>
                        • {a.exercise_name} — {a.reason}
                      </Text>
                    ))}
                  </View>
                )}
              </Card>

              <Pressable
                testID="ai-pdf-import-confirm"
                style={[styles.analyzeBtn, saving && { opacity: 0.5 }]}
                onPress={confirmImport}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={16} color="#fff" />}
                <Text style={styles.analyzeBtnText}>{saving ? "IMPORT…" : "IMPORTER CE PROGRAMME"}</Text>
              </Pressable>
              <Pressable testID="ai-pdf-import-restart" style={styles.secondaryBtn} onPress={reset} disabled={saving}>
                <Text style={styles.secondaryBtnText}>Choisir un autre PDF</Text>
              </Pressable>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function buildStyles(theme: Theme) {
  const { colors, radius } = theme;
  const isGlass = theme.card.mode === "glass";
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
    },
    title: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
    scroll: { padding: spacing.lg, gap: spacing.sm },
    hintCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.brandTertiary,
      padding: 10,
      borderRadius: radius.md,
      marginBottom: spacing.sm,
    },
    hintText: { flex: 1, color: colors.brandSecondary, fontSize: 11, lineHeight: 15 },
    miniLabel: {
      color: colors.onSurfaceTertiary,
      fontSize: 10,
      letterSpacing: 1,
      fontWeight: "700",
      marginTop: 4,
    },
    pickBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    pickBtnText: { flex: 1, color: colors.onSurface, fontSize: 13, fontWeight: "600" },
    analyzeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isGlass ? withAlpha(colors.brand, 20) : colors.brand,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    analyzeBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 0.6, fontSize: 12 },
    secondaryBtn: { alignItems: "center", justifyContent: "center", padding: spacing.md, marginTop: spacing.xs },
    secondaryBtnText: { color: colors.onSurfaceSecondary, fontWeight: "700", fontSize: 12 },
    errorCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: withAlpha(colors.error, 14),
      padding: spacing.md,
      borderRadius: radius.md,
      marginTop: spacing.md,
    },
    errorText: { flex: 1, color: colors.error, fontSize: 12, lineHeight: 17 },
    previewSection: { marginTop: spacing.md, gap: spacing.sm },
    previewCard: { gap: spacing.sm },
    previewHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
    previewTitle: { flex: 1, color: colors.onSurface, fontSize: 17, fontWeight: "800" },
    confidenceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    confidenceBadgeText: { fontSize: 10, fontWeight: "800" },
    previewDescription: { color: colors.onSurfaceSecondary, fontSize: 12, lineHeight: 17 },
    previewStat: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "600" },
    noteBlock: { marginTop: spacing.xs, gap: 2 },
    noteTitle: { color: colors.onSurface, fontSize: 11, fontWeight: "800", letterSpacing: 0.4, marginBottom: 2 },
    noteText: { color: colors.onSurfaceSecondary, fontSize: 11, lineHeight: 16 },
  });
}
