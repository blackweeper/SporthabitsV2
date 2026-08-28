// IronFlow — service worker minimal (shell + assets), pensé pour ne jamais
// bloquer une ancienne version en cache pendant des semaines :
// - navigation (HTML) : réseau d'abord, cache seulement en repli hors-ligne
//   (garantit qu'un rechargement voit toujours la dernière version tant que
//   le réseau est disponible — jamais de vieux HTML servi silencieusement).
// - assets statiques (JS/CSS/images du bundle Expo, noms hashés par build) :
//   cache d'abord, réseau en repli — sûr car un nouveau déploiement change
//   les noms de fichiers hashés, donc ne réutilise jamais un ancien asset
//   incompatible avec un nouveau HTML.
// CACHE_VERSION est le seul endroit à changer pour forcer une purge complète
// du cache d'assets lors d'un futur incident (ex. mauvais déploiement).
const CACHE_VERSION = "ironflow-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;

const SHELL_URLS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation (chargement de page/HTML) — réseau d'abord.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(SHELL_CACHE).then((cache) => cache.put("/", res.clone()));
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Assets statiques du bundle (JS/CSS/images) — cache d'abord.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
