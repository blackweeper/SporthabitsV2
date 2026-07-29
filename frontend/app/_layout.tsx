import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { migrateFavoritesToUserData } from "@/src/utils/exercise-user-data-migration";
import { backfillPersonalLibrary } from "@/src/utils/exercise-library-backfill";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

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
  useEffect(() => {
    migrateFavoritesToUserData()
      .catch((err) => console.warn("Favorites migration failed:", err))
      .then(() => backfillPersonalLibrary())
      .catch((err) => console.warn("Library backfill failed:", err));
  }, []);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0E0E0E" }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0E0E0E" />
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
          <Stack.Screen name="pr/new" />
          <Stack.Screen name="compare" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="programs" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="program/[id]" />
          <Stack.Screen name="custom-program/[id]" />
          <Stack.Screen name="habit/[id]" />
          <Stack.Screen name="daily-journal" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="journal/[id]" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="exercise/[name]" />
          <Stack.Screen name="exercise/index" />
          <Stack.Screen name="exercise-detail/[name]" />
          <Stack.Screen name="cardio-log/new" />
          <Stack.Screen name="exercise-library-settings" />
          <Stack.Screen name="exercise-library-update" />
          <Stack.Screen name="stats" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="achievements" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="goals" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="photo-crop" options={MODAL_SCREEN_OPTIONS} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
