import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";

/** Une carte du générateur — même modèle que l'entrée "Cindy" (nom de
 * l'exercice + reps/consigne en texte libre). `exerciseRecordId` est
 * additif : renseigné quand la carte vient de la bibliothèque, `null`
 * sinon (texte libre, résolu par nom comme partout ailleurs dans l'app). */
export type CircuitCardDraft = {
  id: string;
  name: string;
  exerciseRecordId?: string | null;
  reps: string;
};

/**
 * Liste de N cartes éditables pour construire un circuit (AMRAP/EMOM/For
 * Time composite, ou la séquence d'un bloc Tours) — chaque carte : vignette
 * (résolue par nom, conteneur carré non tronqué — voir `ExerciseThumbnail`),
 * sélection depuis la bibliothèque, et un champ libre reps/consigne. Le
 * contrôle "nombre d'exercices" reste dans l'écran hôte (il interagit avec
 * la logique de sauvegarde propre à chaque mode) — ce composant n'édite que
 * la liste elle-même.
 */
export default function CircuitCardListEditor({
  cards,
  onChange,
  records,
  onOpenPicker,
}: {
  cards: CircuitCardDraft[];
  onChange: (cards: CircuitCardDraft[]) => void;
  records: ExerciseRecord[];
  /** Ouvre `ExerciseLibraryPicker` côté écran hôte (un seul picker partagé,
   * même convention que le reste de l'app) pour la carte `cardId`. */
  onOpenPicker: (cardId: string) => void;
}) {
  const updateCard = (cardId: string, patch: Partial<CircuitCardDraft>) => {
    onChange(cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
  };
  const removeCard = (cardId: string) => {
    onChange(cards.filter((c) => c.id !== cardId));
  };

  return (
    <View style={styles.wrap}>
      {cards.map((card, i) => (
        <View key={card.id} style={styles.card} testID={`circuit-card-${i}`}>
          <Text style={styles.cardIdx}>{i + 1}</Text>
          <Pressable
            testID={`circuit-card-pic-${i}`}
            onPress={() => onOpenPicker(card.id)}
            style={styles.cardPic}
          >
            <ExerciseThumbnail
              name={card.name || "?"}
              records={records}
              exerciseRecordId={card.exerciseRecordId}
              size={40}
            />
          </Pressable>
          <View style={styles.cardFields}>
            <TextInput
              testID={`circuit-card-name-${i}`}
              style={styles.cardInput}
              value={card.name}
              onChangeText={(t) => {
                if (!card.name.trim() && t.trim()) {
                  onOpenPicker(card.id);
                }
                updateCard(card.id, { name: t, exerciseRecordId: null });
              }}
              placeholder="Nom de l'exercice"
              placeholderTextColor={colors.onSurfaceTertiary}
            />
            <TextInput
              testID={`circuit-card-reps-${i}`}
              style={[styles.cardInput, styles.cardInputSecondary]}
              value={card.reps}
              onChangeText={(t) => updateCard(card.id, { reps: t })}
              placeholder="Reps / consigne (ex: 10, 250m…)"
              placeholderTextColor={colors.onSurfaceTertiary}
            />
          </View>
          <Pressable
            testID={`circuit-card-remove-${i}`}
            onPress={() => removeCard(card.id)}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={colors.onSurfaceTertiary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export function newCircuitCard(): CircuitCardDraft {
  return { id: Math.random().toString(36).slice(2), name: "", exerciseRecordId: null, reps: "" };
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIdx: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 12,
    width: 14,
    textAlign: "center",
  },
  cardPic: { borderRadius: radius.sm, overflow: "hidden" },
  cardFields: { flex: 1, gap: 4 },
  cardInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    color: colors.onSurface,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInputSecondary: { color: colors.onSurfaceSecondary, fontSize: 12 },
});
