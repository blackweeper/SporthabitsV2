import { ReactNode, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";

/**
 * Single shared visual shell for every "track something daily" card on the
 * Dashboard (Eau/Calories/Pas and every custom habit): icon → name → % →
 * value/target → progress bar → quick actions. What differs between habits
 * is only the `actions` content, composed by the caller with the helpers
 * below (`ActionChip`, `WideActionButton`, `ActionsRow`, `ActionsScroll`) —
 * this keeps the shell itself simple and avoids a rigid variant system.
 */
export default function HabitCard({
  testId,
  icon,
  color,
  title,
  value,
  target,
  unit,
  onPressValue,
  onLongPress,
  actions,
}: {
  testId?: string;
  icon: any;
  color: string;
  title: string;
  value: number;
  target: number;
  unit?: string;
  onPressValue?: () => void;
  onLongPress?: () => void;
  actions: ReactNode;
}) {
  const pct = Math.min(1, target > 0 ? value / target : 0);
  const done = pct >= 1;
  const bounce = useRef(new Animated.Value(1)).current;
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    Animated.sequence([
      Animated.spring(bounce, { toValue: 1.25, useNativeDriver: true, speed: 30, bounciness: 12 }),
      Animated.spring(bounce, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
  }, [value, bounce]);

  return (
    <View style={[styles.card, done && { borderColor: color }]} testID={testId}>
      <Pressable
        testID={testId ? `${testId}-body` : undefined}
        onPress={onPressValue}
        onLongPress={onLongPress}
        delayLongPress={450}
      >
        <View style={styles.head}>
          <Animated.View
            style={[
              styles.iconWrap,
              { backgroundColor: color + "26", transform: [{ scale: bounce }] },
            ]}
          >
            <Ionicons name={icon} size={15} color={color} />
          </Animated.View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.pct, done && { color }]}>{Math.round(pct * 100)}%</Text>
          {done && <Ionicons name="checkmark-circle" size={13} color={color} />}
        </View>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{formatNumber(value)}</Text>
          <Text style={styles.target}>
            / {formatNumber(target)}
            {unit ? ` ${unit}` : ""}
          </Text>
        </View>
      </Pressable>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.actionsSlot}>{actions}</View>
    </View>
  );
}

/** Default actions layout: wraps chips (or stretches a single wide button). */
export function ActionsRow({ children }: { children: ReactNode }) {
  return <View style={styles.actionsRow}>{children}</View>;
}

/** Horizontal-scroll actions layout — for habits with many shortcuts (ex.
 * Calories meal presets) so the card never grows taller to fit them all. */
export function ActionsScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.actionsScroll}
    >
      {children}
    </ScrollView>
  );
}

export function ActionChip({
  label,
  emoji,
  onPress,
  color,
  testID,
}: {
  label: string;
  emoji?: string;
  onPress: () => void;
  color?: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      style={[styles.chip, color && { borderColor: color }]}
      onPress={onPress}
    >
      {emoji ? <Text style={styles.chipEmoji}>{emoji}</Text> : null}
      <Text style={[styles.chipText, color && { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function MinusButton({ onPress, testID }: { onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} style={styles.minusBtn} onPress={onPress} hitSlop={6}>
      <Ionicons name="remove" size={14} color={colors.onSurface} />
    </Pressable>
  );
}

/** Single, full-width call-to-action (timer start/resume, checkbox toggle). */
export function WideActionButton({
  label,
  icon,
  color,
  onPress,
  testID,
}: {
  label: string;
  icon?: any;
  color: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      style={[styles.wideBtn, { backgroundColor: color }]}
      onPress={onPress}
    >
      {icon && <Ionicons name={icon} size={14} color="#fff" />}
      <Text style={styles.wideBtnText}>{label}</Text>
    </Pressable>
  );
}

/** Shared "saisir/ajouter une valeur" modal for quantitative habit cards
 * (Eau, Calories, Pas, and any future numeric habit) — one instance reused
 * from the parent screen instead of duplicating this modal per card. */
export function QuantityModal({
  mode,
  label,
  unit,
  currentValue,
  color,
  onClose,
  onSubmit,
}: {
  mode: "set" | "add" | null;
  label: string;
  unit: string;
  currentValue: number;
  color: string;
  onClose: () => void;
  onSubmit: (n: number) => void;
}) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (mode === "set") setDraft(String(currentValue));
    else if (mode === "add") setDraft("");
  }, [mode, currentValue]);

  const submit = () => {
    const n = parseInt(draft.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(n)) onSubmit(n);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={mode !== null}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {mode === "add" ? `Ajouter ${label.toLowerCase()}` : `Saisir ${label.toLowerCase()}`}
            </Text>
            <TextInput
              testID="quantity-modal-input"
              style={styles.modalInput}
              value={draft}
              onChangeText={setDraft}
              keyboardType="number-pad"
              placeholder={mode === "add" ? `Ex: 325 ${unit}` : `0 ${unit}`}
              placeholderTextColor={colors.onSurfaceTertiary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable onPress={onClose} style={styles.modalBtnGhost}>
                <Text style={styles.modalBtnGhostText}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                style={[styles.modalBtn, { backgroundColor: color }]}
                testID="quantity-modal-save"
              >
                <Text style={styles.modalBtnText}>
                  {mode === "add" ? "Ajouter" : "Valider"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
    </Modal>
  );
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 12,
  },
  pct: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 12,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  value: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "800",
  },
  target: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "600",
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3 },
  actionsSlot: { marginTop: 2 },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  actionsScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipEmoji: { fontSize: 12 },
  chipText: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 11.5,
  },
  minusBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  wideBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    width: "100%",
  },
  wideBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12.5,
    letterSpacing: 0.3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 16,
  },
  modalInput: {
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  modalBtnGhost: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnGhostText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "800",
  },
});
