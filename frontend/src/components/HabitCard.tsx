import { ReactNode, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
// ScrollView de react-native-gesture-handler (pas celui de react-native) :
// le ScrollView natif perdait la négociation de geste face aux
// PressableScale enfants (chips) sur mobile — le rang ne défilait plus
// horizontalement même si chaque chip restait cliquable.
import { ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "@/src/theme";
import PressableScale from "@/src/components/ui/PressableScale";

/** Shared "saisir/ajouter une valeur" modal for quantitative habit cards
 * (Eau, Calories, Pas, and any future numeric habit) — one instance reused
 * from the parent screen instead of duplicating this modal per card.
 *
 * Note historique : ce fichier hébergeait aussi `HabitCard` (la coquille
 * visuelle "grosse ligne" des habitudes personnalisées), `ActionsRow` et
 * `WideActionButton`. Retirés lors de POLISH V2 : les habitudes
 * personnalisées utilisent désormais les mêmes tuiles `RingChip`
 * qu'Eau/Calories/Pas (voir app/(tabs)/index.tsx). `ActionsScroll`/
 * `ActionChip`/`MinusButton` restent : toujours utilisés par les raccourcis
 * de préréglage à l'intérieur de `QuantityModal` (Eau/Calories/Pas). */
export function QuantityModal({
  mode,
  label,
  unit,
  currentValue,
  color,
  quickActions,
  onClose,
  onSubmit,
}: {
  mode: "set" | "add" | null;
  label: string;
  unit: string;
  currentValue: number;
  color: string;
  /** Optional preset shortcuts (e.g. +250 ml, meal presets) shown above the
   * manual input — moved in here from the Dashboard's rings so nothing that
   * existed inline before is actually lost, just one tap deeper. */
  quickActions?: React.ReactNode;
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
            {quickActions}
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

/** Horizontal-scroll actions layout — for habits with many shortcuts (ex.
 * Calories meal presets) so the row never grows taller to fit them all. */
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
    <PressableScale
      testID={testID}
      style={[styles.chip, color && { borderColor: color }]}
      onPress={onPress}
    >
      {emoji ? <Text style={styles.chipEmoji}>{emoji}</Text> : null}
      <Text style={[styles.chipText, color && { color }]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Visual "carte défilante" preset — richer than `ActionChip`, for choices
 * that benefit from more presence (meal presets: emoji + value stand out at
 * a glance in a horizontal `ActionsScroll`, tap to add-and-close). Numeric
 * increments (water/steps) stay on the plainer `ActionChip` — a short
 * number doesn't need this much visual weight. */
export function PresetCard({
  label,
  value,
  emoji,
  onPress,
  testID,
}: {
  label: string;
  value: string;
  emoji?: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <PressableScale testID={testID} style={styles.presetCard} onPress={onPress}>
      <Text style={styles.presetCardEmoji}>{emoji ?? "🍽️"}</Text>
      <Text style={styles.presetCardValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.presetCardLabel} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

export function MinusButton({ onPress, testID }: { onPress: () => void; testID?: string }) {
  return (
    <PressableScale testID={testID} style={styles.minusBtn} onPress={onPress} hitSlop={6}>
      <Ionicons name="remove" size={14} color={colors.onSurface} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.elevated,
  },
  presetCard: {
    width: 76,
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetCardEmoji: { fontSize: 20 },
  presetCardValue: { color: colors.onSurface, fontWeight: "800", fontSize: 13 },
  presetCardLabel: { color: colors.onSurfaceTertiary, fontWeight: "600", fontSize: 10, textAlign: "center" },
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
