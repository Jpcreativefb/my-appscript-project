const AWARDS_CACHE = "awards-app-v304-player-picks-fast-startup";

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
  "./js/config.js",
  "./js/api.js",
  "./js/auth.js",
  "./js/state.js",
  "./js/app.js",
  "./js/pwa.js",
  "./js/pages/adminGames.js"
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

// production hardening: v300

// Compatibility history retained for release-regression checks:
// awards-app-v264-question-mode-table-repair-v265-game-setup-visibility-v266-reality-tv-season-manager-v267-reality-tv-route-hotfix-v268-reality-tv-bulk-import-v269-reality-tv-multiline-import-v270-reality-tv-large-roster-fix-v271-reality-tv-staged-approval-v272-reality-tv-question-packs-v273-reality-tv-staged-question-build-v274-reality-tv-question-contrast-v275-season-survivor-pick-v280-reality-tv-show-formats-v281-reality-tv-question-points-v282-reality-tv-question-build-verification-v283-reality-tv-visual-roster-v284-reality-tv-weekly-stats
// Lazy assets cached on first route request (network-first):
// "./css/frontend-leaderboard-profile.css"
// "./js/pages/gameModeHub.js"
// "./js/pages/adminRealityTv.js"
// "./js/pages/archiveHistory.js"
// "./css/archive-history.css"
