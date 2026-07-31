import { View, Text, StyleSheet } from "react-native";
import { colors, radius } from "@/src/theme";
import PressableScale from "./PressableScale";

/**
 * Générique, léger — une rangée de sous-onglets égaux en largeur, à
 * l'intérieur d'un écran (pas un remplacement des onglets top-level de
 * l'app). Réutilisé par `program/[id].tsx` (Semaine/Vue complète) et
 * `training.tsx` (Cette semaine/Semaines à venir/Historique).
 */
export default function SegmentedTabRow<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  testIDPrefix?: string;
}) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <PressableScale
            key={opt.key}
            testID={testIDPrefix ? `${testIDPrefix}-${opt.key}` : undefined}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(opt.key)}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{opt.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: colors.brand },
  tabText: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  tabTextActive: { color: "#fff" },
});
