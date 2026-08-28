import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { coloredShadow, spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import Card from "@/src/components/ui/Card";
import PressableScale from "@/src/components/ui/PressableScale";
import SwipeableRow from "@/src/components/SwipeableRow";
import {
  DailyJournalEntry,
  PAIN_ZONE_LABEL,
  deleteDailyJournalEntry,
  getDailyJournal,
} from "@/src/utils/gym-storage";

/** Historique du Journal quotidien — anciennement le sous-onglet "Journal" de
 * Mon évolution/Performance, déplacé dans Réglages (voir la refonte
 * IronFlow → Performance : le Journal est une fonctionnalité conservée mais
 * n'a plus sa place dans un onglet dédié à la performance sportive).
 * Fonctionnalité et données strictement identiques à avant — seule la
 * destination de navigation a changé (`/settings` plutôt que `/progression`),
 * et l'écran a désormais son propre header/back plutôt que de vivre comme
 * sous-vue d'un autre écran. */
export default function JournalHistoryScreen() {
  const { theme } = useTheme();
  const styles = buildStyles(theme);
  const router = useRouter();
  const [entries, setEntries] = useState<DailyJournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const list = await getDailyJournal();
    setEntries(list.sort((a, b) => (a.date < b.date ? 1 : -1)));
    setLoaded(true);
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
        edges={["top", "bottom"]}
      >
        <View style={styles.header}>
          <Pressable testID="close-journal-history" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Journal</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable
            testID="open-daily-journal"
            style={[
              styles.ctaFull,
              { borderRadius: theme.radius.md },
              theme.card.mode !== "glass"
                ? { backgroundColor: theme.colors.brand }
                : [
                    { backgroundColor: withAlpha(theme.colors.brand, 18), borderWidth: 1, borderColor: withAlpha(theme.colors.brand, 50) },
                    coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                  ],
            ]}
            onPress={() => router.push("/daily-journal")}
          >
            <Ionicons name="book" size={18} color={theme.card.mode === "glass" ? theme.colors.brand : "#fff"} />
            <Text style={[styles.ctaFullText, { color: theme.card.mode === "glass" ? theme.colors.brand : "#fff" }]}>
              NOTE DU JOUR
            </Text>
          </Pressable>

          {loaded && entries.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar" size={40} color={theme.colors.brand} />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Journal quotidien</Text>
              <Text style={[styles.emptySub, { color: theme.colors.onSurfaceTertiary }]}>
                Note ton énergie, ton stress, tes douleurs. Revois ton évolution jour après jour.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Historique</Text>
              {entries.map((e) => (
                <SwipeableRow
                  key={e.date}
                  testID={`journal-entry-${e.date}`}
                  onDelete={async () => {
                    await deleteDailyJournalEntry(e.date);
                    await reload();
                  }}
                  deleteConfirm={{
                    title: "Supprimer cette entrée ?",
                    message: `Journal du ${formatJournalDate(e.date)} — cette action est définitive.`,
                    confirmLabel: "SUPPRIMER",
                    destructive: true,
                  }}
                >
                  <PressableScale testID={`journal-entry-${e.date}`} onPress={() => router.push("/daily-journal")}>
                    <Card style={styles.journalEntryCard}>
                      <View style={styles.pastHead}>
                        <Text style={[styles.pastDate, { color: theme.colors.onSurface }]}>
                          {formatJournalDate(e.date)}
                        </Text>
                        <View style={styles.pastRatings}>
                          {e.energy != null && <MiniBadge label="⚡" value={e.energy} />}
                          {e.mood != null && <MiniBadge label="🙂" value={e.mood} />}
                          {e.stress != null && <MiniBadge label="⚠️" value={e.stress} />}
                        </View>
                      </View>
                      {e.sleep_hours != null && (
                        <Text style={[styles.journalEntryMeta, { color: theme.colors.onSurfaceSecondary }]}>
                          😴 {e.sleep_hours.toFixed(1)}h de sommeil
                        </Text>
                      )}
                      {e.pain_zones && e.pain_zones.length > 0 ? (
                        <Text style={[styles.journalEntryMeta, { color: theme.colors.onSurfaceSecondary }]} numberOfLines={2}>
                          🩹 {e.pain_zones.map((z) => `${PAIN_ZONE_LABEL[z.zone]} ${z.intensity}/10`).join(" · ")}
                        </Text>
                      ) : null}
                      {e.notes ? (
                        <Text style={[styles.pastNotes, { color: theme.colors.onSurfaceSecondary }]} numberOfLines={3}>
                          {e.notes}
                        </Text>
                      ) : null}
                    </Card>
                  </PressableScale>
                </SwipeableRow>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MiniBadge({ label, value }: { label: string; value: number }) {
  const { theme } = useTheme();
  return (
    <View style={[styles2.miniJournalBadge, { backgroundColor: theme.colors.surfaceTertiary }]}>
      <Text style={[styles2.miniJournalBadgeText, { color: theme.colors.onSurface }]}>
        {label} {value}
      </Text>
    </View>
  );
}

function formatJournalDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
}

const styles2 = StyleSheet.create({
  miniJournalBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  miniJournalBadgeText: { fontSize: 11, fontWeight: "700" },
});

function buildStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    title: { fontSize: 17, fontWeight: "700" },
    scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl3 },
    ctaFull: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
    ctaFullText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
    empty: { alignItems: "center", gap: 8, paddingVertical: 40 },
    emptyTitle: { fontSize: 15, fontWeight: "800" },
    emptySub: { fontSize: 12, textAlign: "center", paddingHorizontal: spacing.lg },
    sectionTitle: { fontSize: 14, fontWeight: "800" },
    journalEntryCard: { gap: 6 },
    pastHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    pastDate: { fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
    pastRatings: { flexDirection: "row", gap: 4 },
    journalEntryMeta: { fontSize: 12 },
    pastNotes: { fontSize: 12, fontStyle: "italic" },
  });
}
