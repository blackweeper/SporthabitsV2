// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* `viewport-fit=cover` est le préalable indispensable à tout le
            reste du travail "fullscreen + safe areas" : sans lui, iOS ne
            laisse jamais le contenu s'étendre sous l'encoche/Dynamic Island/
            Home Indicator, donc `env(safe-area-inset-*)` (lu par
            `useSafeAreaInsets()` partout dans l'app) resterait toujours à 0
            en mode installé. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />

        {/* PWA — installation en mode standalone (aucune barre de navigateur
            visible une fois ajoutée à l'écran d'accueil). */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0E0E0E" />
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/* iOS n'implémente pas le Web App Manifest pour le mode standalone —
            ces meta tags Apple historiques restent le seul mécanisme qui
            fonctionne réellement sur Safari/iOS pour masquer la chrome du
            navigateur une fois l'app ajoutée à l'écran d'accueil. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="IronFlow" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { background-color: #0E0E0E; }
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
            `,
          }}
        />
        {/* Service worker minimal (shell + assets, réseau prioritaire pour le
            HTML — voir `public/sw.js`) : n'enregistre qu'en mode standalone/
            production, jamais pendant `expo start --web` (le rechargement à
            chaud casserait sous un cache agressif). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0E0E0E",
        }}
      >
        {children}
      </body>
    </html>
  );
}
