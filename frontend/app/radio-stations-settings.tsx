import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";
import { RADIO_STATIONS } from "@/src/data/radio-stations";
import { getEnabledStationUuids, toggleStationEnabled } from "@/src/utils/radio-preferences";

/**
 * Écran de gestion du catalogue radio (tag `workout` de radio-browser.info,
 * trié par popularité — `radio-stations.ts`) —
 * une case à cocher par station, persistée via `radio-preferences.ts`.
 * Seules les stations cochées ici apparaissent ensuite dans `/radio`.
 */
export default function RadioStationsSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getEnabledStationUuids().then((uuids) => {
        if (!cancelled) setEnabled(new Set(uuids));
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const toggle = async (uuid: string) => {
    const willEnable = !enabled.has(uuid);
    // Optimiste — l'écriture AsyncStorage est quasi instantanée mais autant
    // ne pas faire attendre le tap pour un simple changement de case.
    setEnabled((prev) => {
      const next = new Set(prev);
      if (willEnable) next.add(uuid);
      else next.delete(uuid);
      return next;
    });
    await toggleStationEnabled(uuid, willEnable);
  };

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.safe,
          { backgroundColor: theme.background.mode === "gradient" ? "transparent" : theme.colors.surface },
        ]}
        edges={["top", "bottom"]}
      >
        <View style={styles.header}>
          <Pressable testID="radio-stations-back" onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Stations radio</Text>
          <View style={{ width: 26 }} />
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceTertiary }]}>
          {enabled.size} sélectionnée{enabled.size > 1 ? "s" : ""} sur {RADIO_STATIONS.length} — seules les
          stations cochées apparaissent dans le menu radio.
        </Text>

        <ScrollView contentContainerStyle={styles.list}>
          {RADIO_STATIONS.map((s) => {
            const isEnabled = enabled.has(s.stationuuid);
            return (
              <PressableScale
                key={s.stationuuid}
                testID={`radio-station-toggle-${s.stationuuid}`}
                onPress={() => toggle(s.stationuuid)}
              >
                <GlassCard style={styles.row} accent={isEnabled ? theme.colors.brand : undefined}>
                  <View style={[styles.artwork, { backgroundColor: withAlpha(theme.colors.brand, 16) }]}>
                    {s.favicon ? (
                      <Image source={{ uri: s.favicon }} style={styles.artworkImage} resizeMode="contain" />
                    ) : (
                      <Ionicons name="radio" size={18} color={theme.colors.brand} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stationName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={[styles.stationMeta, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
                      {s.tags} · {s.country}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      isEnabled
                        ? { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand }
                        : { borderColor: theme.colors.borderStrong },
                    ]}
                  >
                    {isEnabled && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </GlassCard>
              </PressableScale>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function buildStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    title: { fontSize: 20, fontWeight: "800" },
    subtitle: {
      fontSize: 12,
      paddingHorizontal: spacing.lg,
      marginTop: 4,
      marginBottom: spacing.md,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl3,
      gap: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
    },
    artwork: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    artworkImage: { width: 26, height: 26 },
    stationName: { fontSize: 14, fontWeight: "800" },
    stationMeta: { fontSize: 10.5, fontWeight: "600", marginTop: 2 },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
