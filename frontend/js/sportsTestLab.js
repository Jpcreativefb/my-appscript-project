/* PATTC Football Test Lab R1 — preview-only, admin-only. */
(function(root){
  "use strict";
  var STATES={
    survivor:["real","preview","open","selected","finalized","locked","live","final-win","final-loss","eliminated","winner"],
    confidence:["real","preview","open","selected","locked","live","final-win","final-loss"],
    "team-fantasy":["real","preview","incomplete","lineup-set","locked","live","final-win","final-loss"],
    koth:["real","preview","safe","warning","strike","eliminated","champion"],
    wager:["real","preview","open","selected","locked","live","won","lost","push"]
  };
  var LABELS={real:"REAL DATA",preview:"PREVIEW / UPCOMING",open:"OPEN",selected:"SELECTED / SAVED",finalized:"FINALIZED PICK",locked:"LOCKED",live:"LIVE","final-win":"FINAL — WIN / SURVIVED","final-loss":"FINAL — LOSS","lineup-set":"LINEUP SET",incomplete:"INCOMPLETE LINEUP",safe:"SAFE",warning:"WARNING ZONE",strike:"STRIKE RECEIVED",eliminated:"ELIMINATED",winner:"WINNER",champion:"LAST MAN STANDING",won:"FINAL — WON",lost:"FINAL — LOST",push:"FINAL — PUSH"};
  var S={page:"",type:"",gameId:"",app:null,baseline:"",state:"real",week:1,panel:false};
  function txt(v){return String(v===undefined||v===null?"":v);}
  function esc(v){return txt(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function admin(){try{var s=typeof getSession==="function"?(getSession()||{}):{};var v=s.isAdmin!==undefined?s.isAdmin:(s.user&&s.user.isAdmin);return v===true||v===1||["true","yes","admin"].indexOf(txt(v).toLowerCase())!==-1;}catch(e){return false;}}
  function gid(){try{return typeof getFrontendGameId==="function"?txt(getFrontendGameId()):txt(root.APP_STATE&&root.APP_STATE.gameId);}catch(e){return "";}}
  function type(page,app){
    if(page==="survivor"){var p={};try{p=typeof SURVIVOR_PAGE_STATE!=="undefined"?(SURVIVOR_PAGE_STATE.payload||{}):{};}catch(e){} if(p.passiveKoth===true||p.mode==="king-of-the-hill"||app.querySelector(".sports-default-koth,.sports-default-koth-final"))return"koth";return app.querySelector(".survivor-page,.survivor-recovery-r3")?"survivor":"";}
    if(page==="picks"){var c=false;try{c=typeof PICKS_PAGE_DATA!=="undefined"&&PICKS_PAGE_DATA.isConfidenceGame===true;}catch(e){} return c||app.querySelector(".confidence-game-row")?"confidence":"";}
    if(page==="team-fantasy")return app.querySelector(".tf-slot,.sports-team-fantasy")?"team-fantasy":"";
    if(page==="betting")return app.querySelector(".betting-nominee-card,.betting-page,[class*='wager']")?"wager":"";
    return"";
  }
  function currentWeek(){try{if(S.type==="survivor"||S.type==="koth"){var p=SURVIVOR_PAGE_STATE.payload||{};return Number(p.currentRound&&(p.currentRound.week||p.currentRound.round)||p.week||1)||1;}if(S.type==="team-fantasy")return Number(root.TEAM_FANTASY_STATE&&root.TEAM_FANTASY_STATE.week||1)||1;if(S.type==="confidence"){var a=PICKS_PAGE_DATA.categories||[];for(var i=0;i<a.length;i++){var w=Number(a[i].week||a[i].weekNumber||a[i].sportsWeek||0);if(w>0)return w;}}}catch(e){}return 1;}
  function key(){return"pattcFootballTestLab:r1:"+encodeURIComponent(S.type+"|"+S.gameId);}
  function load(){var d={state:"real",week:currentWeek()};try{var x=JSON.parse(sessionStorage.getItem(key())||"null");if(x){d.state=x.state||d.state;d.week=Number(x.week||d.week)||d.week;}}catch(e){}if((STATES[S.type]||[]).indexOf(d.state)===-1)d.state="real";S.state=d.state;S.week=Math.max(1,Math.min(18,d.week));}
  function save(){try{sessionStorage.setItem(key(),JSON.stringify({state:S.state,week:S.week}));}catch(e){}}
  function restore(){if(!S.app)return;S.app.inert=false;document.body.classList.remove("pattc-testlab-simulating");if(S.baseline)S.app.innerHTML=S.baseline;}
  function stamp(n,l,t){if(!n)return;var x=document.createElement("div");x.className="pattc-testlab-stamp pattc-testlab-generated is-"+(t||"info");x.textContent=l;n.prepend(x);}
  function set(n,v){if(n)n.textContent=v;}
  function banner(){S.app.insertAdjacentHTML("afterbegin",'<div class="pattc-testlab-banner pattc-testlab-generated"><strong>TEST LAB — '+esc(LABELS[S.state]||S.state.toUpperCase())+'</strong><span>WEEK '+S.week+' · DISPLAY ONLY · NO SAVES</span></div>');}
  function weekLabels(){S.app.querySelectorAll(".survivor-r3-browser-head>span,.tf-week-title,.tf-week-label,.confidence-week-label,.sports-default-koth-weekbar>span:not(.is-live)").forEach(function(n){if(/week/i.test(n.textContent||"")||n.matches(".survivor-r3-browser-head>span"))n.textContent="WEEK "+S.week;});}
  function score(card,label,a,h){if(!card)return;var n=document.createElement("div");n.className="pattc-testlab-scorebar pattc-testlab-generated";n.innerHTML="<strong>"+esc(label)+"</strong><span>"+a+" — "+h+"</span>";card.appendChild(n);}
  function survivor(){weekLabels();var cards=Array.from(S.app.querySelectorAll(".survivor-r3-matchup,.survivor-final-matchup")),first=cards[0],status=first&&first.querySelector(".survivor-r2-matchup-meta strong"),hero=S.app.querySelector(".survivor-rich-hero-status"),hs=hero&&hero.querySelector("span"),hd=hero&&hero.querySelector("strong"),pick=S.app.querySelector(".survivor-r3-pick-head small");if(["selected","finalized","locked","live","final-win","final-loss","eliminated","winner"].indexOf(S.state)!==-1){var team=S.app.querySelector(".survivor-r3-team-side,.survivor-r2-team-side");if(team){team.classList.add("pattc-testlab-selected");stamp(team,"YOUR PICK","selected");}}if(S.state==="locked"){set(status,"LOCKED");set(pick,"LOCKED IN");}if(S.state==="live"){set(status,"LIVE · Q2 06:42");set(pick,"LOCKED IN · LIVE");score(first,"LIVE · Q2 06:42","17","14");}if(S.state==="final-win"){set(status,"FINAL");set(hs,"STILL ALIVE");set(hd,"Week survived · streak continues");score(first,"FINAL · SURVIVED","24","20");}if(S.state==="final-loss"){set(status,"FINAL");set(hs,"LOSS — LIFE USED");set(hd,"One life consumed · streak reset");score(first,"FINAL · LOSS","17","27");}if(S.state==="eliminated"){set(hs,"ELIMINATED");set(hd,"Season complete");}if(S.state==="winner"){set(hs,"WINNER");set(hd,"LAST SURVIVOR STANDING");}if(["preview","open","selected","finalized"].indexOf(S.state)!==-1){set(status,"SCHEDULED");set(pick,S.state==="finalized"?"FINALIZED · OPEN UNTIL KICKOFF":"OPEN UNTIL KICKOFF");}}
  function confidence(){weekLabels();var rows=Array.from(S.app.querySelectorAll(".confidence-game-row")).slice(0,6);rows.forEach(function(r,i){var a=r.querySelector(".confidence-matchup-state strong"),b=r.querySelector(".confidence-matchup-state span");if(S.state==="live"){set(a,i?"LIVE":"LIVE · Q3 08:14");set(b,"LOCKED · IN PROGRESS");}else if(S.state==="final-win"||S.state==="final-loss"){set(a,"FINAL");set(b,S.state==="final-win"?"CORRECT":"WRONG");}else{set(a,S.state==="preview"?"SCHEDULED":"UPCOMING");set(b,S.state==="locked"?"LOCKED":S.state==="selected"?"SAVED · Locks at kickoff":"OPEN · Locks at kickoff");}});if(rows[0])stamp(rows[0],LABELS[S.state]||S.state,S.state==="final-loss"?"danger":"info");}
  function fantasy(){weekLabels();var slots=Array.from(S.app.querySelectorAll(".tf-slot")).slice(0,8);slots.forEach(function(s,i){var st=s.querySelector(".tf-slot-status-word"),pt=s.querySelector(".tf-slot-points-r3");if(S.state==="incomplete"&&i<3)set(st,"OPEN");if(S.state==="locked")set(st,"LOCKED");if(S.state==="live"){set(st,"LIVE");if(pt)pt.textContent=(i%2?"8.7":"12.4")+" pts";}if(S.state==="final-win"||S.state==="final-loss"){set(st,"FINAL");if(pt)pt.textContent=(S.state==="final-win"?(14+i*.7):(6+i*.4)).toFixed(1)+" pts";}});var c=S.app.querySelector(".tf-game-day-card,.sports-team-fantasy");if(c)stamp(c,LABELS[S.state]||S.state,S.state==="final-loss"?"danger":"info");}
  function koth(){weekLabels();var b=S.app.querySelector(".sports-default-koth-status,.koth-final-status"),st=b&&b.querySelector("strong"),label="SAFE",count=0;if(S.state==="warning"){label="WARNING ZONE";count=1;}if(S.state==="strike"){label="STRIKE RECEIVED";count=2;}if(S.state==="eliminated"){label="FINAL-ELIMINATED";count=3;}if(S.state==="champion")label="LAST MAN STANDING";if(S.state==="preview")label="WEEK PREVIEW";set(st,label);Array.from(S.app.querySelectorAll(".sports-default-koth-strikes i,.koth-final-mini-strikes i")).slice(0,3).forEach(function(n,i){n.classList.toggle("is-filled",i<count);});var p=S.app.querySelector(".koth-final-player,.koth-final-standing");if(p)stamp(p,label,S.state==="eliminated"?"danger":"info");}
  function wager(){weekLabels();var c=S.app.querySelector(".betting-category-card,.betting-category,.sports-wager-card,.betting-game-card,[data-category-id],.betting-page");if(!c)return;stamp(c,LABELS[S.state]||S.state,S.state==="won"?"success":S.state==="lost"?"danger":"info");if(S.state==="live"||["won","lost","push"].indexOf(S.state)!==-1)score(c,S.state==="live"?"LIVE · Q4 04:12":"FINAL · "+S.state.toUpperCase(),"BUF 27","DET 24");}
  function apply(){if(!S.app)return;restore();if(S.state==="real"){launcher();return;}S.app.inert=true;document.body.classList.add("pattc-testlab-simulating");banner();if(S.type==="survivor"){survivor();if(typeof root.pattcSurvivorR4TestLabApply==="function")root.pattcSurvivorR4TestLabApply(S);}if(S.type==="confidence")confidence();if(S.type==="team-fantasy")fantasy();if(S.type==="koth")koth();if(S.type==="wager")wager();launcher();}
  function launcher(){var b=document.getElementById("pattcSportsTestLabButton");if(b)b.innerHTML="<strong>TEST LAB</strong><span>"+esc(S.state==="real"?"REAL DATA":(LABELS[S.state]||S.state))+"</span>";}
  function panel(){var o=(STATES[S.type]||[]).map(function(v){return'<option value="'+v+'" '+(v===S.state?"selected":"")+'>'+esc(LABELS[v]||v)+'</option>';}).join("");return'<section id="pattcSportsTestLabPanel" class="pattc-testlab-panel"><div class="pattc-testlab-head"><strong>FOOTBALL TEST LAB</strong><button onclick="pattcSportsTestLabClose()">×</button></div><div class="pattc-testlab-body"><label><span>Game state</span><select onchange="pattcSportsTestLabSetState(this.value)">'+o+'</select></label><label><span>Week</span><div class="pattc-testlab-week-row"><button onclick="pattcSportsTestLabBumpWeek(-1)">‹</button><input type="number" min="1" max="18" value="'+S.week+'" onchange="pattcSportsTestLabSetWeek(this.value)"><button onclick="pattcSportsTestLabBumpWeek(1)">›</button></div></label><button class="pattc-testlab-reset" onclick="pattcSportsTestLabReset()">RESTORE REAL DATA</button></div></section>';}
  function open(){close();document.body.insertAdjacentHTML("beforeend",panel());S.panel=true;}
  function close(){var n=document.getElementById("pattcSportsTestLabPanel");if(n)n.remove();S.panel=false;}
  function mount(page,app){teardown();if(!admin()||!app)return;var t=type(page,app);if(!t)return;S.page=page;S.type=t;S.gameId=gid();S.app=app;S.baseline=app.innerHTML;load();document.body.insertAdjacentHTML("beforeend",'<button id="pattcSportsTestLabButton" class="pattc-testlab-launcher" onclick="pattcSportsTestLabOpen()"><strong>TEST LAB</strong><span>REAL DATA</span></button>');launcher();if(S.state!=="real")apply();}
  function teardown(){close();var b=document.getElementById("pattcSportsTestLabButton");if(b)b.remove();document.body.classList.remove("pattc-testlab-simulating");if(S.app)S.app.inert=false;}
  function before(page,app){if(S.app===app&&S.baseline){app.inert=false;app.innerHTML=S.baseline;}teardown();S={page:"",type:"",gameId:"",app:null,baseline:"",state:"real",week:1,panel:false};}
  root.pattcSportsTestLabMount=mount;root.pattcSportsTestLabBeforeNavigate=before;root.pattcSportsTestLabOpen=open;root.pattcSportsTestLabClose=close;
  root.pattcSportsTestLabSetState=function(v){S.state=txt(v||"real");save();apply();if(S.panel)open();};
  root.pattcSportsTestLabSetWeek=function(v){S.week=Math.max(1,Math.min(18,Number(v||1)||1));save();apply();if(S.panel)open();};
  root.pattcSportsTestLabBumpWeek=function(d){S.week=Math.max(1,Math.min(18,S.week+Number(d||0)));save();apply();if(S.panel)open();};
  root.pattcSportsTestLabReset=function(){S.state="real";S.week=currentWeek();save();close();if(typeof navigate==="function"&&S.page)navigate(S.page,{forceRefresh:true,suppressLoader:true,skipHistoryWrite:true,skipUnsavedCheck:true});else{restore();launcher();}};
})(window);

/* SURVIVOR_R4_PLAYER_EXPERIENCE_R1 — display-only dummy NFL slate. */
window.pattcSurvivorR4TestLabApply=function(S){if(!S||!S.app||S.state==="real")return;const teams=[["BUF","Buffalo Bills","2-0","#00338D","#C60C30"],["DET","Detroit Lions","1-1","#0076B6","#B0B7BC"],["PHI","Philadelphia Eagles","2-0","#004C54","#A5ACAF"],["TEN","Tennessee Titans","0-2","#0C2340","#4B92DB"],["PIT","Pittsburgh Steelers","1-1","#101820","#FFB612"],["NE","New England Patriots","1-1","#002244","#C60C30"],["MIN","Minnesota Vikings","1-1","#4F2683","#FFC62F"],["CHI","Chicago Bears","1-1","#0B162A","#C83803"],["CAR","Carolina Panthers","0-2","#0085CA","#101820"],["ATL","Atlanta Falcons","1-1","#A71930","#000000"],["GB","Green Bay Packers","1-1","#203731","#FFB612"],["NYJ","New York Jets","1-1","#125740","#000000"],["NO","New Orleans Saints","1-1","#D3BC8D","#101820"],["BAL","Baltimore Ravens","2-0","#241773","#9E7C0C"],["CIN","Cincinnati Bengals","1-1","#FB4F14","#000000"],["HOU","Houston Texans","1-1","#03202F","#A71930"],["CLE","Cleveland Browns","0-2","#311D00","#FF3C00"],["TB","Tampa Bay Buccaneers","2-0","#D50A0A","#34302B"],["JAX","Jacksonville Jaguars","2-0","#006778","#D7A22A"],["DEN","Denver Broncos","1-1","#FB4F14","#002244"],["LV","Las Vegas Raiders","1-1","#000000","#A5ACAF"],["LAC","Los Angeles Chargers","1-1","#0080C6","#FFC20E"],["SEA","Seattle Seahawks","1-1","#002244","#69BE28"],["ARI","Arizona Cardinals","1-1","#97233F","#000000"],["MIA","Miami Dolphins","1-1","#008E97","#FC4C02"],["SF","San Francisco 49ers","1-1","#AA0000","#B3995D"],["WAS","Washington Commanders","1-1","#5A1414","#FFB612"],["DAL","Dallas Cowboys","1-1","#003594","#869397"],["IND","Indianapolis Colts","1-1","#002C5F","#A2AAAD"],["KC","Kansas City Chiefs","2-0","#E31837","#FFB81C"],["NYG","New York Giants","1-1","#0B2265","#A71930"],["LA","Los Angeles Rams","1-1","#003594","#FFA300"]];function logo(a){const m={JAX:"jax",LA:"lar",WAS:"wsh"};return"https://a.espncdn.com/i/teamlogos/nfl/500/"+(m[a]||a.toLowerCase())+".png";}function rgba(h,a){h=String(h||"#123456").replace("#","");return`rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;}function html(t,score,badge){return(badge?`<span class="survivor-r2-team-badge ${badge[0]}">${badge[1]}</span>`:"")+`<span class="survivor-r2-logo"><img src="${logo(t[0])}" alt=""></span><span class="survivor-r2-team-name"><strong>${t[1]}</strong><small>${t[2]}</small></span>`+(score!==null?`<b class="survivor-r2-score survivor-r4-score">${score}</b>`:"");}const cards=Array.from(S.app.querySelectorAll(".survivor-r3-matchup"));cards.forEach((card,i)=>{const away=teams[i*2],home=teams[i*2+1];if(!away||!home)return;const sides=card.querySelectorAll(".survivor-r3-team-side");[away,home].forEach((t,side)=>{const n=sides[side];if(!n)return;n.className="survivor-r2-team-side survivor-r3-team-side";n.style.cssText=`--survivor-team-primary:${t[3]};--survivor-team-secondary:${t[4]};--survivor-team-primary-a:${rgba(t[3],.52)};--survivor-team-primary-soft:${rgba(t[3],.30)};--survivor-team-secondary-a:${rgba(t[4],.30)};`;let badge=null,score=null;if(i===1&&side===0){n.classList.add("is-prior-used","is-prior-win");badge=["is-used is-win","W1 USED"];}if(i===2&&side===1){n.classList.add("is-prior-used","is-prior-loss");badge=["is-used is-loss","W2 USED"];}if(i===0&&side===1&&["selected","finalized","locked","live","final-win","final-loss","eliminated","winner"].indexOf(S.state)!==-1){n.classList.add("is-selected");badge=["is-saved",S.state==="selected"?"SELECTED":"YOUR PICK"];}if(S.state==="live"&&i===0)score=side===0?17:14;if((S.state==="final-win"||S.state==="final-loss")&&i===0)score=side===0?(S.state==="final-win"?20:27):(S.state==="final-win"?24:17);n.innerHTML=html(t,score,badge);});const meta=card.querySelector(".survivor-r2-matchup-meta strong");if(meta)meta.textContent=S.state==="live"&&i===0?"LIVE · Q2 06:42":(S.state==="final-win"||S.state==="final-loss")&&i===0?"FINAL":"SCHEDULED";});const idx=S.app.querySelector(".survivor-r3-game-index");if(idx)idx.textContent="1";if(["selected","finalized","locked","live","final-win","final-loss","eliminated","winner"].indexOf(S.state)!==-1){const t=teams[1],wrap=S.app.querySelector(".survivor-r3-selected-wrap");if(wrap)wrap.innerHTML=`<div class="survivor-r2-selected-team survivor-r3-selected-team survivor-r4-selected-team" style="--survivor-team-primary:${t[3]};--survivor-team-secondary:${t[4]};--survivor-team-primary-a:${rgba(t[3],.52)};--survivor-team-primary-soft:${rgba(t[3],.30)};--survivor-team-secondary-a:${rgba(t[4],.30)};"><span class="survivor-r2-selected-logo"><img src="${logo(t[0])}" alt=""></span><div class="survivor-r4-selected-copy"><strong>${t[1]}</strong><b>${t[2]}</b><span>vs Buffalo Bills · Sun 12:00 PM</span></div></div>`;}const circles=S.app.querySelector(".survivor-r3-lives>div");if(circles){const used=S.state==="final-loss"?1:S.state==="eliminated"?3:0;circles.innerHTML=[0,1,2].map(i=>`<i class="${i<used?"is-used":""}"></i>`).join("");}};

/* SURVIVOR_R4_1_SELECTOR_STATES
   Test Lab starts from the real locked DOM. Rebuild the omitted action stack
   for simulated open/selected/finalized states. DISPLAY ONLY / NO SAVES.
*/
(function(root){
  const base = root.pattcSurvivorR4TestLabApply;
  if (typeof base !== "function") return;

  root.pattcSurvivorR4TestLabApply = function(S){
    base(S);
    if (!S || !S.app || S.state === "real") return;

    const panel = S.app.querySelector(".survivor-r3-finalize");
    if (!panel) return;

    const showActions = ["open","selected","finalized"].indexOf(String(S.state || "")) !== -1;
    const hasSelection = ["selected","finalized"].indexOf(String(S.state || "")) !== -1;
    let stack = panel.querySelector(".survivor-r3-action-stack");

    if (!showActions) {
      if (stack && stack.classList.contains("survivor-testlab-r4-actions")) stack.remove();
      return;
    }

    if (!stack) {
      stack = document.createElement("div");
      stack.className = "survivor-r2-action-stack survivor-r3-action-stack survivor-testlab-r4-actions";
      panel.appendChild(stack);
    } else {
      stack.classList.add("survivor-testlab-r4-actions");
    }

    stack.innerHTML =
      '<button id="survivorSaveButton" class="survivor-r2-finalize-button survivor-r3-finalize-button" type="button" ' +
        (hasSelection ? '' : 'disabled') + '><strong>FINALIZE PICK</strong></button>' +
      '<div class="survivor-r2-pick-tools">' +
        '<button type="button" class="survivor-r2-tool secondary"><strong>Random Pick</strong><span>Eligible team</span></button>' +
        '<button type="button" class="survivor-r2-tool primary"><strong>Auto Pick</strong><span>Choose method</span></button>' +
      '</div>' +
      '<small class="survivor-r2-safety-note survivor-r3-safety-note survivor-r4-auto-summary">AUTO PICK SETTINGS AVAILABLE</small>' +
      '<span id="survivorSelectionCount" class="survivor-selection-count">' +
        (hasSelection ? '1 / 1 selected' : '0 / 1 selected') +
      '</span><span id="survivorSaveMessage" class="survivor-save-message"></span>';

    // Correct semantic colors in simulated states.
    const current = S.app.querySelector(".survivor-r3-team-side.is-selected, .survivor-r3-team-side.is-finalized");
    if (current) {
      current.classList.remove("is-result-win","is-result-loss");
      if (S.state === "final-win") current.classList.add("is-result-win");
      if (S.state === "final-loss") current.classList.add("is-result-loss");
    }

    // Make used-team overlays explicit.
    S.app.querySelectorAll(".survivor-r3-team-side.is-prior-used .survivor-r2-team-badge.is-used").forEach(function(badge){
      const text = String(badge.textContent || "").trim();
      const m = text.match(/W(?:EEK\s*)?(\d+)/i);
      if (m) badge.textContent = "WEEK " + m[1] + " USED";
    });
  };
})(window);
