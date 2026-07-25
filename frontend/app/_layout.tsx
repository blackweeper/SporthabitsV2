import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

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
          <Stack.Screen name="import" options={{ presentation: "modal" }} />
          <Stack.Screen name="profile" options={{ presentation: "modal" }} />
          <Stack.Screen name="plan/[id]" />
          <Stack.Screen name="workout/[id]" />
          <Stack.Screen name="session/[id]" />
          <Stack.Screen name="measurement/[id]" />
          <Stack.Screen name="pr/new" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
