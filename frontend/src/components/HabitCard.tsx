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
  ScrollView as RNScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  headerActionLabel,
  onHeaderAction,
  headerActionTestID,
  onClose,
  onSubmit,
}: {
  mode: "set" | "add" | null;
  label: string;
  unit: string;
  currentValue: number;
  color: string;
  /** Optional preset shortcuts (e.g. +250 ml, meal presets) — rendered
   * inside the single scrollable body zone, ABOVE the manual input, never
   * in a separate nested scroll view of their own (a vertical list inside a
   * vertical ScrollView fights for gesture ownership and is exactly what
   * caused the sheet's internal overlap bugs). */
  quickActions?: React.ReactNode;
  /** Optional fixed-header action (ex. "Personnaliser" → gérer les
   * raccourcis) — rendered next to the title, never scrolls away with the
   * list. */
  headerActionLabel?: string;
  onHeaderAction?: () => void;
  headerActionTestID?: string;
  onClose: () => void;
  onSubmit: (n: number) => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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

  // Bottom Sheet à 3 zones (header fixe / corps scrollable / footer fixe),
  // même patron que `ExerciseLinkModal` — pas de hauteur fixe fragile :
  // `KeyboardAvoidingView` remplit tout l'écran (`flex:1`) et pousse son
  // contenu vers le haut à l'ouverture du clavier (padding/height natifs,
  // jamais de décalage horizontal ni de zoom) ; la feuille elle-même est
  // bornée par `maxHeight:"85%"` **relatif à cette même box**, recalculé à
  // chaque layout — jamais un `Dimensions.get()` figé qui ignorerait la
  // présence du clavier ou une rotation d'écran. À l'intérieur, seul le
  // corps (`RNScrollView`, `flex:1`) est scrollable ; le header (poignée +
  // titre + action) et le footer (Annuler/Ajouter, avec le padding de la
  // safe-area) sont des frères de taille fixe dans la même colonne flex —
  // ils ne peuvent donc structurellement jamais se chevaucher ni recouvrir
  // la liste, quelle que soit la taille de l'écran.
  return (
    <Modal
      transparent
      visible={mode !== null}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <GlassCard
          level="elevated"
          style={[
            styles.modalSheet,
            { borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg },
            !isGlass && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
          ]}
        >
          {/* HEADER — fixe, jamais dans le flux qui défile. */}
          <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              {mode === "add" ? `Ajouter ${label.toLowerCase()}` : `Saisir ${label.toLowerCase()}`}
            </Text>
            {onHeaderAction && headerActionLabel && (
              <PressableScale
                testID={headerActionTestID}
                onPress={onHeaderAction}
                hitSlop={8}
                style={styles.customizeBtn}
              >
                <Ionicons name="options-outline" size={13} color={theme.colors.brand} />
                <Text style={[styles.customizeBtnText, { color: theme.colors.brand }]}>{headerActionLabel}</Text>
              </PressableScale>
            )}
          </View>

          {/* CORPS — seule zone scrollable, prend tout l'espace restant
              entre header et footer (`flex:1`). Raccourcis + champ de
              saisie personnalisée vivent ensemble ici, jamais séparés. */}
          <RNScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
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
          </RNScrollView>

          {/* FOOTER — fixe, toujours visible, jamais recouvert par la
              liste ; `insets.bottom` évite que les boutons se retrouvent
              sous le home indicator / la barre système. */}
          <View style={[styles.modalActions, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
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
    </Modal>
  );
}

/** Petit libellé de section au-dessus de la liste de raccourcis (ex.
 * "RACCOURCIS") — purement décoratif, l'action "Personnaliser" vit
 * maintenant dans le header fixe de `QuantityModal` (`headerActionLabel`/
 * `onHeaderAction`), jamais ici : un lien qui défilait avec la liste sortait
 * de l'écran en même temps qu'elle, contrairement à un vrai header fixe. */
export function PresetListLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return <Text style={[styles.presetListHeaderLabel, { color: theme.colors.onSurfaceTertiary }]}>{label}</Text>;
}

/** Ligne verticale d'un raccourci — nom + valeur toujours visibles (pas de
 * troncature façon carte), toute la ligne est la cible de tap (ajout rapide
 * + fermeture). Édition/suppression restent dans `/meal-presets`, ouvert
 * depuis le bouton "Personnaliser" du header de `QuantityModal`. */
export function PresetRow({
  label,
  valueLabel,
  emoji,
  onPress,
  testID,
}: {
  label: string;
  valueLabel: string;
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
        styles.presetRow,
        {
          backgroundColor: isGlass ? theme.glass.subtle.tint : theme.colors.surfaceTertiary,
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text style={styles.presetRowEmoji}>{emoji ?? "🍽️"}</Text>
      <Text style={[styles.presetRowLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.presetRowValue, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
        {valueLabel}
      </Text>
      <Ionicons name="add-circle" size={20} color={theme.colors.brand} />
    </PressableScale>
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
    justifyContent: "flex-end",
  },
  modalSheet: {
    // Pourcentage relatif à la box `flex:1` du `KeyboardAvoidingView`
    // parent — recalculé à chaque layout (jamais un `Dimensions.get()`
    // figé), donc reste correct après une rotation d'écran ou à l'ouverture
    // du clavier. Header et footer sont des frères de taille fixe dans
    // cette même colonne ; seul le corps (`modalBody`, `flex:1`) se partage
    // l'espace restant et défile si besoin — jamais de contenu coupé.
    maxHeight: "85%",
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    ...shadow.elevated,
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: -spacing.xs,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  modalBody: {
    // `flex:1` (pas de hauteur fixe) — le corps prend exactement l'espace
    // restant entre le header et le footer, quelle que soit la taille de
    // l'écran ou la présence du clavier ; défile en interne dès que son
    // contenu dépasse cet espace.
    flex: 1,
  },
  modalBodyContent: {
    gap: 8,
    // Marge basse — le dernier raccourci (ex. "Fruit") reste entièrement
    // scrollable au-dessus du footer plutôt que de s'arrêter pile à son
    // bord.
    paddingBottom: spacing.sm,
  },
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
  presetListHeaderLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  customizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  customizeBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderWidth: 1,
  },
  presetRowEmoji: { fontSize: 18 },
  presetRowLabel: { flex: 1, fontWeight: "700", fontSize: 13 },
  presetRowValue: { fontWeight: "700", fontSize: 12.5 },
});
