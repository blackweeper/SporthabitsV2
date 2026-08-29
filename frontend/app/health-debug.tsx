import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import { getAppSettings } from "@/src/utils/app-settings";
import { HealthSyncPhase, HEALTH_SYNC_INTERVAL_MS, useHealthSync } from "@/src/hooks/useHealthSync";
import {
  getHealthMetrics,
  getHealthSyncState,
  getHealthWorkouts,
  getImportedStepsForDates,
  getLastHealthDataChangeAt,
  HealthMetricSample,
  localDateYYYYMMDD,
  normalizeMetricName,
} from "@/src/utils/health-data-storage";
import { HEALTH_METRIC_REGISTRY, HealthMetricKey } from "@/src/utils/health-metric-registry";

/**
 * Panneau de diagnostic temporaire — pour comprendre précisément où une
 * donnée envoyée par Health Auto Export s'arrête avant d'atteindre l'UI,
 * sans jamais rien inventer : chaque nombre affiché ici est lu en direct,
 * exactement via les mêmes fonctions que le Dashboard/Santé/Défis (jamais
 * une valeur recalculée différemment "pour le debug"). Distingue en
 * particulier "le backend a des données" de "le frontend les a réellement
 * récupérées" (§21 du brief) via l'appel à `/api/health-import/summary`,
 * comparé au compte local — la seule façon de trancher entre les deux
 * causes possibles d'un pipeline qui semble ne rien afficher.
 */

type BackendSummary = {
  metrics_count: number;
  workouts_count: number;
  latest_ingested_at: string | null;
  latest_metric_name: string | null;
  latest_metric_date: string | null;
};

