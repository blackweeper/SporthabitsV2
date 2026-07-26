import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  DailyJournalEntry,
  getDailyJournal,
  saveDailyJournal,
  todayYYYYMMDD,
} from "@/src/utils/gym-storage";

export default function DailyJournalScreen() {
  const router = useRouter();
  const [entry, setEntry] = useState<DailyJournalEntry>({
    date: todayYYYYMMDD(),
  });
  const [past, setPast] = useState<DailyJournalEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const list = await getDailyJournal();
        setPast(list.sort((a, b) => (a.date < b.date ? 1 : -1)));
        const today = todayYYYYMMDD();
        const cur = list.find((x) => x.date === today);
        setEntry(cur ?? { date: today });
      })();
    }, []),
  );

  const save = async () => {
    await saveDailyJournal(entry);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Journal du jour</Text>
        <Pressable onPress={save} hitSlop={12} testID="save-daily-journal">
          <Text style={styles.saveText}>SAUVER</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.dateCard}>
            <Ionicons name="calendar" size={14} color={colors.brand} />
            <Text style={styles.dateText}>
              {formatDate(entry.date)}
            </Text>
          </View>

          <Rating
            label="Énergie"
            icon="battery-charging"
            value={entry.energy ?? null}
            onChange={(v) => setEntry({ ...entry, energy: v })}
          />
          <Rating
            label="Motivation"
            icon="flame"
            value={entry.motivation ?? null}
            onChange={(v) => setEntry({ ...entry, motivation: v })}
          />
          <Rating
            label="Humeur"
            icon="happy"
            value={entry.mood ?? null}
            onChange={(v) => setEntry({ ...entry, mood: v })}
          />
          <Rating
            label="Stress"
            icon="warning"
            value={entry.stress ?? null}
            onChange={(v) => setEntry({ ...entry, stress: v })}
          />

          <Text style={styles.miniLabel}>Sommeil (h)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={entry.sleep_hours == null ? "" : String(entry.sleep_hours)}
            onChangeText={(t) => {
              if (t.trim() === "") return setEntry({ ...entry, sleep_hours: null });
              const n = parseFloat(t.replace(",", "."));
              if (!isNaN(n)) setEntry({ ...entry, sleep_hours: n });
            }}
            placeholder="8"
            placeholderTextColor={colors.onSurfaceTertiary}
          />

          <Text style={styles.miniLabel}>Douleurs</Text>
          <TextInput
            style={styles.textArea}
            value={entry.pain || ""}
            onChangeText={(t) => setEntry({ ...entry, pain: t.trim() ? t : null })}
            placeholder="Ex: petite tension aux lombaires"
            placeholderTextColor={colors.onSurfaceTertiary}
            multiline
          />

          <Text style={styles.miniLabel}>Notes</Text>
          <TextInput
            style={[styles.textArea, { minHeight: 100 }]}
            value={entry.notes || ""}
            onChangeText={(t) => setEntry({ ...entry, notes: t.trim() ? t : null })}
            placeholder="Comment tu te sens aujourd'hui ?"
            placeholderTextColor={colors.onSurfaceTertiary}
            multiline
          />

          {past.length > 1 && (
            <>
              <Text style={styles.sectionTitle}>Historique</Text>
              {past
                .filter((p) => p.date !== entry.date)
                .slice(0, 30)
                .map((p) => (
                  <View key={p.date} style={styles.pastCard}>
                    <View style={styles.pastHead}>
                      <Text style={styles.pastDate}>{formatDate(p.date)}</Text>
                      <View style={styles.pastRatings}>
                        {p.energy != null && <MiniBadge label="⚡" value={p.energy} />}
                        {p.mood != null && <MiniBadge label="🙂" value={p.mood} />}
                        {p.stress != null && <MiniBadge label="⚠️" value={p.stress} />}
                      </View>
                    </View>
                    {p.notes ? (
                      <Text style={styles.pastNotes} numberOfLines={3}>
                        {p.notes}
                      </Text>
                    ) : null}
                  </View>
                ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Rating({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: any;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <View style={styles.ratingRow}>
      <View style={styles.ratingHead}>
        <Ionicons name={icon} size={14} color={colors.brand} />
        <Text style={styles.ratingLabel}>{label}</Text>
        <Text style={styles.ratingValue}>
          {value != null ? `${value}/10` : "—"}
        </Text>
      </View>
      <View style={styles.dotsRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(value === n ? null : n)}
            style={[styles.dot, value != null && n <= value && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

function MiniBadge({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.miniBadge}>
      <Text style={styles.miniBadgeText}>
        {label} {value}
      </Text>
    </View>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
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
  saveText: { color: colors.brand, fontWeight: "800", letterSpacing: 0.8 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  dateText: {
    color: colors.brandSecondary,
    fontWeight: "800",
    textTransform: "capitalize",
    fontSize: 13,
  },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: 4,
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
  textArea: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: "top",
    marginTop: 4,
  },
  ratingRow: { gap: 6 },
  ratingHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingLabel: {
    flex: 1,
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 13,
  },
  ratingValue: { color: colors.brand, fontWeight: "800", fontSize: 12 },
  dotsRow: { flexDirection: "row", gap: 4 },
  dot: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.md,
    letterSpacing: 0.5,
  },
  pastCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  pastHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pastDate: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "capitalize",
  },
  pastRatings: { flexDirection: "row", gap: 4 },
  miniBadge: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeText: {
    color: colors.onSurface,
    fontSize: 10,
    fontWeight: "700",
  },
  pastNotes: { color: colors.onSurfaceSecondary, fontSize: 12, lineHeight: 16 },
});
