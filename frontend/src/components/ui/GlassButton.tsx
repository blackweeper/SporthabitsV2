import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { coloredShadow } from "@/src/theme";
import { useTheme } from "@/src/themes";
import PressableScale from "./PressableScale";

/** Second arrêt du dégradé du CTA principal ("Electric Blue" du brief
 * Glacier Aurora) — littéral plutôt qu'un token de thème : ce n'est pas une
 * couleur sémantique réutilisée ailleurs, seulement l'autre extrémité du
 * dégradé `theme.colors.brand → #247BFF` qui définit visuellement "LE"
 * bouton principal de l'app. Sous Classique, jamais lu (rendu inchangé). */
const CTA_GRADIENT_END = "#247BFF";

/**
 * CTA plein-largeur partagé — remplace les pavés `backgroundColor:
 * theme.colors.brand` répétés à la main dans une dizaine d'écrans. Sous
 * Glacier Aurora, un vrai dégradé Glacier Blue → Electric Blue (jamais un
 * aplat plat) avec reflet supérieur et lueur douce — "premium glass", pas
 * un néon. Sous Classique, rendu inchangé (pavé `brand` plein, texte/icône
 * blancs).
 */
export default function GlassButton({
  label,
  icon,
  onPress,
  testID,
  style,
  disabled,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const isGlass = theme.card.mode === "glass";

  if (!isGlass) {
    return (
      <PressableScale
        testID={testID}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.cta,
          { borderRadius: theme.radius.md, opacity: disabled ? 0.5 : 1, backgroundColor: theme.colors.brand },
          style,
        ]}
      >
        {icon && <Ionicons name={icon} size={18} color="#fff" />}
        <Text style={[styles.text, { color: "#fff" }]}>{label}</Text>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={[
        { borderRadius: theme.radius.md, opacity: disabled ? 0.5 : 1 },
        coloredShadow(theme.colors.brand, { offsetY: 5, opacity: 0.32, radius: 16, elevation: 5 }),
        style,
      ]}
    >
      <LinearGradient
        colors={[theme.colors.brand, CTA_GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cta, { borderRadius: theme.radius.md, overflow: "hidden" }]}
      >
        {/* Reflet supérieur — donne au dégradé une texture de verre plutôt
            qu'un aplat de couleur pure. Très discret. */}
        <LinearGradient
          colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0)"]}
          style={styles.topHighlight}
          pointerEvents="none"
        />
        {icon && <Ionicons name={icon} size={18} color="#fff" />}
        <Text style={[styles.text, { color: "#fff" }]}>{label}</Text>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  cta: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  topHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "55%",
  },
  text: { fontWeight: "800", letterSpacing: 1 },
});
