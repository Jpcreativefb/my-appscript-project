const AWARDS_CACHE = "awards-app-v208-archive-history";

const APP_SHELL = [
  "./",
  "./index.html",
  "./app.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./css/styles.css",
  "./css/components.css",
  "./css/pages.css",
  "./css/picks.css",
  "./css/betting.css",
  "./css/profile.css",
  "./css/league-admin.css",
  "./js/config.js",
  "./js/api.js",
  "./js/auth.js",
  "./js/state.js",
  "./js/app.js",
  "./js/pwa.js",
  "./js/pages/dashboard.js",
  "./js/pages/picks.js",
  "./js/pages/leaderboard.js",
  "./js/pages/seasonHub.js",
  "./js/pages/betting.js",
  "./js/pages/admin.js",
  "./js/pages/adminGames.js",
  "./js/pages/adminGameSetup.js",
  "./js/pages/profile.js"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(AWARDS_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(err => console.warn("Awards App cache install warning:", err))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== AWARDS_CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Do not touch Apps Script/API calls or any outside requests.
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(AWARDS_CACHE);

  try {
    const fresh = await fetch(request);

    if (fresh && fresh.status === 200) {
      cache.put(request, fresh.clone());
    }

    return fresh;
  } catch (err) {
    const cached = await cache.match(request);

    if (cached) return cached;

    if (request.mode === "navigate") {
      return cache.match("./index.html");
    }

    throw err;
  }
}
