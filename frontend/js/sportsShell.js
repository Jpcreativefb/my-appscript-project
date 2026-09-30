
/* PATTC RC24A R2 — shared Sports shell renderer */
(function(global){
  "use strict";
  function esc(v){
    return String(v===undefined||v===null?"":v)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function attr(js){return js?` onclick="${js}"`:"";}
  function render(c){
    c=c||{};
    return `<section class="sports-shell ${esc(c.className||"")}">
      <div class="sports-shell-topbar">
        <button type="button" class="sports-shell-menu" aria-label="Sports menu"${attr(c.menuAction)}></button>
        <div class="sports-shell-wordmark" aria-label="PATTC Sports"><strong>PATTC</strong><small>SPORTS</small></div>
        <div class="sports-shell-account">
          <div class="sports-shell-points"><b>P</b><span>${esc(c.pointsLabel||"—")}</span></div>
          <button type="button" class="sports-shell-sync"${attr(c.syncAction)}>SYNC ↻</button>
        </div>
      </div>
      <div class="sports-shell-identity">
        <div class="sports-shell-badge"><span>${esc(c.badgeText||"SP")}</span></div>
        <div class="sports-shell-title"><h1>${esc(c.title||"SPORTS")}</h1><p>${esc(c.subtitle||"")}</p></div>
        <span class="sports-shell-league">${esc(c.league||"NFL")}</span>
      </div>
      ${c.featureHtml||""}
    </section>`;
  }
  global.PATTCSportsShell={render,escape:esc};
})(window);

/* PATTC Loading / How-to-Play R1 — local, non-blocking loader tips. */
(function(global){
  "use strict";

  var STORAGE_ENABLED="pattcLoadingHowToEnabled:v1";
  var STORAGE_MODE="pattcLoadingHowToMode:v1";
  var STORAGE_SEEN_PREFIX="pattcLoadingHowToSeen:v1:";
  var rotationTimer=null;
  var activeIndex=0;
  var activeKey="";

  var CONTENT={
    "team-fantasy":{
      title:"How to Play",
      tips:[
        {text:"Pick one NFL team at QB, RB, WR/TE, OL, K, DL, LB and DB.",example:"Example: BUF at QB can be different from BUF at RB."},
        {text:"Teams have position-based usage limits across the season."},
        {text:"Each position locks at the selected team's kickoff."}
      ]
    },
    confidence:{
      title:"How to Play",
      tips:[
        {text:"Pick each game, then assign your confidence values."},
        {text:"Higher confidence means more points when that pick is correct."},
        {text:"Picks stay editable until their game locks."}
      ]
    },
    survivor:{
      title:"How to Play",
      tips:[
        {text:"Choose from this week's eligible NFL teams."},
        {text:"Team availability follows this game's use and elimination rules."},
        {text:"Your selection locks according to the NFL game timing shown in the app."}
      ]
    },
    "playoff-race":{
      title:"How to Play",
      tips:[
        {text:"Build your projected NFL playoff field and seed order."},
        {text:"Accuracy earns more credit; near-miss seed positions can still score."},
        {text:"Update open predictions before the game locks them."}
      ]
    },
    generic:{
      title:"Quick Tip",
      tips:[
        {text:"Review the game rules, make your selections and save before they lock."},
        {text:"Scoring and lock timing can vary by game; use the Rules or How to Play help when available."}
      ]
    }
  };

  function storageGet_(key,fallback){
    try{var v=global.localStorage&&global.localStorage.getItem(key);return v===null||v===undefined?fallback:v;}catch(e){return fallback;}
  }
  function storageSet_(key,value){try{if(global.localStorage)global.localStorage.setItem(key,String(value));}catch(e){}}
  function enabled_(){return storageGet_(STORAGE_ENABLED,"1")!=="0";}
  function mode_(){return storageGet_(STORAGE_MODE,"every")==="first"?"first":"every";}
  function gameId_(){
    try{if(typeof global.getFrontendGameId==="function")return String(global.getFrontendGameId()||"").trim().toLowerCase();}catch(e){}
    try{return String((global.APP_STATE&&global.APP_STATE.gameId)||storageGet_("gameId","")||"").trim().toLowerCase();}catch(e){return "";}
  }
  function gameMode_(){return String(storageGet_("gameMode","")||"").trim().toLowerCase();}
  function page_(page){
    if(page)return String(page||"").trim().toLowerCase();
    try{if(global.APP_STATE&&global.APP_STATE.currentPage)return String(global.APP_STATE.currentPage).trim().toLowerCase();}catch(e){}
    try{return String(global.location&&global.location.hash||"").replace(/^#/,"").trim().toLowerCase();}catch(e){return "";}
  }
  function contextKey_(page){
    var p=page_(page), mode=gameMode_(), id=gameId_();
    if(/^admin/.test(p)||p==="dashboard"||p==="profile"||p==="more"||p.indexOf("hub:")===0)return "";
    if(/playoff.*race|nfl-playoff/.test(id))return "playoff-race";
    if(p==="team-fantasy"||mode==="team-fantasy"||/team-fantasy/.test(id))return "team-fantasy";
    if(p==="survivor"||mode==="survivor"||/survivor/.test(id))return "survivor";
    if((p==="picks"||p==="game-hub")&&(mode==="confidence"||/confidence/.test(id)))return "confidence";
    if(p==="ranking"&&/playoff/.test(id))return "playoff-race";
    if(["picks","game-hub","ranking","betting","season-hub"].indexOf(p)!==-1)return "generic";
    return "";
  }
  function shouldShow_(key){
    if(!key||!CONTENT[key]||!enabled_())return false;
    if(mode_()!=="first")return true;
    return storageGet_(STORAGE_SEEN_PREFIX+key,"")!=="1";
  }
  function markSeen_(key){if(key)storageSet_(STORAGE_SEEN_PREFIX+key,"1");}
  function esc_(v){return String(v===undefined||v===null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}

  function ensureStyle_(){
    if(!global.document||global.document.getElementById("pattcLoadingHowToStyle"))return;
    var style=global.document.createElement("style");
    style.id="pattcLoadingHowToStyle";
    style.textContent=".pattc-loading-howto{margin-top:14px;padding:12px;border:1px solid rgba(212,175,55,.35);border-radius:12px;background:rgba(255,255,255,.045);text-align:left}.pattc-loading-howto h3{margin:0 0 7px;font-size:13px;color:#f7df86}.pattc-loading-howto p{margin:0;color:#f8fafc;font-size:12px;line-height:1.4}.pattc-loading-howto-example{margin-top:6px!important;color:#cbd5e1!important;font-size:11px!important}.pattc-loading-howto-controls{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px}.pattc-loading-howto-controls button{border:1px solid rgba(255,255,255,.18);background:transparent;color:#e5e7eb;border-radius:8px;padding:4px 8px;font:inherit;font-size:11px;cursor:pointer}.pattc-loading-howto-count{color:#94a3b8;font-size:10px}.pattc-howto-help{position:fixed;right:14px;top:calc(env(safe-area-inset-top) + 72px);z-index:8500;width:36px;height:36px;border-radius:999px;border:1px solid rgba(212,175,55,.65);background:#111827;color:#f7df86;font-weight:900;font-size:18px;box-shadow:0 6px 22px rgba(0,0,0,.24);cursor:pointer}.pattc-howto-modal{position:fixed;inset:0;z-index:10030;background:rgba(2,6,23,.72);display:flex;align-items:center;justify-content:center;padding:18px}.pattc-howto-sheet{width:min(460px,100%);max-height:80vh;overflow:auto;border:1px solid rgba(212,175,55,.45);border-radius:16px;background:#111827;color:#fff;padding:18px}.pattc-howto-sheet h2{margin:0 0 12px}.pattc-howto-tip{padding:10px 0;border-top:1px solid rgba(255,255,255,.08)}.pattc-howto-tip:first-of-type{border-top:0}.pattc-howto-tip p{margin:0;font-size:14px;line-height:1.45}.pattc-howto-pref{display:grid;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12);font-size:12px}.pattc-howto-pref label{display:flex;align-items:center;justify-content:space-between;gap:12px}.pattc-howto-pref select{background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:6px}.pattc-howto-close{margin-top:14px;width:100%;min-height:40px;border:0;border-radius:9px;background:#d4af37;color:#111827;font-weight:900;cursor:pointer}.loader.is-admin .pattc-loading-howto{display:none!important}";
    (global.document.head||global.document.documentElement).appendChild(style);
  }

  function cardHtml_(key,index){
    var cfg=CONTENT[key], tips=cfg&&cfg.tips||[];
    if(!tips.length)return "";
    index=Math.max(0,Math.min(tips.length-1,Number(index)||0));
    var tip=tips[index]||{};
    return '<h3>'+esc_(cfg.title||"How to Play")+'</h3><p>'+esc_(tip.text||"")+'</p>'+(tip.example?'<p class="pattc-loading-howto-example">'+esc_(tip.example)+'</p>':"")+'<div class="pattc-loading-howto-controls"><button type="button" data-howto-prev aria-label="Previous tip">‹</button><span class="pattc-loading-howto-count">'+(index+1)+' / '+tips.length+'</span><button type="button" data-howto-next aria-label="Next tip">›</button></div>';
  }
  function renderInto_(host,key,index){
    if(!host||!key||!CONTENT[key])return false;
    ensureStyle_();
    host.innerHTML=cardHtml_(key,index);
    host.setAttribute("data-howto-key",key);
    host.setAttribute("data-howto-index",String(index));
    var prev=host.querySelector&&host.querySelector("[data-howto-prev]");
    var next=host.querySelector&&host.querySelector("[data-howto-next]");
    if(prev)prev.onclick=function(){showIndex_(host,key,(Number(host.getAttribute("data-howto-index"))||0)-1);};
    if(next)next.onclick=function(){showIndex_(host,key,(Number(host.getAttribute("data-howto-index"))||0)+1);};
    return true;
  }
  function showIndex_(host,key,index){
    var tips=CONTENT[key]&&CONTENT[key].tips||[];
    if(!tips.length)return;
    index=(index+tips.length)%tips.length;
    activeIndex=index;
    renderInto_(host,key,index);
  }
  function stopRotation_(){if(rotationTimer){global.clearTimeout(rotationTimer);rotationTimer=null;}}
  function startRotation_(host,key){
    stopRotation_();
    function rotate(){
      if(!host||!host.isConnected){stopRotation_();return;}
      showIndex_(host,key,(Number(host.getAttribute("data-howto-index"))||0)+1);
      rotationTimer=global.setTimeout(rotate,3600);
    }
    rotationTimer=global.setTimeout(rotate,3600);
  }
  function removeLoadingCards_(){
    stopRotation_();
    if(!global.document)return;
    var nodes=global.document.querySelectorAll?global.document.querySelectorAll(".pattc-loading-howto"):[];
    Array.prototype.forEach.call(nodes||[],function(node){if(node&&node.parentNode)node.parentNode.removeChild(node);});
  }
  function mountLoaderTip_(page){
    if(!global.document)return false;
    var loader=global.document.getElementById("loader");
    if(!loader||loader.classList&&loader.classList.contains("is-admin")){removeLoadingCards_();return false;}
    var key=contextKey_(page);
    if(!shouldShow_(key)){removeLoadingCards_();return false;}
    var card=loader.querySelector&&loader.querySelector(".pattc-loading-howto");
    if(!card){card=global.document.createElement("div");card.className="pattc-loading-howto";var wrap=loader.querySelector&&loader.querySelector(".app-loader-card");if(!wrap)return false;wrap.appendChild(card);}
    activeKey=key;activeIndex=0;renderInto_(card,key,0);markSeen_(key);startRotation_(card,key);return true;
  }
  function mountProgressiveTip_(page,app){
    if(!global.document||!app)return false;
    var key=contextKey_(page);
    if(!shouldShow_(key))return false;
    var wrap=app.querySelector&&app.querySelector(".app-route-loading-shell-card");
    if(!wrap)return false;
    var card=wrap.querySelector&&wrap.querySelector(".pattc-loading-howto");
    if(!card){card=global.document.createElement("div");card.className="pattc-loading-howto";wrap.appendChild(card);}
    activeKey=key;activeIndex=0;renderInto_(card,key,0);markSeen_(key);startRotation_(card,key);return true;
  }
  function helpButton_(){
    if(!global.document)return null;
    var key=contextKey_();
    var btn=global.document.getElementById("pattcHowToPlayButton");
    if(!key){if(btn&&btn.parentNode)btn.parentNode.removeChild(btn);return null;}
    if(!btn){btn=global.document.createElement("button");btn.id="pattcHowToPlayButton";btn.className="pattc-howto-help";btn.type="button";btn.textContent="?";btn.setAttribute("aria-label","How to Play");btn.onclick=openHelp_;(global.document.body||global.document.documentElement).appendChild(btn);}
    return btn;
  }
  function openHelp_(){
    if(!global.document)return false;
    var key=contextKey_()||activeKey||"generic", cfg=CONTENT[key]||CONTENT.generic;
    ensureStyle_();
    var old=global.document.getElementById("pattcHowToModal");if(old&&old.parentNode)old.parentNode.removeChild(old);
    var modal=global.document.createElement("div");modal.id="pattcHowToModal";modal.className="pattc-howto-modal";
    var tips=(cfg.tips||[]).map(function(t){return '<div class="pattc-howto-tip"><p>'+esc_(t.text)+(t.example?'<br><small>'+esc_(t.example)+'</small>':"")+'</p></div>';}).join("");
    modal.innerHTML='<div class="pattc-howto-sheet" role="dialog" aria-modal="true" aria-label="How to Play"><h2>'+esc_(cfg.title||"How to Play")+'</h2>'+tips+'<div class="pattc-howto-pref"><label><span>How to Play during loading</span><input id="pattcHowToEnabled" type="checkbox" '+(enabled_()?"checked":"")+'></label><label><span>Show</span><select id="pattcHowToMode"><option value="every" '+(mode_()==="every"?"selected":"")+'>Every load</option><option value="first" '+(mode_()==="first"?"selected":"")+'>First visit</option></select></label></div><button type="button" class="pattc-howto-close">Close</button></div>';
    var close=modal.querySelector(".pattc-howto-close"), toggle=modal.querySelector("#pattcHowToEnabled"), mode=modal.querySelector("#pattcHowToMode");
    if(close)close.onclick=function(){if(modal.parentNode)modal.parentNode.removeChild(modal);};
    if(toggle)toggle.onchange=function(){storageSet_(STORAGE_ENABLED,toggle.checked?"1":"0");};
    if(mode)mode.onchange=function(){storageSet_(STORAGE_MODE,mode.value==="first"?"first":"every");};
    modal.onclick=function(e){if(e&&e.target===modal&&modal.parentNode)modal.parentNode.removeChild(modal);};
    (global.document.body||global.document.documentElement).appendChild(modal);return true;
  }
  function installHooks_(){
    ensureStyle_();
    if(typeof global.showLoader==="function"&&!global.showLoader.__pattcHowToWrapped){var originalShow=global.showLoader;var wrappedShow=function(options){var out=originalShow.apply(this,arguments);mountLoaderTip_();return out;};wrappedShow.__pattcHowToWrapped=true;global.showLoader=wrappedShow;}
    if(typeof global.hideLoader==="function"&&!global.hideLoader.__pattcHowToWrapped){var originalHide=global.hideLoader;var wrappedHide=function(){removeLoadingCards_();var out=originalHide.apply(this,arguments);helpButton_();return out;};wrappedHide.__pattcHowToWrapped=true;global.hideLoader=wrappedHide;}
    if(typeof global.appPaintProgressiveRouteShell_==="function"&&!global.appPaintProgressiveRouteShell_.__pattcHowToWrapped){var originalPaint=global.appPaintProgressiveRouteShell_;var wrappedPaint=function(page,app){var out=originalPaint.apply(this,arguments);mountProgressiveTip_(page,app);helpButton_();return out;};wrappedPaint.__pattcHowToWrapped=true;global.appPaintProgressiveRouteShell_=wrappedPaint;}
    helpButton_();
  }

  global.PATTCLoadingHowToR1={content:CONTENT,contextKey:contextKey_,shouldShow:shouldShow_,mountLoaderTip:mountLoaderTip_,mountProgressiveTip:mountProgressiveTip_,removeLoadingCards:removeLoadingCards_,openHelp:openHelp_,installHooks:installHooks_,enabled:enabled_,mode:mode_};
  if(global.document&&typeof global.document.addEventListener==="function")global.document.addEventListener("DOMContentLoaded",installHooks_);
})(window);
