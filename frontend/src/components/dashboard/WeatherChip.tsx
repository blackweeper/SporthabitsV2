import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/themes";
import { WeatherState } from "@/src/hooks/useWeather";

function iconForWeatherCode(code: number): keyof typeof Ionicons.glyphMap {
  if ([95, 96, 99].includes(code)) return "thunderstorm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rainy";
  if ([45, 48].includes(code)) return "cloud-outline";
  if (code === 0) return "sunny";
  if ([1, 2].includes(code)) return "partly-sunny";
  return "cloud";
}

/**
 * Météo actuelle à côté du calendrier — purement présentationnel, reçoit la
 * donnée déjà chargée (`useWeather()`, appelé par l'appelant) plutôt que de
 * la charger elle-même : l'appelant a besoin de savoir AVANT de rendre s'il
 * y a une donnée réelle, pour ne jamais envelopper ce composant dans une
 * carte vide quand la géolocalisation est refusée (bug corrigé).
 */
export default function WeatherChip({ data }: { data: WeatherState }) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrap} testID="weather-chip">
      <Ionicons name={iconForWeatherCode(data.code)} size={16} color={theme.colors.onSurfaceSecondary} />
      <Text style={[styles.temp, { color: theme.colors.onSurface }]}>{Math.round(data.tempC)}°</Text>
      <Text style={[styles.hint, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
        {data.hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  temp: { fontWeight: "800", fontSize: 13 },
  hint: { fontSize: 11, flexShrink: 1 },
});
