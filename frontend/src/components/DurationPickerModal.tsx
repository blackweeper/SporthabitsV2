import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Pleasant minutes-first duration picker (replaces raw "enter a number of
 * seconds" text fields). Values are still exchanged in seconds so callers
 * don't need to touch storage — only the editing experience changes.
 */
export default function DurationPickerModal({
  visible,
  title,
  valueSeconds,
  onChange,
  onClose,
  presetsSeconds = [15, 30, 45, 60, 90, 120, 180, 300],
  maxMinutes = 60,
}: {
  visible: boolean;
  title: string;
  valueSeconds: number;
  onChange: (seconds: number) => void;
  onClose: () => void;
  presetsSeconds?: number[];
  maxMinutes?: number;
}) {
  const [minutes, setMinutes] = useState(Math.floor(valueSeconds / 60));
  const [seconds, setSeconds] = useState(valueSeconds % 60);

  useEffect(() => {
    if (!visible) return;
    setMinutes(Math.floor(valueSeconds / 60));
    setSeconds(valueSeconds % 60);
  }, [visible, valueSeconds]);

  const bumpMinutes = (d: number) => setMinutes((m) => clamp(m + d, 0, maxMinutes));
  const bumpSeconds = (d: number) =>
    setSeconds((s) => {
      let next = s + d;
      if (next >= 60) {
        setMinutes((m) => clamp(m + 1, 0, maxMinutes));
        next -= 60;
      } else if (next < 0) {
        if (minutes > 0) setMinutes((m) => clamp(m - 1, 0, maxMinutes));
        next += 60;
      }
      return clamp(next, 0, 59);
    });

  const confirm = () => {
    onChange(minutes * 60 + seconds);
    onClose();
  };

  const applyPreset = (sec: number) => {
    setMinutes(Math.floor(sec / 60));
    setSeconds(sec % 60);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.wheelsRow}>
            <Wheel label="MIN" value={minutes} onBump={bumpMinutes} />
            <Text style={styles.colon}>:</Text>
            <Wheel label="SEC" value={seconds} onBump={bumpSeconds} step={15} />
          </View>

          <View style={styles.presetsRow}>
            {presetsSeconds.map((p) => (
              <Pressable
                key={p}
                testID={`duration-preset-${p}`}
                style={styles.presetChip}
                onPress={() => applyPreset(p)}
              >
                <Text style={styles.presetChipText}>{formatShort(p)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              testID="duration-cancel"
              style={styles.btnGhost}
              onPress={onClose}
            >
              <Text style={styles.btnGhostText}>Annuler</Text>
            </Pressable>
            <Pressable
              testID="duration-confirm"
              style={styles.btnPrimary}
              onPress={confirm}
            >
              <Text style={styles.btnPrimaryText}>Valider</Text>
            </Pressable>
          </View>
        </View>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
    </Modal>
  );
}

function Wheel({
  label,
  value,
  onBump,
  step = 1,
}: {
  label: string;
  value: number;
  onBump: (delta: number) => void;
  step?: number;
}) {
  return (
    <View style={styles.wheel}>
      <Pressable
        testID={`wheel-${label}-up`}
        style={styles.wheelBtn}
        onPress={() => onBump(step)}
        hitSlop={8}
      >
        <Ionicons name="chevron-up" size={20} color={colors.brand} />
      </Pressable>
      <Text style={styles.wheelValue}>{String(value).padStart(2, "0")}</Text>
      <Pressable
        testID={`wheel-${label}-down`}
        style={styles.wheelBtn}
        onPress={() => onBump(-step)}
        hitSlop={8}
      >
        <Ionicons name="chevron-down" size={20} color={colors.brand} />
      </Pressable>
      <Text style={styles.wheelLabel}>{label}</Text>
    </View>
  );
}

function formatShort(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}min` : `${m}min${s}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 15,
    textAlign: "center",
  },
  wheelsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  wheel: { alignItems: "center", gap: 2 },
  wheelBtn: { padding: 4 },
  wheelValue: {
    color: colors.onSurface,
    fontSize: 40,
    fontWeight: "800",
    minWidth: 64,
    textAlign: "center",
  },
  wheelLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  colon: {
    color: colors.onSurfaceTertiary,
    fontSize: 32,
    fontWeight: "800",
    marginTop: -14,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipText: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btnGhost: {
    flex: 1,
    padding: 14,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhostText: { color: colors.onSurfaceSecondary, fontWeight: "800" },
  btnPrimary: {
    flex: 1,
    padding: 14,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.brand,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
});
