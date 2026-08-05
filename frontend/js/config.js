const CONFIG = {

  API_URL:
    "https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec",

  DEFAULT_GAME_ID:
    "oscars-2026",
  
  SESSION_TTL_HOURS:
    720,  

  DEBUG:
    false

};
// Shared image-delivery settings for Reality TV, awards, sports, racing,
// game heroes, profiles, and admin previews. Browser mode is always free
// and works on both pages.dev and VS Code Live Server.
window.PLATFORM_IMAGE_CONFIG = {
  enabled: true,
  mode: "browser", // Keep "browser" for the zero-charge pages.dev setup.
  cloudflareBaseUrl: "", // Optional custom-domain origin, e.g. https://play.example.com
  transformExternal: false,
  providerOptimization: true,
  lazyRootMargin: "350px 0px"
};
