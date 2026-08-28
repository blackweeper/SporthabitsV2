import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { coloredShadow, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
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
  const { theme } = useTheme();
  const isGlass = theme.card.mode === "glass";
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
        <Ionicons name="moon" size={14} color={theme.colors.brand} />
        <Text style={[styles.label, { color: theme.colors.onSurface }]}>Sommeil</Text>
      </View>

      <View
        style={[
          styles.modeRow,
          { borderRadius: theme.radius.sm, backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary },
        ]}
      >
        <Pressable
          testID="sleep-mode-auto"
          style={[
            styles.modeChip,
            value.mode === "auto"
              ? isGlass
                ? { backgroundColor: withAlpha(theme.colors.brand, 22) }
                : { backgroundColor: theme.colors.brand }
              : null,
          ]}
          onPress={() => onChange({ ...value, mode: "auto" })}
        >
          <Text
            style={[
              styles.modeChipText,
              { color: theme.colors.onSurfaceTertiary },
              value.mode === "auto" && { color: isGlass ? theme.colors.brand : "#fff" },
            ]}
          >
            COUCHER / LEVER
          </Text>
        </Pressable>
        <Pressable
          testID="sleep-mode-manual"
          style={[
            styles.modeChip,
            value.mode === "manual"
              ? isGlass
                ? { backgroundColor: withAlpha(theme.colors.brand, 22) }
                : { backgroundColor: theme.colors.brand }
              : null,
          ]}
          onPress={() => onChange({ ...value, mode: "manual" })}
        >
          <Text
            style={[
              styles.modeChipText,
              { color: theme.colors.onSurfaceTertiary },
              value.mode === "manual" && { color: isGlass ? theme.colors.brand : "#fff" },
            ]}
          >
            MANUEL
          </Text>
        </Pressable>
      </View>

      {value.mode === "auto" ? (
        <View style={styles.timesRow}>
          <Pressable
            testID="sleep-bedtime-field"
            style={[
              styles.timeField,
              { borderRadius: theme.radius.md, backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary },
            ]}
            onPress={() => setEditing("bedtime")}
          >
            <Text style={[styles.timeFieldLabel, { color: theme.colors.onSurfaceTertiary }]}>Coucher</Text>
            <Text style={[styles.timeFieldValue, { color: theme.colors.onSurface }]}>{value.bedtime ?? "--:--"}</Text>
          </Pressable>
          <Ionicons name="arrow-forward" size={14} color={theme.colors.onSurfaceTertiary} />
          <Pressable
            testID="sleep-wake-field"
            style={[
              styles.timeField,
              { borderRadius: theme.radius.md, backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary },
            ]}
            onPress={() => setEditing("wake")}
          >
            <Text style={[styles.timeFieldLabel, { color: theme.colors.onSurfaceTertiary }]}>Lever</Text>
            <Text style={[styles.timeFieldValue, { color: theme.colors.onSurface }]}>{value.wakeTime ?? "--:--"}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          testID="sleep-manual-field"
          style={[
            styles.manualField,
            { borderRadius: theme.radius.md, backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary },
          ]}
          onPress={() => setEditing("manual")}
        >
          <Text style={[styles.timeFieldLabel, { color: theme.colors.onSurfaceTertiary }]}>Durée de sommeil</Text>
          <Text style={[styles.timeFieldValue, { color: theme.colors.onSurface }]}>
            {value.manualHours != null ? formatSleepHM(value.manualHours) : "Ex: 7h30"}
          </Text>
        </Pressable>
      )}

      <View
        style={[
          styles.durationCallout,
          { borderRadius: theme.radius.md },
          isGlass
            ? [
                { backgroundColor: withAlpha(theme.colors.brand, 12), borderColor: withAlpha(theme.colors.brand, 30) },
                coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.12, radius: 10, elevation: 2 }),
              ]
            : { backgroundColor: theme.colors.brandTertiary, borderColor: theme.colors.brand },
        ]}
        testID={testID ? `${testID}-duration` : undefined}
      >
        <Text style={[styles.durationLabel, { color: theme.colors.brandSecondary }]}>Temps de sommeil</Text>
        <Text style={[styles.durationValue, { color: theme.colors.brand }]}>
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
  label: { flex: 1, fontWeight: "800", fontSize: 13 },
  durationCallout: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  durationLabel: {
    fontWeight: "700",
    fontSize: 12,
  },
  durationValue: {
    fontWeight: "800",
    fontSize: 22,
  },
  modeRow: {
    flexDirection: "row",
    padding: 3,
    gap: 3,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 4,
  },
  modeChipText: {
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.6,
  },
  timesRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  timeField: {
    flex: 1,
    padding: spacing.sm,
    alignItems: "center",
  },
  manualField: {
    padding: spacing.md,
    alignItems: "center",
  },
  timeFieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeFieldValue: { fontWeight: "800", fontSize: 16 },
});
