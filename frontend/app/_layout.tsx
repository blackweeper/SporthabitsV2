import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DarkTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { migrateFavoritesToUserData } from "@/src/utils/exercise-user-data-migration";
import { backfillPersonalLibrary } from "@/src/utils/exercise-library-backfill";
import { seedCoreLibraryIfNeeded } from "@/src/utils/exercise-library-bootstrap";
import { seedStarterProgramsIfNeeded } from "@/src/utils/program-bootstrap";
import { seedWodLibraryIfNeeded } from "@/src/utils/wod-bootstrap";
import { useHealthSync } from "@/src/hooks/useHealthSync";
import { ThemeProvider } from "@/src/themes";
import { RadioPlayerProvider } from "@/src/hooks/useRadioPlayer";
import MiniRadioPlayer from "@/src/components/radio/MiniRadioPlayer";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

// `@react-navigation/bottom-tabs` enveloppe CHAQUE écran d'onglet dans son
// propre `Background` (`@react-navigation/elements`), un `View` opaque
// séparé qui peint `theme.colors.background` — une DEUXIÈME couche, imbriquée
// À L'INTÉRIEUR de `<Tabs>` (donc à l'intérieur de `ThemedBackground`), en
// plus de celle déjà couverte par `DarkTheme` au niveau du `<Stack>` racine.
// Avec `DarkTheme` telle quelle (`colors.background: 'rgb(1, 1, 1)'`), cette
// couche interne masque entièrement le dégradé partagé derrière l'écran
// Dashboard (fond transparent) — seule la barre d'onglets (rendue en dehors
// de `<Tabs>`) laissait voir le dégradé, d'où un écran presque entièrement
// noir malgré un dégradé correctement dimensionné. Rendre ce fond de secours
// transparent règle les deux couches à la fois : chaque écran NON migré
// peint déjà son propre fond opaque (`colors.surface`) dans son propre
// conteneur, donc rien ne change pour eux.
const NAVIGATION_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: "transparent" },
};

// `presentation: "modal"` seul suffit sur iOS (transition native "glisser
// depuis le bas" automatique), mais pas sur Android/web où l'écran hérite
// sinon du slide_from_right par défaut — incohérent avec l'esprit "modal".
// `photo-crop` forçait déjà les deux ensemble ; généralisé ici à tous les
// écrans plein-écran de type fiche/paramètres pour un comportement identique
// sur toutes les plateformes.
const MODAL_SCREEN_OPTIONS = {
  presentation: "modal" as const,
  animation: "slide_from_bottom" as const,
};

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const { sync: syncHealthData } = useHealthSync();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Étape B puis D — migration silencieuse des favoris, puis
  // rétro-remplissage de la bibliothèque personnelle depuis l'historique/
  // exercices personnalisés/favoris. Séquencé (D dépend des favoris déjà
  // migrés) ; ne bloque jamais le démarrage, aucune UI n'en dépend encore
  // (Étape E).
  // V3 — amorce la bibliothèque de base (300 exercices officiels, illustrations
  // incluses) avant les étapes existantes, pour qu'un install neuf n'ait
  // jamais une bibliothèque vide ni un favori/backfill qui n'ait rien à
  // référencer.
  useEffect(() => {
    seedCoreLibraryIfNeeded()
      .catch((err) => console.warn("Core library seed failed:", err))
      .then(() => migrateFavoritesToUserData())
      .catch((err) => console.warn("Favorites migration failed:", err))
      .then(() => backfillPersonalLibrary())
      .catch((err) => console.warn("Library backfill failed:", err))
      // Programmes de démarrage (Flexy Series) — après la bibliothèque de
      // base, dont ils référencent des `exerciseRecordId` par id.
      .then(() => seedStarterProgramsIfNeeded())
      .catch((err) => console.warn("Starter programs seed failed:", err))
      // Bibliothèque de WODs curés — indépendante des programmes de
      // démarrage, peut être amorcée dans la même chaîne fire-and-forget.
      .then(() => seedWodLibraryIfNeeded())
      .catch((err) => console.warn("WOD library seed failed:", err));
  }, []);

  // Import santé (Health Auto Export) — synchronisation silencieuse : une
  // fois au lancement, puis toutes les 15 minutes tant que l'app reste
  // ouverte (pas de vraie exécution en arrière-plan possible sur le web sans
  // Service Worker, hors périmètre ici — ceci couvre "à l'ouverture" et
  // "pendant que l'app est utilisée"). Aucun état de `useHealthSync` n'est
  // lu ici : si l'URL/le token ne sont pas configurés, `sync()` échoue en
  // interne avant toute requête réseau (voir useHealthSync.ts) — totalement
  // silencieux, jamais de spinner ni d'erreur visible.
  useEffect(() => {
    syncHealthData();
    const interval = setInterval(syncHealthData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [syncHealthData]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0E0E0E" }}>
      <ThemeProvider>
      <RadioPlayerProvider>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0E0E0E" />
        {/* Sans thème de navigation explicite, `@react-navigation` peint le
            fond de scène par défaut clair (`DefaultTheme`, rgb(242,242,242))
            sous chaque écran — invisible tant que chaque écran peint son
            propre fond opaque, mais exposé dès qu'un écran (Dashboard/
            `/day-detail`) est rendu transparent pour laisser voir
            `ThemedBackground`. `NAVIGATION_THEME` (voir plus haut) neutralise
            ce fond de secours (transparent) à la fois au niveau du `<Stack>`
            ici et au niveau de chaque écran d'onglet (`Background` interne de
            `@react-navigation/bottom-tabs`) ; aucun changement pour les
            écrans déjà opaques. */}
        <NavigationThemeProvider value={NAVIGATION_THEME}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0E0E0E" },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="plan/[id]" />
          <Stack.Screen name="workout/[id]" />
          <Stack.Screen name="session/[id]" />
          <Stack.Screen name="measurement/[id]" />
          <Stack.Screen name="pr/[id]" />
          <Stack.Screen name="compare" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="programs" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="program/[id]" />
          <Stack.Screen name="custom-program/[id]" />
          <Stack.Screen name="habit/[id]" />
          <Stack.Screen name="daily-journal" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="journal-history" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="journal/[id]" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="reminders-list" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="exercise/[name]" />
          <Stack.Screen name="exercise/index" />
          <Stack.Screen name="exercise-detail/[name]" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="cardio-log/new" />
          <Stack.Screen name="exercise-library-settings" />
          <Stack.Screen name="exercise-library-update" />
          <Stack.Screen name="health-sync-settings" />
          <Stack.Screen name="health-metric/[key]" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="day-detail" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="stats" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="goals" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="photo-crop" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="radio" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="radio-stations-settings" options={MODAL_SCREEN_OPTIONS} />
        </Stack>
        <MiniRadioPlayer />
        </NavigationThemeProvider>
      </SafeAreaProvider>
      </RadioPlayerProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
