(function registerAwardsPwa() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("./sw.js")
      .then(function () {
        console.log("Awards App PWA ready");
      })
      .catch(function (err) {
        console.warn("Awards App PWA registration failed", err);
      });
  });
})();
