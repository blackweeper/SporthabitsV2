import { useCallback, useMemo, useState } from "react";
import {
  GestureResponderEvent,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import PressableScale from "@/src/components/ui/PressableScale";
import { RADIO_STATIONS, RadioStation } from "@/src/data/radio-stations";
import { fetchStationsLiveInfo, StationLiveInfo } from "@/src/utils/radio-browser";
import { getEnabledStationUuids } from "@/src/utils/radio-preferences";
import { useRadioPlayer } from "@/src/hooks/useRadioPlayer";

/**
 * Écran "Radio" — liste des stations cochées par l'utilisateur (voir
 * `radio-stations-settings.tsx`/`radio-preferences.ts`), jamais l'annuaire
 * radio-browser.info brut ni le catalogue complet (~30, `radio-stations.ts`).
 * Le statut en ligne est rafraîchi une fois au focus via l'API (best-effort,
 * la lecture elle-même ne dépend jamais de ce rafraîchissement). La lecture/
 * le volume vivent dans `useRadioPlayer` (Provider global, racine de l'app)
 * — cet écran ne fait que piloter ce lecteur partagé, il ne peut pas être
 * fermé "en gardant le son coupé" par erreur : fermer l'écran ne coupe
 * jamais la lecture (voir `MiniRadioPlayer` pour le contrôle persistant).
 */
export default function RadioScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const { station, status, errorMessage, volume, play, pause, resume, stop, setVolume } = useRadioPlayer();
  const [liveInfo, setLiveInfo] = useState<Record<string, StationLiveInfo>>({});
  const [enabledUuids, setEnabledUuids] = useState<Set<string> | null>(null);

  const stations = useMemo(
    () => (enabledUuids ? RADIO_STATIONS.filter((s) => enabledUuids.has(s.stationuuid)) : []),
    [enabledUuids],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getEnabledStationUuids().then((uuids) => {
        if (cancelled) return;
        setEnabledUuids(new Set(uuids));
        fetchStationsLiveInfo(uuids).then((info) => {
          if (!cancelled) setLiveInfo(info);
        });
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const isCurrentStation = (s: RadioStation) => station?.stationuuid === s.stationuuid;

  const onPressStation = (s: RadioStation) => {
    if (isCurrentStation(s)) {
      if (status === "playing") pause();
      else if (status === "paused") resume();
      else play(s);
    } else {
      play(s);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.background.mode === "gradient" ? "transparent" : theme.colors.surface }]}
        edges={["top", "bottom"]}
      >
        <View style={styles.header}>
          <Pressable testID="radio-back" onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Radio</Text>
          <Pressable
            testID="radio-manage-stations"
            hitSlop={10}
            onPress={() => router.push("/radio-stations-settings" as any)}
          >
            <Ionicons name="options-outline" size={24} color={theme.colors.onSurface} />
          </Pressable>
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceTertiary }]}>
          Musique motivante pour t'entraîner — sport, électro, dance
        </Text>

        {enabledUuids && stations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="radio-outline" size={32} color={theme.colors.onSurfaceTertiary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.onSurfaceTertiary }]}>
              Aucune station sélectionnée. Choisis-en dans la gestion des stations.
            </Text>
            <PressableScale
              testID="radio-empty-manage"
              style={[styles.emptyStateBtn, { backgroundColor: theme.colors.brand }]}
              onPress={() => router.push("/radio-stations-settings" as any)}
            >
              <Text style={styles.emptyStateBtnText}>Gérer les stations</Text>
            </PressableScale>
          </View>
        ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {stations.map((s) => {
            const current = isCurrentStation(s);
            const live = liveInfo[s.stationuuid];
            const currentlyPlaying = current && status === "playing";
            const currentlyConnecting = current && status === "connecting";
            const currentlyError = current && status === "error";
            return (
              <GlassCard
                key={s.stationuuid}
                testID={`radio-station-${s.stationuuid}`}
                accent={current ? theme.colors.brand : undefined}
                style={styles.card}
              >
                <PressableScale style={styles.cardInner} onPress={() => onPressStation(s)}>
                  <View style={[styles.artwork, { backgroundColor: withAlpha(theme.colors.brand, 16) }]}>
                    {s.favicon ? (
                      <Image source={{ uri: s.favicon }} style={styles.artworkImage} resizeMode="contain" />
                    ) : (
                      <Ionicons name="radio" size={22} color={theme.colors.brand} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stationName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={[styles.stationMeta, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
                      {s.tags} · {s.country}
                      {live && !live.lastCheckOk ? " · Peut-être hors ligne" : ""}
                    </Text>
                    {currentlyError && (
                      <Text style={[styles.errorText, { color: theme.colors.error }]} numberOfLines={2}>
                        {errorMessage ?? "Cette station ne répond pas."}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.playBtn,
                      { backgroundColor: current ? theme.colors.brand : withAlpha(theme.colors.brand, 16) },
                    ]}
                  >
                    <Ionicons
                      name={
                        currentlyError
                          ? "refresh"
                          : currentlyConnecting
                            ? "hourglass"
                            : currentlyPlaying
                              ? "pause"
                              : "play"
                      }
                      size={18}
                      color={current ? "#fff" : theme.colors.brand}
                    />
                  </View>
                </PressableScale>

                {current && !currentlyError && (
                  <View style={styles.volumeRow}>
                    <Ionicons name="volume-low" size={14} color={theme.colors.onSurfaceTertiary} />
                    <VolumeBar value={volume} onChange={setVolume} tint={theme.colors.brand} track={theme.colors.surfaceTertiary} />
                    <Ionicons name="volume-high" size={14} color={theme.colors.onSurfaceTertiary} />
                  </View>
                )}
              </GlassCard>
            );
          })}
        </ScrollView>
        )}

        {station && (
          <PressableScale testID="radio-stop-all" style={styles.stopAll} onPress={stop}>
            <Ionicons name="stop-circle-outline" size={16} color={theme.colors.error} />
            <Text style={[styles.stopAllText, { color: theme.colors.error }]}>Arrêter la radio</Text>
          </PressableScale>
        )}
      </SafeAreaView>
    </View>
  );
}

