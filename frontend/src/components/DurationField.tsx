import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import DurationPickerModal from "@/src/components/DurationPickerModal";

/** Renders "1:30" / "0:45" / "12:00" — minutes-first, seconds always shown. */
export function formatDurationMinSec(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Tap-to-open duration field: shows the value as minutes:seconds and opens
 * DurationPickerModal to edit it, instead of a raw numeric-seconds input.
 */
export default function DurationField({
  label,
  valueSeconds,
  onChange,
  testID,
  presetsSeconds,
}: {
  label: string;
  valueSeconds: number;
  onChange: (seconds: number) => void;
  testID?: string;
  presetsSeconds?: number[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Pressable
        testID={testID}
        style={styles.field}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.fieldValue}>{formatDurationMinSec(valueSeconds)}</Text>
        <Ionicons name="time-outline" size={14} color={colors.onSurfaceTertiary} />
      </Pressable>
      <DurationPickerModal
        visible={open}
        title={label}
        valueSeconds={valueSeconds}
        onChange={onChange}
        onClose={() => setOpen(false)}
        presetsSeconds={presetsSeconds}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  field: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldValue: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
});
