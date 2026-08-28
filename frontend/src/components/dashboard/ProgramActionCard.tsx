import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Carte carrée "Ginásio/Cardio" de la capture de référence Sunset — icône
 * colorée en haut, titre, sous-texte, flèche — utilisée pour chaque
 * programme actif ET pour le widget WOD aléatoire, exactement le même
 * format visuel (demande explicite : pas de style différent entre les
 * deux). N'est montée que sous le thème Sunset (voir call sites) ; ne gère
 * donc pas de mode "flat" particulier au-delà de ce que `GlassCard` fait
 * déjà par défaut.
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
    <GlassCard testID={testID} style={[styles.card, style]}>
      <PressableScale style={styles.inner} onPress={onPress}>
        <View style={[styles.iconBanner, { backgroundColor: withAlpha(iconColor, 22) }]}>
          <Ionicons name={icon} size={30} color={iconColor} />
          <View style={[styles.chevronBadge, { backgroundColor: withAlpha("#000000", 30) }]}>
            <Ionicons name="chevron-forward" size={12} color={theme.colors.onSurface} />
          </View>
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
  inner: { flex: 1, padding: spacing.xs, gap: 6 },
  // Grand carré arrondi mettant l'icône en avant façon "image vedette" —
  // occupe la majorité de la carte (`flex:1`), au lieu d'un petit badge
  // circulaire perdu dans l'espace de la carte glass.
  iconBanner: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { paddingHorizontal: 2 },
  title: { fontSize: 13, fontWeight: "800" },
  subtitle: { fontSize: 10.5, fontWeight: "600", marginTop: 1 },
});
