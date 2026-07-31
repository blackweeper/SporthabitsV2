import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import PressableScale from "@/src/components/ui/PressableScale";
import Card from "@/src/components/ui/Card";
import {
  AppSettings,
  CalendarViewMode,
  getAppSettings,
  saveAppSettings,
} from "@/src/utils/app-settings";

const CALENDAR_OPTIONS: {
  key: CalendarViewMode;
  label: string;
  icon: any;
  hint: string;
}[] = [
  {
    key: "week",
    label: "Semaine",
    icon: "today",
    hint: "7 jours en cercles, détail du jour sélectionné en dessous",
  },
  {
    key: "month",
    label: "Mois",
    icon: "calendar",
    hint: "Grille mensuelle complète",
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    (async () => setSettings(await getAppSettings()))();
  }, []);

  const setCalendarView = async (mode: CalendarViewMode) => {
    setSettings((s) => (s ? { ...s, calendarView: mode } : s));
    await saveAppSettings({ calendarView: mode });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <PressableScale testID="settings-back" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </PressableScale>
        <Text style={styles.title}>Paramètres</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>APPARENCE</Text>
        <Text style={styles.sectionHint}>Calendrier du Dashboard</Text>
        {CALENDAR_OPTIONS.map((opt) => {
          const active = settings?.calendarView === opt.key;
          return (
            <PressableScale
              key={opt.key}
              testID={`settings-calendar-${opt.key}`}
              onPress={() => setCalendarView(opt.key)}
            >
              <Card style={[styles.optionRow, active && styles.optionRowActive]}>
                <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={active ? "#fff" : colors.onSurfaceTertiary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionHint}>{opt.hint}</Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.brand} />
                )}
              </Card>
            </PressableScale>
          );
        })}
      </ScrollView>
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
  scroll: { padding: spacing.lg, gap: spacing.sm },
  sectionLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
  },
  sectionHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginTop: -2,
    marginBottom: 4,
  },
  optionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  optionRowActive: { borderColor: colors.brand },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconActive: { backgroundColor: colors.brand },
  optionLabel: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
  optionHint: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
});
