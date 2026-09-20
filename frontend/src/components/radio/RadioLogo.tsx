import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";

/**
 * Logo unique de la radio — même pastille partout (liste des stations,
 * gestion des stations, mini-lecteur), jamais le favicon d'une station : ceux
 * de l'annuaire sont de qualité inégale et cassaient la cohérence visuelle.
 */
export default function RadioLogo({ size = 40 }: { size?: number }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        backgroundColor: withAlpha(theme.colors.brand, 16),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="radio" size={Math.round(size * 0.46)} color={theme.colors.brand} />
    </View>
  );
}
