import { useEffect, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { coloredShadow, motion } from "@/src/theme";
import { useTheme } from "@/src/themes";
import PressableScale from "./PressableScale";

/**
 * Générique, léger — une rangée de sous-onglets égaux en largeur, à
 * l'intérieur d'un écran (pas un remplacement des onglets top-level de
 * l'app). Réutilisé par `program/[id].tsx` (Semaine/Vue complète),
 * `training.tsx` (Mes séances/WOD, Cette semaine/Semaines à venir/
 * Historique), `library.tsx` (Ma bibliothèque/Découvrir),
 * `exercise-detail/[name].tsx` (Technique/Sécurité/Niveau).
 *
 * V2 — remplace l'ancien "pavé plein"/"Active Glass" (bordure + fond
 * translucide + ombre sur l'onglet actif, à l'intérieur d'une piste
 * `GlassCard`) par un indicateur fin qui glisse sous le libellé actif, sans
 * aucun bloc/pavé de fond : la piste `GlassCard` disparaît, chaque onglet
 * n'est plus qu'un texte, jamais un "gros rectangle". Un seul composant,
 * jamais un style par écran (Classic → `theme.colors.brand`, Sunset → le
 * même token, juste une couleur différente — aucune branche `theme.id`).
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
  const { theme } = useTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const activeIndex = Math.max(0, options.findIndex((o) => o.key === value));
  const tabWidth = rowWidth / options.length;
  const indicatorX = useSharedValue(0);
  const accent = theme.colors.brand;

  useEffect(() => {
    indicatorX.value = withTiming(activeIndex * tabWidth, { duration: motion.fast });
  }, [activeIndex, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth,
  }));

  const handleLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={[styles.row, { borderBottomColor: theme.colors.divider }]}
      onLayout={handleLayout}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <PressableScale
            key={opt.key}
            testID={testIDPrefix ? `${testIDPrefix}-${opt.key}` : undefined}
            style={styles.tab}
            onPress={() => onChange(opt.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: active ? accent : theme.colors.onSurfaceTertiary },
                active && styles.tabTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </PressableScale>
        );
      })}
      {rowWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            { backgroundColor: accent },
            coloredShadow(accent, { offsetY: 0, opacity: 0.45, radius: 5, elevation: 2 }),
            indicatorStyle,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  tabTextActive: { fontWeight: "800" },
  indicator: {
    position: "absolute",
    left: 0,
    bottom: -StyleSheet.hairlineWidth,
    height: 2,
    borderRadius: 1,
  },
});
