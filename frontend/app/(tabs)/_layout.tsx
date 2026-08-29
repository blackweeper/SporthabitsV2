import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { BlurView } from "expo-blur";
import { coloredShadow } from "@/src/theme";
import { useTheme } from "@/src/themes";
import QuickAddModal from "@/src/components/QuickAddModal";
import { SUNSET_BAR_HEIGHT, SUNSET_BAR_MARGIN } from "@/src/utils/tab-bar-metrics";

// Taille d'icône explicite et cohérente (au lieu de la taille par défaut
// transmise sans intention) — s'accorde avec la pilule d'onglet actif
// ci-dessous.
const TAB_ICON_SIZE = 20;

/** Icône seule — le libellé est rendu par le mécanisme natif de
 * react-navigation (`tabBarShowLabel:true` dans `screenOptions`), PAS ici.
 * Constat fait par inspection DOM : un `tabBarIcon` personnalisé est toujours
 * enveloppé par la librairie dans un slot à TAILLE FIXE (`TabBarIcon.tsx`,
 * `wrapperUikit: {width, height}` constants, non extensible même avec
 * `flex:1` côté appelant) — y combiner icône+libellé écrase le texte dans ce
 * petit slot et le décentre verticalement dans la pilule. Laisser
 * react-navigation empiler lui-même icône (slot fixe) + libellé (hauteur
 * libre) est le seul chemin qui rend correctement — commun aux deux thèmes. */
function TabIcon({
  name,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return <Ionicons name={name} color={color} size={TAB_ICON_SIZE} />;
}

export default function TabsLayout() {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const { theme } = useTheme();
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
          // Libellé natif de react-navigation, toujours visible — seul
          // mécanisme qui n'écrase pas le texte dans le slot à taille fixe
          // réservé à `tabBarIcon` (voir le commentaire sur `TabIcon`).
          // Commun aux deux thèmes.
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabLabel,
          // Barre flottante en pilule (glass), commune aux deux thèmes —
          // seule la teinte (`theme.colors.borderStrong`/`theme.card.tint`)
          // change. Le home indicator ne doit jamais recouvrir les onglets —
          // mais sans jamais transformer `insets.bottom` en espace vide sous
          // l'app (bug constaté sur iPhone : bande noire sous l'app + barre
          // pas vraiment au bord) : la pilule flottante garde sa marge fixe
          // (`SUNSET_BAR_MARGIN`, jamais `+ insets.bottom` — la pousser plus
          // haut n'aide pas et agrandit la zone qui doit rester peinte par le
          // fond de l'app, voir le fix `min-height:100dvh` dans
          // `scripts/patch-web-build.js`).
          tabBarStyle: {
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
          },
          // Fond flouté "Liquid Glass" de la barre — commun aux deux thèmes,
          // seule la teinte du verre (`theme.card.tint`) change.
          tabBarBackground: () => (
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
          ),
          // Icônes blanches par défaut, couleur d'accent du thème sur
          // l'onglet actif — pas de fond de pilule par onglet (le libellé
          // permanent joue déjà ce rôle). `onSurface` vaut #FFFFFF dans les
          // deux thèmes (voir `classic.ts`/`sunset.ts`) : un vrai token,
          // jamais une couleur en dur.
          tabBarActiveTintColor: theme.colors.brand,
          tabBarInactiveTintColor: theme.colors.onSurface,
          tabBarItemStyle: { justifyContent: "center", alignItems: "center" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Aujourd'hui",
            tabBarIcon: ({ color }) => <TabIcon name="today" color={color} />,
            tabBarButtonTestID: "tab-today",
          }}
        />
        <Tabs.Screen
          name="training"
          options={{
            title: "Entraînements",
            tabBarIcon: ({ color }) => <TabIcon name="barbell" color={color} />,
            tabBarButtonTestID: "tab-training",
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Bibliothèque",
            tabBarIcon: ({ color }) => <TabIcon name="library" color={color} />,
            tabBarButtonTestID: "tab-library",
          }}
        />
        <Tabs.Screen
          name="sante"
          options={{
            title: "Santé",
            tabBarIcon: ({ color }) => <TabIcon name="heart" color={color} />,
            tabBarButtonTestID: "tab-sante",
          }}
        />
        <Tabs.Screen
          name="progression"
          options={{
            title: "Performance",
            tabBarLabel: "Performance",
            tabBarIcon: ({ color }) => <TabIcon name="trending-up" color={color} />,
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
        style={[styles.fabWrap, { bottom: SUNSET_BAR_MARGIN + SUNSET_BAR_HEIGHT + 14 }]}
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
  tabLabel: { fontSize: 9.5, fontWeight: "700" },
  fabWrap: {
    // La position réelle (au-dessus de la pilule flottante) est appliquée
    // à l'appel — `bottom` ici n'est qu'un repli avant le premier calcul.
    position: "absolute",
    left: 0,
    right: 0,
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
