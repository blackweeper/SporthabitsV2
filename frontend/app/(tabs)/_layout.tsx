import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { BlurView } from "expo-blur";
import Animated, { FadeIn } from "react-native-reanimated";
import { coloredShadow, radius, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import QuickAddModal from "@/src/components/QuickAddModal";
import { SUNSET_BAR_HEIGHT, SUNSET_BAR_MARGIN } from "@/src/utils/tab-bar-metrics";

// Taille d'icône explicite et cohérente (au lieu de la taille par défaut
// transmise sans intention) — s'accorde avec la pilule d'onglet actif
// ci-dessous.
const TAB_ICON_SIZE = 20;

/** Icône seule sous Sunset — le libellé y est rendu par le mécanisme natif
 * de react-navigation (`tabBarShowLabel:true` dans `screenOptions`), PAS ici.
 * Constat fait par inspection DOM : un `tabBarIcon` personnalisé est toujours
 * enveloppé par la librairie dans un slot à TAILLE FIXE (`TabBarIcon.tsx`,
 * `wrapperUikit: {width, height}` constants, non extensible même avec
 * `flex:1` côté appelant) — y combiner icône+libellé écrase le texte dans ce
 * petit slot et le décentre verticalement dans la pilule. Laisser
 * react-navigation empiler lui-même icône (slot fixe) + libellé (hauteur
 * libre, `renderLabel`/`styles.labelBeneath`) est le seul chemin qui rend
 * correctement. Sous Classique, la pilule (icône + libellé seulement sur
 * l'onglet actif, fond teinté) reste inchangée — comportement déjà correct
 * avec cette identique contrainte, jamais un problème car son libellé est
 * conditionnel/discret, pas la cause du bug rapporté. */
function TabIcon({
  name,
  label,
  focused,
  color,
  sunset,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  color: string;
  sunset: boolean;
}) {
  if (sunset) {
    return <Ionicons name={name} color={color} size={TAB_ICON_SIZE} />;
  }
  return (
    <View style={[styles.pill, focused && { backgroundColor: withAlpha(color, 16) }]}>
      <Ionicons name={name} color={color} size={TAB_ICON_SIZE} />
      {focused && (
        <Animated.Text
          entering={FadeIn.duration(150)}
          style={[styles.pillLabel, { color }]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const { theme } = useTheme();
  const isGlass = theme.card.mode === "glass";
  const isSunset = theme.id === "sunset";

  return (
    // Fond de secours opaque uni (jamais le dégradé — voir `ThemedBackground.tsx`
    // pour pourquoi un fond partagé unique ici casse l'empilement zIndex des
    // écrans d'onglets). Chaque écran migré (Dashboard/`/day-detail`) peint
    // désormais son propre dégradé via son propre `<ThemedBackground/>` ; les
    // écrans non migrés peignent déjà leur propre fond opaque `colors.surface`.
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          // Classique : libellé géré à la main dans `TabIcon` (visible
          // seulement sur l'onglet actif) — natif désactivé. Sunset :
          // libellé natif de react-navigation activé et toujours visible
          // (`renderLabel`/`styles.labelBeneath`), seul mécanisme qui
          // n'écrase pas le texte dans le slot à taille fixe réservé à
          // `tabBarIcon` (voir le commentaire sur `TabIcon`).
          tabBarShowLabel: isSunset,
          tabBarLabelStyle: isSunset ? styles.sunsetLabel : undefined,
          // Le fond de scène par défaut de React Navigation est neutralisé
          // (voir `NAVIGATION_THEME` dans `app/_layout.tsx`). Onglets non
          // migrés (Entraînements/Bibliothèque/...) : chaque écran garde son
          // propre fond opaque (`colors.surface`) qui masque naturellement
          // le dégradé partagé, comme prévu.
          tabBarStyle: isSunset
            ? {
                position: "absolute",
                left: SUNSET_BAR_MARGIN,
                right: SUNSET_BAR_MARGIN,
                bottom: SUNSET_BAR_MARGIN,
                height: SUNSET_BAR_HEIGHT,
                borderRadius: theme.radius.pill,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.borderStrong,
                backgroundColor: "transparent",
                overflow: "hidden",
                elevation: 8,
                paddingBottom: 0,
                paddingTop: 0,
              }
            : {
                backgroundColor: theme.card.mode === "glass" ? theme.card.tint : theme.colors.surfaceSecondary,
                borderTopColor: isGlass ? theme.colors.borderStrong : theme.colors.border,
                borderTopWidth: isGlass ? StyleSheet.hairlineWidth : 1,
                height: 72,
                paddingBottom: 10,
                paddingTop: 8,
              },
          // Fond flouté "liquid glass" de la barre — seulement sous Sunset ;
          // `undefined` ailleurs laisse `tabBarStyle.backgroundColor` gérer
          // le fond (comportement Classique inchangé).
          tabBarBackground: isSunset
            ? () => (
                <View style={StyleSheet.absoluteFillObject}>
                  <BlurView
                    intensity={theme.card.mode === "glass" ? theme.card.blurIntensity : 0}
                    tint="dark"
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View
                    style={[
                      StyleSheet.absoluteFillObject,
                      { backgroundColor: theme.card.mode === "glass" ? theme.card.tint : theme.colors.surfaceSecondary },
                    ]}
                  />
                </View>
              )
            : undefined,
          // Sunset (Glacier Aurora) : icônes blanches par défaut, Glacier
          // Blue (accent du thème) sur l'onglet actif — pas de fond de
          // pilule par onglet (le libellé permanent joue déjà ce rôle).
          // Classique : inchangé.
          tabBarActiveTintColor: theme.colors.brand,
          tabBarInactiveTintColor: isSunset ? "#FFFFFF" : theme.colors.onSurfaceTertiary,
          tabBarItemStyle: isSunset ? { justifyContent: "center", alignItems: "center" } : undefined,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Aujourd'hui",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="today" label="Aujourd'hui" focused={focused} color={color} sunset={isSunset} />
            ),
            tabBarButtonTestID: "tab-today",
          }}
        />
        <Tabs.Screen
          name="training"
          options={{
            title: "Entraînements",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="barbell" label="Entraînements" focused={focused} color={color} sunset={isSunset} />
            ),
            tabBarButtonTestID: "tab-training",
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Bibliothèque",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="library" label="Bibliothèque" focused={focused} color={color} sunset={isSunset} />
            ),
            tabBarButtonTestID: "tab-library",
          }}
        />
        <Tabs.Screen
          name="sante"
          options={{
            title: "Santé",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="heart" label="Santé" focused={focused} color={color} sunset={isSunset} />
            ),
            tabBarButtonTestID: "tab-sante",
          }}
        />
        <Tabs.Screen
          name="progression"
          options={{
            title: "Mon évolution",
            // Sous Sunset, le libellé natif de l'onglet lit `options.title`
            // par défaut ("Mon évolution", trop long pour la pilule) — le
            // raccourcir explicitement ici, cohérent avec le libellé déjà
            // utilisé par la pilule Classique ci-dessous.
            tabBarLabel: "Évolution",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="trending-up" label="Évolution" focused={focused} color={color} sunset={isSunset} />
            ),
            tabBarButtonTestID: "tab-progression",
          }}
        />
        {/* Profil retiré de la barre — doublonnait avec la roue de réglages
            en haut du Dashboard, qui mène au même endroit. La route reste
            navigable (router.push), juste plus listée comme onglet. */}
        <Tabs.Screen name="profile-tab" options={{ href: null }} />
        {/* Hidden routes (kept for backward compat / deep links) */}
        {/* `add.tsx` est un simple repli (`<Redirect>`) pour une navigation
            programmatique vers `/add` — jamais un vrai onglet, le "+" est
            maintenant le FAB flottant ci-dessous. Sans `href:null`,
            expo-router l'aurait quand même auto-enregistré comme 6e onglet
            visible (tout fichier de `(tabs)/` devient un onglet par défaut,
            que `<Tabs.Screen>` le configure explicitement ou non). */}
        <Tabs.Screen name="add" options={{ href: null }} />
        <Tabs.Screen name="program" options={{ href: null }} />
        <Tabs.Screen name="plans" options={{ href: null }} />
        <Tabs.Screen name="stretching" options={{ href: null }} />
        <Tabs.Screen name="history" options={{ href: null }} />
      </Tabs>

      {/* Bouton "Actions rapides" — flotte au-dessus de la barre d'onglets
          sur chaque onglet, plutôt que d'occuper un slot au milieu de la
          barre (revert explicite : l'utilisateur veut retrouver un
          espacement égal entre les onglets restants). */}
      <View
        pointerEvents="box-none"
        style={[styles.fabWrap, isSunset && { bottom: SUNSET_BAR_MARGIN + SUNSET_BAR_HEIGHT + 14 }]}
      >
        <Pressable
          testID="tab-add"
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.brand,
              borderColor: theme.card.mode === "glass" ? theme.card.tint : theme.colors.surfaceSecondary,
              ...coloredShadow(theme.colors.brand, { opacity: 0.5, radius: 8, elevation: 6 }),
            },
          ]}
          onPress={() => setAddOpen(true)}
        >
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
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pillLabel: { fontSize: 11, fontWeight: "800" },
  sunsetLabel: { fontSize: 9.5, fontWeight: "700" },
  fabWrap: {
    // Reste au-dessus de la barre (72px de haut sous Classique — offset
    // Sunset appliqué séparément, voir l'appel ci-dessus) sans jamais
    // recouvrir un onglet.
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
});
