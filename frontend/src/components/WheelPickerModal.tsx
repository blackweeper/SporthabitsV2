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
 * Generic two-wheel picker (e.g. hour:minute) with quick-pick presets.
 * Used for bedtime/wake-time and manual sleep-duration entry — anywhere a
 * plain numeric field would be less pleasant than tapping a couple of
 * steppers. Migré sur `useTheme()` (Glacier Aurora) — même patron que
 * `DurationPickerModal.tsx`, jusqu'ici resté statique/orange par erreur.
 */
export default function WheelPickerModal({
  visible,
  title,
  valueA,
  valueB,
  maxA = 23,
  maxB = 59,
  stepB = 5,
  labelA = "H",
  labelB = "MIN",
  presets,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  valueA: number;
  valueB: number;
  maxA?: number;
  maxB?: number;
  stepB?: number;
  labelA?: string;
  labelB?: string;
  presets?: { label: string; a: number; b: number }[];
  onConfirm: (a: number, b: number) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const isGlass = theme.card.mode === "glass";
  const [a, setA] = useState(valueA);
  const [b, setB] = useState(valueB);

  useEffect(() => {
    if (!visible) return;
    setA(valueA);
    setB(valueB);
  }, [visible, valueA, valueB]);

  const bumpA = (d: number) => setA((v) => clamp(v + d, 0, maxA));
  const bumpB = (d: number) =>
    setB((v) => {
      let next = v + d;
      if (next > maxB) {
        setA((av) => clamp(av + 1, 0, maxA));
        next -= maxB + 1;
      } else if (next < 0) {
        setA((av) => clamp(av - 1, 0, maxA));
        next += maxB + 1;
      }
      return clamp(next, 0, maxB);
    });

  const confirm = () => {
    onConfirm(a, b);
    onClose();
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
            !isGlass && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>

          <View style={styles.wheelsRow}>
            <Wheel label={labelA} value={a} onBump={bumpA} accentColor={theme.colors.brand} valueColor={theme.colors.onSurface} labelColor={theme.colors.onSurfaceTertiary} />
            <Text style={[styles.colon, { color: theme.colors.onSurfaceTertiary }]}>:</Text>
            <Wheel label={labelB} value={b} onBump={bumpB} step={stepB} accentColor={theme.colors.brand} valueColor={theme.colors.onSurface} labelColor={theme.colors.onSurfaceTertiary} />
          </View>

          {presets && presets.length > 0 && (
            <View style={styles.presetsRow}>
              {presets.map((p) => (
                <Pressable
                  key={p.label}
                  testID={`wheel-preset-${p.label}`}
                  style={[
                    styles.presetChip,
                    {
                      borderRadius: theme.radius.pill,
                      backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setA(p.a);
                    setB(p.b);
                  }}
                >
                  <Text style={[styles.presetChipText, { color: theme.colors.onSurface }]}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.actionsRow}>
            <Pressable
              testID="wheel-cancel"
              style={[styles.btnGhost, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.btnGhostText, { color: theme.colors.onSurfaceSecondary }]}>Annuler</Text>
            </Pressable>
            <Pressable
              testID="wheel-confirm"
              style={[
                styles.btnPrimary,
                { borderRadius: theme.radius.md },
                isGlass
                  ? [
                      { backgroundColor: withAlpha(theme.colors.brand, 18), borderWidth: 1, borderColor: withAlpha(theme.colors.brand, 50) },
                      coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                    ]
                  : { backgroundColor: theme.colors.brand },
              ]}
              onPress={confirm}
            >
              <Text style={[styles.btnPrimaryText, isGlass && { color: theme.colors.brand }]}>Valider</Text>
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
      <Pressable testID={`wheel-${label}-up`} style={styles.wheelBtn} onPress={() => onBump(step)} hitSlop={8}>
        <Ionicons name="chevron-up" size={20} color={accentColor} />
      </Pressable>
      <Text style={[styles.wheelValue, { color: valueColor }]}>{String(value).padStart(2, "0")}</Text>
      <Pressable testID={`wheel-${label}-down`} style={styles.wheelBtn} onPress={() => onBump(-step)} hitSlop={8}>
        <Ionicons name="chevron-down" size={20} color={accentColor} />
      </Pressable>
      <Text style={[styles.wheelLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
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
