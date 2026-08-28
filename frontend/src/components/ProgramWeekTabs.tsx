import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Sélecteur de semaine à accès direct ("Semaine 1", "Semaine 2"...),
 * scrollable horizontalement — remplace la navigation séquentielle par
 * chevrons. `weeks` est la liste explicite des index de semaine à afficher
 * (pas forcément 0..N — training.tsx "Semaines à venir" ne montre par
 * exemple que les semaines après celle d'aujourd'hui), toujours libellés
 * par leur numéro absolu ("Semaine {w+1}").
 */
export default function ProgramWeekTabs({
  weeks,
  activeWeek,
  onSelectWeek,
  color,
  completedWeeks,
}: {
  weeks: number[];
  activeWeek: number;
  onSelectWeek: (weekIndex: number) => void;
  color: string;
  completedWeeks?: Set<number>;
}) {
  const { theme } = useTheme();
  if (weeks.length <= 1) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {weeks.map((w) => {
        const active = w === activeWeek;
        const done = completedWeeks?.has(w) ?? false;
        return (
          <PressableScale
            key={w}
            testID={`program-week-tab-${w}`}
            style={[styles.tab, active && { borderBottomColor: color }]}
            onPress={() => onSelectWeek(w)}
          >
            <Text
              style={[
                styles.tabText,
                { color: active ? theme.colors.onSurface : theme.colors.onSurfaceTertiary },
                active && styles.tabTextActive,
              ]}
            >
              Semaine {w + 1}
            </Text>
            {done && (
              <Ionicons
                name="checkmark-circle"
                size={12}
                color={theme.colors.success}
                style={{ marginLeft: 4 }}
              />
            )}
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.md, paddingHorizontal: 4, paddingBottom: 2 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextActive: {
    fontWeight: "800",
  },
});
