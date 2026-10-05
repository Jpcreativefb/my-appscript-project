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

// Visual Studio Save/Restore + Color Authority Rescue R1.
//
// R3 historically scheduled a verified server Draft save 650ms after every
// editor change. That made an intentionally unsaved edit become "Last Saved"
// before Restore/Undo could use the explicit Save contract. Keep the existing
// verified write path, but suppress only that one R3 timer. Save Element,
// Save Section, Save Page Draft and Save Whole Project Drafts still call the
// normal controller.flush() path.
//
// R3 also paints editor colors inline with !important. Runtime Appearance is
// authoritative for the Home profile, saved Hub cards, and saved Bottom Nav.
// Strip only those R3 important paint declarations when an authoritative
// runtime value exists; never strip layout/geometry/structure declarations.
(function pattcInstallVisualStudioSaveRestoreAuthorityRescueR1_(global){
  "use strict";
  if(!global||!global.document||global.__PATTC_VISUAL_STUDIO_SAVE_RESTORE_AUTHORITY_R1__)return;
  global.__PATTC_VISUAL_STUDIO_SAVE_RESTORE_AUTHORITY_R1__=true;

  var AUTO_SAVE_DELAY=650;
  var PAINT_PROPERTIES=[
    "background","background-color","background-image","color","border-color",
    "outline-color","fill","stroke"
  ];
  var rawSetTimeout=global.setTimeout;
  var rawClearTimeout=global.clearTimeout;
  var guardedTimerInstalled=false;
  var observer=null;
  var observerScheduled=false;
  var observerApplying=false;

  function functionSource_(fn){
    try{return Function.prototype.toString.call(fn);}catch(e){return "";}
  }

  function isVisualStudioAutosave_(fn,delay){
    if(Number(delay)!==AUTO_SAVE_DELAY||typeof fn!=="function")return false;
    var source=functionSource_(fn);
    return source.indexOf("api.flush().catch")!==-1&&/timer\s*=\s*null/.test(source);
  }

  function guardedSetTimeout_(fn,delay){
    if(isVisualStudioAutosave_(fn,delay))return 0;
    if(typeof rawSetTimeout!=="function")return 0;
    var args=Array.prototype.slice.call(arguments,2);
    return rawSetTimeout.apply(global,[fn,delay].concat(args));
  }

  if(typeof rawSetTimeout==="function"){
    global.setTimeout=guardedSetTimeout_;
    guardedTimerInstalled=true;
  }

  function stringValue_(value){
    return value===undefined||value===null?"":String(value).trim();
  }

  function profileHasSavedAppearance_(){
    var state=global.APP_STATE||{};
    var profile=state.profile&&typeof state.profile==="object"?state.profile:{};
    var values=[
      profile.profileColor,profile.ProfileColor,profile.themeColor,profile.ThemeColor,
      profile.profileColor2,profile.ProfileColor2,profile.profileColorMode,profile.ProfileColorMode,
      profile.profileGradientAngle,profile.ProfileGradientAngle,profile.textColor,profile.TextColor
    ];
    var nested=[profile.appearance,profile.profileAppearance];
    nested.forEach(function(item){
      if(!item||typeof item!=="object")return;
      ["primaryColor","secondaryColor","color","color2","textColor","gradientMode","gradientAngle"].forEach(function(key){
        values.push(item[key]);
      });
    });
    return values.some(function(value){return stringValue_(value)!=="";});
  }

  function appearanceRows_(){
    var state=global.APP_STATE||{};
    if(Array.isArray(state.dashboardHubAppearanceRows))return state.dashboardHubAppearanceRows.filter(Boolean);
    var map=state.dashboardHubAppearanceMap&&typeof state.dashboardHubAppearanceMap==="object"
      ? state.dashboardHubAppearanceMap
      : {};
    return Object.keys(map).map(function(key){return map[key];}).filter(Boolean);
  }

  function appearanceMap_(){
    var state=global.APP_STATE||{};
    return state.dashboardHubAppearanceMap&&typeof state.dashboardHubAppearanceMap==="object"
      ? state.dashboardHubAppearanceMap
      : {};
  }

  function hubRow_(category){
    var key=stringValue_(category).toLowerCase();
    if(!key)return null;
    var map=appearanceMap_();
    if(map[key]&&typeof map[key]==="object")return map[key];
    var rows=appearanceRows_();
    for(var i=0;i<rows.length;i++){
      var row=rows[i]||{};
      var rowKey=stringValue_(row.HubCategory||row.hubCategory||row.SettingKey||row.settingKey).toLowerCase();
      if(rowKey===key)return row;
    }
    return null;
  }

  function navigationRows_(){
    return appearanceRows_().filter(function(row){
      var category=stringValue_(row&&(row.HubCategory||row.hubCategory)).toLowerCase();
      var setting=stringValue_(row&&(row.SettingKey||row.settingKey)).toLowerCase();
      return category==="navigation"||setting.indexOf("nav:")===0;
    });
  }

  function closest_(node,selector){
    try{return node&&typeof node.closest==="function"?node.closest(selector):null;}catch(e){return null;}
  }

  function runtimeOwnsPaint_(node){
    if(!node||node.nodeType!==1)return false;
    if(closest_(node,"[data-dashboard-profile-card],#dashboardPlayerCard,#dashboardPlayerSticky")){
      return profileHasSavedAppearance_();
    }
    var hub=closest_(node,"[data-dashboard-hub-category]");
    if(hub){
      var category=typeof hub.getAttribute==="function"
        ? hub.getAttribute("data-dashboard-hub-category")
        : "";
      return !!hubRow_(category);
    }
    if(closest_(node,".bottom-nav"))return navigationRows_().length>0;
    return false;
  }

  function stripVisualStudioPaint_(node){
    if(!runtimeOwnsPaint_(node)||!node.style)return false;
    var changed=false;
    PAINT_PROPERTIES.forEach(function(property){
      try{
        if(node.style.getPropertyPriority(property)==="important"){
          node.style.removeProperty(property);
          changed=true;
        }
      }catch(e){}
    });
    return changed;
  }

  function stripAuthoritativeSubtree_(root){
    if(!root)return false;
    var changed=stripVisualStudioPaint_(root);
    if(typeof root.querySelectorAll!=="function")return changed;
    var nodes=root.querySelectorAll("*");
    for(var i=0;i<nodes.length;i++)changed=stripVisualStudioPaint_(nodes[i])||changed;
    return changed;
  }

  function savedProfileTarget_(){
    if(!profileHasSavedAppearance_())return [];
    var list=[];
    ["dashboardPlayerCard","dashboardPlayerSticky"].forEach(function(id){
      var node=global.document.getElementById&&global.document.getElementById(id);
      if(node)list.push(node);
    });
    if(global.document.querySelectorAll){
      var extra=global.document.querySelectorAll("[data-dashboard-profile-card]");
      for(var i=0;i<extra.length;i++)if(list.indexOf(extra[i])===-1)list.push(extra[i]);
    }
    return list;
  }

  function savedHubTargets_(){
    if(!global.document.querySelectorAll)return [];
    var result=[];
    var nodes=global.document.querySelectorAll("[data-dashboard-hub-category]");
    for(var i=0;i<nodes.length;i++){
      var category=nodes[i].getAttribute("data-dashboard-hub-category");
      if(hubRow_(category))result.push(nodes[i]);
    }
    return result;
  }

  function savedNavTargets_(){
    if(!navigationRows_().length||!global.document.querySelectorAll)return [];
    return Array.prototype.slice.call(global.document.querySelectorAll(".bottom-nav"));
  }

  function reapplyRuntimeAppearance_(){
    if(observerApplying)return;
    observerApplying=true;
    try{
      if(observer&&typeof observer.disconnect==="function")observer.disconnect();

      savedProfileTarget_().forEach(stripAuthoritativeSubtree_);
      savedHubTargets_().forEach(stripAuthoritativeSubtree_);
      savedNavTargets_().forEach(stripAuthoritativeSubtree_);

      // Reuse already-loaded runtime state only; no backend requests.
      if(profileHasSavedAppearance_()&&typeof global.dashboardApplyCurrentHomeProfile_==="function"){
        var username=typeof global.getCurrentUsername==="function"?global.getCurrentUsername():"";
        global.dashboardApplyCurrentHomeProfile_((global.APP_STATE||{}).profile||{},username);
      }
      if(appearanceRows_().length&&typeof global.dashboardApplyHubAppearance_==="function"){
        global.dashboardApplyHubAppearance_();
      }
      var navRows=navigationRows_();
      if(navRows.length&&global.PATTC_NAVIGATION_SLOTS_R1&&typeof global.PATTC_NAVIGATION_SLOTS_R1.apply==="function"){
        global.PATTC_NAVIGATION_SLOTS_R1.apply(navRows);
      }
    }catch(e){
      if(global.console&&typeof global.console.warn==="function")global.console.warn("Visual Studio appearance authority rescue",e);
    }finally{
      observerApplying=false;
      observe_();
    }
  }

  function scheduleReapply_(){
    if(observerScheduled||observerApplying)return;
    observerScheduled=true;
    var run=function(){observerScheduled=false;reapplyRuntimeAppearance_();};
    if(typeof global.requestAnimationFrame==="function")global.requestAnimationFrame(run);
    else if(typeof rawSetTimeout==="function")rawSetTimeout.call(global,run,0);
    else run();
  }

  function observe_(){
    if(!observer||observerApplying)return;
    var target=global.document.documentElement||global.document.body;
    if(!target)return;
    try{
      observer.observe(target,{subtree:true,childList:true,attributes:true,attributeFilter:["style"]});
    }catch(e){}
  }

  function installAppearanceObserver_(){
    if(observer||typeof global.MutationObserver!=="function"){
      scheduleReapply_();
      return;
    }
    observer=new global.MutationObserver(function(records){
      if(observerApplying)return;
      for(var i=0;i<records.length;i++){
        var record=records[i];
        if(record.type==="childList"||(record.type==="attributes"&&runtimeOwnsPaint_(record.target))){
          scheduleReapply_();
          break;
        }
      }
    });
    observe_();
    scheduleReapply_();
  }

  function finishBoot_(){
    // By this point R3's DOMContentLoaded listener has created its controller
    // and captured guardedSetTimeout_. Restore the browser global for everyone
    // else; only R3's captured timer remains guarded.
    if(guardedTimerInstalled&&global.setTimeout===guardedSetTimeout_)global.setTimeout=rawSetTimeout;
    installAppearanceObserver_();
  }

  function finishAfterStudioMount_(){
    if(typeof global.queueMicrotask==="function")global.queueMicrotask(finishBoot_);
    else if(typeof Promise!=="undefined")Promise.resolve().then(finishBoot_);
    else if(typeof rawSetTimeout==="function")rawSetTimeout.call(global,finishBoot_,0);
    else finishBoot_();
  }

  if(global.document.readyState==="loading"){
    global.document.addEventListener("DOMContentLoaded",finishAfterStudioMount_,{once:true});
  }else if(typeof rawSetTimeout==="function"){
    rawSetTimeout.call(global,finishAfterStudioMount_,0);
  }else{
    finishAfterStudioMount_();
  }

  global.PATTC_VISUAL_STUDIO_RESCUE_R1={
    isVisualStudioAutosave:isVisualStudioAutosave_,
    profileHasSavedAppearance:profileHasSavedAppearance_,
    hubRow:hubRow_,
    navigationRows:navigationRows_,
    runtimeOwnsPaint:runtimeOwnsPaint_,
    stripVisualStudioPaint:stripVisualStudioPaint_,
    reapplyRuntimeAppearance:reapplyRuntimeAppearance_,
    originalSetTimeout:rawSetTimeout,
    guardedSetTimeout:guardedSetTimeout_
  };
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
