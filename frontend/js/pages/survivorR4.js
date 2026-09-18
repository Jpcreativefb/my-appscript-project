/* =========================================================
   PATTC SURVIVOR R4 PLAYER EXPERIENCE R1
   Loaded after survivor.js. Sports Survivor only.
   ========================================================= */
(function(root){
  "use strict";
  const MARK="SURVIVOR_R4_PLAYER_EXPERIENCE_R1";

  function esc(v){return typeof survivorFinalEscape_==="function"?survivorFinalEscape_(v):String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
  function js(v){return String(v||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");}
  function rankValue(team){const a=[team&&team.sportsRank,team&&team.powerRank,team&&team.powerRanking,team&&team.teamRank,team&&team.rank,team&&team.leagueRank];for(let i=0;i<a.length;i++){const n=Number(a[i]);if(Number.isFinite(n)&&n>0)return n;}return 9999;}
  function strategyLabel(v){v=String(v||"best-odds").toLowerCase();return v==="best-record"?"Best Record":v==="best-rank"?"Best Sports Rank":v==="biggest-favorite"?"Biggest Favorite":v==="random"?"Random Eligible":"Best Odds";}
  function triggerLabel(v){v=String(v||"last-game").toLowerCase();return v==="thursday"?"Before Thursday Game":v==="sunday-early"?"Before Sunday Early":v==="sunday-late"?"Before Sunday Late":v==="sunday-night"?"Before Sunday Night":"Before Last Eligible Game";}

  root.survivorRecoveryR4StrategyLabel_=strategyLabel;
  root.survivorRecoveryR4TriggerLabel_=triggerLabel;
  root.survivorRecoveryR2StrategyLabel_=strategyLabel;

  root.survivorRecoveryR3AutoPreference_=function(payload){
    payload=payload||{};const pref=payload.autoPickPreference||{},settings=payload.settings||{};
    return {configured:pref.configured===true,enabled:pref.configured===true?pref.enabled===true:settings.autoPickEnabled===true,strategy:pref.strategy||settings.autoPickStrategy||"best-odds",trigger:pref.trigger||"last-game",scope:pref.scope==="week"?"week":"season",targetWeek:Number(pref.targetWeek||0)};
  };

  const selectBase=root.survivorRecoveryR2SelectHelper_;
  root.survivorRecoveryR2SelectHelper_=function(strategy){
    strategy=String(strategy||"random").toLowerCase();
    if(strategy!=="best-rank"&&strategy!=="biggest-favorite")return selectBase(strategy);
    const payload=root.SURVIVOR_PAGE_STATE&&root.SURVIVOR_PAGE_STATE.payload||{},round=payload.currentRound||{},required=Math.max(1,Number(round.requiredSelections||1));
    const rows=(round.nominees||[]).filter(t=>{if(!t||t.eligible===false)return false;const k=t.kickoff?new Date(t.kickoff).getTime():0;return !k||Date.now()<k;}).slice();
    if(strategy==="best-rank")rows.sort((a,b)=>rankValue(a)-rankValue(b));
    else rows.sort((a,b)=>{const aa=Number(a&&a.spread),bb=Number(b&&b.spread),av=Number.isFinite(aa)?aa:9999,bv=Number.isFinite(bb)?bb:9999;if(av!==bv)return av-bv;return survivorRecoveryR2OddsStrength_(b.moneyline)-survivorRecoveryR2OddsStrength_(a.moneyline);});
    root.SURVIVOR_PAGE_STATE.selected=rows.slice(0,required).map(t=>String(t.id||""));
    if(typeof root.survivorRecoveryR3Refresh_==="function")root.survivorRecoveryR3Refresh_();
  };

  root.survivorRecoveryR3SelectedTeamHtml_=function(team){
    team=team||{};const logo=survivorFinalTeamLogo_(team),opp=team.opponent?((String(team.side||"").toLowerCase()==="away"?"@ ":"vs ")+team.opponent):"",record=team.teamRecord?String(team.teamRecord):"",kick=team.kickoff?survivorFormatKickoff_(team.kickoff):"";
    return `<div class="survivor-r2-selected-team survivor-r3-selected-team survivor-r4-selected-team" style="${survivorRecoveryR2TeamStyle_(team)}"><span class="survivor-r2-selected-logo">${logo||`<span class="survivor-r2-logo-fallback">${esc(survivorRecoveryR2TeamKey_(team))}</span>`}</span><div class="survivor-r4-selected-copy"><strong>${esc(team.name||team.id||"Team")}</strong>${record?`<b>${esc(record)}</b>`:""}<span>${esc([opp,kick].filter(Boolean).join(" · "))}</span></div></div>`;
  };

  root.survivorRecoveryR3TeamSide_=function(team,round,matchup,result,state,side,payload){
    if(!team)return '<div class="survivor-r2-team-side survivor-r3-team-side is-empty"><strong>TBD</strong></div>';
    const selectedIds=survivorFinalSelectedIds_().map(String),savedIds=survivorRecoveryR2SavedIds_(round),id=String(team.id||""),selected=selectedIds.indexOf(id)!==-1,saved=savedIds.indexOf(id)!==-1,history=survivorRecoveryR3HistoryMeta_(payload,team),used=!!(team.usedWeek||team.usedOverlay||history.week),unavailable=team.eligible===false&&!selected,started=state!=="pregame",disabled=!round.canPick||unavailable||started,outcome=String(round.outcome||"").toLowerCase();
    const resultClass=saved&&state==="final"&&(outcome==="win"||outcome==="loss")?"is-result-"+outcome:"",priorClass=used&&!saved?(history.cls==="is-loss"?"is-prior-loss":history.cls==="is-win"||history.cls==="is-push"?"is-prior-win":"is-prior-used"):"";
    const classes=["survivor-r3-team-side",selected?"is-selected":"",saved&&state!=="final"?"is-finalized":"",unavailable?"is-disabled":"",started?"is-started":"",used&&!saved?"is-prior-used":"",resultClass,priorClass].filter(Boolean).join(" ");
    const logo=survivorFinalTeamLogo_(team)||`<span class="survivor-r2-logo-fallback">${esc(survivorRecoveryR2TeamKey_(team))}</span>`,record=team.teamRecord?String(team.teamRecord):"",score=state==="pregame"?"":survivorRecoveryR2ScoreValue_(result,side);
    let badge="";if(saved)badge=`<span class="survivor-r2-team-badge is-saved">${state==="pregame"?"FINALIZED":state==="live"?"YOUR PICK":outcome==="win"?"SURVIVED":outcome==="loss"?"LIFE USED":"YOUR PICK"}</span>`;else if(selected)badge='<span class="survivor-r2-team-badge is-selected">SELECTED</span>';else if(used)badge=`<span class="survivor-r2-team-badge is-used ${history.cls==="is-loss"?"is-loss":history.cls==="is-win"||history.cls==="is-push"?"is-win":""}">W${esc(history.week||team.usedWeek||"?")} USED</span>`;else if(unavailable&&team.unavailableReason==="started")badge='<span class="survivor-r2-team-badge is-locked">LOCKED</span>';
    return `<button type="button" class="survivor-r2-team-side ${classes}" style="${survivorRecoveryR2TeamStyle_(team)}" data-survivor-id="${esc(id)}" ${disabled?"disabled":""} aria-pressed="${selected?"true":"false"}" onclick="survivorSelect_('${js(id)}')">${badge}<span class="survivor-r2-logo">${logo}</span><span class="survivor-r2-team-name"><strong>${esc(team.name||team.id||"Team")}</strong>${record?`<small>${esc(record)}</small>`:""}</span>${score!==""&&score!=null?`<b class="survivor-r2-score survivor-r4-score">${esc(score)}</b>`:""}</button>`;
  };

  root.survivorRecoveryR3OpenAutoPick_=function(){
    survivorRecoveryR3CloseAutoPick_();const payload=SURVIVOR_PAGE_STATE.payload||{},pref=survivorRecoveryR3AutoPreference_(payload),enabled=payload.settings&&payload.settings.autoPickEnabled===true,o=document.createElement("div");o.id="survivorR3AutoPickOverlay";o.className="tf-info-overlay survivor-r3-auto-overlay survivor-r4-auto-overlay";
    const m=(v,t,n)=>`<label><input type="radio" name="survivorR3AutoStrategy" value="${v}" ${pref.strategy===v?"checked":""}><span><strong>${t}</strong><small>${n}</small></span></label>`;
    o.innerHTML=`<section class="tf-info-sheet survivor-r3-auto-sheet survivor-r4-auto-sheet"><div class="tf-info-head"><h2>Auto Pick</h2><button class="tf-info-close" type="button" onclick="survivorRecoveryR3CloseAutoPick_()">×</button></div><div class="tf-info-body"><p class="tf-info-intro">Select Team Now fills your choice but does not finalize it. Missed-Pick Protection chooses and finalizes automatically at your selected deadline.</p><div class="survivor-r3-auto-methods survivor-r4-auto-methods">${m("best-odds","Best Odds / Favorite","Strongest available favorite using current moneyline odds.")}${m("best-record","Best Record","Eligible team with the best current win percentage.")}${m("best-rank","Best Sports Rank","Highest-ranked eligible team when ranking data is available.")}${m("biggest-favorite","Biggest Spread Favorite","Eligible team favored by the most points.")}${m("random","Random Eligible","Random legal team you have not exhausted.")}</div><button type="button" class="survivor-r3-auto-now" onclick="survivorRecoveryR3AutoPickNow_()">SELECT TEAM NOW</button><div class="survivor-r3-auto-protection ${enabled?"":"is-disabled"}"><div><strong>Missed-Pick Protection</strong><small>If no pick is finalized, PATTC chooses and finalizes one automatically.</small></div><label class="survivor-r3-switch"><input id="survivorR3AutoProtect" type="checkbox" ${pref.enabled?"checked":""} ${enabled?"":"disabled"}><span></span></label></div><label class="survivor-r3-auto-scope"><span>When should PATTC take over?</span><select id="survivorR4AutoTrigger" ${enabled?"":"disabled"}><option value="thursday" ${pref.trigger==="thursday"?"selected":""}>Before the Thursday game</option><option value="sunday-early" ${pref.trigger==="sunday-early"?"selected":""}>Before Sunday early games</option><option value="sunday-late" ${pref.trigger==="sunday-late"?"selected":""}>Before Sunday late games</option><option value="sunday-night" ${pref.trigger==="sunday-night"?"selected":""}>Before Sunday Night Football</option><option value="last-game" ${pref.trigger==="last-game"?"selected":""}>Before the last eligible game</option></select></label><label class="survivor-r3-auto-scope"><span>Protection scope</span><select id="survivorR3AutoScope" ${enabled?"":"disabled"}><option value="week" ${pref.scope==="week"?"selected":""}>This Week Only</option><option value="season" ${pref.scope==="season"?"selected":""}>Every Future Week This Season</option></select></label>${enabled?'<button type="button" class="survivor-r3-auto-save" onclick="survivorRecoveryR3SaveAutoPreference_()">SAVE AUTO PICK SETTINGS</button>':'<p class="survivor-r3-auto-disabled-note">Future missed-pick protection is disabled by the game admin. Auto Pick Now is still available.</p>'}<div id="survivorR3AutoStatus" class="survivor-r3-auto-status"></div></div><div class="tf-info-footer"><button class="tf-button secondary" type="button" onclick="survivorRecoveryR3CloseAutoPick_()">Close</button></div></section>`;
    o.addEventListener("click",e=>{if(e.target===o)survivorRecoveryR3CloseAutoPick_();});document.body.appendChild(o);
  };

  root.survivorRecoveryR3SaveAutoPreference_=async function(){
    const payload=SURVIVOR_PAGE_STATE.payload||{},round=payload.currentRound||{},status=document.getElementById("survivorR3AutoStatus"),strategyNode=document.querySelector('input[name="survivorR3AutoStrategy"]:checked'),protect=document.getElementById("survivorR3AutoProtect"),scopeNode=document.getElementById("survivorR3AutoScope"),triggerNode=document.getElementById("survivorR4AutoTrigger"),strategy=strategyNode?strategyNode.value:"best-odds",enabled=!!(protect&&protect.checked),scope=scopeNode?scopeNode.value:"season",trigger=triggerNode?triggerNode.value:"last-game";
    if(status)status.textContent="Saving…";let result;if(/^(127\.0\.0\.1|localhost)$/.test(String(location&&location.hostname||"")))result={success:true,preference:{configured:true,enabled,strategy,trigger,scope,targetWeek:scope==="week"?Number(round.week||round.round||0):0}};else if(typeof apiPost==="function"){const session=typeof getSession==="function"?(getSession()||{}):{};result=await apiPost("saveSportsSurvivorAutoPickPreference",{gameId:SURVIVOR_PAGE_STATE.gameId||payload.gameId||"",username:session.username||"",enabled,strategy,trigger,scope,week:Number(round.week||round.round||0)});}else result={success:false,message:"Auto Pick settings service is unavailable."};
    if(!result||result.success===false){if(status)status.textContent=result&&(result.message||result.error)||"Could not save Auto Pick settings.";return;}payload.autoPickPreference=result.preference||{configured:true,enabled,strategy,trigger,scope,targetWeek:scope==="week"?Number(round.week||round.round||0):0};if(status)status.textContent=enabled?"Saved · "+strategyLabel(strategy)+" · "+triggerLabel(trigger):"Missed-pick protection turned off.";survivorRecoveryR3Refresh_();
  };

  const finalizeBase=root.renderSurvivorRecoveryR3Finalize_;
  root.renderSurvivorRecoveryR3Finalize_=function(payload){let html=finalizeBase(payload);if(!html)return html;const p=survivorRecoveryR3AutoPreference_(payload||{}),note=p.enabled?`AUTO PICK ON · ${strategyLabel(p.strategy)} · ${triggerLabel(p.trigger)}`:"AUTO PICK OFF";return html.replace(/<small class="survivor-r2-safety-note survivor-r3-safety-note">[\s\S]*?<\/small>/,`<small class="survivor-r2-safety-note survivor-r3-safety-note survivor-r4-auto-summary">${esc(note)}</small>`);};

  function movement(row){const n=Number(row&&(row.rankMovement!==undefined?row.rankMovement:row.movement!==undefined?row.movement:row.positionChange!==undefined?row.positionChange:0));return !Number.isFinite(n)||n===0?"—":n>0?"▲"+n:"▼"+Math.abs(n);}
  root.survivorRecoveryR3StandingsRows_=function(payload){const rows=(payload.standings||[]).slice();rows.sort((a,b)=>{const aa=a.survivorAlive!==false?1:0,bb=b.survivorAlive!==false?1:0;if(aa!==bb)return bb-aa;return Number(b.total||0)-Number(a.total||0);});if(!rows.length)return '<div class="survivor-r3-compare-empty">No Survivor standings yet.</div>';const head='<div class="survivor-r4-standing survivor-r4-standing-head"><span>RANK</span><strong>PLAYER</strong><em>STATUS</em><b>CUR</b><b>BEST</b><b>PTS</b><b>LIVES</b><b>MOVE</b></div>',body=rows.map((r,i)=>`<div class="survivor-r4-standing ${r.survivorAlive!==false?"is-alive":"is-out"}"><span>#${i+1}</span><strong>${esc(r.displayName||r.username||r.user||"Player")}</strong><em>${r.survivorWinner?"WINNER":r.survivorAlive!==false?"ALIVE":"OUT"}</em><b>${esc(r.survivorWinStreak||0)}</b><b>${esc(r.survivorBestStreak||r.bestStreak||0)}</b><b>${esc(r.total||0)}</b><b>${esc(r.survivorLivesRemaining||0)}</b><b>${esc(movement(r))}</b></div>`).join("");return `<div class="survivor-r4-standings-scroll"><div class="survivor-r4-standings">${head}${body}</div></div>`;};

  function cstate(){const s=SURVIVOR_RECOVERY_R3_COMPARE_STATE_;if(!s.weekOpen)s.weekOpen={};if(!s.userStatsOpen)s.userStatsOpen={};return s;}
  root.survivorRecoveryR4ToggleWeek_=function(w){const s=cstate(),k=String(w);s.weekOpen[k]=!s.weekOpen[k];survivorRecoveryR3CompareRerender_();};
  root.survivorRecoveryR4ToggleUserStats_=function(u){const s=cstate(),k=String(u||"").toLowerCase();s.userStatsOpen[k]=!s.userStatsOpen[k];survivorRecoveryR3CompareRerender_();};
  function weeks(players,payload){const m={};(players||[]).forEach(p=>(p.weeks||[]).forEach(w=>{const n=Number(w&&w.week||0);if(n>0)m[n]=1;}));const current=Number(payload&&payload.currentRound&&(payload.currentRound.week||payload.currentRound.round)||0);for(let i=1;i<=current;i++)m[i]=1;return Object.keys(m).map(Number).sort((a,b)=>b-a);}
  function wk(p,w){return(p&&p.weeks||[]).find(r=>Number(r&&r.week||0)===Number(w))||null;}
  function primary(r){if(!r)return '<div class="survivor-r4-cm-empty">—</div>';if(r.hidden)return '<div class="survivor-r4-cm-hidden"><span>🔒</span><small>Hidden</small></div>';const logo=r.logoUrl?`<img src="${esc(r.logoUrl)}" alt="">`:`<span class="survivor-r3-cm-abbr">${esc(String(r.teamId||r.team||"—").slice(0,3).toUpperCase())}</span>`,pts=r.weeklyPoints==null?"—":r.weeklyPoints,st=r.streak==null?"—":r.streak;return `<div class="survivor-r4-cm-week-pick">${logo}<strong>${esc(r.team||r.teamId||"No Pick")}</strong><small>${esc(pts)} pts (${esc(st)})</small></div>`;}
  function detail(r){if(!r)return '<div class="survivor-r4-cm-detail-empty">No pick</div>';if(r.hidden)return '<div class="survivor-r4-cm-detail-empty">Pick hidden until reveal rule allows it.</div>';return `<div class="survivor-r4-cm-detail-list"><span><b>Result</b>${esc(r.result||"pending")}</span><span><b>Opponent</b>${esc(r.opponent||"—")}</span><span><b>Score</b>${esc(r.finalScore||"—")}</span><span><b>Weekly</b>${esc(r.weeklyPoints==null?"—":r.weeklyPoints+" pts")}</span><span><b>Streak</b>${esc(r.streak==null?"—":r.streak)}</span><span><b>Lives</b>${esc(r.livesRemaining==null?"—":r.livesRemaining)}</span></div>`;}

  root.survivorRecoveryR3CompareMatrix_=function(payload){payload=payload||{};const players=survivorRecoveryR3ComparePlayers_(payload),names=survivorRecoveryR3CompareInit_(payload),viewer=survivorRecoveryR3Viewer_(payload),active=names.map(n=>players.find(p=>String(p.username||"").toLowerCase()===String(n||"").toLowerCase())).filter(Boolean),available=players.filter(p=>names.indexOf(p.username)===-1),s=cstate(),ws=weeks(active,payload),toolbar=`<div class="survivor-r3-cm-toolbar survivor-r4-cm-toolbar"><span>You + ${Math.max(0,active.length-1)} rival${active.length===2?"":"s"} · ${active.length}/6 columns</span>${active.length<6&&available.length?'<button type="button" onclick="survivorRecoveryR3ToggleAdd_()">+ Add User</button>':""}</div>${s.addOpen?`<div class="survivor-r3-cm-add">${available.map(p=>`<button type="button" onclick="survivorRecoveryR3AddUser_('${js(p.username)}')">${esc(p.displayName||p.username)}</button>`).join("")}</div>`:""}`;
    const header=active.map((p,i)=>{const u=String(p.username||""),k=u.toLowerCase(),you=k===viewer;return `<div class="survivor-r4-cm-head ${you?"is-you survivor-r4-cm-viewer":""}"><div class="survivor-r4-cm-user-top"><strong>${esc(p.displayName||u)}</strong>${you?'<span class="survivor-r3-cm-you">YOU</span>':`<span class="survivor-r3-cm-actions"><button ${i<=1?"disabled":""} onclick="survivorRecoveryR3MoveUser_('${js(u)}',-1)">‹</button><button ${i>=active.length-1?"disabled":""} onclick="survivorRecoveryR3MoveUser_('${js(u)}',1)">›</button><button onclick="survivorRecoveryR3RemoveUser_('${js(u)}')">×</button></span>`}</div><b>${esc(p.totalPoints||0)} <small>pts</small></b><em>${p.alive===false?"ELIMINATED":"ALIVE"}</em><button class="survivor-r4-cm-stats-toggle" onclick="survivorRecoveryR4ToggleUserStats_('${js(u)}')">${s.userStatsOpen[k]?"Hide Stats":"Stats +"}</button></div>`;}).join("");
    const stats=`<div class="survivor-r4-cm-row survivor-r4-cm-season-row"><div class="survivor-r4-cm-label"><strong>SEASON</strong><small>Player stats</small></div>${active.map(p=>{const k=String(p.username||"").toLowerCase(),open=s.userStatsOpen[k]===true,best=p.bestStreak!==undefined?p.bestStreak:p.survivorBestStreak!==undefined?p.survivorBestStreak:"—";return `<div class="survivor-r4-cm-season ${k===viewer?"survivor-r4-cm-viewer":""}">${open?`<span>Rank <b>${esc(p.rank||p.leagueRank||"—")}</b></span><span>Current <b>${esc(p.winStreak||0)}</b></span><span>Longest <b>${esc(best)}</b></span><span>Lives <b>${esc(p.livesRemaining||0)}</b></span><span>Losses <b>${esc(p.lossesUsed||0)}</b></span>`:`<span>${p.alive===false?"OUT":"ALIVE"} · ${esc(p.winStreak||0)} streak</span>`}</div>`;}).join("")}</div>`;
    const rows=ws.map(w=>{const open=s.weekOpen[String(w)]===true,main=active.map(p=>`<div class="survivor-r4-cm-primary ${String(p.username||"").toLowerCase()===viewer?"survivor-r4-cm-viewer":""}">${primary(wk(p,w))}</div>`).join(""),more=open?`<div class="survivor-r4-cm-row survivor-r4-cm-detail-row"><div class="survivor-r4-cm-label"><strong>DETAIL</strong><small>Week ${w}</small></div>${active.map(p=>`<div class="survivor-r4-cm-detail ${String(p.username||"").toLowerCase()===viewer?"survivor-r4-cm-viewer":""}">${detail(wk(p,w))}</div>`).join("")}</div>`:"";return `<div class="survivor-r4-cm-row"><button class="survivor-r4-cm-label survivor-r4-cm-week-label ${open?"is-open":""}" onclick="survivorRecoveryR4ToggleWeek_('${w}')"><span>${open?"▾":"▸"}</span><strong>WEEK ${w}</strong><small>${open?"Hide detail":"Details"}</small></button>${main}</div>${more}`;}).join("");
    return toolbar+`<div class="survivor-r4-cm-scroll"><div class="survivor-r4-cm-matrix" style="--survivor-r4-users:${Math.max(1,active.length)}"><div class="survivor-r4-cm-row survivor-r4-cm-header"><div class="survivor-r4-cm-corner"><span>WEEKS</span><strong>SURVIVOR</strong></div>${header}</div>${stats}${rows||'<div class="survivor-r3-compare-empty">No Survivor weeks available yet.</div>'}</div></div><div class="survivor-r3-cm-privacy">You stay pinned first. Rival picks remain hidden until the existing Survivor reveal rule allows them.</div>`;
  };

  root.renderSurvivorRecoveryR3Competition_=function(payload){payload=payload||{};const tab=SURVIVOR_RECOVERY_R3_COMPARE_STATE_.tab||"standings",lc=payload.leagueContext||{};return `<section class="survivor-r3-competition survivor-r4-competition"><div class="survivor-r3-comp-head"><div><strong>STANDINGS &amp; PLAYER COMPARE</strong><small>Rank, status, streaks, points, lives and weekly Survivor picks</small></div></div><div class="survivor-r3-comp-toolbar"><div class="survivor-r3-tabs"><button class="${tab==="standings"?"active":""}" onclick="survivorRecoveryR3SetTab_('standings')">Standings</button><button class="${tab==="compare"?"active":""}" onclick="survivorRecoveryR3SetTab_('compare')">Compare</button></div><div class="survivor-r3-filters">${(lc.leagues||[]).length>1?`<label>League<select onchange="survivorFinalSwitchLeague_(this.value)">${(lc.leagues||[]).map(l=>`<option value="${esc(l.leagueId)}" ${l.leagueId===lc.leagueId?"selected":""}>${esc(l.leagueName||l.leagueId)}</option>`).join("")}</select></label>`:""}</div></div>${tab==="compare"?survivorRecoveryR3CompareMatrix_(payload):survivorRecoveryR3StandingsRows_(payload)}</section>`;};

  root.PATTC_SURVIVOR_R4_MARKER=MARK;
})(window);

/* =========================================================
   SURVIVOR_FINISH_R1
   Result color belongs on YOUR PICK confirmation, not scoreboard.
   Stats/lives/used-team presentation finalized.
   ========================================================= */
(function(root){
  "use strict";
  const baseSelected=root.survivorRecoveryR3SelectedTeamHtml_;

  root.survivorRecoveryR3SelectedTeamHtml_=function(team){
    let html=baseSelected(team);
    const payload=root.SURVIVOR_PAGE_STATE&&root.SURVIVOR_PAGE_STATE.payload||{};
    const round=payload.currentRound||{};
    const outcome=String(round.outcome||"").toLowerCase();
    const cls=outcome==="win"?"is-result-win":outcome==="loss"?"is-result-loss":"is-result-selected";
    return html.replace("survivor-r4-selected-team\"", "survivor-r4-selected-team "+cls+"\"");
  };

  root.renderSurvivorRecoveryR3Stats_=function(payload){
    payload=payload||{};
    const allowed=Math.max(0,Number(payload.lossesAllowed||payload.settings&&payload.settings.lossesAllowed||0)+Number(payload.earnedLives||0));
    const used=Math.max(0,Number(payload.lossesUsed||payload.strikes||0));
    const remaining=Math.max(0,Number(payload.livesRemaining!==undefined?payload.livesRemaining:allowed-used));
    const circles=allowed?`<div class="survivor-r4-life-row"><span>LIVES</span><div>${Array.from({length:allowed}).map(function(_,i){return `<i class="${i<used?"is-used":""}" title="${i<used?"Life used":"Life remaining"}"></i>`;}).join("")}</div><small>${remaining} remaining</small></div>`:"";
    const rows=(typeof survivorRecoveryR3HistoryRows_==="function"?survivorRecoveryR3HistoryRows_(payload):[]).filter(function(row){return !!(row&&(row.teamId||row.team));}).slice().sort(function(a,b){return Number(a.week||0)-Number(b.week||0);});
    const history=rows.length?`<div class="survivor-r4-used"><div class="survivor-r4-used-head"><span>USED TEAMS</span><small>${rows.length} used</small></div><div class="survivor-r4-used-rail">${rows.map(function(row){
      const cls=typeof survivorRecoveryR2HistoryClass_==="function"?survivorRecoveryR2HistoryClass_(row):"";
      const logo=typeof survivorFinalTrailLogo_==="function"?survivorFinalTrailLogo_(row):"";
      const label=cls==="is-win"||cls==="is-push"?"WIN":cls==="is-loss"?"LOSS":"PENDING";
      return `<article class="survivor-r4-used-team ${cls}"><span>WEEK ${survivorFinalEscape_(row.week||"—")}</span><div>${logo}</div><strong>${label}</strong></article>`;
    }).join("")}</div></div>`:`<div class="survivor-r4-used is-empty"><div class="survivor-r4-used-head"><span>USED TEAMS</span><small>None yet</small></div></div>`;
    return `<section class="survivor-r3-stats survivor-r4-stats">
      <div class="survivor-r4-stats-head"><strong class="${payload.alive===false?"is-out":"is-alive"}">${payload.winner?"WINNER":payload.alive===false?"ELIMINATED":"ALIVE"}</strong>${circles}</div>
      <div class="survivor-r4-stat-grid">
        <div><span>Weeks Survived</span><strong>${survivorFinalEscape_(payload.roundsSurvived||0)}</strong></div>
        <div><span>Current Streak</span><strong>${survivorFinalEscape_(payload.winStreak||0)}</strong></div>
        <div><span>Longest Streak</span><strong>${survivorFinalEscape_(payload.bestStreak||payload.survivorBestStreak||0)}</strong></div>
        <div><span>Points</span><strong>${survivorFinalEscape_(payload.totalPoints||0)}</strong></div>
      </div>
      ${history}
    </section>`;
  };
})(window);
