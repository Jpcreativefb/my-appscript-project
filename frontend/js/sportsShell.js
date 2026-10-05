
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

/* PATTC Loading / How-to-Play R2 — local, non-blocking mobile game guide. */
(function(global){
  "use strict";

  var STORAGE_ENABLED="pattcLoadingHowToEnabled:v1";
  var STORAGE_COMPLETED_PREFIX="pattcLoadingHowToCompleted:v2:";
  var STORAGE_SEEN_PREFIX_LEGACY="pattcLoadingHowToSeen:v1:";
  var ROTATION_MS=7000;
  var rotationTimer=null;
  var activeIndex=0;
  var activeKey="";
  var activeDeck="howto";

  var CONTENT={
    "team-fantasy":{
      title:"Team Fantasy",
      subtitle:"Build an eight-unit NFL lineup each week.",
      howto:[
        {heading:"Build your lineup",text:"Choose one NFL team for each unit: QB, RB, WR/TE, OL, K, DL, LB and DB.",visual:"lineup",example:"Your QB team and RB team can be different."},
        {heading:"Watch team usage",text:"Each team can only be used as often as this game allows for a position. Used-up teams stay unavailable even if they rank highly.",visual:"usage"},
        {heading:"Know the lock",text:"Each lineup slot locks at the selected NFL team's kickoff. Before kickoff, an unlocked selection can still be replaced.",visual:"clock"},
        {heading:"How scoring works",text:"Your weekly score comes from the configured fantasy scoring for each selected team's position unit. The eight unit scores combine into your lineup total.",visual:"score"},
        {heading:"Weekly result",text:"After games settle, your lineup total is compared using the league's Team Fantasy format. Missing or ineligible selections cannot earn normal unit points.",visual:"result"}
      ],
      tips:[
        {heading:"Tip",text:"Check kickoff times before choosing late-window teams; each slot locks independently.",visual:"clock"},
        {heading:"Tip",text:"A strong team can be valuable now, but position usage limits can make saving it for a later week worthwhile.",visual:"usage"},
        {heading:"Reminder",text:"Use the position rankings as a guide, then confirm the team is eligible for that slot and week.",visual:"lineup"}
      ]
    },
    confidence:{
      title:"Confidence",
      subtitle:"Pick every game, then rank how strongly you believe each pick.",
      howto:[
        {heading:"Pick the winners",text:"Choose the team you expect to win each available matchup.",visual:"confidence-picks"},
        {heading:"Assign confidence",text:"Give each matchup a confidence value. Higher numbers place more of your available points on that prediction.",visual:"confidence-numbers",example:"If 4 games are open, values might be 4, 3, 2 and 1 — one value per game."},
        {heading:"Know the lock",text:"A matchup stays editable only until its lock time. Once that game locks, its pick and confidence value can no longer be changed.",visual:"clock"},
        {heading:"How scoring works",text:"A correct pick earns its assigned confidence points. An incorrect pick earns no normal confidence points for that matchup unless the game has a special scoring rule.",visual:"confidence-score"},
        {heading:"Plan the board",text:"Use your largest confidence values on the outcomes you trust most while keeping every open matchup assigned before it locks.",visual:"result"}
      ],
      tips:[
        {heading:"Tip",text:"Do not spend your biggest confidence number just because a game starts first; use it on the pick you trust most.",visual:"confidence-numbers"},
        {heading:"Reminder",text:"Check that every open game has both a winner and a unique confidence value before its lock.",visual:"confidence-picks"},
        {heading:"Tip",text:"Early games can lock while later games remain editable, so review the board by kickoff window.",visual:"clock"}
      ]
    },
    survivor:{
      title:"Survivor",
      subtitle:"Make one eligible NFL team selection for the week.",
      howto:[
        {heading:"Choose this week's team",text:"Select one team from the eligible choices shown for the current Survivor week.",visual:"survivor-path"},
        {heading:"Respect eligibility",text:"A team can become unavailable because of prior use, a bye, game rules or other configured Survivor restrictions.",visual:"survivor-eligibility"},
        {heading:"Know the lock",text:"Your selection locks at the applicable NFL kickoff shown by the game. Change or clear it before that lock if the game still allows editing.",visual:"clock"},
        {heading:"How results work",text:"The app settles the weekly selection from the configured Survivor rule set. Standard win/loss, ATS or strike-style behavior can vary by this game's settings.",visual:"survivor-result"},
        {heading:"Season rule",text:"If one-use-per-season is enabled, a team you have already used cannot be selected again later in the season.",visual:"usage"}
      ],
      tips:[
        {heading:"Tip",text:"Check future schedules before using a strong team if your game limits each team to one use.",visual:"survivor-path"},
        {heading:"Reminder",text:"Bye teams and previously used teams can still appear in history, but they are not selectable when ineligible.",visual:"survivor-eligibility"},
        {heading:"Rule check",text:"Look at the game rules to confirm whether this Survivor contest uses straight-up results, ATS or strikes.",visual:"survivor-result"}
      ]
    },
    "playoff-race":{
      title:"Playoff Race",
      subtitle:"Build your projected NFL playoff field and seed order.",
      howto:[
        {heading:"Build the field",text:"Choose the teams you expect to reach the playoffs and place them into the seed positions required by the game.",visual:"playoff-seeds"},
        {heading:"Order matters",text:"The seed you assign affects scoring. Exact placement earns the strongest credit, while nearby seed positions can receive partial credit when configured.",visual:"playoff-score"},
        {heading:"Know the deadline",text:"You may update open playoff predictions until the game or stage lock shown in PATTC. Locked entries remain unchanged unless an Admin rule explicitly allows otherwise.",visual:"clock"},
        {heading:"How scoring works",text:"Scoring compares your projected playoff teams and seed positions with the official standings/results used by the game. The configured accuracy scale controls exact and near-miss points.",visual:"score"},
        {heading:"Think season-long",text:"Revisit still-open predictions as the standings change; a correct playoff team and a correct seed are separate pieces of accuracy.",visual:"result"}
      ],
      tips:[
        {heading:"Tip",text:"Check both playoff qualification and likely seed movement before changing an open projection.",visual:"playoff-seeds"},
        {heading:"Reminder",text:"A team can be right but the seed can still move, so partial-credit ranges matter.",visual:"playoff-score"},
        {heading:"Tip",text:"Review the lock shown in the game before assuming late-season standings changes can still be entered.",visual:"clock"}
      ]
    },
    generic:{
      title:"How to Play",
      subtitle:"A quick guide while your game opens.",
      howto:[
        {heading:"Make your selections",text:"Review the available choices and complete the selections required by this game.",visual:"generic"},
        {heading:"Check the lock",text:"Save or finalize before the lock or deadline shown in PATTC. Different games can lock at different times.",visual:"clock"},
        {heading:"Review the rules",text:"Scoring and special rules vary by game. Reopen How to Play from the ? button whenever you need the full guide.",visual:"score"}
      ],
      tips:[
        {heading:"Quick Tip",text:"Check the displayed lock time before leaving an unfinished selection.",visual:"clock"},
        {heading:"Quick Tip",text:"Use the ? button on supported game pages to reopen the complete How to Play guide.",visual:"generic"}
      ]
    }
  };

  function storageGet_(key,fallback){
    try{var v=global.localStorage&&global.localStorage.getItem(key);return v===null||v===undefined?fallback:v;}catch(e){return fallback;}
  }
  function storageSet_(key,value){try{if(global.localStorage)global.localStorage.setItem(key,String(value));}catch(e){}}
  function enabled_(){return storageGet_(STORAGE_ENABLED,"1")!=="0";}
  function completed_(key){return storageGet_(STORAGE_COMPLETED_PREFIX+key,"")==="1"||storageGet_(STORAGE_SEEN_PREFIX_LEGACY+key,"")==="1";}
  function markCompleted_(key){if(key)storageSet_(STORAGE_COMPLETED_PREFIX+key,"1");}
  function completeLoadingVisit_(){if(activeKey&&activeDeck==="howto")markCompleted_(activeKey);}
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
  function deckFor_(key,forceHowTo){
    if(forceHowTo===true)return "howto";
    return completed_(key)?"tips":"howto";
  }
  function shouldShow_(key){return !!(key&&CONTENT[key]&&enabled_());}
  function esc_(v){return String(v===undefined||v===null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}

  function visualHtml_(kind){
    if(kind==="lineup")return '<div class="pattc-howto-visual lineup" aria-hidden="true"><b>QB</b><b>RB</b><b>WR/TE</b><b>OL</b><b>K</b><b>DL</b><b>LB</b><b>DB</b></div>';
    if(kind==="usage")return '<div class="pattc-howto-visual usage" aria-hidden="true"><span>BUF</span><i>1 / 2 uses</i><span class="ok">✓</span></div>';
    if(kind==="clock")return '<div class="pattc-howto-visual clock" aria-hidden="true"><span>OPEN</span><i>→ kickoff →</i><strong>LOCKED</strong></div>';
    if(kind==="score")return '<div class="pattc-howto-visual score" aria-hidden="true"><span>Pick</span><b>+</b><span>Result</span><b>=</b><strong>Points</strong></div>';
    if(kind==="result")return '<div class="pattc-howto-visual result" aria-hidden="true"><span>Set picks</span><i>→</i><span>Games finish</span><i>→</i><strong>Score</strong></div>';
    if(kind==="confidence-picks")return '<div class="pattc-howto-visual picks" aria-hidden="true"><span>BUF ✓</span><span>KC ✓</span><span>DET ✓</span></div>';
    if(kind==="confidence-numbers")return '<div class="pattc-howto-visual confidence" aria-hidden="true"><span>BUF <b>4</b></span><span>KC <b>3</b></span><span>DET <b>2</b></span><span>GB <b>1</b></span></div>';
    if(kind==="confidence-score")return '<div class="pattc-howto-visual confidence-score" aria-hidden="true"><span>Correct pick</span><b>×</b><span>Confidence 4</span><strong>+4</strong></div>';
    if(kind==="survivor-path")return '<div class="pattc-howto-visual path" aria-hidden="true"><span>Week 1<br><b>BUF</b></span><i>→</i><span>Week 2<br><b>KC</b></span><i>→</i><span>Week 3<br><b>?</b></span></div>';
    if(kind==="survivor-eligibility")return '<div class="pattc-howto-visual eligibility" aria-hidden="true"><span class="ok">✓ Eligible</span><span class="no">× Used / Bye</span></div>';
    if(kind==="survivor-result")return '<div class="pattc-howto-visual result" aria-hidden="true"><span>Your team</span><i>→</i><span>Official result</span><i>→</i><strong>Game rule</strong></div>';
    if(kind==="playoff-seeds")return '<div class="pattc-howto-visual seeds" aria-hidden="true"><span><b>1</b> BUF</span><span><b>2</b> KC</span><span><b>3</b> BAL</span><span><b>4</b> HOU</span></div>';
    if(kind==="playoff-score")return '<div class="pattc-howto-visual seedscore" aria-hidden="true"><span>Exact seed <b>10</b></span><span>±1 <b>8</b></span><span>±2 <b>6</b></span></div>';
    return '<div class="pattc-howto-visual generic" aria-hidden="true"><span>Choose</span><i>→</i><span>Save</span><i>→</i><strong>Score</strong></div>';
  }

  function ensureStyle_(){
    if(!global.document||global.document.getElementById("pattcLoadingHowToStyle"))return;
    var style=global.document.createElement("style");
    style.id="pattcLoadingHowToStyle";
    style.textContent=".pattc-loading-howto{margin-top:18px;padding:18px;border:1px solid rgba(212,175,55,.42);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.025));text-align:left;display:flex;flex-direction:column;gap:12px;min-height:340px}.pattc-loading-howto-kicker{color:#f7df86;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.pattc-loading-howto h3{margin:0;font-size:24px;line-height:1.12;color:#fff}.pattc-loading-howto-sub{margin:0;color:#cbd5e1;font-size:14px;line-height:1.45}.pattc-loading-howto-copy{margin:0;color:#f8fafc;font-size:17px;line-height:1.5}.pattc-loading-howto-example{margin:0;color:#cbd5e1;font-size:13px;line-height:1.45;padding:10px 12px;border-radius:10px;background:rgba(15,23,42,.65)}.pattc-loading-howto-spacer{flex:1}.pattc-loading-howto-controls{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin-top:4px}.pattc-loading-howto-controls button,.pattc-loading-howto-actions button{min-height:40px;border:1px solid rgba(255,255,255,.2);background:rgba(15,23,42,.72);color:#f8fafc;border-radius:10px;padding:7px 12px;font:inherit;font-size:13px;font-weight:800;cursor:pointer}.pattc-loading-howto-count{color:#94a3b8;font-size:12px;text-align:center}.pattc-loading-howto-actions{display:flex;gap:8px;justify-content:flex-end}.pattc-loading-howto-actions .finish{background:#d4af37;color:#111827;border-color:#d4af37}.pattc-howto-visual{display:flex;align-items:center;justify-content:center;gap:8px;min-height:82px;padding:12px;border-radius:14px;background:rgba(2,6,23,.52);border:1px solid rgba(148,163,184,.14);color:#e2e8f0}.pattc-howto-visual b,.pattc-howto-visual strong{color:#f7df86}.pattc-howto-visual.lineup{display:grid;grid-template-columns:repeat(4,1fr)}.pattc-howto-visual.lineup b{display:grid;place-items:center;min-height:42px;border-radius:9px;background:rgba(212,175,55,.12);font-size:12px}.pattc-howto-visual.confidence,.pattc-howto-visual.seeds{display:grid;grid-template-columns:repeat(2,1fr)}.pattc-howto-visual.confidence span,.pattc-howto-visual.seeds span{padding:8px 10px;border-radius:9px;background:rgba(255,255,255,.05)}.pattc-howto-visual.confidence b,.pattc-howto-visual.seeds b{float:right}.pattc-howto-visual.path span{flex:1;text-align:center}.pattc-howto-visual .ok{color:#86efac}.pattc-howto-visual .no{color:#fca5a5}.pattc-howto-visual.seedscore{display:grid;grid-template-columns:repeat(3,1fr);text-align:center}.pattc-howto-visual.seedscore span{font-size:12px}.loader.pattc-howto-active:not(.is-admin){padding:12px}.loader.pattc-howto-active:not(.is-admin) .app-loader-card{width:min(620px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto}.loader.is-admin .pattc-loading-howto{display:none!important}.app-route-loading-shell-card .pattc-loading-howto{max-width:620px;margin-left:auto;margin-right:auto}.pattc-howto-help{position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom) + 86px);z-index:8500;width:38px;height:38px;border-radius:999px;border:1px solid rgba(212,175,55,.65);background:#111827;color:#f7df86;font-weight:900;font-size:17px;box-shadow:0 4px 16px rgba(0,0,0,.24);cursor:pointer}.pattc-home-discovery{margin-top:16px;padding:14px;border:1px solid rgba(212,175,55,.35);border-radius:14px;background:rgba(15,23,42,.78);text-align:left}.pattc-home-discovery-kicker{color:#f7df86;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.pattc-home-discovery h3{margin:4px 0 10px;font-size:19px}.pattc-home-discovery-list{display:grid;gap:8px}.pattc-home-discovery-item{padding:10px 11px;border-radius:10px;background:rgba(255,255,255,.05)}.pattc-home-discovery-item strong{display:block;font-size:14px;color:#fff}.pattc-home-discovery-item p{margin:3px 0 5px;color:#cbd5e1;font-size:12px;line-height:1.35}.pattc-home-discovery-item span{color:#f7df86;font-size:11px;font-weight:800}.pattc-howto-modal{position:fixed;inset:0;z-index:10030;background:rgba(2,6,23,.82);display:flex;align-items:center;justify-content:center;padding:14px}.pattc-howto-sheet{width:min(620px,100%);max-height:92dvh;overflow:auto;border:1px solid rgba(212,175,55,.45);border-radius:20px;background:#111827;color:#fff;padding:20px}.pattc-howto-sheet h2{margin:0;font-size:28px}.pattc-howto-sheet-sub{color:#cbd5e1;margin:6px 0 16px}.pattc-howto-tip{padding:14px 0;border-top:1px solid rgba(255,255,255,.08)}.pattc-howto-tip:first-of-type{border-top:0}.pattc-howto-tip h3{margin:0 0 5px;font-size:17px}.pattc-howto-tip p{margin:0;font-size:15px;line-height:1.5}.pattc-howto-pref{display:grid;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12);font-size:13px}.pattc-howto-pref label{display:flex;align-items:center;justify-content:space-between;gap:12px}.pattc-howto-close{margin-top:14px;width:100%;min-height:44px;border:0;border-radius:10px;background:#d4af37;color:#111827;font-weight:900;cursor:pointer}@media(max-width:560px){.loader.pattc-howto-active:not(.is-admin){align-items:stretch}.loader.pattc-howto-active:not(.is-admin) .app-loader-card{min-height:calc(100dvh - 24px);display:flex;flex-direction:column;padding:18px}.loader.pattc-howto-active:not(.is-admin) .pattc-loading-howto{flex:1;min-height:0}.pattc-loading-howto h3{font-size:26px}.pattc-loading-howto-copy{font-size:18px}.pattc-howto-visual{min-height:96px}.pattc-howto-sheet{max-height:94dvh;border-radius:16px;padding:18px}}";
    (global.document.head||global.document.documentElement).appendChild(style);
  }

  function homeDiscoveryHub_(game){
    game=game||{};
    var explicit=String(game.Hub||game.hub||game.Category||game.category||game.GameCategory||game.gameCategory||"").toLowerCase();
    var text=(explicit+" "+String(game.GameType||game.gameType||game.Type||game.type||"")+" "+String(game.GameId||game.gameId||game.id||"")+" "+String(game.Name||game.name||game.Title||game.title||"")).toLowerCase();
    if(/reality|television|tv|traitors|big brother|dancing|dwts/.test(explicit)||/reality-tv/.test(text))return "Reality Hub";
    if(/award|oscars|emmys|grammys|academy/.test(explicit)||/awards?/.test(text))return "Awards Hub";
    if(/sport|nfl|football|confidence|team[- ]fantasy|playoff[- ]race/.test(text)||/survivor/.test(String(game.GameType||game.gameType||game.Type||game.type||"").toLowerCase()))return "Sports Hub";
    if(/reality|traitors|big brother|dwts/.test(text))return "Reality Hub";
    return "Games Hub";
  }
  function homeDiscoveryName_(game){
    game=game||{};
    return String(game.DisplayName||game.displayName||game.GameName||game.gameName||game.Name||game.name||game.Title||game.title||game.GameId||game.gameId||game.id||"Game").trim()||"Game";
  }
  function homeDiscoveryDescription_(game){
    game=game||{};
    var supplied=String(game.ShortDescription||game.shortDescription||game.Description||game.description||game.Summary||game.summary||"").trim();
    if(supplied)return supplied.length>150?supplied.slice(0,147)+"…":supplied;
    var text=(homeDiscoveryName_(game)+" "+String(game.GameType||game.gameType||game.Type||game.type||game.GameId||game.gameId||"")).toLowerCase();
    if(/team[- ]fantasy/.test(text))return "Build an NFL lineup by choosing a team for each position unit and manage weekly usage.";
    if(/confidence/.test(text))return "Pick the winners, then assign confidence values to show which predictions you trust most.";
    if(/playoff.*race|nfl-playoff/.test(text))return "Project the NFL playoff field and seed order as the season standings change.";
    if(/survivor/.test(text)&&homeDiscoveryHub_(game)==="Sports Hub")return "Choose an eligible NFL team for the week and follow the contest's survival rules.";
    if(homeDiscoveryHub_(game)==="Reality Hub")return "A Reality game is active now; visit the Reality Hub for its format, picks and weekly play.";
    if(homeDiscoveryHub_(game)==="Awards Hub")return "An Awards game is active now; visit the Awards Hub for its categories and predictions.";
    return "This game is active now. Visit its Hub to see the format, rules and available play.";
  }
  function homeDiscoveryItems_(payload){
    var games=payload&&Array.isArray(payload.activeGames)?payload.activeGames:[];
    return games.slice(0,4).map(function(game){return {name:homeDiscoveryName_(game),description:homeDiscoveryDescription_(game),hub:homeDiscoveryHub_(game)};});
  }
  function mountHomeDiscovery_(payload){
    if(!global.document||page_()!=="dashboard")return false;
    var loader=global.document.getElementById("loader");
    if(!loader||loader.classList&&loader.classList.contains("is-admin"))return false;
    var wrap=loader.querySelector&&loader.querySelector(".app-loader-card");if(!wrap)return false;
    var prior=wrap.querySelector&&wrap.querySelector(".pattc-home-discovery");if(prior&&prior.parentNode)prior.parentNode.removeChild(prior);
    var items=homeDiscoveryItems_(payload);if(!items.length)return false;
    ensureStyle_();
    var card=global.document.createElement("div");card.className="pattc-home-discovery";
    card.innerHTML='<div class="pattc-home-discovery-kicker">Available games</div><h3>Explore something new</h3><div class="pattc-home-discovery-list">'+items.map(function(item){return '<div class="pattc-home-discovery-item"><strong>'+esc_(item.name)+'</strong><p>'+esc_(item.description)+'</p><span>Available in '+esc_(item.hub)+'</span></div>';}).join("")+'</div>';
    wrap.appendChild(card);return true;
  }

  function slides_(key,deck){
    var cfg=CONTENT[key]||CONTENT.generic;
    var list=cfg[deck]||cfg.howto||[];
    return list.length?list:(CONTENT.generic[deck]||CONTENT.generic.howto||[]);
  }
  function cardHtml_(key,deck,index){
    var cfg=CONTENT[key]||CONTENT.generic, slides=slides_(key,deck);
    if(!slides.length)return "";
    index=Math.max(0,Math.min(slides.length-1,Number(index)||0));
    var slide=slides[index]||{}, isHowTo=deck==="howto";
    return '<div class="pattc-loading-howto-kicker">'+esc_(isHowTo?"How to Play":"Game Tips")+'</div><h3>'+esc_(slide.heading||cfg.title||"How to Play")+'</h3><p class="pattc-loading-howto-sub">'+esc_(cfg.subtitle||"")+'</p>'+visualHtml_(slide.visual)+'<p class="pattc-loading-howto-copy">'+esc_(slide.text||"")+'</p>'+(slide.example?'<p class="pattc-loading-howto-example">'+esc_(slide.example)+'</p>':"")+'<div class="pattc-loading-howto-spacer"></div><div class="pattc-loading-howto-controls"><button type="button" data-howto-prev>Previous</button><span class="pattc-loading-howto-count">'+(index+1)+' / '+slides.length+'</span><button type="button" data-howto-next>Next</button></div><div class="pattc-loading-howto-actions"><button type="button" data-howto-skip>Skip</button>'+(isHowTo?'<button type="button" class="finish" data-howto-finish>Finish How-To</button>':"")+'</div>';
  }
  function renderInto_(host,key,deck,index){
    if(!host||!key||!CONTENT[key])return false;
    ensureStyle_();
    host.innerHTML=cardHtml_(key,deck,index);
    host.setAttribute("data-howto-key",key);host.setAttribute("data-howto-deck",deck);host.setAttribute("data-howto-index",String(index));
    var prev=host.querySelector&&host.querySelector("[data-howto-prev]");
    var next=host.querySelector&&host.querySelector("[data-howto-next]");
    var skip=host.querySelector&&host.querySelector("[data-howto-skip]");
    var finish=host.querySelector&&host.querySelector("[data-howto-finish]");
    if(prev)prev.onclick=function(){showIndex_(host,key,deck,(Number(host.getAttribute("data-howto-index"))||0)-1);};
    if(next)next.onclick=function(){showIndex_(host,key,deck,(Number(host.getAttribute("data-howto-index"))||0)+1);};
    if(skip)skip.onclick=function(){if(deck==="howto")markCompleted_(key);removeLoadingCards_();};
    if(finish)finish.onclick=function(){markCompleted_(key);removeLoadingCards_();};
    return true;
  }
  function showIndex_(host,key,deck,index){
    var slides=slides_(key,deck);if(!slides.length)return;
    index=(index+slides.length)%slides.length;activeIndex=index;activeDeck=deck;renderInto_(host,key,deck,index);
  }
  function stopRotation_(){if(rotationTimer){global.clearTimeout(rotationTimer);rotationTimer=null;}}
  function startRotation_(host,key,deck){
    stopRotation_();
    function rotate(){
      if(!host||!host.isConnected){stopRotation_();return;}
      showIndex_(host,key,deck,(Number(host.getAttribute("data-howto-index"))||0)+1);
      rotationTimer=global.setTimeout(rotate,ROTATION_MS);
    }
    rotationTimer=global.setTimeout(rotate,ROTATION_MS);
  }
  function removeLoadingCards_(){
    stopRotation_();
    if(global.document){
      var loader=global.document.getElementById&&global.document.getElementById("loader");if(loader&&loader.classList)loader.classList.remove("pattc-howto-active");
      var nodes=global.document.querySelectorAll?global.document.querySelectorAll(".pattc-loading-howto"):[];
      Array.prototype.forEach.call(nodes||[],function(node){if(node&&node.parentNode)node.parentNode.removeChild(node);});
      var discovery=global.document.querySelectorAll?global.document.querySelectorAll(".pattc-home-discovery"):[];
      Array.prototype.forEach.call(discovery||[],function(node){if(node&&node.parentNode)node.parentNode.removeChild(node);});
    }
    activeKey="";activeIndex=0;activeDeck="howto";
  }
  function mountLoaderTip_(page){
    if(!global.document)return false;
    var loader=global.document.getElementById("loader");
    if(!loader||loader.classList&&loader.classList.contains("is-admin")){removeLoadingCards_();return false;}
    var key=contextKey_(page);if(!shouldShow_(key)){removeLoadingCards_();return false;}
    var deck=deckFor_(key,false), card=loader.querySelector&&loader.querySelector(".pattc-loading-howto");
    if(!card){card=global.document.createElement("div");card.className="pattc-loading-howto";var wrap=loader.querySelector&&loader.querySelector(".app-loader-card");if(!wrap)return false;wrap.appendChild(card);}
    if(loader.classList)loader.classList.add("pattc-howto-active");
    activeKey=key;activeIndex=0;activeDeck=deck;renderInto_(card,key,deck,0);startRotation_(card,key,deck);return true;
  }
  function mountProgressiveTip_(page,app){
    if(!global.document||!app)return false;
    var key=contextKey_(page);if(!shouldShow_(key))return false;
    var wrap=app.querySelector&&app.querySelector(".app-route-loading-shell-card");if(!wrap)return false;
    var deck=deckFor_(key,false),card=wrap.querySelector&&wrap.querySelector(".pattc-loading-howto");
    if(!card){card=global.document.createElement("div");card.className="pattc-loading-howto";wrap.appendChild(card);}
    activeKey=key;activeIndex=0;activeDeck=deck;renderInto_(card,key,deck,0);startRotation_(card,key,deck);return true;
  }
  function helpButton_(){
    if(!global.document)return null;var key=contextKey_(),btn=global.document.getElementById("pattcHowToPlayButton");
    if(!key){if(btn&&btn.parentNode)btn.parentNode.removeChild(btn);return null;}
    if(!btn){btn=global.document.createElement("button");btn.id="pattcHowToPlayButton";btn.className="pattc-howto-help";btn.type="button";btn.textContent="?";btn.setAttribute("aria-label","How to Play");btn.onclick=function(){openHelp_(true);};(global.document.body||global.document.documentElement).appendChild(btn);}
    return btn;
  }
  function openHelp_(forceHowTo){
    if(!global.document)return false;
    var key=contextKey_()||activeKey||"generic",cfg=CONTENT[key]||CONTENT.generic,deck=forceHowTo===false?deckFor_(key,false):"howto",slides=slides_(key,deck);
    ensureStyle_();var old=global.document.getElementById("pattcHowToModal");if(old&&old.parentNode)old.parentNode.removeChild(old);
    var modal=global.document.createElement("div");modal.id="pattcHowToModal";modal.className="pattc-howto-modal";
    var items=slides.map(function(slide){return '<div class="pattc-howto-tip"><h3>'+esc_(slide.heading||"")+'</h3>'+visualHtml_(slide.visual)+'<p>'+esc_(slide.text||"")+(slide.example?'<br><small>'+esc_(slide.example)+'</small>':"")+'</p></div>';}).join("");
    modal.innerHTML='<div class="pattc-howto-sheet" role="dialog" aria-modal="true" aria-label="How to Play"><h2>'+esc_(cfg.title||"How to Play")+'</h2><p class="pattc-howto-sheet-sub">'+esc_(cfg.subtitle||"")+'</p>'+items+'<div class="pattc-howto-pref"><label><span>How to Play / Tips during loading</span><input id="pattcHowToEnabled" type="checkbox" '+(enabled_()?"checked":"")+'></label></div><button type="button" class="pattc-howto-close">Close</button></div>';
    var close=modal.querySelector(".pattc-howto-close"),toggle=modal.querySelector("#pattcHowToEnabled");
    if(close)close.onclick=function(){if(modal.parentNode)modal.parentNode.removeChild(modal);};
    if(toggle)toggle.onchange=function(){storageSet_(STORAGE_ENABLED,toggle.checked?"1":"0");};
    modal.onclick=function(e){if(e&&e.target===modal&&modal.parentNode)modal.parentNode.removeChild(modal);};
    (global.document.body||global.document.documentElement).appendChild(modal);return true;
  }
  function installHooks_(){
    ensureStyle_();
    if(typeof global.showLoader==="function"&&!global.showLoader.__pattcHowToWrapped){var originalShow=global.showLoader;var wrappedShow=function(options){var out=originalShow.apply(this,arguments);mountLoaderTip_();return out;};wrappedShow.__pattcHowToWrapped=true;global.showLoader=wrappedShow;}
    if(typeof global.hideLoader==="function"&&!global.hideLoader.__pattcHowToWrapped){var originalHide=global.hideLoader;var wrappedHide=function(){completeLoadingVisit_();removeLoadingCards_();var out=originalHide.apply(this,arguments);helpButton_();return out;};wrappedHide.__pattcHowToWrapped=true;global.hideLoader=wrappedHide;}
    if(typeof global.appPaintProgressiveRouteShell_==="function"&&!global.appPaintProgressiveRouteShell_.__pattcHowToWrapped){var originalPaint=global.appPaintProgressiveRouteShell_;var wrappedPaint=function(page,app){var out=originalPaint.apply(this,arguments);mountProgressiveTip_(page,app);helpButton_();return out;};wrappedPaint.__pattcHowToWrapped=true;global.appPaintProgressiveRouteShell_=wrappedPaint;}
    if(typeof global.apiGetDashboardGamesHub==="function"&&!global.apiGetDashboardGamesHub.__pattcHowToWrapped){var originalHomeApi=global.apiGetDashboardGamesHub;var wrappedHomeApi=function(){var out=originalHomeApi.apply(this,arguments);if(out&&typeof out.then==="function"){out.then(function(payload){mountHomeDiscovery_(payload);}).catch(function(){});}else{mountHomeDiscovery_(out);}return out;};wrappedHomeApi.__pattcHowToWrapped=true;global.apiGetDashboardGamesHub=wrappedHomeApi;}
    helpButton_();
  }

  global.PATTCLoadingHowToR1={content:CONTENT,contextKey:contextKey_,shouldShow:shouldShow_,mountLoaderTip:mountLoaderTip_,mountProgressiveTip:mountProgressiveTip_,removeLoadingCards:removeLoadingCards_,openHelp:openHelp_,installHooks:installHooks_,enabled:enabled_,completed:completed_,markCompleted:markCompleted_,completeLoadingVisit:completeLoadingVisit_,deckFor:deckFor_,homeDiscoveryItems:homeDiscoveryItems_,mountHomeDiscovery:mountHomeDiscovery_,rotationMs:ROTATION_MS};
  if(global.document&&typeof global.document.addEventListener==="function")global.document.addEventListener("DOMContentLoaded",installHooks_);
})(window);
