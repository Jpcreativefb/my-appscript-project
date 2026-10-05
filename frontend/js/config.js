const CONFIG = {

  API_URL:
    "https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec",

  DEFAULT_GAME_ID:
    "oscars-2026",
  
  SESSION_TTL_HOURS:
    2160,  

  DEBUG:
    false

};

// Loading / How-To Rescue R2 boot shim. Install before app startup so the
// existing Dashboard request can be observed even when Home begins before the
// normal DOMContentLoaded loader hooks. This never starts a request.
(function pattcInstallLoadingHowToRescueBoot_(global){
  if(!global||!global.document||global.__PATTC_LOADING_HOWTO_RESCUE_BOOT__)return;
  global.__PATTC_LOADING_HOWTO_RESCUE_BOOT__=true;

  function showHomeDiscovery_(detail){
    detail=detail||{};
    if(String(detail.action||"")!=="getDashboardGamesHub")return;
    var feature=global.PATTCLoadingHowToR1;
    if(feature&&typeof feature.mountHomeDiscovery==="function"){
      feature.mountHomeDiscovery(detail.result||null);
      global.__PATTC_PENDING_HOME_DISCOVERY__=null;
    }else{
      global.__PATTC_PENDING_HOME_DISCOVERY__=detail.result||null;
    }
  }

  global.document.addEventListener("awards:api-end",function(event){
    showHomeDiscovery_(event&&event.detail||{});
  });

  global.document.addEventListener("DOMContentLoaded",function(){
    var pending=global.__PATTC_PENDING_HOME_DISCOVERY__;
    var feature=global.PATTCLoadingHowToR1;
    if(pending&&feature&&typeof feature.mountHomeDiscovery==="function"){
      feature.mountHomeDiscovery(pending);
      global.__PATTC_PENDING_HOME_DISCOVERY__=null;
    }
  });

  // Capture Finish before the guide removes itself. Persist both the current
  // completion key and the legacy seen key so the next load selects Tips.
  global.document.addEventListener("click",function(event){
    var target=event&&event.target;
    var finish=target&&typeof target.closest==="function"
      ? target.closest("[data-howto-finish]")
      : null;
    if(!finish)return;
    var card=typeof finish.closest==="function"
      ? finish.closest(".pattc-loading-howto")
      : null;
    var key=card&&typeof card.getAttribute==="function"
      ? String(card.getAttribute("data-howto-key")||"").trim()
      : "";
    if(!key)return;
    try{
      if(global.localStorage){
        global.localStorage.setItem("pattcLoadingHowToCompleted:v2:"+key,"1");
        global.localStorage.setItem("pattcLoadingHowToSeen:v1:"+key,"1");
      }
    }catch(e){}
  },true);
})(window);

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
