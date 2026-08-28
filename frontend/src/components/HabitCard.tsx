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
import { coloredShadow, shadow, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import PressableScale from "@/src/components/ui/PressableScale";
import GlassCard from "@/src/components/ui/GlassCard";

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
  const { theme } = useTheme();
  const isGlass = theme.card.mode === "glass";
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
          <GlassCard
            level="elevated"
            style={[
              styles.modalCard,
              { borderRadius: theme.radius.lg },
              !isGlass && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              {mode === "add" ? `Ajouter ${label.toLowerCase()}` : `Saisir ${label.toLowerCase()}`}
            </Text>
            {quickActions}
            <TextInput
              testID="quantity-modal-input"
              style={[
                styles.modalInput,
                {
                  backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
                  borderRadius: theme.radius.md,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.border,
                },
              ]}
              value={draft}
              onChangeText={setDraft}
              keyboardType="number-pad"
              placeholder={mode === "add" ? `Ex: 325 ${unit}` : `0 ${unit}`}
              placeholderTextColor={theme.colors.onSurfaceTertiary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={onClose}
                style={[styles.modalBtnGhost, { borderRadius: theme.radius.md, borderColor: theme.colors.border }]}
              >
                <Text style={[styles.modalBtnGhostText, { color: theme.colors.onSurfaceSecondary }]}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                style={[
                  styles.modalBtn,
                  { borderRadius: theme.radius.md },
                  isGlass
                    ? [
                        { backgroundColor: withAlpha(color, 20), borderWidth: 1, borderColor: withAlpha(color, 50) },
                        coloredShadow(color, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                      ]
                    : { backgroundColor: color },
                ]}
                testID="quantity-modal-save"
              >
                <Text style={[styles.modalBtnText, isGlass && { color }]}>
                  {mode === "add" ? "Ajouter" : "Valider"}
                </Text>
              </Pressable>
            </View>
          </GlassCard>
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
  const { theme } = useTheme();
  const isGlass = theme.card.mode === "glass";
  return (
    <PressableScale
      testID={testID}
      style={[
        styles.chip,
        {
          backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
          borderRadius: theme.radius.pill,
          borderColor: theme.colors.border,
        },
        color && { borderColor: color },
      ]}
      onPress={onPress}
    >
      {emoji ? <Text style={styles.chipEmoji}>{emoji}</Text> : null}
      <Text
        style={[styles.chipText, { color: theme.colors.onSurface }, color && { color }]}
        numberOfLines={1}
      >
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
  const { theme } = useTheme();
  const isGlass = theme.card.mode === "glass";
  return (
    <PressableScale
      testID={testID}
      style={[
        styles.presetCard,
        {
          backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text style={styles.presetCardEmoji}>{emoji ?? "🍽️"}</Text>
      <Text style={[styles.presetCardValue, { color: theme.colors.onSurface }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.presetCardLabel, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

export function MinusButton({ onPress, testID }: { onPress: () => void; testID?: string }) {
  const { theme } = useTheme();
  const isGlass = theme.card.mode === "glass";
  return (
    <PressableScale
      testID={testID}
      style={[
        styles.minusBtn,
        {
          backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      hitSlop={6}
    >
      <Ionicons name="remove" size={14} color={theme.colors.onSurface} />
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
    borderWidth: 1,
  },
  chipEmoji: { fontSize: 12 },
  chipText: {
    fontWeight: "700",
    fontSize: 11.5,
  },
  minusBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    ...shadow.elevated,
  },
  presetCard: {
    width: 76,
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  presetCardEmoji: { fontSize: 20 },
  presetCardValue: { fontWeight: "800", fontSize: 13 },
  presetCardLabel: { fontWeight: "600", fontSize: 10, textAlign: "center" },
  modalTitle: {
    fontWeight: "800",
    fontSize: 16,
  },
  modalInput: {
    borderWidth: 1,
    padding: 14,
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
    alignItems: "center",
    borderWidth: 1,
  },
  modalBtnGhostText: {
    fontWeight: "800",
  },
});
