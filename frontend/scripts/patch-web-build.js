#!/usr/bin/env node
/**
 * NE JAMAIS lancer "npx expo export -p web" seul pour produire `dist/` — ce
 * script (et `verify-web-build.js` juste après) ne s'exécutent PAS
 * automatiquement dans ce cas, et `dist/` réintroduit silencieusement le bug
 * de bande blanche en PWA plein écran iOS (cause racine déjà rencontrée en
 * production). La seule méthode officielle est `npm run build:web`
 * (= export → ce patch → vérification), voir le README (§ Build web / PWA).
 *
 * Injecte les balises PWA (manifest, viewport-fit=cover, meta Apple,
 * enregistrement du service worker) dans `dist/index.html` après
 * `expo export -p web`.
 *
 * Pourquoi ce script plutôt que `app/+html.tsx` seul : sous
 * `expo.web.output: "single"` (SPA), Expo Router n'applique PAS la
 * personnalisation `+html.tsx` au HTML généré par `expo export` — vérifié
 * directement (le HTML exporté restait le gabarit par défaut d'Expo, malgré
 * `+html.tsx` correctement écrit et `tsc` propre). `+html.tsx` est conservé
 * tel quel dans le code (documente l'intention, ne fait de mal à personne),
 * mais c'est CE script qui garantit réellement le résultat en patchant le
 * HTML final produit par le pipeline d'export — indépendant du comportement
 * interne d'Expo Router.
 */
const fs = require("fs");
const path = require("path");

const distIndexPath = path.join(__dirname, "..", "dist", "index.html");

if (!fs.existsSync(distIndexPath)) {
  console.error(`[patch-web-build] ${distIndexPath} introuvable — lancez d'abord "expo export -p web".`);
  process.exit(1);
}

let html = fs.readFileSync(distIndexPath, "utf8");

html = html.replace(/<html lang="[^"]*">/, '<html lang="fr">');

html = html.replace(
  /<meta name="viewport" content="[^"]*"\s*\/>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, shrink-to-fit=no" />',
);

const injected = `
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#0E0E0E" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="IronFlow" />
  <meta name="mobile-web-app-capable" content="yes" />
  <style>
    html, body { background-color: #0E0E0E; }
    /* Le reset #expo-reset (généré par Expo, avant ce bloc) fixe html/body/#root
       à "height: 100%". Sous Safari iOS en mode standalone (PWA installée) +
       viewport-fit=cover, "100%"/"100vh" peut rester plus court que la
       hauteur réelle de l'écran (l'espace derrière le Home Indicator n'est
       pas toujours inclus) — c'est la cause exacte de la bande noire sous
       l'app : le fond de la page (body, correctement noir) reste visible
       sous le contenu React, qui s'arrête trop tôt. "100dvh" (dynamic
       viewport height) mesure la VRAIE surface visible, Home Indicator
       inclus. Ajouté en "min-height" (jamais en remplacement de "height")
       pour ne jamais RÉDUIRE la hauteur sur les navigateurs qui calculent
       déjà "100%" correctement — seulement l'agrandir si besoin.
       "var(--app-vh, 100dvh)" — la variable est posée/retirée par
       app/_layout.tsx au show/hide du clavier (voir son commentaire) ;
       absente (valeur par défaut, hors clavier), le repli "100dvh" donne un
       résultat identique à avant — aucun changement de comportement en
       dehors d'un clavier ouvert. */
    html, body, #root { min-height: var(--app-vh, 100dvh); }
  </style>
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
      });
    }
  </script>
</head>`;

if (!html.includes('rel="manifest"')) {
  html = html.replace(/<\/head>/, injected);
}

fs.writeFileSync(distIndexPath, html, "utf8");
console.log("[patch-web-build] dist/index.html patché (manifest, viewport-fit=cover, meta Apple, service worker).");
