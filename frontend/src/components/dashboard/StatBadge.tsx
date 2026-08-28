import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Icône colorée dans un badge circulaire + gros chiffre + petit libellé en
 * dessous — style "Ginásio/Cardio" de la capture de référence Sunset, pour
 * la ligne "Aujourd'hui" (calories/pas/sommeil/temps d'entraînement), qui
 * remplace les anneaux `RingChip` sous ce thème. Autonome/sans logique de
 * progression : l'appelant passe déjà la valeur formatée.
 */
export default function StatBadge({
  testID,
  icon,
  color,
  value,
  label,
  onPress,
  style,
}: {
  testID?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string;
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <PressableScale testID={testID} style={[styles.wrap, style]} onPress={onPress} disabled={!onPress}>
      <View style={[styles.badge, { backgroundColor: withAlpha(color, 22) }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.value, { color: theme.colors.onSurface }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", flex: 1, gap: 2 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  value: { fontSize: 16, fontWeight: "800" },
  label: { fontSize: 10.5, fontWeight: "600" },
});
