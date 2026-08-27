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
        <View style={styles.topRow}>
          <View style={[styles.iconChip, { backgroundColor: withAlpha(iconColor, 22) }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.onSurfaceTertiary} />
        </View>
        <View>
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
  inner: { flex: 1, padding: spacing.sm, gap: 4, justifyContent: "space-between" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 13, fontWeight: "800" },
  subtitle: { fontSize: 10.5, fontWeight: "600", marginTop: 1 },
});
