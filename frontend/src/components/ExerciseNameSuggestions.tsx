import { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radius, spacing, withAlpha } from "@/src/theme";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import { normalize, similarity } from "@/src/utils/exercise-library-merge";
import { matchScoreBand } from "@/src/utils/exercise-matching";

function bandColor(band: ReturnType<typeof matchScoreBand>): string {
  if (band.color === "success") return colors.success;
  if (band.color === "warning") return colors.warning;
  if (band.color === "info") return colors.info;
  return colors.onSurfaceTertiary;
}

/**
 * Suggestions de bibliothèque affichées EN DIRECT sous un champ de nom
 * d'exercice pendant la frappe — même moteur de score (similarité +
 * containment) que `ExerciseLinkModal`, mais inline plutôt que dans un
 * modal à ouvrir manuellement : un utilisateur qui REMPLACE le nom d'un
 * exercice existant voit tout de suite les correspondances possibles, du
 * meilleur au moins bon score, sans avoir à connaître le nom exact de la
 * bibliothèque au préalable. `ExerciseLinkModal` reste disponible à côté
 * (via le lien "lier à la bibliothèque") pour la recherche plus poussée ou
 * la création d'un nouvel exercice.
 */
export default function ExerciseNameSuggestions({
  query,
  records,
  onPick,
}: {
  query: string;
  records: ExerciseRecord[];
  onPick: (record: ExerciseRecord) => void;
}) {
  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return records
      .map((r) => ({ record: r, score: similarity(q, r.nameFr) }))
      .filter((s) => s.score > 0.3 || normalize(s.record.nameFr).includes(normalize(q)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [query, records]);

  if (results.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {results.map(({ record, score }) => {
        const band = matchScoreBand(score);
        const color = bandColor(band);
        return (
          <Pressable
            key={record.id}
            testID={`exercise-suggestion-${record.id}`}
            style={styles.row}
            onPress={() => onPick(record)}
          >
            <Text style={styles.name} numberOfLines={1}>
              {record.nameFr}
            </Text>
            <View style={[styles.badge, { backgroundColor: withAlpha(color, 18) }]}>
              <Text style={[styles.badgeText, { color }]}>{Math.round(score * 100)}%</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { flex: 1, color: colors.onSurface, fontSize: 12, fontWeight: "600" },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, marginLeft: 8 },
  badgeText: { fontSize: 10, fontWeight: "800" },
});