function fmt(iso: string | null): string {
  if (!iso) return "jamais";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Seuil au-delà duquel "le backend n'a rien reçu de neuf récemment" cesse
 * d'être normal et devient un signal à afficher — heuristique (Health Auto
 * Export tourne typiquement sur une automation horaire ou déclenchée par
 * l'utilisateur, pas en continu), pas une garantie contractuelle. Sert
 * uniquement à distinguer "En attente d'un nouvel export" (rien d'anormal,
 * HAE n'a juste rien envoyé récemment) d'un vrai silence prolongé.
 */
const FRESHNESS_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2h

type Freshness = { label: string; tone: "ok" | "waiting" | "error"; detail: string };

/**
 * Ne dit JAMAIS "Synchronisation OK" simplement parce que la boucle de 15
 * minutes tourne sans erreur — un export HAE vieux de plusieurs heures doit
 * être visible, pas masqué par un statut technique vert (voir la demande
 * explicite : "ne mets jamais simplement Synchronisation OK si le dernier
 * export date de plusieurs heures").
 */
function computeFreshness(params: {
  backendStatus: "idle" | "checking" | "ok" | "error";
  backendError?: string;
  syncPhase: HealthSyncPhase;
  syncError: string | null;
  latestIngestedAt: string | null;
}): Freshness | null {
  const { backendStatus, backendError, syncPhase, syncError, latestIngestedAt } = params;
  if (backendStatus === "error") {
    return { label: "Erreur", tone: "error", detail: `Backend injoignable : ${backendError ?? "raison inconnue"}.` };
  }
  if (syncPhase === "error") {
    return { label: "Erreur", tone: "error", detail: syncError ?? "La synchronisation a échoué." };
  }
  if (backendStatus === "ok" && latestIngestedAt) {
    const ageMs = Date.now() - new Date(latestIngestedAt).getTime();
    if (ageMs <= FRESHNESS_THRESHOLD_MS) {
      return { label: "À jour", tone: "ok", detail: "Le backend a reçu un export Health Auto Export récemment." };
    }
    const hours = Math.max(1, Math.round(ageMs / 3600000));
    return {
      label: "En attente d'un nouvel export",
      tone: "waiting",
      detail: `IronFlow et le backend fonctionnent normalement — c'est Health Auto Export qui n'a rien envoyé depuis ${hours} h. Le retard vient d'iOS/HAE, pas d'IronFlow.`,
    };
  }
  return null;
}

export default function HealthDataDebugScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const { phase, error, sync } = useHealthSync();

  const [configured, setConfigured] = useState(false);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [localMetricsCount, setLocalMetricsCount] = useState(0);
  const [localWorkoutsCount, setLocalWorkoutsCount] = useState(0);
  const [lastChangeAt, setLastChangeAt] = useState<string | null>(null);
  const [lastSample, setLastSample] = useState<HealthMetricSample | null>(null);
  const [todayByMetric, setTodayByMetric] = useState<Partial<Record<HealthMetricKey, { value: number; hasData: boolean }>>>({});
  const [weekSteps, setWeekSteps] = useState<{ date: string; steps: number }[]>([]);
  const [backend, setBackend] = useState<{ status: "idle" | "checking" | "ok" | "error"; summary?: BackendSummary; error?: string }>({
    status: "idle",
  });
  const [readAt, setReadAt] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const settings = await getAppSettings();
    setConfigured(!!settings.healthSyncBaseUrl && !!settings.healthSyncToken);
    setBaseUrl(settings.healthSyncBaseUrl);

    const [syncState, metrics, workouts] = await Promise.all([getHealthSyncState(), getHealthMetrics(), getHealthWorkouts()]);
    setLastSyncedAt(syncState.lastSyncedAt);
    setLocalMetricsCount(metrics.length);
    setLocalWorkoutsCount(workouts.length);
    setLastChangeAt(getLastHealthDataChangeAt());

    const latest = metrics.reduce<HealthMetricSample | null>((best, m) => {
      if (!best || m.date > best.date) return m;
      return best;
    }, null);
    setLastSample(latest);

    const today = localDateYYYYMMDD();
    const metricResults = await Promise.all(
      (Object.keys(HEALTH_METRIC_REGISTRY) as HealthMetricKey[]).map(async (key) => {
        const def = HEALTH_METRIC_REGISTRY[key]!;
        const [value, hasData] = await Promise.all([def.getValueForDate(today), def.hasAnyData()]);
        return [key, { value, hasData }] as const;
      }),
    );
    setTodayByMetric(Object.fromEntries(metricResults) as Partial<Record<HealthMetricKey, { value: number; hasData: boolean }>>);

    const last7Dates: string[] = [];
    for (let i = 6; i >= 0; i--) last7Dates.push(localDateYYYYMMDD(new Date(Date.now() - i * 86400000)));
    const byDate = await getImportedStepsForDates(last7Dates);
    setWeekSteps(last7Dates.map((d) => ({ date: d, steps: byDate[d] ?? 0 })));

    setReadAt(new Date().toISOString());

    // Vérification live du backend, uniquement si configuré — compare son
    // compte réel de documents persistés au compte local ci-dessus (§21).
    if (settings.healthSyncBaseUrl && settings.healthSyncToken) {
      setBackend({ status: "checking" });
      try {
        const base = settings.healthSyncBaseUrl.trim().replace(/\/+$/, "");
        const res = await fetch(`${base}/api/health-import/summary`, {
          headers: { Authorization: `Bearer ${settings.healthSyncToken}` },
        });
        if (!res.ok) {
          setBackend({ status: "error", error: res.status === 401 ? "Token invalide." : `Erreur serveur (${res.status}).` });
        } else {
          const summary: BackendSummary = await res.json();
          setBackend({ status: "ok", summary });
        }
      } catch (e) {
        setBackend({ status: "error", error: e instanceof Error ? e.message : "Serveur injoignable." });
      }
    } else {
      setBackend({ status: "idle" });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onForceSync = async () => {
    await sync();
    await reload();
  };

  const backendVsLocalMismatch =
    backend.status === "ok" && backend.summary && backend.summary.metrics_count > 0 && localMetricsCount === 0;

  const freshness = computeFreshness({
    backendStatus: backend.status,
    backendError: backend.error,
    syncPhase: phase,
    syncError: error,
    latestIngestedAt: backend.summary?.latest_ingested_at ?? null,
  });
  const freshnessColor =
    freshness?.tone === "ok" ? theme.colors.success : freshness?.tone === "error" ? theme.colors.error : theme.colors.warning;

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[styles.container, theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface }]}
        edges={["top", "bottom"]}
      >
        <View style={styles.header}>
          <Pressable testID="close-health-debug" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Diagnostic santé</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Section title="CONFIGURATION" theme={theme}>
            <Row label="Backend configuré" value={configured ? "Oui" : "Non"} theme={theme} warn={!configured} />
            {baseUrl && <Row label="URL" value={baseUrl} theme={theme} small />}
            {!configured && (
              <Text style={[styles.hint, { color: theme.colors.error }]}>
                Aucune URL/token renseigné dans Réglages → Import santé. Tant que ce n&apos;est pas fait, aucune synchronisation
                n&apos;est jamais tentée — c&apos;est un no-op totalement silencieux, pas une erreur réseau.
              </Text>
            )}
          </Section>

          {freshness && (
            <View style={[styles.alertBox, { backgroundColor: withAlpha(freshnessColor, 14), borderColor: freshnessColor }]}>
              <Ionicons
                name={freshness.tone === "ok" ? "checkmark-circle" : freshness.tone === "error" ? "warning" : "time"}
                size={16}
                color={freshnessColor}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertText, { color: freshnessColor }]}>{freshness.label}</Text>
                <Text style={[styles.hint, { color: theme.colors.onSurfaceSecondary, marginTop: 2 }]}>{freshness.detail}</Text>
              </View>
            </View>
          )}

          <Section title="EXPORT HEALTH AUTO EXPORT" theme={theme}>
            {backend.status === "idle" && <Row label="État" value="Non vérifiable (backend non configuré)" theme={theme} />}
            {backend.status === "checking" && <Row label="État" value="Vérification…" theme={theme} />}
            {backend.status === "error" && (
              <Text style={[styles.hint, { color: theme.colors.error }]}>Backend injoignable : {backend.error}</Text>
            )}
            {backend.status === "ok" && backend.summary && (
              <>
                <Row label="Dernier export reçu" value={fmt(backend.summary.latest_ingested_at)} theme={theme} />
                <Row
                  label="Dernier échantillon"
                  value={backend.summary.latest_metric_date ?? "—"}
                  theme={theme}
                  small
                />
                <Row label="Échantillons persistés (serveur)" value={String(backend.summary.metrics_count)} theme={theme} small />
                <Text style={[styles.hint, { color: theme.colors.onSurfaceTertiary, marginTop: 4 }]}>
                  Cette section reflète ce que Health Auto Export a réellement réussi à envoyer et que LE BACKEND a reçu — pas
                  ce qu'IronFlow a déjà récupéré (voir "SYNCHRONISATION IRONFLOW" ci-dessous). Le compteur "Échantillons
                  stockés" affiché par Health Auto Export sur l'iPhone est un total interne à cette app (potentiellement
                  toutes les métriques qu'elle suit, sur toute la période qu'elle connaît) — il ne mesure jamais ce que CE
                  backend a reçu. Un renvoi d'une même donnée par Health Auto Export ne crée jamais de doublon ici (fusion par
                  jour + type de métrique), donc ce nombre peut légitimement être plus petit que celui de Health Auto Export
                  sans qu'aucune donnée soit perdue.
                </Text>
              </>
            )}
          </Section>

          {backendVsLocalMismatch && (
            <View style={[styles.alertBox, { backgroundColor: withAlpha(theme.colors.error, 14), borderColor: theme.colors.error }]}>
              <Ionicons name="warning" size={16} color={theme.colors.error} />
              <Text style={[styles.alertText, { color: theme.colors.error }]}>
                Le serveur a {backend.summary?.metrics_count} échantillon(s) mais l&apos;app locale en a 0 : la synchro n&apos;a
                jamais réellement récupéré les données. Essaie &quot;Forcer une synchronisation&quot; ci-dessous.
              </Text>
            </View>
          )}

          <Section title="SYNCHRONISATION IRONFLOW" theme={theme}>
            <Row label="Dernière récupération" value={fmt(lastSyncedAt)} theme={theme} />
            <Row label="Fréquence" value={`${Math.round(HEALTH_SYNC_INTERVAL_MS / 60000)} min`} theme={theme} />
            <Row
              label="Statut"
              value={configured ? "ACTIF (auto au lancement + toutes les 15 min)" : "INACTIF (non configuré)"}
              theme={theme}
              small
              warn={!configured}
            />
            <Row label="Échantillons (stockage local)" value={String(localMetricsCount)} theme={theme} small />
            <Row label="Séances (stockage local)" value={String(localWorkoutsCount)} theme={theme} small />
            <Row
              label="Dernière fusion (depuis l'ouverture)"
              value={lastChangeAt ? fmt(lastChangeAt) : "aucune depuis l'ouverture de l'app"}
              theme={theme}
              small={!lastChangeAt}
            />
            <Text style={[styles.hint, { color: theme.colors.onSurfaceTertiary, marginTop: 4 }]}>
              IronFlow ne fait ici que RÉCUPÉRER ce que Health Auto Export a déjà envoyé au backend — il ne déclenche jamais
              un nouvel export côté iOS. Si "EXPORT HEALTH AUTO EXPORT" ci-dessus est ancien, le retard vient de Health Auto
              Export/iOS, pas de cette synchronisation.
            </Text>
          </Section>

          <Pressable
            testID="health-debug-force-sync"
            style={[styles.syncBtn, { backgroundColor: theme.card.mode === "glass" ? withAlpha(theme.colors.brand, 18) : theme.colors.brand }]}
            onPress={onForceSync}
            disabled={phase === "syncing"}
          >
            <Ionicons name="sync" size={16} color={theme.card.mode === "glass" ? theme.colors.brand : "#fff"} />
            <Text style={[styles.syncBtnText, { color: theme.card.mode === "glass" ? theme.colors.brand : "#fff" }]}>
              {phase === "syncing" ? "SYNCHRONISATION…" : "FORCER UNE SYNCHRONISATION"}
            </Text>
          </Pressable>
          {phase === "error" && error && <Text style={[styles.hint, { color: theme.colors.error }]}>{error}</Text>}

          <Section title="DERNIER ÉCHANTILLON" theme={theme}>
            {lastSample ? (
              <>
                <Row label="Type" value={`${lastSample.name} (${normalizeMetricName(lastSample.name)})`} theme={theme} small />
                <Row label="Date" value={lastSample.date} theme={theme} />
                <Row label="Valeur" value={lastSample.qty != null ? `${lastSample.qty} ${lastSample.units ?? ""}`.trim() : "—"} theme={theme} />
                <Row label="Source" value={String((lastSample.raw as any)?.source ?? "—")} theme={theme} small />
              </>
            ) : (
              <Text style={[styles.hint, { color: theme.colors.onSurfaceTertiary }]}>Aucun échantillon en stockage local.</Text>
            )}
          </Section>

          <Section title="AUJOURD'HUI" theme={theme}>
            {(Object.keys(HEALTH_METRIC_REGISTRY) as HealthMetricKey[]).map((key) => {
              const def = HEALTH_METRIC_REGISTRY[key]!;
              const entry = todayByMetric[key];
              // "Aucune donnée disponible" seulement si CE type de métrique n'a
              // jamais été reçu — jamais confondu avec un 0 réel (§17 du brief :
              // une nuit sans sommeil enregistré n'est pas la même chose qu'une
              // vraie nuit de 0h).
              const value = !entry ? "…" : entry.hasData ? def.formatValue(entry.value) : "Aucune donnée disponible";
              return <Row key={key} label={def.label} value={value} theme={theme} small={!!entry && !entry.hasData} />;
            })}
          </Section>

          <Section title="7 DERNIERS JOURS — PAS" theme={theme}>
            {weekSteps.map((d) => (
              <Row key={d.date} label={d.date} value={String(Math.round(d.steps))} theme={theme} small />
            ))}
          </Section>

          <Text style={[styles.footer, { color: theme.colors.onSurfaceTertiary }]}>Lu à l&apos;instant : {fmt(readAt)}</Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, theme, children }: { title: string; theme: Theme; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[localStyles.sectionLabel, { color: theme.colors.onSurfaceTertiary }]}>{title}</Text>
      <GlassCard
        style={[
          localStyles.card,
          theme.card.mode === "flat" && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.md },
        ]}
      >
        {children}
      </GlassCard>
    </View>
  );
}

