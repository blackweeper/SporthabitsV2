import { View, Text, StyleSheet } from "react-native";
import { coloredShadow, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import PressableScale from "./PressableScale";
import GlassCard from "./GlassCard";

/**
 * Générique, léger — une rangée de sous-onglets égaux en largeur, à
 * l'intérieur d'un écran (pas un remplacement des onglets top-level de
 * l'app). Réutilisé par `program/[id].tsx` (Semaine/Vue complète) et
 * `training.tsx` (Cette semaine/Semaines à venir/Historique).
 *
 * Sous Sunset, la piste est un verre "subtle" et l'onglet actif devient un
 * "Active Glass" (fond Sunset translucide + bordure + lueur douce) plutôt
 * qu'un pavé plein — cohérent avec "le Sunset comme lumière, pas comme
 * couleur de fond" (voir `GlassCard`). Sous Classique, rendu inchangé
 * (piste `surfaceSecondary`, onglet actif = pavé `brand` plein, texte blanc).
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
  const isGlass = theme.card.mode === "glass";
  return (
    <GlassCard
      level="subtle"
      style={[
        styles.row,
        { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md },
      ]}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <PressableScale
            key={opt.key}
            testID={testIDPrefix ? `${testIDPrefix}-${opt.key}` : undefined}
            style={[
              styles.tab,
              { borderRadius: theme.radius.sm },
              active && !isGlass && { backgroundColor: theme.colors.brand },
              active &&
                isGlass && [
                  styles.tabActiveGlass,
                  {
                    backgroundColor: withAlpha(theme.colors.brand, 20),
                    borderColor: withAlpha(theme.colors.brand, 50),
                  },
                  coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.3, radius: 8, elevation: 3 }),
                ],
            ]}
            onPress={() => onChange(opt.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: theme.colors.onSurfaceTertiary },
                active && !isGlass && styles.tabTextActive,
                active && isGlass && { color: theme.colors.brand },
              ]}
            >
              {opt.label}
            </Text>
          </PressableScale>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActiveGlass: { borderWidth: 1 },
  tabText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  tabTextActive: { color: "#fff" },
});
