(function registerAwardsPwa() {
  if (!("serviceWorker" in navigator)) return;

  const PWA_VERSION = "v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217v-studio-control-fixes";
  const SW_URL = "./sw.js?v=" + encodeURIComponent(PWA_VERSION);
  const host = String(window.location.hostname || "").toLowerCase();
  const isLocalDevelopment = host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0";

  function clearAwardsCaches_(keepName) {
    if (!window.caches || typeof window.caches.keys !== "function") {
      return Promise.resolve();
    }

    return window.caches.keys().then(function(keys) {
      return Promise.all(keys
        .filter(function(key) {
          return key.indexOf("awards-app-") === 0 && key !== keepName;
        })
        .map(function(key) {
          return window.caches.delete(key);
        }));
    });
  }

  // A service worker should never control VS Code Live Server.
  if (isLocalDevelopment) {
    window.addEventListener("load", function() {
      navigator.serviceWorker.getRegistrations()
        .then(function(registrations) {
          return Promise.all(registrations.map(function(registration) {
            return registration.unregister();
          }));
        })
        .catch(function(err) {
          console.warn("Local service-worker cleanup warning", err);
        });

      clearAwardsCaches_("")
        .catch(function(err) {
          console.warn("Local cache cleanup warning", err);
        });
    });
    return;
  }

  window.addEventListener("load", function() {
    let didControllerReload = false;

    navigator.serviceWorker.addEventListener("controllerchange", function() {
      if (didControllerReload) return;

      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem("awardsPwaReload:" + PWA_VERSION) === "1";
        if (!alreadyReloaded) {
          sessionStorage.setItem("awardsPwaReload:" + PWA_VERSION, "1");
        }
      } catch (err) {
        alreadyReloaded = false;
      }

      if (alreadyReloaded) return;
      didControllerReload = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register(SW_URL)
      .then(function(registration) {
        console.log("Awards App PWA ready", PWA_VERSION);

        // Force an update check now instead of waiting for Safari's normal
        // service-worker refresh interval. This is especially important for
        // iPhone home-screen installs after a production asset change.
        if (registration && typeof registration.update === "function") {
          registration.update().catch(function(err) {
            console.warn("Awards App PWA update check warning", err);
          });
        }

        try {
          localStorage.setItem("awardsPwaVersion", PWA_VERSION);
        } catch (err) {
          // Private browsing/storage restrictions should never block startup.
        }
      })
      .catch(function(err) {
        console.warn("Awards App PWA registration failed", err);
      });
  });
})();
