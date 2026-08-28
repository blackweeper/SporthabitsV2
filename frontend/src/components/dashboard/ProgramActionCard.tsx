import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Carte carrée "Ginásio/Cardio" de la capture de référence Sunset — grande
 * icône dans un carré arrondi coloré (dégradé discret dans la couleur du
 * thème de la carte), fine bordure assortie autour de toute la carte, titre
 * en gras puis sous-texte discret en dessous — utilisée pour chaque
 * programme actif ET pour le widget WOD aléatoire, exactement le même
 * format visuel (demande explicite : pas de style différent entre les
 * deux). `accent={iconColor}` sur `GlassCard` fournit la bordure fine +
 * léger halo assortis (même mécanisme "Active Glass" que le reste de
 * l'app) — pas de logique de bordure dupliquée ici. N'est montée que sous
 * le thème Sunset (voir call sites) ; ne gère donc pas de mode "flat"
 * particulier au-delà de ce que `GlassCard` fait déjà par défaut.
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
          <Ionicons name={icon} size={30} color={iconColor} />
        </View>
        <View style={[styles.chevronBadge, { backgroundColor: withAlpha("#000000", 30) }]}>
          <Ionicons name="chevron-forward" size={12} color={theme.colors.onSurface} />
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
      </PressableScale>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  // L'`aspectRatio` (fourni par l'appelant via `style`, ex. `width:"48%"`)
  // dimensionne la carte — `inner` doit alors occuper `flex:1` pour remplir
  // ce cadre plutôt que de se limiter à une `minHeight` fixe.
  card: { minWidth: 140 },
  inner: {
    flex: 1,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  // Grand carré arrondi mettant l'icône en avant — taille fixe (pas
  // `flex:1`) avec de la marge autour, façon "app icon", plutôt qu'un aplat
  // occupant toute la carte : laisse le fond glass de la carte respirer
  // autour, cohérent avec la capture de référence.
  iconSquare: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chevronBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { alignItems: "center" },
  title: { fontSize: 15, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 11.5, fontWeight: "600", marginTop: 2, textAlign: "center" },
});
