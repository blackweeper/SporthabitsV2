import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Pressable, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, coloredShadow, motion } from "@/src/theme";
import QuickAddModal from "@/src/components/QuickAddModal";

// Taille d'icône explicite et cohérente (au lieu de la taille par défaut
// transmise sans intention) — s'accorde avec la pastille d'onglet actif
// ci-dessous.
const TAB_ICON_SIZE = 22;

/** Icône d'onglet + pastille discrète sous l'icône active — le seul repère
 * visuel manquant de cette tab bar (le changement de couleur icône/label
 * suffisait à peine à signaler "où je suis"). La pastille s'estompe en
 * fondu plutôt qu'en coupure nette, cohérent avec le reste des
 * micro-interactions introduites ailleurs. */
function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) {
  const opacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(focused ? 1 : 0, { duration: motion.fast });
  }, [focused, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.iconWrap}>
      <Ionicons name={name} color={color} size={TAB_ICON_SIZE} />
      <Animated.View style={[styles.activeDot, animatedStyle]} />
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surfaceSecondary,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 72,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.onSurfaceTertiary,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Aujourd'hui",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="today" focused={focused} color={color} />
            ),
            tabBarButtonTestID: "tab-today",
          }}
        />
        <Tabs.Screen
          name="training"
          options={{
            title: "Entraînements",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="barbell" focused={focused} color={color} />
            ),
            tabBarButtonTestID: "tab-training",
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Bibliothèque",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="library" focused={focused} color={color} />
            ),
            tabBarButtonTestID: "tab-library",
          }}
        />
        <Tabs.Screen
          name="progression"
          options={{
            title: "Mon évolution",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="trending-up" focused={focused} color={color} />
            ),
            tabBarButtonTestID: "tab-progression",
          }}
        />
        <Tabs.Screen
          name="profile-tab"
          options={{
            title: "Profil",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="person" focused={focused} color={color} />
            ),
            tabBarButtonTestID: "tab-profile",
          }}
        />
        {/* Hidden routes (kept for backward compat / deep links) */}
        <Tabs.Screen name="program" options={{ href: null }} />
        <Tabs.Screen name="plans" options={{ href: null }} />
        <Tabs.Screen name="stretching" options={{ href: null }} />
        <Tabs.Screen name="history" options={{ href: null }} />
      </Tabs>

      {/* Global "Actions rapides" button — floats above the tab bar on every
          tab, no longer a tab-bar slot itself. */}
      <View pointerEvents="box-none" style={styles.fabWrap}>
        <Pressable testID="tab-add" style={styles.fab} onPress={() => setAddOpen(true)}>
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      </View>

      <QuickAddModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onPick={(where) => {
          setAddOpen(false);
          // small delay so the modal closes smoothly before navigation
          setTimeout(() => router.push(where as any), 150);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: "center", gap: 3 },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  fabWrap: {
    // Sits clear above the 72px-tall tab bar so it never overlaps a tab's
    // touch target (the Bibliothèque tab now occupies the center slot).
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 82,
    alignItems: "center",
    zIndex: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.surfaceSecondary,
    ...coloredShadow(colors.brand, { opacity: 0.5, radius: 8, elevation: 6 }),
  },
});
