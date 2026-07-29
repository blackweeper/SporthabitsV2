import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  getLibraryBackupInfo,
  getLibraryMeta,
  restoreLibraryBackup,
} from "@/src/utils/exercise-records";
import { EXERCISE_LIBRARY_MANIFEST_URL } from "@/src/utils/exercise-library-source-config";
import { useLibraryUpdate } from "@/src/hooks/useLibraryUpdate";
import { useConfirmDialog } from "@/src/hooks/use-confirm-dialog";

function formatDate(iso: string | null): string {
  if (!iso) return "jamais";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ExerciseLibrarySettingsScreen() {
  const router = useRouter();
  const { confirm, ConfirmModal } = useConfirmDialog();
  const { checkForUpdate } = useLibraryUpdate();

  const [version, setVersion] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [backupExists, setBackupExists] = useState(false);
  const [backupSavedAt, setBackupSavedAt] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const reload = useCallback(async () => {
    const [meta, backup] = await Promise.all([getLibraryMeta(), getLibraryBackupInfo()]);
    setVersion(meta.version);
    setLastUpdatedAt(meta.lastUpdatedAt);
    setExerciseCount(meta.exerciseCount);
    setBackupExists(backup.exists);
    setBackupSavedAt(backup.savedAt);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const hasSource = !!EXERCISE_LIBRARY_MANIFEST_URL;

  const onCheck = async () => {
    setChecking(true);
    setCheckMessage(null);
    const result = await checkForUpdate();
    setChecking(false);
    if ("error" in result) {
      setCheckMessage(result.error);
    } else if (result.available) {
      setCheckMessage(`Nouvelle version disponible (${result.remoteCount} exercices).`);
    } else {
      setCheckMessage("Ta bibliothèque est déjà à jour.");
    }
  };

  const onRestore = async () => {
    const ok = await confirm({
      title: "Restaurer la version précédente ?",
      message: `Sauvegarde du ${formatDate(backupSavedAt)}. La bibliothèque actuelle sera remplacée par cette version.`,
      confirmLabel: "RESTAURER",
      destructive: true,
    });
    if (!ok) return;
    setRestoring(true);
    const restored = await restoreLibraryBackup();
    setRestoring(false);
    if (restored) await reload();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="close-library-settings" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Bibliothèque d&apos;exercices</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>VERSION ACTUELLE</Text>
          <Text style={styles.statusValue}>{version > 0 ? `v${version}` : "Bibliothèque de base"}</Text>
          <Text style={styles.statusSub}>
            {exerciseCount > 0 ? `${exerciseCount} exercices · ` : ""}Dernière mise à jour : {formatDate(lastUpdatedAt)}
          </Text>
        </View>

        {!hasSource && (
          <View style={styles.hintBox}>
            <Ionicons name="information-circle" size={14} color={colors.brand} />
            <Text style={styles.hintText}>
              Aucune source de mise à jour n&apos;est configurée pour l&apos;instant. Les
              vérifications et mises à jour seront disponibles une fois la bibliothèque
              WorkoutX hébergée.
            </Text>
          </View>
        )}

        <Pressable
          testID="check-library-update"
          style={[styles.actionBtn, !hasSource && styles.actionBtnDisabled]}
          onPress={onCheck}
          disabled={!hasSource || checking}
        >
          <Ionicons name="refresh" size={16} color={hasSource ? colors.brand : colors.onSurfaceTertiary} />
          <Text style={[styles.actionBtnText, !hasSource && styles.actionBtnTextDisabled]}>
            {checking ? "VÉRIFICATION…" : "VÉRIFIER LES MISES À JOUR"}
          </Text>
        </Pressable>

        {checkMessage && <Text style={styles.checkMessage}>{checkMessage}</Text>}

        <Pressable
          testID="start-library-update"
          style={[styles.ctaFull, !hasSource && styles.actionBtnDisabled]}
          onPress={() => router.push("/exercise-library-update")}
          disabled={!hasSource}
        >
          <Ionicons name="cloud-download" size={18} color="#fff" />
          <Text style={styles.ctaFullText}>METTRE À JOUR</Text>
        </Pressable>

        {backupExists && (
          <Pressable
            testID="restore-library-backup"
            style={styles.restoreRow}
            onPress={onRestore}
            disabled={restoring}
          >
            <Ionicons name="arrow-undo" size={16} color={colors.onSurfaceSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.restoreTitle}>Restaurer la version précédente</Text>
              <Text style={styles.restoreSub}>Sauvegarde du {formatDate(backupSavedAt)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {ConfirmModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  scroll: { padding: spacing.lg, gap: spacing.md },
  statusCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  statusLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
  },
  statusValue: { color: colors.onSurface, fontSize: 24, fontWeight: "800", marginTop: 4 },
  statusSub: { color: colors.onSurfaceTertiary, fontSize: 12, marginTop: 4 },
  hintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  hintText: { color: colors.brandSecondary, fontSize: 12, flex: 1, lineHeight: 16 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  actionBtnDisabled: { borderColor: colors.border, opacity: 0.6 },
  actionBtnText: { color: colors.brand, fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  actionBtnTextDisabled: { color: colors.onSurfaceTertiary },
  checkMessage: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  ctaFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  ctaFullText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  restoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restoreTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 13 },
  restoreSub: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
});
