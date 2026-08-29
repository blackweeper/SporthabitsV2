import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Structure commune à TOUTE carte "lancer un entraînement" du Dashboard
 * (WOD aléatoire, programme actif, et toute future carte du même type) —
 * remplace `ProgramActionCard`/le JSX interne ad hoc de `RandomWodWidget`
 * pour que ces deux cartes (et toute nouvelle carte) partagent exactement
 * la même hauteur, les mêmes paddings, le même rayon, la même structure et
 * le même indicateur d'action, plutôt que d'être corrigées une par une.
 *
 * La hauteur totale est entièrement pilotée par `iconSquare` (52px) +
 * `inner.padding` (spacing.md des deux côtés) — jamais par la présence ou
 * la longueur du texte : `title`/`subtitle` sont tous deux verrouillés à
 * `numberOfLines={1}`, et `subtitle` est obligatoire (jamais omis) pour que
 * le titre reste toujours à la même position, qu'un appelant ait ou non un
 * sous-texte pertinent à afficher.
 */
export default function TrainingActionCard({
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
  subtitle: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <GlassCard testID={testID} level="elevated" accent={iconColor} style={[styles.card, style]}>
      <PressableScale style={styles.inner} onPress={onPress}>
        <View style={[styles.iconSquare, { borderColor: withAlpha(iconColor, 45) }]}>
          <LinearGradient
            colors={[withAlpha(iconColor, 35), withAlpha(iconColor, 65)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {/* Même indicateur d'action pour toutes les cartes de ce type — un
            badge rond "play" (le geste est toujours "lancer un
            entraînement", que ce soit un WOD aléatoire ou la séance du jour
            d'un programme), jamais un simple chevron sur certaines cartes
            et un badge plein sur d'autres. */}
        <View style={[styles.ctaBadge, { backgroundColor: withAlpha(iconColor, 20) }]}>
          <Ionicons name="play" size={15} color={iconColor} />
        </View>
      </PressableScale>
    </GlassCard>
  );
}

const CARD_PADDING = spacing.md;
const ICON_SIZE = 52;

const styles = StyleSheet.create({
  card: { width: "100%" },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: CARD_PADDING,
    // Filet de sécurité — la hauteur naturelle (icône + padding) suffit déjà
    // à égaliser toutes les cartes, ce `minHeight` ne fait que documenter
    // l'intention et protéger contre un texte agrandi (accessibilité) qui
    // dépasserait la hauteur de l'icône.
    minHeight: ICON_SIZE + CARD_PADDING * 2,
  },
  iconSquare: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  textBlock: { flex: 1, gap: 2, justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "800" },
  subtitle: { fontSize: 12, fontWeight: "600" },
  ctaBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
