import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DarkTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { migrateFavoritesToUserData } from "@/src/utils/exercise-user-data-migration";
import { backfillPersonalLibrary } from "@/src/utils/exercise-library-backfill";
import { seedCoreLibraryIfNeeded } from "@/src/utils/exercise-library-bootstrap";
import { seedStarterProgramsIfNeeded } from "@/src/utils/program-bootstrap";
import { seedWodLibraryIfNeeded } from "@/src/utils/wod-bootstrap";
import { HEALTH_SYNC_INTERVAL_MS, useHealthSync } from "@/src/hooks/useHealthSync";
import { ThemeProvider } from "@/src/themes";
import ThemedStatusBar from "@/src/themes/ThemedStatusBar";
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
  // fois au lancement, puis toutes les `HEALTH_SYNC_INTERVAL_MS` (15 min)
  // tant que l'app reste ouverte (pas de vraie exécution en arrière-plan
  // possible sur le web sans Service Worker, hors périmètre ici — ceci
  // couvre "à l'ouverture" et "pendant que l'app est utilisée"). Aucun état
  // de `useHealthSync` n'est lu ici : si l'URL/le token ne sont pas
  // configurés, `sync()` échoue en interne avant toute requête réseau (voir
  // useHealthSync.ts) — totalement silencieux, jamais de spinner ni
  // d'erreur visible.
  //
  // IMPORTANT — ce que ceci automatise et ce qu'il n'automatise PAS :
  // cette boucle fait uniquement "récupérer ce que Health Auto Export a déjà
  // envoyé au backend". Elle ne déclenche JAMAIS un nouvel export côté iOS —
  // ça reste entièrement la responsabilité de l'automation Health Auto
  // Export elle-même (déclenchée par HAE en arrière-plan si son automation
  // est configurée ainsi, ou manuellement par l'utilisateur dans l'app HAE).
  // Voir le panneau Réglages > Santé > Diagnostic santé, qui distingue
  // explicitement "dernier export reçu par le backend" (dépend de HAE/iOS)
  // de "dernière récupération par IronFlow" (ce que cette boucle fait).
  useEffect(() => {
    syncHealthData();
    const interval = setInterval(syncHealthData, HEALTH_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [syncHealthData]);

  // Web — bug confirmé en direct : après un changement d'onglet (tap sur un
  // chip/segment horizontalement scrollable), Chrome déclenche son
  // `scrollIntoView` automatique sur l'élément focus et remonte la chaîne
  // d'ancêtres jusqu'à en scroller un qui a `overflow:hidden` (confirmé par
  // inspection DOM directe : la vue quasi-racine de l'app, `flex:1` +
  // `overflow:hidden`, se retrouve avec un `scrollLeft` non nul alors
  // qu'elle n'a jamais de barre de défilement ni de scroll utilisateur
  // possible) — tout le contenu monté après ce point se retrouve rendu
  // décalé/hors cadre. Un élément `overflow:hidden` n'est par définition
  // jamais scrollable par l'utilisateur (contrairement à `overflow:auto`/
  // `scroll`) ; réinitialiser son `scrollLeft` dès qu'il dérive est donc
  // sans risque pour les vrais rangs défilants de l'app (ScrollView
  // horizontal, `overflow-x:auto`), jamais concernés par ce correctif.
  //
  // Deuxième manifestation du MÊME mécanisme, confirmée en direct dans les
  // écrans Programme (Semaine → Séance → Exercice) : le `scrollIntoView`
  // remonte parfois jusqu'à la FENÊTRE elle-même (`e.target === document`),
  // qui n'a pourtant pas de `.scrollLeft` d'élément DOM classique — le garde
  // ci-dessus ne le détectait donc jamais (`typeof el.scrollLeft !== "number"`
  // sur un `Document` retourne toujours vrai, sortie anticipée silencieuse).
  // `body{overflow:hidden}` (voir `#expo-reset` injecté par Expo) signifie que
  // TOUT scroll de fenêtre est par construction un artefact, jamais une vraie
  // fonctionnalité — reproduit : `window.scrollY` dérivait à 390px après une
  // transition Séance→Exercice, poussant tout le contenu vers le bas et
  // laissant un bandeau vide, lu comme "carte illisible/floue" par
  // l'utilisateur alors qu'aucun flou CSS n'est en cause.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleScroll = (e: Event) => {
      if (e.target === document) {
        if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
        return;
      }
      const el = e.target as HTMLElement;
      if (!el || typeof el.scrollLeft !== "number" || el.scrollLeft === 0) return;
      if (window.getComputedStyle(el).overflowX === "hidden") {
        el.scrollLeft = 0;
      }
    };
    document.addEventListener("scroll", handleScroll, true);
    return () => document.removeEventListener("scroll", handleScroll, true);
  }, []);

  // Web PWA — bug clavier iOS confirmé : Réglages/Santé/Profil → focus un
  // TextInput ("Taille"...) → le clavier apparaît → l'app se décale (gauche
  // ET haut) → fermeture du clavier → le décalage RESTE. Cause distincte du
  // bug scrollLeft/scrollY ci-dessus : sur iOS Safari (y compris PWA
  // standalone), amener un champ focus au-dessus du clavier peut déplacer le
  // VISUAL VIEWPORT lui-même (`visualViewport.offsetLeft`/`offsetTop`) —
  // invisible via `window.scrollX`/`scrollY`, qui restent à 0 pendant tout
  // ce temps (vérifié : la garde ci-dessus ne peut donc rien détecter ici).
  // `window.visualViewport` est le seul signal qui expose ce décalage réel,
  // donc le seul point d'accroche fiable pour le détecter ET le corriger —
  // jamais un recalage arbitraire : on revient exactement à l'état d'avant
  // (viewport plein, scroll à l'origine) seulement quand le clavier vient
  // réellement de se refermer (hauteur visuelle redevenue ≈ celle de la
  // fenêtre), jamais pendant qu'il est ouvert ou pour une autre raison.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const vv = window.visualViewport;
    if (!vv) return;

    let keyboardWasOpen = false;

    const handleViewportChange = () => {
      // Marge de 120px pour ne jamais confondre "clavier ouvert" avec une
      // barre d'adresse qui se rétracte/déploie au scroll (variation
      // typique de quelques dizaines de px, jamais plus).
      const keyboardOpen = vv.height < window.innerHeight - 120;

      if (keyboardOpen) {
        // Garde le layout aligné sur la vraie zone visible pendant que le
        // clavier est ouvert — `100dvh` seul ne suit pas toujours ce
        // changement en PWA standalone iOS (voir la règle CSS correspondante
        // dans `scripts/patch-web-build.js`).
        document.documentElement.style.setProperty("--app-vh", `${vv.height}px`);
      } else if (keyboardWasOpen) {
        // Le clavier vient de se fermer : jamais pendant qu'il est ouvert,
        // jamais pour une autre variation de taille. Retire la variable
        // (repli sur `100dvh` statique) ET force la remise à zéro du
        // scroll — iOS ne resynchronise pas toujours le visual viewport
        // tout seul, remettre le scroll du viewport de mise en page à
        // l'origine force ce recalage.
        document.documentElement.style.removeProperty("--app-vh");
        window.scrollTo(0, 0);
        // Bug trouvé en relisant ce correctif : le commentaire ci-dessus
        // diagnostiquait déjà `visualViewport.offsetLeft/offsetTop` comme la
        // vraie cause du décalage horizontal+vertical persistant, mais
        // aucune ligne ne le corrigeait réellement — seule la hauteur
        // (`vv.height`) était traitée. Un `offsetLeft`/`offsetTop` non nul
        // une fois le clavier fermé signifie que Safari n'a pas repris
        // `scale:1` (le vrai mécanisme du "reste décalé") ; `window.scrollTo`
        // seul n'influence pas ce zoom. Reforcer brièvement le contenu du
        // `<meta name=viewport>` (retrait puis remise), technique connue
        // pour forcer iOS Safari à recalculer le viewport visuel, est le
        // seul levier restant côté page — jamais appliqué en dehors de ce
        // cas précis (clavier qui vient de se fermer avec un offset résiduel).
        if (vv.offsetLeft !== 0 || vv.offsetTop !== 0) {
          const meta = document.querySelector('meta[name="viewport"]');
          const content = meta?.getAttribute("content");
          if (meta && content) {
            meta.setAttribute("content", `${content}, shrink-to-fit=yes`);
            requestAnimationFrame(() => {
              meta.setAttribute("content", content);
              window.scrollTo(0, 0);
            });
          }
        }
      }
      keyboardWasOpen = keyboardOpen;
    };

    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);
    return () => {
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0E0E0E" }}>
      <ThemeProvider>
      <RadioPlayerProvider>
      <SafeAreaProvider>
        <ThemedStatusBar />
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
          <Stack.Screen name="health-debug" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="health-metric/[key]" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="day-detail" options={MODAL_SCREEN_OPTIONS} />
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
