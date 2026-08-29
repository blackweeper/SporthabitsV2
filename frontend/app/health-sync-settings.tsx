import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import { AppSettings, getAppSettings, saveAppSettings } from "@/src/utils/app-settings";
import {
  getHealthMetrics,
  getHealthSyncState,
  getHealthWorkouts,
  HealthWorkoutEntry,
  HEART_RATE_METRIC_NAMES,
  normalizeMetricName,
} from "@/src/utils/health-data-storage";
import { useHealthSync } from "@/src/hooks/useHealthSync";

function formatDateTime(iso: string | null): string {
  if (!iso) return "jamais";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HealthSyncSettingsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const { phase, error, lastResult, sync } = useHealthSync();

  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [metricsCount, setMetricsCount] = useState(0);
  const [latestHeartRate, setLatestHeartRate] = useState<number | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<HealthWorkoutEntry[]>([]);

  const reload = useCallback(async () => {
    const [settings, syncState, metrics, workouts] = await Promise.all([
      getAppSettings(),
      getHealthSyncState(),
      getHealthMetrics(),
      getHealthWorkouts(),
    ]);
    setBaseUrl(settings.healthSyncBaseUrl ?? "");
    setToken(settings.healthSyncToken ?? "");
    setLastSyncedAt(syncState.lastSyncedAt);
    setMetricsCount(metrics.length);
    const heartRateSamples = metrics.filter(
      (m) => HEART_RATE_METRIC_NAMES.has(normalizeMetricName(m.name)) && m.qty != null,
    );
    setLatestHeartRate(heartRateSamples.length > 0 ? heartRateSamples[heartRateSamples.length - 1].qty : null);
    setRecentWorkouts(workouts.slice(-10).reverse());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const saveField = async (patch: Partial<AppSettings>) => {
    await saveAppSettings(patch);
  };

  const onSync = async () => {
    // Persister explicitement les champs avant de synchroniser : `onBlur`
    // seul est trop fragile (un tap direct sur "Synchroniser" sans perte de
    // focus préalable du champ ne le déclenche pas), et `reload()` juste
    // après aurait sinon écrasé les champs à l'écran avec les anciens
    // réglages (encore vides) lus depuis le stockage.
    await saveAppSettings({
      healthSyncBaseUrl: baseUrl.trim() || null,
      healthSyncToken: token.trim() || null,
    });
    await sync();
    await reload();
  };

  const webhookUrl = baseUrl.trim() ? `${baseUrl.trim().replace(/\/+$/, "")}/api/health-import` : "";

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
        <Pressable testID="close-health-sync-settings" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Import santé</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>CONFIGURATION DU BACKEND</Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>URL du backend</Text>
          <TextInput
            testID="health-sync-base-url"
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            onBlur={() => saveField({ healthSyncBaseUrl: baseUrl.trim() || null })}
            placeholder="https://mon-service.onrender.com"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Token</Text>
          <TextInput
            testID="health-sync-token"
            style={styles.input}
            value={token}
            onChangeText={setToken}
            onBlur={() => saveField({ healthSyncToken: token.trim() || null })}
            placeholder="Le HEALTH_IMPORT_TOKEN configuré sur le serveur"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>

        {!!webhookUrl && (
          <View style={styles.webhookBlock}>
            <Text style={styles.fieldLabel}>URL du webhook (à coller dans Health Auto Export)</Text>
            <TextInput
              testID="health-sync-webhook-url"
              style={[styles.input, styles.webhookInput]}
              value={webhookUrl}
              editable={false}
              multiline
            />
          </View>
        )}

        <Pressable
          testID="health-sync-now"
          style={[styles.ctaFull, (!baseUrl || !token) && styles.ctaFullDisabled]}
          onPress={onSync}
          disabled={!baseUrl || !token || phase === "syncing"}
        >
          <Ionicons name="sync" size={18} color="#fff" />
          <Text style={styles.ctaFullText}>{phase === "syncing" ? "SYNCHRONISATION…" : "SYNCHRONISER MAINTENANT"}</Text>
        </Pressable>

        {phase === "error" && error && <Text style={styles.errorText}>{error}</Text>}
        {phase === "done" && lastResult && (
          <Text style={styles.successText}>
            {lastResult.metricsAdded + lastResult.workoutsAdded === 0
              ? "Déjà à jour, rien de nouveau."
              : `${lastResult.metricsAdded} nouvelle(s) métrique(s), ${lastResult.workoutsAdded} nouvelle(s) séance(s).`}
          </Text>
        )}

        <Text style={styles.lastSync}>Dernière synchronisation : {formatDateTime(lastSyncedAt)}</Text>

        <Text style={styles.sectionLabel}>DONNÉES IMPORTÉES</Text>

        <View style={styles.statusCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Fréquence cardiaque</Text>
            <Text style={styles.statValue}>{latestHeartRate != null ? `${Math.round(latestHeartRate)} bpm` : "—"}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Échantillons stockés</Text>
            <Text style={styles.statValue}>{metricsCount}</Text>
          </View>
        </View>

        {recentWorkouts.length > 0 && (
          <View style={styles.workoutsCard}>
            <Text style={styles.workoutsTitle}>Séances récentes</Text>
            {recentWorkouts.map((w) => (
              <View key={`${w.name}|${w.start}`} style={styles.workoutRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workoutName} numberOfLines={1}>
                    {w.name}
                  </Text>
                  <Text style={styles.workoutSub}>{formatDateTime(w.start)}</Text>
                </View>
                {w.energyKcal != null && <Text style={styles.workoutKcal}>{Math.round(w.energyKcal)} kcal</Text>}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionLabel}>DIAGNOSTIC</Text>
        <Pressable testID="health-sync-open-debug" onPress={() => router.push("/health-debug" as any)}>
          <View style={styles.diagnosticRow}>
            <View style={styles.diagnosticIcon}>
              <Ionicons name="pulse" size={18} color={theme.colors.onSurfaceTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.diagnosticLabel}>Diagnostic santé</Text>
              <Text style={styles.diagnosticHint}>Vérifie que l'import Apple Santé arrive bien jusqu'au Dashboard</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceTertiary} />
          </View>
        </Pressable>

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
  scroll: { padding: spacing.lg, gap: spacing.md },
  sectionLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  fieldBlock: { gap: 6 },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.onSurface,
    fontSize: 13,
  },
  webhookBlock: { gap: 6 },
  webhookInput: { color: colors.onSurfaceSecondary, fontSize: 12 },
  ctaFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: isGlass ? withAlpha(colors.brand, 18) : colors.brand,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  ctaFullDisabled: { opacity: 0.5 },
  ctaFullText: { color: isGlass ? colors.brand : "#fff", fontWeight: "800", letterSpacing: 1 },
  errorText: { color: colors.error, fontSize: 12, textAlign: "center" },
  successText: { color: colors.success, fontSize: 12, textAlign: "center" },
  lastSync: { color: colors.onSurfaceTertiary, fontSize: 11, textAlign: "center" },
  statusCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  statValue: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  workoutsCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  workoutsTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 13, marginBottom: 4 },
  workoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  workoutName: { color: colors.onSurface, fontSize: 12, fontWeight: "600" },
  workoutSub: { color: colors.onSurfaceTertiary, fontSize: 10, marginTop: 2 },
  workoutKcal: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700" },
  diagnosticRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  diagnosticIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  diagnosticLabel: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
  diagnosticHint: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  });
}