function Row({ label, value, theme, warn, small }: { label: string; value: string; theme: Theme; warn?: boolean; small?: boolean }) {
  return (
    <View style={localStyles.row}>
      <Text style={[localStyles.rowLabel, { color: theme.colors.onSurfaceSecondary }]}>{label}</Text>
      <Text
        style={[
          small ? localStyles.rowValueSmall : localStyles.rowValue,
          { color: warn ? theme.colors.error : theme.colors.onSurface },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  card: { borderWidth: 1, padding: spacing.md, gap: 8 },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  rowLabel: { fontSize: 12.5, fontWeight: "600", flexShrink: 0 },
  rowValue: { fontSize: 13.5, fontWeight: "800", textAlign: "right", flex: 1 },
  rowValueSmall: { fontSize: 11, fontWeight: "700", textAlign: "right", flex: 1 },
});

function buildStyles(theme: Theme) {
  const { colors } = theme;
  return StyleSheet.create({
    container: { flex: 1 },
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
    hint: { fontSize: 11.5, lineHeight: 16 },
    alertBox: { flexDirection: "row", gap: 8, padding: spacing.md, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
    alertText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
    syncBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: spacing.md, borderRadius: 12 },
    syncBtnText: { fontWeight: "800", letterSpacing: 0.5, fontSize: 13 },
    footer: { fontSize: 10.5, textAlign: "center" },
  });
}
