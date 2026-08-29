import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Ligne compacte pour un programme actif — icône dans un petit carré coloré
 * (dégradé discret dans la couleur du thème de la carte) à gauche, titre +
 * sous-texte au centre, chevron à droite. Remplace l'ancienne carte carrée
 * "Ginásio/Cardio" (icône 64px + texte centré en dessous, ~160px de haut) :
 * retour explicite "les widgets de séances suivies prennent trop de place
 * verticalement" — une ligne horizontale de ~64px tient le même contenu en
 * bien moins de hauteur, sans réduire brutalement la taille du texte.
 * `accent={iconColor}` sur `GlassCard` fournit la bordure fine + léger halo
 * assortis (même mécanisme "Active Glass" que le reste de l'app) — pas de
 * logique de bordure dupliquée ici.
 */
export default function ProgramActionCard({
  testID,
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  style,
}: {
  testID?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string | null;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <GlassCard testID={testID} accent={iconColor} style={[styles.card, style]}>
      <PressableScale style={styles.inner} onPress={onPress}>
        <View style={[styles.iconSquare, { borderColor: withAlpha(iconColor, 45) }]}>
          <LinearGradient
            colors={[withAlpha(iconColor, 30), withAlpha(iconColor, 60)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
      </PressableScale>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%" },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  // Petit carré arrondi mettant l'icône en avant — assez compact pour une
  // ligne de ~64px de haut au total (icône + padding), tout en gardant le
  // traitement "app icon" (dégradé + bordure assortie) de la version carrée.
  iconSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  textBlock: { flex: 1, gap: 1 },
  title: { fontSize: 14, fontWeight: "800" },
  subtitle: { fontSize: 11.5, fontWeight: "600" },
});
