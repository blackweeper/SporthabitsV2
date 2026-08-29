#!/usr/bin/env node
/**
 * Garde-fou de fin de pipeline `build:web` — échoue bruyamment (code de
 * sortie non-nul) si `dist/index.html` n'a pas réellement reçu le patch de
 * `patch-web-build.js` (viewport-fit=cover, fond global, min-height:100dvh,
 * manifest PWA). Sans ce script, un `dist/` régénéré en sautant l'étape de
 * patch (ex. `npx expo export -p web` lancé seul, à la main, en dehors de
 * `npm run build:web`) produit un HTML qui a l'air valide — aucune erreur
 * d'export — mais réintroduit silencieusement le bug de "ligne/bande
 * blanche" en PWA plein écran iOS (cause racine confirmée : la version
 * shippée à l'époque avait été construite ainsi, sans passer par ce patch).
 *
 * `npm run build:web` = `expo export -p web && node scripts/patch-web-build.js
 * && node scripts/verify-web-build.js` est la SEULE méthode officielle pour
 * régénérer `dist/` — voir le README (§ Build web / PWA).
 */
const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
const distIndexPath = path.join(distDir, "index.html");

if (!fs.existsSync(distIndexPath)) {
  console.error(`[verify-web-build] ${distIndexPath} introuvable.`);
  process.exit(1);
}

const html = fs.readFileSync(distIndexPath, "utf8");

// `index.html` peut référencer "/manifest.json"/"/sw.js" (chaînes présentes)
// sans que ces fichiers existent réellement sur disque — vu en pratique
// pendant cette même passe (un `robocopy /MIR` depuis un export qui ne les
// contenait pas les a supprimés de `dist/` sans toucher `index.html`).
// Vérifier la présence réelle des fichiers, pas seulement la référence.
const REQUIRED_FILES = ["manifest.json", "sw.js"];
const missingFiles = REQUIRED_FILES.filter((f) => !fs.existsSync(path.join(distDir, f)));

const REQUIRED_CHECKS = [
  { label: "viewport-fit=cover", test: /viewport-fit=cover/ },
  { label: "fond global html/body", test: /html,\s*body\s*\{\s*background-color:\s*#0E0E0E/ },
  {
    label: "min-height: var(--app-vh, 100dvh) sur html/body/#root",
    test: /html,\s*body,\s*#root\s*\{\s*min-height:\s*var\(--app-vh,\s*100dvh\)/,
  },
  { label: "manifest PWA", test: /rel="manifest"/ },
  { label: "meta apple-mobile-web-app-capable", test: /apple-mobile-web-app-capable/ },
  { label: "enregistrement du service worker", test: /serviceWorker/ },
];

const missing = REQUIRED_CHECKS.filter((c) => !c.test.test(html));

if (missing.length > 0 || missingFiles.length > 0) {
  console.error("[verify-web-build] dist/ incomplet :");
  for (const m of missing) console.error(`  - index.html : ${m.label} manquant`);
  for (const f of missingFiles) console.error(`  - dist/${f} introuvable sur disque`);
  console.error(
    '[verify-web-build] "dist/" a probablement été régénéré sans passer par "npm run build:web" ' +
      '(ex. "npx expo export -p web" lancé seul, ou un "robocopy /MIR" depuis un export incomplet). ' +
      'Relancez "npm run build:web" en entier.',
  );
  process.exit(1);
}

console.log("[verify-web-build] dist/ conforme (index.html patché + manifest.json/sw.js présents).");
