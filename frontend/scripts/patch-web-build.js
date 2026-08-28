#!/usr/bin/env node
/**
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
  <style>html, body { background-color: #0E0E0E; }</style>
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
