import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { coloredShadow, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";

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
  const { theme } = useTheme();
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
        <GlassCard
          level="elevated"
          style={[
            styles.card,
            { borderRadius: theme.radius.lg },
            theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>

          <View style={styles.wheelsRow}>
            <Wheel label="MIN" value={minutes} onBump={bumpMinutes} accentColor={theme.colors.brand} valueColor={theme.colors.onSurface} labelColor={theme.colors.onSurfaceTertiary} />
            <Text style={[styles.colon, { color: theme.colors.onSurfaceTertiary }]}>:</Text>
            <Wheel label="SEC" value={seconds} onBump={bumpSeconds} step={15} accentColor={theme.colors.brand} valueColor={theme.colors.onSurface} labelColor={theme.colors.onSurfaceTertiary} />
          </View>

          <View style={styles.presetsRow}>
            {presetsSeconds.map((p) => (
              <Pressable
                key={p}
                testID={`duration-preset-${p}`}
                style={[
                  styles.presetChip,
                  {
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.surfaceTertiary,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => applyPreset(p)}
              >
                <Text style={[styles.presetChipText, { color: theme.colors.onSurface }]}>{formatShort(p)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              testID="duration-cancel"
              style={[styles.btnGhost, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.btnGhostText, { color: theme.colors.onSurfaceSecondary }]}>Annuler</Text>
            </Pressable>
            <Pressable
              testID="duration-confirm"
              style={[
                styles.btnPrimary,
                { borderRadius: theme.radius.md },
                theme.card.mode === "glass"
                  ? [
                      { backgroundColor: withAlpha(theme.colors.brand, 18), borderWidth: 1, borderColor: withAlpha(theme.colors.brand, 50) },
                      coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                    ]
                  : { backgroundColor: theme.colors.brand },
              ]}
              onPress={confirm}
            >
              <Text
                style={[
                  styles.btnPrimaryText,
                  theme.card.mode === "glass" && { color: theme.colors.brand },
                ]}
              >
                Valider
              </Text>
            </Pressable>
          </View>
        </GlassCard>
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
  accentColor,
  valueColor,
  labelColor,
}: {
  label: string;
  value: number;
  onBump: (delta: number) => void;
  step?: number;
  accentColor: string;
  valueColor: string;
  labelColor: string;
}) {
  return (
    <View style={styles.wheel}>
      <Pressable
        testID={`wheel-${label}-up`}
        style={styles.wheelBtn}
        onPress={() => onBump(step)}
        hitSlop={8}
      >
        <Ionicons name="chevron-up" size={20} color={accentColor} />
      </Pressable>
      <Text style={[styles.wheelValue, { color: valueColor }]}>{String(value).padStart(2, "0")}</Text>
      <Pressable
        testID={`wheel-${label}-down`}
        style={styles.wheelBtn}
        onPress={() => onBump(-step)}
        hitSlop={8}
      >
        <Ionicons name="chevron-down" size={20} color={accentColor} />
      </Pressable>
      <Text style={[styles.wheelLabel, { color: labelColor }]}>{label}</Text>
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
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
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
    fontSize: 40,
    fontWeight: "800",
    minWidth: 64,
    textAlign: "center",
  },
  wheelLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  colon: {
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
    borderWidth: 1,
  },
  presetChipText: {
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
    alignItems: "center",
    borderWidth: 1,
  },
  btnGhostText: { fontWeight: "800" },
  btnPrimary: {
    flex: 1,
    padding: 14,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
});
