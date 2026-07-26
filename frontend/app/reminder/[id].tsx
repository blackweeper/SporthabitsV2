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
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  deleteReminder,
  getReminders,
  Reminder,
  ReminderKind,
  REMINDER_KIND_ICON,
  REMINDER_KIND_LABEL,
  saveReminder,
  uid,
} from "@/src/utils/gym-storage";

const KINDS: ReminderKind[] = [
  "workout",
  "hydration",
  "mobility",
  "measurement",
  "sleep",
  "other",
];

const DAYS = [
  { key: 1, label: "L" },
  { key: 2, label: "M" },
  { key: 3, label: "M" },
  { key: 4, label: "J" },
  { key: 5, label: "V" },
  { key: 6, label: "S" },
  { key: 0, label: "D" },
];

export default function ReminderEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const [r, setR] = useState<Reminder | null>(null);

  useEffect(() => {
    (async () => {
      if (isNew) {
        setR({
          id: uid(),
          kind: "workout",
          title: "",
          time: "18:00",
          daysOfWeek: [1, 2, 3, 4, 5],
          enabled: true,
          createdAt: new Date().toISOString(),
        });
      } else {
        const list = await getReminders();
        const found = list.find((x) => x.id === id);
        if (found) setR(found);
        else router.back();
      }
    })();
  }, [id, isNew, router]);

  if (!r) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const set = <K extends keyof Reminder>(k: K, v: Reminder[K]) =>
    setR((prev) => (prev ? { ...prev, [k]: v } : prev));

  const toggleDay = (d: number) => {
    if (!r) return;
    const has = r.daysOfWeek.includes(d);
    set("daysOfWeek", has ? r.daysOfWeek.filter((x) => x !== d) : [...r.daysOfWeek, d]);
  };

  const save = async () => {
    if (!r) return;
    if (!r.time.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("Heure invalide", "Utilise le format HH:MM (ex: 18:30)");
      return;
    }
    if (r.daysOfWeek.length === 0) {
      Alert.alert("Sélectionne au moins un jour");
      return;
    }
    await saveReminder(r);
    router.back();
  };

  const remove = async () => {
    if (!r || isNew) return;
    const doDel = async () => {
      await deleteReminder(r.id);
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm("Supprimer ce rappel ?")) doDel();
      return;
    }
    Alert.alert("Supprimer ce rappel ?", "", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: doDel },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>{isNew ? "Nouveau rappel" : "Rappel"}</Text>
        <Pressable onPress={save} hitSlop={12} testID="save-reminder">
          <Text style={styles.saveText}>SAUVER</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hintCard}>
            <Ionicons name="information-circle" size={14} color={colors.brand} />
            <Text style={styles.hintText}>
              Les rappels apparaîtront comme des notifications push après publication de l&apos;app avec un build natif.
            </Text>
          </View>

          <Text style={styles.miniLabel}>Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 46 }}
            contentContainerStyle={styles.kindRow}
          >
            {KINDS.map((k) => {
              const active = r.kind === k;
              return (
                <Pressable
                  key={k}
                  testID={`reminder-kind-${k}`}
                  style={[styles.kindChip, active && styles.kindChipActive]}
                  onPress={() => set("kind", k)}
                >
                  <Ionicons
                    name={REMINDER_KIND_ICON[k]}
                    size={14}
                    color={active ? "#fff" : colors.brand}
                  />
                  <Text style={[styles.kindLabel, active && { color: "#fff" }]}>
                    {REMINDER_KIND_LABEL[k]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.miniLabel}>Titre (optionnel)</Text>
          <TextInput
            testID="reminder-title"
            style={styles.input}
            value={r.title}
            onChangeText={(t) => set("title", t)}
            placeholder={REMINDER_KIND_LABEL[r.kind]}
            placeholderTextColor={colors.onSurfaceTertiary}
          />

          <Text style={styles.miniLabel}>Heure (HH:MM)</Text>
          <TextInput
            testID="reminder-time"
            style={styles.input}
            value={r.time}
            onChangeText={(t) => set("time", t.replace(/[^0-9:]/g, "").slice(0, 5))}
            placeholder="18:00"
            placeholderTextColor={colors.onSurfaceTertiary}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.miniLabel}>Jours de la semaine</Text>
          <View style={styles.daysRow}>
            {DAYS.map((d) => {
              const active = r.daysOfWeek.includes(d.key);
              return (
                <Pressable
                  key={d.key}
                  testID={`reminder-day-${d.key}`}
                  style={[styles.dayBtn, active && styles.dayBtnActive]}
                  onPress={() => toggleDay(d.key)}
                >
                  <Text style={[styles.dayText, active && { color: "#fff" }]}>
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Rappel actif</Text>
              <Text style={styles.switchSub}>
                Recevoir la notification aux heures configurées
              </Text>
            </View>
            <Switch
              testID="reminder-enabled"
              value={r.enabled}
              onValueChange={(v) => set("enabled", v)}
              trackColor={{ true: colors.brand, false: colors.surfaceTertiary }}
              thumbColor="#fff"
            />
          </View>

          {!isNew && (
            <Pressable style={styles.deleteBtn} onPress={remove}>
              <Ionicons name="trash" size={16} color={colors.error} />
              <Text style={styles.deleteText}>Supprimer</Text>
            </Pressable>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brandTertiary,
    padding: 10,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  hintText: {
    flex: 1,
    color: colors.brandSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
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
  daysRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  dayBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  dayText: { color: colors.onSurfaceSecondary, fontWeight: "800", fontSize: 12 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  switchTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 13 },
  switchSub: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
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
