(function registerAwardsPwa() {
  if (!("serviceWorker" in navigator)) return;

  const host = String(window.location.hostname || "").toLowerCase();
  const isLocalDevelopment = host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0";

  // A service worker should never control VS Code Live Server. Stale localhost
  // caches can make newly added lazy page modules fail with net::ERR_FAILED.
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

      if (window.caches && typeof window.caches.keys === "function") {
        window.caches.keys()
          .then(function(keys) {
            return Promise.all(keys
              .filter(function(key) { return key.indexOf("awards-app-") === 0; })
              .map(function(key) { return window.caches.delete(key); }));
          })
          .catch(function(err) {
            console.warn("Local cache cleanup warning", err);
          });
      }
    });
    return;
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("./sw.js?v=303-admin-page-module-loader-fix")
      .then(function () {
        console.log("Awards App PWA ready");
      })
      .catch(function (err) {
        console.warn("Awards App PWA registration failed", err);
      });
  });
})();
