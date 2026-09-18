/* =========================================================
   PATTC CONFIDENCE RECOVERY R1
   Survivor-family matchup presentation, compact for mobile.
   Loaded after picks.js. Confidence-only presentation layer.
   ========================================================= */
(function(root){
  "use strict";
  const MARK="CONFIDENCE_RECOVERY_R1";
  const STATE=root.CONFIDENCE_R2_STATE||(root.CONFIDENCE_R2_STATE={
    tab:"standings",users:[],addOpen:false,rowOpen:{}
  });

  const TEAM_COLORS={
    "arizona cardinals":["#97233F","#000000"],"ari":["#97233F","#000000"],
    "atlanta falcons":["#A71930","#000000"],"atl":["#A71930","#000000"],
    "baltimore ravens":["#241773","#9E7C0C"],"bal":["#241773","#9E7C0C"],
    "buffalo bills":["#00338D","#C60C30"],"buf":["#00338D","#C60C30"],
    "carolina panthers":["#0085CA","#101820"],"car":["#0085CA","#101820"],
    "chicago bears":["#0B162A","#C83803"],"chi":["#0B162A","#C83803"],
    "cincinnati bengals":["#FB4F14","#000000"],"cin":["#FB4F14","#000000"],
    "cleveland browns":["#311D00","#FF3C00"],"cle":["#311D00","#FF3C00"],
    "dallas cowboys":["#003594","#869397"],"dal":["#003594","#869397"],
    "denver broncos":["#FB4F14","#002244"],"den":["#FB4F14","#002244"],
    "detroit lions":["#0076B6","#B0B7BC"],"det":["#0076B6","#B0B7BC"],
    "green bay packers":["#203731","#FFB612"],"gb":["#203731","#FFB612"],
    "houston texans":["#03202F","#A71930"],"hou":["#03202F","#A71930"],
    "indianapolis colts":["#002C5F","#A2AAAD"],"ind":["#002C5F","#A2AAAD"],
    "jacksonville jaguars":["#006778","#D7A22A"],"jax":["#006778","#D7A22A"],"jac":["#006778","#D7A22A"],
    "kansas city chiefs":["#E31837","#FFB81C"],"kc":["#E31837","#FFB81C"],
    "las vegas raiders":["#000000","#A5ACAF"],"lv":["#000000","#A5ACAF"],
    "los angeles chargers":["#0080C6","#FFC20E"],"lac":["#0080C6","#FFC20E"],
    "los angeles rams":["#003594","#FFA300"],"la":["#003594","#FFA300"],"lar":["#003594","#FFA300"],
    "miami dolphins":["#008E97","#FC4C02"],"mia":["#008E97","#FC4C02"],
    "minnesota vikings":["#4F2683","#FFC62F"],"min":["#4F2683","#FFC62F"],
    "new england patriots":["#002244","#C60C30"],"ne":["#002244","#C60C30"],
    "new orleans saints":["#D3BC8D","#101820"],"no":["#D3BC8D","#101820"],
    "new york giants":["#0B2265","#A71930"],"nyg":["#0B2265","#A71930"],
    "new york jets":["#125740","#000000"],"nyj":["#125740","#000000"],
    "philadelphia eagles":["#004C54","#A5ACAF"],"phi":["#004C54","#A5ACAF"],
    "pittsburgh steelers":["#101820","#FFB612"],"pit":["#101820","#FFB612"],
    "san francisco 49ers":["#AA0000","#B3995D"],"sf":["#AA0000","#B3995D"],
    "seattle seahawks":["#002244","#69BE28"],"sea":["#002244","#69BE28"],
    "tampa bay buccaneers":["#D50A0A","#34302B"],"tb":["#D50A0A","#34302B"],
    "tennessee titans":["#0C2340","#4B92DB"],"ten":["#0C2340","#4B92DB"],
    "washington commanders":["#5A1414","#FFB612"],"was":["#5A1414","#FFB612"],"wsh":["#5A1414","#FFB612"]
  };

  function esc(v){return typeof escapeHtml==="function"?escapeHtml(v):String(v==null?"":v).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c];});}
  function attr(v){return typeof escapeAttr==="function"?escapeAttr(v):esc(v);}
  function js(v){return typeof escapeJs==="function"?escapeJs(v):String(v||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");}
  function norm(v){return typeof normalizeId==="function"?normalizeId(v):String(v||"").trim().toLowerCase();}
  function rgba(hex,a){hex=String(hex||"#1b4d77").replace("#","");return "rgba("+parseInt(hex.slice(0,2),16)+","+parseInt(hex.slice(2,4),16)+","+parseInt(hex.slice(4,6),16)+","+a+")";}
  function teamKey(team){
    const parts=[
      team&&team.abbr,team&&team.teamAbbr,team&&team.abbreviation,team&&team.id,
      team&&team.name,team&&team.shortAnswer
    ].filter(Boolean);
    for(let i=0;i<parts.length;i++){
      const k=String(parts[i]).trim().toLowerCase();
      if(TEAM_COLORS[k])return k;
    }
    return String(team&&team.name||"").trim().toLowerCase();
  }
  function teamStyle(team){
    const c=TEAM_COLORS[teamKey(team)]||["#175b91","#5f788c"];
    return [
      "--confidence-team-primary:"+c[0],
      "--confidence-team-secondary:"+c[1],
      "--confidence-team-primary-a:"+rgba(c[0],.38),
      "--confidence-team-primary-soft:"+rgba(c[0],.22),
      "--confidence-team-secondary-a:"+rgba(c[1],.20)
    ].join(";");
  }
  function kickoff(category){
    const raw=category&& (category.gameDateTime||category.lockDateTime||category.GameDateTime)||"";
    const d=raw?new Date(raw):null;
    if(!d||Number.isNaN(d.getTime()))return "Kickoff TBD";
    try{return d.toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
    catch(e){return d.toLocaleString();}
  }
  function recordFor(category,side){
    return String(side==="home"?category.homeRecord||"":category.awayRecord||"");
  }
  function maxConfidence(){
    try{return Math.max(1,Number(getMaxConfidencePoints())||getCompactConfidenceCategories_().length||1);}
    catch(e){return 1;}
  }

  root.confidenceR2Adjust_=function(categoryId,delta){
    const category=getCompactConfidenceCategories_().find(function(row){return norm(row.id)===norm(categoryId);});
    if(!category||isCompactConfidenceLocked_(category))return;
    const current=Math.max(0,Number(PICKS_PAGE_DATA.confidencePoints[category.id])||0);
    const max=maxConfidence();
    const used=(typeof getUsedConfidencePointsForOtherCategories==="function"?getUsedConfidencePointsForOtherCategories(category.id):[]).map(Number);
    let next=current;
    const dir=Number(delta)>=0?1:-1;
    for(let step=0;step<=max;step++){
      next+=dir;
      if(next<0){next=0;break;}
      if(next>max){next=max;break;}
      if(next===0||used.indexOf(next)===-1)break;
    }
    updateConfidenceForCategory(category.id,next);
  };

  function teamButton(category,nominee,selectedId,locked,result){
    const selected=norm(selectedId)===norm(nominee&&nominee.id);
    const hasPick=!!selectedId;
    const side=confidenceNomineeSide_(category,nominee);
    const score=confidenceScoreValue_(category,side);
    const phase=getConfidenceSportsPhase_(category);
    const actualWinner=!!(result&&result.winnerNomineeId&&norm(result.winnerNomineeId)===norm(nominee&&nominee.id));
    const record=recordFor(category,side);
    const image=confidenceAppearanceResolvedImage_(category,nominee).imageUrl;
    const parts=splitConfidenceTeamName_(nominee&&nominee.name);
    const resultClass=selected&&result&&result.className==="correct"?"is-correct":selected&&result&&result.className==="wrong"?"is-wrong":"";
    return `<button type="button"
      class="confidence-team-choice confidence-r2-team confidence-team-${side||"team"} ${selected?"selected":""} ${hasPick&&!selected?"not-selected":""} ${actualWinner?"actual-winner":""} ${resultClass} ${locked?"is-locked":""}"
      style="${teamStyle(nominee)}"
      onclick="draftConfidenceNominee_('${js(category.id)}','${js(nominee.id)}')"
      aria-pressed="${selected?"true":"false"}"
      ${locked||PICKS_CONFIDENCE_BATCH_SAVING?"disabled":""}>
      ${selected?'<span class="confidence-r2-pick-badge">YOUR PICK</span>':""}
      <span class="confidence-team-visual">${platformImgHtml(image,{className:"confidence-team-logo",variant:"thumb",alt:nominee.name||"Team"})}</span>
      <span class="confidence-r2-team-copy">
        ${parts.city?`<small>${esc(parts.city)}</small>`:""}
        <strong>${esc(parts.nickname||nominee.name||"Team")}</strong>
        ${record?`<span>${esc(record)}</span>`:""}
      </span>
      ${phase!=="pregame"&&score!==""?`<b class="confidence-r2-score">${esc(score)}</b>`:""}
    </button>`;
  }

  function valueControl(category,locked,result){
    const current=Number(PICKS_PAGE_DATA.confidencePoints[category.id])||0;
    const max=maxConfidence();
    const points=confidenceResultPointsLabel_(category,result);
    return `<div class="confidence-r2-value ${locked?"is-locked":""}">
      <span>CONFIDENCE</span>
      <div class="confidence-r2-value-control">
        <button type="button" onclick="confidenceR2Adjust_('${js(category.id)}',-1)" ${locked||current<=0?"disabled":""}>−</button>
        <select id="confidence-${attr(category.id)}" onchange="updateConfidenceForCategory('${js(category.id)}',this.value)" ${locked||PICKS_CONFIDENCE_BATCH_SAVING?"disabled":""}>
          <option value="">—</option>${renderConfidenceOptionsForCategory(category.id,current)}
        </select>
        <button type="button" onclick="confidenceR2Adjust_('${js(category.id)}',1)" ${locked||current>=max?"disabled":""}>+</button>
      </div>
      <small>1–${max}</small>
      ${points?`<strong class="${result.className}">${esc(points)} pts</strong>`:""}
    </div>`;
  }

  function details(category,dirty,locked){
    const odds=PICKS_CONFIDENCE_ODDS_BY_CATEGORY[category.id]||confidenceFallbackOdds_(category);
    const loading=PICKS_CONFIDENCE_ODDS_IN_FLIGHT[category.id]===true;
    const home=category.homeTeam||(confidenceNomineeForSide_(category,"home")||{}).name||"Home";
    const away=category.awayTeam||(confidenceNomineeForSide_(category,"away")||{}).name||"Away";
    const favorite=confidenceFavoriteName_(category,odds);
    const total=odds.totalPoints!==""&&odds.totalPoints!==undefined?odds.totalPoints:"—";
    return `<details class="confidence-game-details confidence-r2-details" ${PICKS_CONFIDENCE_EXPANDED.has(category.id)?"open":""}
      ontoggle="toggleConfidenceDetails_('${js(category.id)}',this.open)">
      <summary><strong>ODDS &amp; MATCHUP DETAILS</strong><span>${dirty?"Saving changes":locked?"Locked":"Tap to expand"}</span></summary>
      <div class="confidence-r2-detail-grid">
        <div><strong>${esc(away)}</strong><span>Record ${esc(category.awayRecord||"—")}</span><span>ML ${esc(confidenceOddsToAmerican_(odds.awayOdds))}</span><span>Spread ${esc(confidenceSpreadLabel_(odds.awaySpread))}</span></div>
        <div class="is-center"><small>FAVORITE</small><strong>${esc(favorite)}</strong><span>O/U ${esc(total)}</span>${loading?"<span>Loading odds…</span>":""}</div>
        <div><strong>${esc(home)}</strong><span>Record ${esc(category.homeRecord||"—")}</span><span>ML ${esc(confidenceOddsToAmerican_(odds.homeOdds))}</span><span>Spread ${esc(confidenceSpreadLabel_(odds.homeSpread))}</span></div>
      </div>
    </details>`;
  }

  root.renderCompactConfidenceRow_=function(category){
    const nominees=Array.isArray(category.nominees)?category.nominees:[];
    if(nominees.length!==2)return renderCategoryCard(category,false);
    const selected=PICKS_PAGE_DATA.picks[category.id]||"";
    const locked=isCompactConfidenceLocked_(category);
    const result=getConfidenceLiveResult_(category,selected);
    const dirty=confidenceCategoryIsDirty_(category.id);
    const phase=getConfidenceSportsPhase_(category);
    return `<article class="confidence-game-row confidence-r2-row phase-${phase} ${result.className||"pending"} ${locked?"is-locked":""}" data-category-id="${attr(category.id)}">
      <div class="confidence-r2-meta confidence-matchup-state"><span>${esc(kickoff(category))}</span><strong>${esc(formatConfidenceSportsStatus_(category))}</strong></div>
      <div class="confidence-r2-main">
        ${teamButton(category,nominees[0],selected,locked,result)}
        ${teamButton(category,nominees[1],selected,locked,result)}
        ${valueControl(category,locked,result)}
      </div>
      ${details(category,dirty,locked)}
    </article>`;
  };

  root.renderSportsDefaultConfidenceActionHeader_=function(){
    const categories=getCompactConfidenceCategories_();
    const picked=categories.filter(function(c){return !!PICKS_PAGE_DATA.picks[c.id];}).length;
    const values=categories.filter(function(c){return Number(PICKS_PAGE_DATA.confidencePoints[c.id])>0;}).length;
    const open=categories.filter(function(c){return !isCompactConfidenceLocked_(c);}).length;
    return `<section class="confidence-r2-action">
      <div><span>${esc(sportsDefaultConfidenceWeekLabel_())}</span><strong>MAKE YOUR PICKS</strong><small>Pick the winner · assign confidence</small></div>
      <em class="${open?"is-open":"is-locked"}">${open?"OPEN":"LOCKED"}</em>
      <p>${picked}/${categories.length} winners · ${values}/${categories.length} confidence values</p>
    </section>`;
  };

  function currentStats(){
    const categories=getCompactConfidenceCategories_();
    let correct=0,wrong=0,finals=0,points=0;
    categories.forEach(function(c){
      const pick=PICKS_PAGE_DATA.picks[c.id]||"";
      const result=getConfidenceLiveResult_(c,pick);
      if(result.className==="correct"||result.className==="wrong")finals++;
      if(result.className==="correct"){
        correct++;
        points+=Number(PICKS_PAGE_DATA.confidencePoints[c.id])||1;
      }else if(result.className==="wrong"){
        wrong++;
        if(String(PICKS_PAGE_DATA.confidenceScoringMode||"").toLowerCase()==="risk_penalty")points-=Number(PICKS_PAGE_DATA.confidencePoints[c.id])||0;
      }
    });
    return {games:categories.length,picked:categories.filter(function(c){return !!PICKS_PAGE_DATA.picks[c.id];}).length,correct:correct,wrong:wrong,finals:finals,points:points};
  }

  function statsHtml(){
    const s=currentStats(),used=getUsedConfidencePoints().map(Number),max=maxConfidence();
    const pool=Array.from({length:max},function(_,i){const n=i+1;return `<i class="${used.indexOf(n)!==-1?"is-used":""}">${n}</i>`;}).join("");
    return `<section class="confidence-r2-stats">
      <div class="confidence-r2-section-head"><div><strong>STATS</strong><small>Current confidence card</small></div><em>${s.picked===s.games&&s.games?"COMPLETE":"IN PROGRESS"}</em></div>
      <div class="confidence-r2-stat-grid">
        <div><span>Picks</span><strong>${s.picked}/${s.games}</strong></div>
        <div><span>Correct</span><strong>${s.correct}</strong></div>
        <div><span>Final</span><strong>${s.finals}</strong></div>
        <div><span>Points</span><strong>${s.points}</strong></div>
      </div>
      <div class="confidence-r2-pool"><span>CONFIDENCE USED</span><div>${pool}</div></div>
    </section>`;
  }

  function players(){
    return RC24K_CONFIDENCE_COMPARE_DATA_&&Array.isArray(RC24K_CONFIDENCE_COMPARE_DATA_.players)?RC24K_CONFIDENCE_COMPARE_DATA_.players:[];
  }
  function pinUsers(list){
    const all=players(),valid={};
    all.forEach(function(p){valid[norm(p.username)]=p.username;});
    let out=(list||[]).filter(function(u){return !!valid[norm(u)];});
    const me=all.find(function(p){return p.isCurrent;});
    if(me)out=[me.username].concat(out.filter(function(u){return norm(u)!==norm(me.username);}));
    if(!out.length&&all.length)out.push(all[0].username);
    all.forEach(function(p){if(out.length<Math.min(3,all.length)&&out.indexOf(p.username)===-1)out.push(p.username);});
    return out.slice(0,6);
  }
  function initUsers(){STATE.users=pinUsers(STATE.users);return STATE.users;}
  root.confidenceR2SetTab_=function(v){STATE.tab=v==="compare"?"compare":"standings";refreshPicksPage();};
  root.confidenceR2ToggleAdd_=function(){STATE.addOpen=!STATE.addOpen;refreshPicksPage();};
  root.confidenceR2AddUser_=function(u){if(STATE.users.length<6&&STATE.users.indexOf(u)===-1)STATE.users.push(u);STATE.addOpen=false;STATE.users=pinUsers(STATE.users);refreshPicksPage();};
  root.confidenceR2RemoveUser_=function(u){const me=players().find(function(p){return p.isCurrent;});if(me&&norm(me.username)===norm(u))return;STATE.users=STATE.users.filter(function(x){return norm(x)!==norm(u);});refreshPicksPage();};
  root.confidenceR2ToggleRow_=function(id){STATE.rowOpen[id]=!STATE.rowOpen[id];refreshPicksPage();};

  function playerPickCount(p){return Object.keys(p&&p.picks||{}).filter(function(k){const x=p.picks[k];return x&&x.hidden!==true&&x.nomineeId;}).length;}
  function playerCorrect(p){return Object.keys(p&&p.picks||{}).filter(function(k){return String(p.picks[k]&&p.picks[k].status||"").toLowerCase()==="correct";}).length;}
  function playerConfidence(p){return Object.keys(p&&p.picks||{}).reduce(function(sum,k){const x=p.picks[k]||{};return sum+(x.hidden?0:Number(x.confidencePoints)||0);},0);}
  function standings(){
    const rows=players().slice().sort(function(a,b){return Number(b.total||0)-Number(a.total||0);});
    if(!rows.length)return '<div class="confidence-r2-empty">Standings will appear when player comparison data is available.</div>';
    return `<div class="confidence-r2-standing-scroll"><div class="confidence-r2-standing-table">
      <div class="confidence-r2-standing is-head"><span>RANK</span><strong>PLAYER</strong><b>PTS</b><b>COR</b><b>PICKS</b><b>CONF</b></div>
      ${rows.map(function(p,i){return `<div class="confidence-r2-standing ${p.isCurrent?"is-you":""}"><span>#${i+1}</span><strong>${esc(p.displayName||p.username)}</strong><b>${Number(p.total||0)}</b><b>${playerCorrect(p)}</b><b>${playerPickCount(p)}</b><b>${playerConfidence(p)}</b></div>`;}).join("")}
    </div></div>`;
  }

  function compareCell(player,category){
    const pick=player&&player.picks?player.picks[norm(category.id)]||player.picks[category.id]:null;
    if(!pick||pick.hidden===true)return '<div class="confidence-r2-cm-hidden">🔒<small>Hidden</small></div>';
    if(!pick.nomineeId)return '<div class="confidence-r2-cm-empty">—</div>';
    const nominee=(category.nominees||[]).find(function(n){return norm(n.id)===norm(pick.nomineeId);})||{};
    const img=nominee.image||nominee.imageUrl||nominee.logoUrl||confidenceAppearanceResolvedImage_(category,nominee).imageUrl||"";
    return `<div class="confidence-r2-cm-pick">${img?platformImgHtml(img,{className:"confidence-r2-cm-logo",variant:"thumb",alt:nominee.name||"Team"}):""}<strong>${esc(nominee.name||pick.nomineeId)}</strong><small>${Number(pick.confidencePoints)||0} conf</small></div>`;
  }

  function compare(){
    const all=players(),names=initUsers(),active=names.map(function(u){return all.find(function(p){return norm(p.username)===norm(u);});}).filter(Boolean);
    if(!all.length)return '<div class="confidence-r2-empty">Compare is loading…</div>';
    const available=all.filter(function(p){return names.indexOf(p.username)===-1;});
    const categories=getCompactConfidenceDisplayCategories_();
    const viewer=active.find(function(p){return p.isCurrent;});
    const viewerKey=viewer?norm(viewer.username):"";
    const toolbar=`<div class="confidence-r2-cm-toolbar"><span>You + ${Math.max(0,active.length-1)} · ${active.length}/6</span>${active.length<6&&available.length?'<button type="button" onclick="confidenceR2ToggleAdd_()">+ Add User</button>':""}</div>${STATE.addOpen?`<div class="confidence-r2-cm-add">${available.map(function(p){return `<button type="button" onclick="confidenceR2AddUser_('${js(p.username)}')">${esc(p.displayName||p.username)}</button>`;}).join("")}</div>`:""}`;
    const heads=active.map(function(p){const you=norm(p.username)===viewerKey;return `<div class="confidence-r2-cm-head ${you?"is-you":""}"><strong>${esc(p.displayName||p.username)}</strong>${you?'<span>YOU</span>':`<button onclick="confidenceR2RemoveUser_('${js(p.username)}')">×</button>`}<b>${Number(p.total||0)} pts</b></div>`;}).join("");
    const rows=categories.map(function(c,index){
      const open=STATE.rowOpen[c.id]===true;
      const label=`<button class="confidence-r2-cm-label ${open?"is-open":""}" onclick="confidenceR2ToggleRow_('${js(c.id)}')"><span>${open?"▾":"▸"}</span><strong>GAME ${index+1}</strong><small>${esc(formatConfidenceSportsStatus_(c))}</small></button>`;
      const main=active.map(function(p){return `<div class="confidence-r2-cm-cell ${norm(p.username)===viewerKey?"is-you":""}">${compareCell(p,c)}</div>`;}).join("");
      const detail=open?`<div class="confidence-r2-cm-row confidence-r2-cm-detail-row"><div class="confidence-r2-cm-label"><strong>DETAIL</strong><small>${esc(getCategoryDisplayTitle(c))}</small></div>${active.map(function(p){const pick=p&&p.picks?p.picks[norm(c.id)]||p.picks[c.id]:null;return `<div class="confidence-r2-cm-detail ${norm(p.username)===viewerKey?"is-you":""}">${!pick||pick.hidden?'<span>Hidden until kickoff</span>':`<span>Confidence <b>${Number(pick.confidencePoints)||0}</b></span><span>Status <b>${esc(pick.status||"pending")}</b></span>`}</div>`;}).join("")}</div>`:"";
      return `<div class="confidence-r2-cm-row">${label}${main}</div>${detail}`;
    }).join("");
    return toolbar+`<div class="confidence-r2-cm-scroll"><div class="confidence-r2-cm-matrix" style="--confidence-r2-users:${Math.max(1,active.length)}"><div class="confidence-r2-cm-row confidence-r2-cm-header"><div class="confidence-r2-cm-corner"><span>GAMES</span><strong>CONFIDENCE</strong></div>${heads}</div>${rows}</div></div><div class="confidence-r2-privacy">You stay pinned first. Rival picks remain hidden until the existing reveal rule allows them.</div>`;
  }

  function competition(){
    return `<section class="confidence-r2-competition">
      <div class="confidence-r2-section-head"><div><strong>STANDINGS &amp; PLAYER COMPARE</strong><small>Same PATTC compare pattern · Confidence data</small></div></div>
      <div class="confidence-r2-tabs"><button class="${STATE.tab==="standings"?"active":""}" onclick="confidenceR2SetTab_('standings')">Standings</button><button class="${STATE.tab==="compare"?"active":""}" onclick="confidenceR2SetTab_('compare')">Compare</button></div>
      ${STATE.tab==="compare"?compare():standings()}
    </section>`;
  }

  function rules(){
    const game=PICKS_PAGE_DATA.game||{};
    const custom=String(game.rulesText||game.rules||game.instructions||game.description||"").trim();
    const mode=String(PICKS_PAGE_DATA.confidenceScoringMode||"win_only").toLowerCase();
    return `<section class="confidence-r2-help">
      <details><summary><strong>RULES</strong><span>Tap to expand</span></summary><div>${custom?`<p>${esc(custom)}</p>`:""}<p>Pick one winner in each matchup. Assign each available confidence value only once.</p><p>${mode==="risk_penalty"?"Incorrect confidence picks can subtract the assigned value.":"Correct picks earn the assigned confidence value; incorrect picks earn 0."}</p><p>Matchups lock according to the configured game kickoff/lock rule.</p></div></details>
      <details><summary><strong>HOW TO PLAY</strong><span>Tap to expand</span></summary><div><p>1. Tap the team you think will win.</p><p>2. Set the confidence value in the control on the right.</p><p>3. Higher numbers mean more confidence in that pick.</p><p>4. Open Odds &amp; Matchup Details when you want records, lines and favorite information.</p></div></details>
    </section>`;
  }

  root.renderConfidenceSummaryBar=function(){return "";};

  root.renderCompactConfidenceSlate_=function(){
    const categories=getCompactConfidenceDisplayCategories_();
    return `<div class="sports-default-confidence-board confidence-r2">
      ${renderSportsDefaultConfidenceActionHeader_()}
      <div class="confidence-r2-slate">${categories.map(renderCompactConfidenceRow_).join("")}</div>
      ${confidenceAutosaveActionsHtml_()}
      ${statsHtml()}
      ${competition()}
      ${rules()}
    </div>`;
  };

  root.PATTC_CONFIDENCE_R2_MARKER=MARK;
})(window);
