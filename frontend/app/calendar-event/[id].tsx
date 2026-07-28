import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { useConfirmDialog } from "@/src/hooks/use-confirm-dialog";
import DatePickerField from "@/src/components/DatePickerField";
import {
  CalendarEvent,
  CalendarEventKind,
  CALENDAR_EVENT_KIND_ICON,
  CALENDAR_EVENT_KIND_LABEL,
  deleteCalendarEvent,
  getCalendarEvents,
  saveCalendarEvent,
  todayYYYYMMDD,
  uid,
} from "@/src/utils/gym-storage";

const KINDS: CalendarEventKind[] = [
  "workout",
  "running",
  "mobility",
  "rest",
  "measurement",
  "weighin",
  "photo",
  "competition",
  "other",
];

const REMINDER_PRESETS: { label: string; minutes: number | null }[] = [
  { label: "Aucun", minutes: null },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 h", minutes: 60 },
  { label: "1 jour", minutes: 1440 },
];

const FAR_FUTURE = new Date(Date.now() + 365 * 86400000);

export default function CalendarEventEditor() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const [e, setE] = useState<CalendarEvent | null>(null);
  const { confirm, ConfirmModal } = useConfirmDialog();

  useEffect(() => {
    (async () => {
      if (isNew) {
        setE({
          id: uid(),
          date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayYYYYMMDD(),
          kind: "workout",
          title: "",
          time: null,
          linkedPlanId: null,
          reminderMinutesBefore: null,
          createdAt: new Date().toISOString(),
        });
      } else {
        const list = await getCalendarEvents();
        const found = list.find((x) => x.id === id);
        if (found) setE(found);
        else router.back();
      }
    })();
  }, [id, date, isNew, router]);

  if (!e) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const set = <K extends keyof CalendarEvent>(k: K, v: CalendarEvent[K]) =>
    setE((prev) => (prev ? { ...prev, [k]: v } : prev));

  const save = async () => {
    if (!e) return;
    if (e.time && !e.time.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("Heure invalide", "Utilise le format HH:MM (ex: 18:30)");
      return;
    }
    await saveCalendarEvent(e);
    router.back();
  };

  const remove = async () => {
    if (!e || isNew) return;
    const ok = await confirm({
      title: "Supprimer cet événement ?",
      confirmLabel: "SUPPRIMER",
      destructive: true,
    });
    if (!ok) return;
    await deleteCalendarEvent(e.id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>{isNew ? "Nouvel événement" : "Événement"}</Text>
        <Pressable onPress={save} hitSlop={12} testID="save-calendar-event">
          <Text style={styles.saveText}>SAUVER</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.miniLabel}>Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 46 }}
            contentContainerStyle={styles.kindRow}
          >
            {KINDS.map((k) => {
              const active = e.kind === k;
              return (
                <Pressable
                  key={k}
                  testID={`cal-event-kind-${k}`}
                  style={[styles.kindChip, active && styles.kindChipActive]}
                  onPress={() => set("kind", k)}
                >
                  <Ionicons
                    name={CALENDAR_EVENT_KIND_ICON[k]}
                    size={14}
                    color={active ? "#fff" : colors.brand}
                  />
                  <Text style={[styles.kindLabel, active && { color: "#fff" }]}>
                    {CALENDAR_EVENT_KIND_LABEL[k]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.miniLabel}>Titre (optionnel)</Text>
          <TextInput
            testID="cal-event-title"
            style={styles.input}
            value={e.title}
            onChangeText={(t) => set("title", t)}
            placeholder={CALENDAR_EVENT_KIND_LABEL[e.kind]}
            placeholderTextColor={colors.onSurfaceTertiary}
          />

          <DatePickerField
            label="Date"
            testID="cal-event-date"
            value={new Date(e.date + "T12:00:00").toISOString()}
            maxDate={FAR_FUTURE}
            onChange={(iso) => set("date", iso.slice(0, 10))}
          />

          <Text style={styles.miniLabel}>Heure (optionnel)</Text>
          <TextInput
            testID="cal-event-time"
            style={styles.input}
            value={e.time ?? ""}
            onChangeText={(t) =>
              set("time", t.replace(/[^0-9:]/g, "").slice(0, 5) || null)
            }
            placeholder="18:30"
            placeholderTextColor={colors.onSurfaceTertiary}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.miniLabel}>Rappel</Text>
          <View style={styles.reminderRow}>
            {REMINDER_PRESETS.map((p) => {
              const active = (e.reminderMinutesBefore ?? null) === p.minutes;
              return (
                <Pressable
                  key={p.label}
                  testID={`cal-event-reminder-${p.minutes ?? "none"}`}
                  style={[styles.reminderChip, active && styles.reminderChipActive]}
                  onPress={() => set("reminderMinutesBefore", p.minutes)}
                >
                  <Text style={[styles.reminderChipText, active && { color: "#fff" }]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {e.reminderMinutesBefore != null && !e.time && (
            <Text style={styles.hint}>
              💡 Ajoute une heure pour que le rappel sache quand se déclencher.
            </Text>
          )}

          {!isNew && (
            <Pressable style={styles.deleteBtn} onPress={remove}>
              <Ionicons name="trash" size={16} color={colors.error} />
              <Text style={styles.deleteText}>Supprimer</Text>
            </Pressable>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      {ConfirmModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { color: colors.onSurfaceTertiary, textAlign: "center", marginTop: 40 },
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
  saveText: { color: colors.brand, fontWeight: "800", letterSpacing: 0.8 },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: 6,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  kindRow: { gap: 6, paddingVertical: 6 },
  kindChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  kindLabel: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  reminderRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  reminderChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reminderChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  reminderChipText: {
    color: colors.onSurfaceSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  hint: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 4,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  deleteText: { color: colors.error, fontWeight: "700" },
});
