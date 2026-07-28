import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  computeSleepHoursFromTimes,
  formatSleepHM,
} from "@/src/utils/gym-storage";
import WheelPickerModal from "@/src/components/WheelPickerModal";

const BEDTIME_PRESETS = [
  { label: "21:30", a: 21, b: 30 },
  { label: "22:00", a: 22, b: 0 },
  { label: "22:30", a: 22, b: 30 },
  { label: "23:00", a: 23, b: 0 },
  { label: "23:30", a: 23, b: 30 },
];
const WAKE_PRESETS = [
  { label: "06:00", a: 6, b: 0 },
  { label: "06:30", a: 6, b: 30 },
  { label: "07:00", a: 7, b: 0 },
  { label: "07:30", a: 7, b: 30 },
  { label: "08:00", a: 8, b: 0 },
];
const DURATION_PRESETS = [
  { label: "6h", a: 6, b: 0 },
  { label: "6h30", a: 6, b: 30 },
  { label: "7h", a: 7, b: 0 },
  { label: "7h30", a: 7, b: 30 },
  { label: "8h", a: 8, b: 0 },
  { label: "8h30", a: 8, b: 30 },
  { label: "9h", a: 9, b: 0 },
];

function parseHM(t: string | null | undefined): { h: number; m: number } {
  if (!t) return { h: 22, m: 0 };
  const [h, m] = t.split(":").map(Number);
  return { h: Number.isFinite(h) ? h : 22, m: Number.isFinite(m) ? m : 0 };
}

function toHM(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type SleepValue = {
  mode: "auto" | "manual";
  bedtime: string | null;
  wakeTime: string | null;
  manualHours: number | null;
};

export default function SleepInput({
  value,
  onChange,
  testID,
}: {
  value: SleepValue;
  onChange: (next: SleepValue) => void;
  testID?: string;
}) {
  const [editing, setEditing] = useState<null | "bedtime" | "wake" | "manual">(null);

  const computedHours =
    value.mode === "auto"
      ? computeSleepHoursFromTimes(value.bedtime, value.wakeTime)
      : value.manualHours;

  const bedHM = parseHM(value.bedtime);
  const wakeHM = parseHM(value.wakeTime);
  const manualHM = {
    h: Math.floor(value.manualHours ?? 7.5),
    m: Math.round(((value.manualHours ?? 7.5) % 1) * 60),
  };

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.headRow}>
        <Ionicons name="moon" size={14} color={colors.brand} />
        <Text style={styles.label}>Sommeil</Text>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          testID="sleep-mode-auto"
          style={[styles.modeChip, value.mode === "auto" && styles.modeChipActive]}
          onPress={() => onChange({ ...value, mode: "auto" })}
        >
          <Text style={[styles.modeChipText, value.mode === "auto" && { color: "#fff" }]}>
            COUCHER / LEVER
          </Text>
        </Pressable>
        <Pressable
          testID="sleep-mode-manual"
          style={[styles.modeChip, value.mode === "manual" && styles.modeChipActive]}
          onPress={() => onChange({ ...value, mode: "manual" })}
        >
          <Text style={[styles.modeChipText, value.mode === "manual" && { color: "#fff" }]}>
            MANUEL
          </Text>
        </Pressable>
      </View>

      {value.mode === "auto" ? (
        <View style={styles.timesRow}>
          <Pressable
            testID="sleep-bedtime-field"
            style={styles.timeField}
            onPress={() => setEditing("bedtime")}
          >
            <Text style={styles.timeFieldLabel}>Coucher</Text>
            <Text style={styles.timeFieldValue}>{value.bedtime ?? "--:--"}</Text>
          </Pressable>
          <Ionicons name="arrow-forward" size={14} color={colors.onSurfaceTertiary} />
          <Pressable
            testID="sleep-wake-field"
            style={styles.timeField}
            onPress={() => setEditing("wake")}
          >
            <Text style={styles.timeFieldLabel}>Lever</Text>
            <Text style={styles.timeFieldValue}>{value.wakeTime ?? "--:--"}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          testID="sleep-manual-field"
          style={styles.manualField}
          onPress={() => setEditing("manual")}
        >
          <Text style={styles.timeFieldLabel}>Durée de sommeil</Text>
          <Text style={styles.timeFieldValue}>
            {value.manualHours != null ? formatSleepHM(value.manualHours) : "Ex: 7h30"}
          </Text>
        </Pressable>
      )}

      <View style={styles.durationCallout} testID={testID ? `${testID}-duration` : undefined}>
        <Text style={styles.durationLabel}>Temps de sommeil</Text>
        <Text style={styles.durationValue}>
          {computedHours != null ? formatSleepHM(computedHours) : "—"}
        </Text>
      </View>

      <WheelPickerModal
        visible={editing === "bedtime"}
        title="Heure de coucher"
        valueA={bedHM.h}
        valueB={bedHM.m}
        presets={BEDTIME_PRESETS}
        onConfirm={(h, m) => onChange({ ...value, bedtime: toHM(h, m) })}
        onClose={() => setEditing(null)}
      />
      <WheelPickerModal
        visible={editing === "wake"}
        title="Heure de lever"
        valueA={wakeHM.h}
        valueB={wakeHM.m}
        presets={WAKE_PRESETS}
        onConfirm={(h, m) => onChange({ ...value, wakeTime: toHM(h, m) })}
        onClose={() => setEditing(null)}
      />
      <WheelPickerModal
        visible={editing === "manual"}
        title="Durée de sommeil"
        valueA={manualHM.h}
        valueB={manualHM.m}
        maxA={14}
        labelA="H"
        labelB="MIN"
        presets={DURATION_PRESETS}
        onConfirm={(h, m) => onChange({ ...value, manualHours: h + m / 60 })}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { flex: 1, color: colors.onSurface, fontWeight: "800", fontSize: 13 },
  durationCallout: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  durationLabel: {
    color: colors.brandSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
  durationValue: {
    color: colors.brand,
    fontWeight: "800",
    fontSize: 22,
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    padding: 3,
    gap: 3,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 4,
  },
  modeChipActive: { backgroundColor: colors.brand },
  modeChipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.6,
  },
  timesRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  timeField: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: "center",
  },
  manualField: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  timeFieldLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeFieldValue: { color: colors.onSurface, fontWeight: "800", fontSize: 16 },
});
