import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { tabBarSafeBottomOffset } from "@/src/utils/tab-bar-metrics";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";
import { useRadioPlayer } from "@/src/hooks/useRadioPlayer";

/**
 * Barre persistante montée à la racine (`app/_layout.tsx`, au-dessus du
 * `<Stack>`) — visible sur TOUT écran, pas seulement les onglets, pour que
 * "arrêter depuis n'importe où" soit vrai littéralement. Remonte au-dessus de
 * la barre d'onglets quand l'écran courant en a une (`useSegments` détecte le
 * groupe `(tabs)`), sinon reste au ras du bas (juste l'inset de sécurité).
 * Se réduit à `null` tant qu'aucune station n'a été choisie — pas de place
 * réservée à vide.
 */
export default function MiniRadioPlayer() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { station, status, pause, resume, stop, errorMessage } = useRadioPlayer();

  if (!station) return null;

  const inTabs = segments[0] === "(tabs)";
  const isSunset = theme.id === "sunset";
  const bottom = inTabs
    ? tabBarSafeBottomOffset(isSunset, insets.bottom) + (isSunset ? spacing.sm : spacing.xs)
    : insets.bottom + spacing.sm;

  const isPlaying = status === "playing";
  const isConnecting = status === "connecting";
  const isError = status === "error";

  return (
    <GlassCard
      testID="mini-radio-player"
      style={[styles.wrap, { bottom, left: spacing.md, right: spacing.md }]}
    >
      <View style={styles.inner}>
        <View style={[styles.iconChip, { backgroundColor: withAlpha(theme.colors.brand, 20) }]}>
          <Ionicons
            name={isError ? "warning" : "radio"}
            size={16}
            color={isError ? theme.colors.error : theme.colors.brand}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {station.name}
          </Text>
          <Text
            style={[styles.status, { color: isError ? theme.colors.error : theme.colors.onSurfaceTertiary }]}
            numberOfLines={1}
          >
            {isError ? errorMessage ?? "Hors ligne" : isConnecting ? "Connexion…" : isPlaying ? "En direct" : "En pause"}
          </Text>
        </View>
        {!isError && (
          <PressableScale
            testID="mini-radio-toggle"
            onPress={isPlaying ? pause : resume}
            style={[styles.controlBtn, { backgroundColor: withAlpha(theme.colors.brand, 18) }]}
            hitSlop={6}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={16} color={theme.colors.brand} />
          </PressableScale>
        )}
        <PressableScale
          testID="mini-radio-stop"
          onPress={stop}
          style={[styles.controlBtn, { backgroundColor: withAlpha(theme.colors.onSurfaceTertiary, 14) }]}
          hitSlop={6}
        >
          <Ionicons name="close" size={16} color={theme.colors.onSurfaceTertiary} />
        </PressableScale>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    borderRadius: 18,
    zIndex: 30,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 13, fontWeight: "800" },
  status: { fontSize: 10.5, fontWeight: "600", marginTop: 1 },
  controlBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
