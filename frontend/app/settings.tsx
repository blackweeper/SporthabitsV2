import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { Theme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import AuroraBackground from "@/src/components/backgrounds/AuroraBackground";
import PressableScale from "@/src/components/ui/PressableScale";
import Card from "@/src/components/ui/Card";
import { useConfirmDialog } from "@/src/hooks/use-confirm-dialog";
import {
  AppSettings,
  CalendarViewMode,
  getAppSettings,
  saveAppSettings,
} from "@/src/utils/app-settings";
import { THEME_LIST, useTheme } from "@/src/themes";
import { ThemeId } from "@/src/utils/theme-settings";
import {
  getActiveWallpaperId,
  getWallpaperImageUri,
  getWallpaperList,
  removeWallpaper,
  setActiveWallpaperId,
  WallpaperMeta,
} from "@/src/utils/wallpaper-storage";
import { pickAndAddWallpaper } from "@/src/utils/wallpaper-picker";

const CALENDAR_OPTIONS: {
  key: CalendarViewMode;
  label: string;
  icon: any;
  hint: string;
}[] = [
  {
    key: "week",
    label: "Semaine",
    icon: "today",
    hint: "7 jours en cercles, détail du jour sélectionné en dessous",
  },
  {
    key: "month",
    label: "Mois",
    icon: "calendar",
    hint: "Grille mensuelle complète",
  },
];

export default function SettingsScreen() {
  const { theme, themeId, setThemeId, refreshWallpaper } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const { confirm, ConfirmModal } = useConfirmDialog();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [wallpapers, setWallpapers] = useState<WallpaperMeta[]>([]);
  const [activeWallpaperId, setActiveWallpaperIdState] = useState<string | null>(null);
  const [thumbUris, setThumbUris] = useState<Record<string, string>>({});
  const [addingWallpaper, setAddingWallpaper] = useState(false);

  useEffect(() => {
    (async () => setSettings(await getAppSettings()))();
  }, []);

  useEffect(() => {
    (async () => {
      setWallpapers(await getWallpaperList());
      setActiveWallpaperIdState(await getActiveWallpaperId());
    })();
  }, []);

  // Ne recharge les images que quand la LISTE change (ajout/suppression),
  // jamais à chaque render — évite de repayer le décodage base64 pour rien.
  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        wallpapers.map(async (w) => [w.id, await getWallpaperImageUri(w.id)] as const),
      );
      const validEntries = entries.filter(
        (e): e is [string, string] => e[1] !== null,
      );
      setThumbUris(Object.fromEntries(validEntries));
    })();
  }, [wallpapers]);

  const setCalendarView = async (mode: CalendarViewMode) => {
    setSettings((s) => (s ? { ...s, calendarView: mode } : s));
    await saveAppSettings({ calendarView: mode });
  };

  const handleAddWallpaper = async () => {
    setAddingWallpaper(true);
    try {
      const meta = await pickAndAddWallpaper();
      if (meta) setWallpapers((list) => [...list, meta]);
    } catch (err) {
      Alert.alert("Import impossible", "Cette image n'a pas pu être ajoutée. Réessaie avec une autre.");
    } finally {
      setAddingWallpaper(false);
    }
  };

  const handleSelectWallpaper = async (id: string | null) => {
    await setActiveWallpaperId(id);
    setActiveWallpaperIdState(id);
    refreshWallpaper();
  };

  const handleRemoveWallpaper = async (id: string) => {
    const ok = await confirm({
      title: "Supprimer ce fond ?",
      message: "Cette image sera définitivement supprimée.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    await removeWallpaper(id);
    setWallpapers((list) => list.filter((w) => w.id !== id));
    if (activeWallpaperId === id) {
      setActiveWallpaperIdState(null);
      refreshWallpaper();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface },
        ]}
        edges={["top", "bottom"]}
      >
      <View style={styles.header}>
        <PressableScale testID="settings-back" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </PressableScale>
        <Text style={styles.title}>Paramètres</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>APPARENCE</Text>
        <Text style={styles.sectionHint}>Calendrier du Dashboard</Text>
        {CALENDAR_OPTIONS.map((opt) => {
          const active = settings?.calendarView === opt.key;
          return (
            <PressableScale
              key={opt.key}
              testID={`settings-calendar-${opt.key}`}
              onPress={() => setCalendarView(opt.key)}
            >
              <Card style={styles.optionRow} accent={active ? theme.colors.brand : undefined}>
                <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={active ? "#fff" : theme.colors.onSurfaceTertiary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionHint}>{opt.hint}</Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand} />
                )}
              </Card>
            </PressableScale>
          );
        })}

        {/* Thème — Dashboard/`/day-detail`/barre d'onglets uniquement pour
            l'instant (voir `src/themes/`) ; le reste de l'app (dont cet
            écran Réglages lui-même) reste sur l'apparence Classique tant
            qu'il n'est pas migré. */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>THÈME</Text>
        <Text style={styles.sectionHint}>Apparence du Dashboard — change immédiatement</Text>
        {THEME_LIST.map((t) => {
          const active = themeId === t.id;
          return (
            <PressableScale
              key={t.id}
              testID={`settings-theme-${t.id}`}
              onPress={() => setThemeId(t.id as ThemeId)}
            >
              <Card style={styles.optionRow} accent={active ? theme.colors.brand : undefined}>
                <View style={[styles.swatch, { backgroundColor: t.swatch }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{t.label}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand} />}
              </Card>
            </PressableScale>
          );
        })}

        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>JOURNAL</Text>
        <Text style={styles.sectionHint}>
          Anciennement dans Performance — déplacé ici, données et fonctionnalités inchangées
        </Text>
        <PressableScale testID="settings-journal" onPress={() => router.push("/journal-history" as any)}>
          <Card style={styles.optionRow}>
            <View style={styles.optionIcon}>
              <Ionicons name="book" size={18} color={theme.colors.onSurfaceTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>Journal</Text>
              <Text style={styles.optionHint}>Note du jour et historique</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceTertiary} />
          </Card>
        </PressableScale>
        <PressableScale testID="settings-reminders" onPress={() => router.push("/reminders-list" as any)}>
          <Card style={styles.optionRow}>
            <View style={styles.optionIcon}>
              <Ionicons name="alarm" size={18} color={theme.colors.onSurfaceTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>Rappels</Text>
              <Text style={styles.optionHint}>Séances, hydratation, mesures…</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceTertiary} />
          </Card>
        </PressableScale>

        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>RADIO</Text>
        <Text style={styles.sectionHint}>Choisis les stations affichées dans le menu radio</Text>
        <PressableScale testID="settings-radio-stations" onPress={() => router.push("/radio-stations-settings" as any)}>
          <Card style={styles.optionRow}>
            <View style={styles.optionIcon}>
              <Ionicons name="radio" size={18} color={theme.colors.onSurfaceTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>Stations radio</Text>
              <Text style={styles.optionHint}>Stations "workout" triées par popularité, sélection libre</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceTertiary} />
          </Card>
        </PressableScale>

        {/* Fond d'écran personnalisé — Sunset uniquement (Classique n'a pas
            de dégradé, rien à personnaliser). L'image active est résolue
            par `ThemeProvider`/`ThemedBackground`, pas ici — ce bloc ne fait
            que piloter le stockage (`wallpaper-storage.ts`) et déclenche
            `refreshWallpaper()` pour que le Dashboard reflète le choix
            immédiatement. */}
        {themeId === "sunset" && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>FOND D&apos;ÉCRAN</Text>
            <Text style={styles.sectionHint}>Personnalise le fond du Dashboard (thème Sunset)</Text>

            <PressableScale
              testID="wallpaper-add"
              style={styles.addWallpaperRow}
              onPress={handleAddWallpaper}
              disabled={addingWallpaper}
            >
              {addingWallpaper ? (
                <ActivityIndicator color={theme.colors.brand} />
              ) : (
                <Ionicons name="add" size={18} color={theme.colors.brand} />
              )}
              <Text style={styles.addWallpaperLabel}>
                {addingWallpaper ? "Import en cours…" : "Ajouter un fond d'écran"}
              </Text>
            </PressableScale>

            <View style={styles.wallpaperGrid}>
              {/* Dégradé par défaut — toujours présent, permet de revenir en
                  arrière sans supprimer les images déjà ajoutées. */}
              <PressableScale
                testID="wallpaper-default"
                style={styles.wallpaperTile}
                onPress={() => handleSelectWallpaper(null)}
              >
                <View style={[styles.wallpaperTileImage, { overflow: "hidden" }]}>
                  <AuroraBackground />
                </View>
                {activeWallpaperId === null && (
                  <View style={styles.wallpaperCheckBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.brand} />
                  </View>
                )}
                <Text style={styles.wallpaperTileLabel} numberOfLines={1}>
                  IronFlow Aurora
                </Text>
              </PressableScale>

              {wallpapers.map((w) => (
                <View key={w.id} style={styles.wallpaperTile}>
                  <PressableScale
                    testID={`wallpaper-${w.id}`}
                    onPress={() => handleSelectWallpaper(w.id)}
                  >
                    {thumbUris[w.id] ? (
                      <Image source={{ uri: thumbUris[w.id] }} style={styles.wallpaperTileImage} />
                    ) : (
                      <View style={[styles.wallpaperTileImage, styles.wallpaperTileLoading]}>
                        <ActivityIndicator color={theme.colors.onSurfaceTertiary} size="small" />
                      </View>
                    )}
                    {activeWallpaperId === w.id && (
                      <View style={styles.wallpaperCheckBadge}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.colors.brand} />
                      </View>
                    )}
                  </PressableScale>
                  <PressableScale
                    testID={`wallpaper-${w.id}-delete`}
                    style={styles.wallpaperDeleteBadge}
                    onPress={() => handleRemoveWallpaper(w.id)}
                    hitSlop={6}
                  >
                    <Ionicons name="trash" size={12} color="#fff" />
                  </PressableScale>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      {ConfirmModal}
      </SafeAreaView>
    </View>
  );
}

function buildStyles(theme: Theme) {
  const { colors, radius } = theme;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  sectionLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
  },
  sectionHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginTop: -2,
    marginBottom: 4,
  },
  optionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconActive: { backgroundColor: colors.brand },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionLabel: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
  optionHint: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  addWallpaperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: "dashed",
  },
  addWallpaperLabel: { color: colors.brand, fontSize: 12, fontWeight: "800" },
  wallpaperGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  wallpaperTile: { width: 84 },
  wallpaperTileImage: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wallpaperTileLoading: { alignItems: "center", justifyContent: "center" },
  wallpaperTileLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  wallpaperCheckBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  wallpaperDeleteBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  });
}