/** Barre de volume "basique" — tap n'importe où sur la piste pour fixer le
 * volume proportionnellement à la position, pas de bibliothèque de slider
 * (aucune n'est déjà une dépendance de ce projet). */
function VolumeBar({
  value,
  onChange,
  tint,
  track,
}: {
  value: number;
  onChange: (v: number) => void;
  tint: string;
  track: string;
}) {
  const [width, setWidth] = useState(0);

  const handlePress = (e: GestureResponderEvent) => {
    if (width <= 0) return;
    const x = e.nativeEvent.locationX;
    onChange(Math.max(0, Math.min(1, x / width)));
  };

  return (
    <Pressable
      testID="radio-volume-bar"
      style={[styles.volumeTrack, { backgroundColor: track }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onPress={handlePress}
    >
      <View style={[styles.volumeFill, { width: `${value * 100}%`, backgroundColor: tint }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  volumeTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  volumeFill: { height: "100%", borderRadius: 3 },
});

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
      fontSize: 12.5,
      paddingHorizontal: spacing.lg,
      marginTop: 4,
      marginBottom: spacing.md,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl3,
      gap: spacing.sm,
    },
    card: { padding: spacing.md },
    cardInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    artwork: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    artworkImage: { width: 32, height: 32 },
    stationName: { fontSize: 14.5, fontWeight: "800" },
    stationMeta: { fontSize: 11, fontWeight: "600", marginTop: 2 },
    errorText: { fontSize: 11, fontWeight: "700", marginTop: 4 },
    playBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    volumeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    stopAll: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: spacing.md,
    },
    stopAllText: { fontSize: 13, fontWeight: "700" },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.xl2,
    },
    emptyStateText: { fontSize: 13, textAlign: "center" },
    emptyStateBtn: {
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 999,
    },
    emptyStateBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  });
}
