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
  deleteReminder,
  getReminders,
  Reminder,
  REMINDER_KIND_ICON,
  REMINDER_KIND_LABEL,
} from "@/src/utils/gym-storage";

function formatDaysOfWeek(days: number[]): string {
  if (days.length === 7) return "Tous les jours";
  if (days.length === 0) return "—";
  const names = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return days.map((d) => names[d]).join(", ");
}

/** Rappels — anciennement le sous-onglet "Rappels" de Mon évolution
 * (partagé avec Habitudes), déplacé dans Réglages avec le Journal lors de
 * la refonte Performance : Performance ne garde plus que EXERCICES/NIVEAU/
 * DÉFIS, et les Habitudes se gèrent déjà depuis le Dashboard — les Rappels
 * n'avaient nulle part où aller sauf ici. Fonctionnalité et données
 * inchangées (mêmes routes `/reminder/new`/`/reminder/{id}`). */
export default function RemindersListScreen() {
  const { theme } = useTheme();
  const styles = buildStyles(theme);
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const reload = useCallback(async () => {
    setReminders(await getReminders());
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
          <Pressable testID="close-reminders" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Rappels</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable
            testID="add-reminder-btn"
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
            onPress={() => router.push("/reminder/new")}
          >
            <Ionicons name="add-circle" size={18} color={theme.card.mode === "glass" ? theme.colors.brand : "#fff"} />
            <Text style={[styles.ctaFullText, { color: theme.card.mode === "glass" ? theme.colors.brand : "#fff" }]}>
              AJOUTER UN RAPPEL
            </Text>
          </Pressable>

          <View style={[styles.hintBanner, { backgroundColor: theme.colors.brandTertiary, borderRadius: theme.radius.sm }]}>
            <Ionicons name="information-circle" size={14} color={theme.colors.brand} />
            <Text style={[styles.hintBannerText, { color: theme.colors.brandSecondary }]}>
              Les rappels s&apos;activent après publication de l&apos;app avec les notifications push.
            </Text>
          </View>

          {reminders.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="alarm" size={40} color={theme.colors.brand} />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Aucun rappel</Text>
              <Text style={[styles.emptySub, { color: theme.colors.onSurfaceTertiary }]}>
                Crée des rappels pour tes séances, ton hydratation, tes mesures…
              </Text>
            </View>
          ) : (
            reminders.map((r) => (
              <SwipeableRow
                key={r.id}
                testID={`reminder-${r.id}`}
                onDelete={async () => {
                  await deleteReminder(r.id);
                  await reload();
                }}
                deleteConfirm={{
                  title: "Supprimer ce rappel ?",
                  message: `"${r.title || REMINDER_KIND_LABEL[r.kind]}" — cette action est définitive.`,
                  confirmLabel: "SUPPRIMER",
                  destructive: true,
                }}
                onEdit={() => router.push(`/reminder/${r.id}`)}
              >
                <PressableScale testID={`reminder-${r.id}`} onPress={() => router.push(`/reminder/${r.id}`)}>
                  <Card style={styles.habitCard}>
                    <View style={[styles.habitIcon, { backgroundColor: theme.colors.brandTertiary }]}>
                      <Ionicons name={REMINDER_KIND_ICON[r.kind]} size={16} color={theme.colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.habitTitle, { color: theme.colors.onSurface }]}>
                        {r.title || REMINDER_KIND_LABEL[r.kind]}
                      </Text>
                      <Text style={[styles.habitMeta, { color: theme.colors.onSurfaceTertiary }]}>
                        {r.time} · {formatDaysOfWeek(r.daysOfWeek)} · {r.enabled ? "actif" : "désactivé"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
                  </Card>
                </PressableScale>
              </SwipeableRow>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

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
    hintBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.sm },
    hintBannerText: { fontSize: 11, flex: 1 },
    empty: { alignItems: "center", gap: 8, paddingVertical: 40 },
    emptyTitle: { fontSize: 15, fontWeight: "800" },
    emptySub: { fontSize: 12, textAlign: "center", paddingHorizontal: spacing.lg },
    habitCard: { flexDirection: "row", alignItems: "center", gap: 10 },
    habitIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    habitTitle: { fontSize: 13.5, fontWeight: "700" },
    habitMeta: { fontSize: 11, marginTop: 2 },
  });
}
