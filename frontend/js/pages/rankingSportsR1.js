/* PATTC NFL SPORTS PACK R1 — Sports Ranking Presentation */
(function(root){
  "use strict";

  const BASE_RENDER = root.renderRankingPage;
  const BASE_MOVE = root.rankingMove_;
  if (typeof BASE_RENDER !== "function" || typeof BASE_MOVE !== "function") return;

  const COLORS={ari:["#97233F","#000000"],atl:["#A71930","#000000"],bal:["#241773","#9E7C0C"],buf:["#00338D","#C60C30"],car:["#0085CA","#101820"],chi:["#0B162A","#C83803"],cin:["#FB4F14","#000000"],cle:["#311D00","#FF3C00"],dal:["#003594","#869397"],den:["#FB4F14","#002244"],det:["#0076B6","#B0B7BC"],gb:["#203731","#FFB612"],hou:["#03202F","#A71930"],ind:["#002C5F","#A2AAAD"],jax:["#006778","#D7A22A"],kc:["#E31837","#FFB81C"],lv:["#000000","#A5ACAF"],lac:["#0080C6","#FFC20E"],la:["#003594","#FFA300"],mia:["#008E97","#FC4C02"],min:["#4F2683","#FFC62F"],ne:["#002244","#C60C30"],no:["#D3BC8D","#101820"],nyg:["#0B2265","#A71930"],nyj:["#125740","#000000"],phi:["#004C54","#A5ACAF"],pit:["#101820","#FFB612"],sf:["#AA0000","#B3995D"],sea:["#002244","#69BE28"],tb:["#D50A0A","#34302B"],ten:["#0C2340","#4B92DB"],was:["#5A1414","#FFB612"]};
  const DIVISIONS=["East","North","South","West"];
  let POINTER_DRAG=null;
  let HTML_DRAG=null;
  root.NFL_RANKING_WARNING_MODE_R3_={};

  function esc(v){return typeof rankingPageEscape_==="function"?rankingPageEscape_(v):String(v||"");}
  function key(v){return String(v||"").trim().toLowerCase();}
  function js(v){return String(v||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");}
  function rgba(hex,a){hex=String(hex||"#22577a").replace("#","");return "rgba("+parseInt(hex.slice(0,2),16)+","+parseInt(hex.slice(2,4),16)+","+parseInt(hex.slice(4,6),16)+","+a+")";}
  function style(team){const c=COLORS[key(team&&team.id)]||["#155c8c","#697c88"];return "--nfl-rank-primary:"+c[0]+";--nfl-rank-secondary:"+c[1]+";--nfl-rank-primary-a:"+rgba(c[0],.28)+";--nfl-rank-secondary-a:"+rgba(c[1],.18)+";";}
  function isNfl(gameId,payload){return /^nfl-/.test(key(gameId))||/\bnfl\b/i.test(String(payload&&payload.gameName||""));}
  function isPlayoffRaceGame(gameId){return /^nfl-playoff-race-\d{4}$/.test(key(gameId));}
  function isPlayoffCategory(value){return /playoff-seeds/.test(key(value&&value.id!==undefined?value.id:value));}
  function teamLabel(team){return String(team&&team.person||"").trim();}
  function teamDivision(team){const parts=teamLabel(team).split(/\s+/);const last=parts.length?parts[parts.length-1]:"";return DIVISIONS.indexOf(last)!==-1?last:"";}
  function teamConference(team){const parts=teamLabel(team).split(/\s+/);return parts.length&&/^(AFC|NFC)$/i.test(parts[0])?parts[0].toUpperCase():"";}
  function rowFor(categoryId,nomineeId){const list=document.getElementById("rankingList_"+categoryId);if(!list)return null;return Array.from(list.querySelectorAll(".ranking-entry")).find(function(row){return String(row.dataset.nomineeId||"")===String(nomineeId||"");})||null;}
  function hint(category){const id=key(category&&category.id);if(id.indexOf("playoff-seeds")!==-1)return "Positions 1–7 are your playoff seeds. Rank all 16 so ties and near-misses can score accurately.";if(id.indexOf("bottom-dwellers")!==-1)return "Rank WORST to BEST. #1 is the team you expect to finish at the bottom of the NFL.";return "Rank strongest final regular-season finish to weakest.";}
  function positionOptions(count,selected){let out="";for(let i=1;i<=count;i++)out+='<option value="'+i+'"'+(i===selected?" selected":"")+">"+i+"</option>";return out;}
function ordinal(n){n=Number(n)||0;const m100=n%100;if(m100>=11&&m100<=13)return n+"th";const m10=n%10;return n+(m10===1?"st":m10===2?"nd":m10===3?"rd":"th");}
  function liveMap(category){const out={};const rows=category&&category.liveStandings&&Array.isArray(category.liveStandings.rows)?category.liveStandings.rows:[];rows.forEach(function(row){out[key(row.nomineeId)]=row;});return out;}
  function liveMove(row){if(!row||!row.currentRank)return "";const move=Number(row.movement)||0;return ordinal(row.currentRank)+(move>0?" ↑"+move:move<0?" ↓"+Math.abs(move):" —");}
  function compactMovement(row){const move=Number(row&&row.movement)||0;return move>0?" ↑"+move:move<0?" ↓"+Math.abs(move):"";}
  function pointsText(row){
    if(!row)return "0 pts";
    const points=Number(row.points),bonus=Number(row.playoffBonus)||0;
    const base=Number.isFinite(points)?points:0;
    return base+" pts"+(bonus>0?" (+"+bonus+" bonus)":"");
  }
  function liveSummary(row){
    if(!row||!row.currentRank)return "";
    return '<div class="nfl-ranking-live"><strong>'+esc(pointsText(row))+'</strong></div>';
  }

  function controls(category,team,index,count,locked,teamPctLabel,pointsLabel){
    if(locked)return '<div class="nfl-ranking-control-group"><div class="nfl-ranking-value-stack">'+(teamPctLabel||"")+(pointsLabel||"")+'</div></div>';
    const cid=js(category.id),tid=js(team.id);
    return '<div class="nfl-ranking-control-group"><div class="nfl-ranking-value-stack">'+(teamPctLabel||"")+(pointsLabel||"")+'</div><div class="ranking-move-buttons nfl-ranking-move">'+
      '<button type="button" aria-label="Move up" title="Move up" onclick="rankingMove_(\''+cid+'\',\''+tid+'\',-1)">↑</button>'+
      '<select class="nfl-ranking-position-select" aria-label="Move directly to position" title="Move directly to position" onchange="nflRankingMoveTo_(\''+cid+'\',\''+tid+'\',this.value)">'+positionOptions(count,index+1)+'</select>'+
      '<button type="button" aria-label="Move down" title="Move down" onclick="rankingMove_(\''+cid+'\',\''+tid+'\',1)">↓</button>'+
      '<button type="button" class="nfl-ranking-drag" aria-label="Drag to reorder" title="Drag to reorder" onpointerdown="nflRankingPointerDown_(event,\''+cid+'\',\''+tid+'\')" onpointermove="nflRankingPointerMove_(event)" onpointerup="nflRankingPointerEnd_(event)" onpointercancel="nflRankingPointerEnd_(event)" onlostpointercapture="nflRankingPointerEnd_(event)">☰</button>'+
    '</div></div>';
  }

  function divisionWarning(categoryId){
    return '<div id="nflDivisionWarning_'+esc(categoryId)+'" class="nfl-ranking-division-warning" hidden>'+
      '<strong>PLAYOFF FIELD CHECK</strong>'+
      '<span id="nflDivisionWarningText_'+esc(categoryId)+'"></span>'+
      '<div><button type="button" onclick="nflRankingDismissWarning_(\''+js(categoryId)+'\')">FIX PICKS</button>'+
      '<button type="button" class="save-anyway" onclick="nflRankingSaveCategory_(\''+js(categoryId)+'\',true,NFL_RANKING_WARNING_MODE_R3_[\''+js(categoryId)+'\']||\'draft\')">CONTINUE ANYWAY</button></div>'+
    '</div>';
  }

function card(category){
    const savedDraft=Array.isArray(category.draftRankings)&&category.draftRankings.length===category.nominees.length
      ?category.draftRankings:[];
    const ordered=rankingPageCategoryOrder_(savedDraft.length?Object.assign({},category,{ballot:savedDraft}):category);
    const locked=category.locked===true;
    const playoff=isPlayoffCategory(category);
    const race=isPlayoffRaceGame(String(RANKING_PAGE_STATE.gameId||""));
    const previous=category.activeSnapshot||null;
    const priorRanks={};
    (previous&&previous.rankings||[]).forEach(function(row){priorRanks[key(row.nomineeId)]=Number(row.rank)||0;});
    const priorPct=previous&&previous.teamMultipliers||{};
    const roundPct=Number(category.finalizeMultiplier===undefined?RANKING_PAGE_STATE.payload&&RANKING_PAGE_STATE.payload.nflPlayoffRace&&RANKING_PAGE_STATE.payload.nflPlayoffRace.saveMultiplier:category.finalizeMultiplier)||1;
    const liveRows=liveMap(category);
    const live=category.liveStandings||null;
    let scoreText;
    if(category.resolved){
      scoreText=esc(category.earnedPoints)+" / "+esc(category.points)+" pts";
      if(category.baseEarnedPoints!==undefined&&Number(category.forecastMultiplier)!==1)scoreText+=" · team-specific scoring applied";
      else scoreText+=" · "+esc(category.accuracyPercent)+"% position accuracy";
    }else{
      scoreText=(category.ballot&&category.ballot.length?"Saved ranking · ":"")+esc(category.points)+" pts available";
    }
    let rows="";
    ordered.forEach(function(team,index){
      const playoffZone=playoff&&index<7;
      const image=team.image?'<img src="'+esc(team.image)+'" alt="" loading="lazy">':'<span>★</span>';
      const label=teamLabel(team)||String(team.shortAnswer||team.id||"");
      const div=teamDivision(team);
      const liveRow=liveRows[key(team.id)]||null;
      const conference=(liveRow&&liveRow.conference)||teamConference(team);
      const divRank=Number(liveRow&&liveRow.divisionRank)||0;
      const statusLine=liveRow&&liveRow.currentRank
        ?conference+" #"+liveRow.currentRank+compactMovement(liveRow)+" | "+(div||liveRow.division||"")+" #"+divRank+" | ("+(liveRow.record||"0-0-0")+")"
        :(conference&&div?conference+" | "+div:(label||""));
      const subtitle=statusLine;
      const priorValue=Object.prototype.hasOwnProperty.call(priorPct,key(team.id))?Number(priorPct[key(team.id)]):previous?Number(previous.multiplier)||1:roundPct;
      const adjusted=!!previous&&priorRanks[key(team.id)]!==index+1;
      const teamValue=adjusted?Math.min(priorValue,roundPct):priorValue;
      const teamPctLabel=race?'<span class="nfl-forecast-team-value" data-team-pct="'+esc(team.id)+'">'+esc(Math.round(teamValue*100))+'%</span>':'';
      const pointsLabel=race?'<small class="nfl-ranking-row-points">'+esc(pointsText(liveRow))+'</small>':"";
      const liveInline="";
      rows+='<div class="ranking-entry nfl-ranking-entry '+(playoffZone?"is-playoff ":"")+(race?"is-playoff-race-row ":"")+'" style="'+style(team)+'" data-nominee-id="'+esc(team.id)+'" data-nfl-label="'+esc(label)+'" data-nfl-status="'+esc(statusLine)+'" data-nfl-division="'+esc(div)+'" ondragover="nflRankingDragOver_(event)" ondrop="nflRankingDrop_(event,\''+js(category.id)+'\',\''+js(team.id)+'\')">'+
        '<div class="ranking-position nfl-ranking-position">#<span>'+(index+1)+'</span></div>'+
        '<div class="ranking-entry-media nfl-ranking-logo">'+image+'</div>'+
        '<div class="ranking-entry-name nfl-ranking-name"><strong>'+esc(team.name||team.shortAnswer||team.id)+'</strong><small>'+esc(subtitle)+'</small>'+(!locked?liveInline:"")+'</div>'+
        (locked?'<div class="nfl-ranking-control-group"><div class="nfl-ranking-value-stack">'+teamPctLabel+pointsLabel+'</div>'+liveSummary(liveRow)+'</div>':controls(category,team,index,ordered.length,locked,teamPctLabel,pointsLabel))+
      '</div>';
    });
    const liveTotal=live&&live.rows&&live.rows.length
      ?'<div class="nfl-ranking-live-total"><span>IF THE SEASON ENDED TODAY · WEEK '+esc(live.week)+'</span><strong>'+esc(live.totalPoints)+' / '+esc(live.maxPoints)+' PTS</strong><small>'+esc(live.correctPlayoffTeams)+' of 7 playoff teams correct'+(live.perfectFieldBonus?" · +"+esc(live.perfectFieldBonus)+" PERFECT 7 BONUS":"")+(live.provisionalTiebreakers?" · tied records use provisional order until official NFL tiebreak data is available":"")+'</small></div>'
      :"";
    const save=!locked?(race
      ?'<div class="ranking-save-row nfl-ranking-save"><button class="button secondary" type="button" onclick="nflRankingSaveCategory_(\''+js(category.id)+'\',false,\'draft\')">SAVE PICKS (DRAFT)</button><button class="button ranking-save-button" type="button" onclick="nflRankingSaveCategory_(\''+js(category.id)+'\',false,\'finalize\')">FINALIZE PICKS</button><span id="rankingMessage_'+esc(category.id)+'" class="ranking-message">'+(savedDraft.length?'Draft restored — not finalized':'')+'</span></div>'
      :'<div class="ranking-save-row nfl-ranking-save"><button class="button ranking-save-button" type="button" onclick="nflRankingSaveCategory_(\''+js(category.id)+'\',false)">SAVE RANKING</button><span id="rankingMessage_'+esc(category.id)+'" class="ranking-message"></span></div>'):"";
    const lockWhy=locked&&category.lockReason?'<div class="nfl-ranking-lock-reason">🔒 '+esc(category.lockReason)+'</div>':'';
    return '<section class="nfl-ranking-card" data-ranking-category="'+esc(category.id)+'">'+
      '<div class="nfl-ranking-card-head"><div><span>'+esc(category.section||"NFL")+'</span><strong>'+esc(category.name)+'</strong><small>'+esc(hint(category))+'</small><em>'+scoreText+'</em></div><b class="'+(category.resolved?"is-final":locked?"is-locked":"is-open")+'">'+(category.resolved?"FINAL":locked?"LOCKED":"OPEN")+'</b></div>'+
      (playoff?'<div class="nfl-ranking-zone-key"><span>1–7 PLAYOFF SEEDS</span><span>8–16 OUTSIDE FIELD</span></div>':"")+
      liveTotal+
      lockWhy+'<div class="ranking-order-list nfl-ranking-list" id="rankingList_'+esc(category.id)+'">'+rows+'</div>'+
      (playoff?divisionWarning(category.id):"")+save+rankingPageOfficialOrder_(category)+
    '</section>';
  }

  function raceStatus(payload){
    const race=payload&&payload.nflPlayoffRace;
    if(!race)return "";
    const currentPct=Math.round(Number(race.currentMultiplier||1)*100);
    const activeTeamValues=[];
    (payload.categories||[]).forEach(function(category){
      const values=category&&category.activeSnapshot&&category.activeSnapshot.teamMultipliers;
      if(values&&typeof values==="object")Object.keys(values).forEach(function(team){
        const pct=Number(values[team]);if(Number.isFinite(pct))activeTeamValues.push(Math.round(pct*100));
      });
    });
    const currentLabel=new Set(activeTeamValues).size>1?"TEAM-SPECIFIC":activeTeamValues.length?activeTeamValues[0]+"%":currentPct+"%";
    const savePct=Math.round(Number(race.saveMultiplier===undefined?race.currentMultiplier:race.saveMultiplier)*100);
    const open=!!(race.currentWindow&&race.currentWindow.week);
    const status=race.setupMode?"SETUP / ORIGINAL FORECAST":race.canEnter?"ORIGINAL PREDICTION OPEN":open?"UPDATE WINDOW OPEN":"FORECAST LOCKED";
    const next=race.nextWindow;
    let timingText=race.lockReason||"Original Prediction is preserved.";
    if(race.setupMode)timingText="Setup / Original Forecast mode — all forecast values stay at 100% until the PATTC game is live.";
    if(open&&race.currentWindow.manual){
      timingText="Admin manual update window is open for Week "+race.currentWindow.week+" at "+savePct+"%.";
    }else if(open&&race.currentWindow.closesAt){
      timingText="Week "+race.currentWindow.week+" adjustment is open at "+Math.round(Number(race.currentWindow.multiplier)*100)+"% and closes at the first Week "+race.currentWindow.week+" kickoff.";
    }else if(next){
      timingText+=" Next adjustment: Week "+next.week+" at "+Math.round(Number(next.multiplier||0)*100)+"%. Opens after Week "+(next.week-1)+" is final and closes at the first Week "+next.week+" kickoff.";
    }
    return '<section class="nfl-race-window '+(race.canEdit?"is-open":"is-locked")+'">'+
      '<div><span>CURRENT NFL WEEK</span><strong>'+esc(race.currentWeek||1)+'</strong></div>'+
      '<div><span>CURRENT FORECAST</span><strong>'+esc(currentLabel)+'</strong></div>'+
      '<div><span>NEXT ADJUSTMENT</span><strong>'+(open?"Week "+esc(race.currentWindow.week)+" · "+esc(Math.round(Number(race.currentWindow.multiplier)*100))+"%":next?"Week "+esc(next.week)+" · "+esc(Math.round(Number(next.multiplier||0)*100))+"%":"FINAL LOCK")+'</strong></div>'+
      '<div><span>STATUS</span><strong>'+esc(status)+'</strong></div>'+
      '<p>'+esc(timingText)+'</p>'+
    '</section>';
  }

  function placeLabel(rank,total){return rank?ordinal(rank)+(total?"/"+total:""):"—";}
  function scoreDeltaLabel(delta){delta=Number(delta)||0;return delta>0?"▲"+delta:delta<0?"▼"+Math.abs(delta):"—";}
  function gameDetail(stage){
    const rows=stage&&Array.isArray(stage.detail)?stage.detail:[];
    if(!rows.length)return "";
    return '<div class="nfl-race-quarter-detail">'+rows.map(function(row){
      return '<span><b>Q'+esc(row.quarterNumber)+' · W'+esc(row.nflWeek)+'</b><em>'+esc(row.raceScore)+' pts'+(row.scoreDelta?' · '+esc(scoreDeltaLabel(row.scoreDelta)):'')+'</em><strong>'+esc(row.wins+'-'+row.losses+'-'+row.ties)+'</strong></span>';
    }).join("")+'</div>';
  }
  function scoreSummary(payload){
    const race=payload&&payload.nflPlayoffRace||{},comp=race.competition||{},stages=Array.isArray(comp.stages)?comp.stages:[];
    const gameLabel=comp.phase==="final-preview"?"FINAL PREVIEW":"GAME "+(comp.gameNumber||1)+" · Q"+(comp.quarterNumber||1)+" · W"+(comp.nflWeek||1);
    const headline='<div class="nfl-race-competition-head"><b>'+esc(gameLabel)+'</b><strong>'+esc(comp.raceScore||0)+' pts <em>'+esc(scoreDeltaLabel(comp.scoreDelta))+'</em></strong><span>'+esc(placeLabel(comp.weeklyPlacement,comp.weeklyFieldSize))+' · '+esc(comp.weeklyRecord||"0-0-0")+'</span><small>GAME '+esc(comp.gameRecord||"0-0-0")+' · SEASON '+esc(comp.seasonRecord||"0-0-0")+'</small></div>';
    const strip='<div class="nfl-race-stage-strip">'+stages.map(function(stage){
      if(stage.kind==="final")return '<span class="nfl-race-stage"><b>FINAL</b><em>PLAYOFFS</em><strong>5TH EVENT</strong></span>';
      const label='G'+stage.gameNumber+' '+stage.status;
      return '<details class="nfl-race-stage '+(stage.status==="FINAL"?"is-earned":"")+'"><summary><b>'+esc(label)+'</b><em>'+esc(stage.record||"0-0-0")+'</em><strong>'+(stage.placement?esc(ordinal(stage.placement)):"UPCOMING")+'</strong></summary>'+gameDetail(stage)+'</details>';
    }).join("")+'</div>';
    return '<section class="nfl-race-season-strip">'+headline+strip+'</section>';
  }

  function currentRankings(categoryId){
    const list=document.getElementById("rankingList_"+categoryId);
    if(!list)return [];
    return Array.from(list.querySelectorAll(".ranking-entry")).map(function(row,index){return {nomineeId:row.dataset.nomineeId||"",rank:index+1};});
  }

  function missingDivisions(categoryId){
    if(!isPlayoffCategory(categoryId))return [];
    const list=document.getElementById("rankingList_"+categoryId);
    if(!list)return [];
    const have={};
    Array.from(list.querySelectorAll(".ranking-entry")).slice(0,7).forEach(function(row){
      const d=String(row.dataset.nflDivision||"");
      if(d)have[d]=true;
    });
    return DIVISIONS.filter(function(d){return !have[d];});
  }

  root.nflRankingSync_=function(categoryId){
    const list=document.getElementById("rankingList_"+categoryId);
    if(!list)return;
    const playoff=isPlayoffCategory(categoryId);
    const rows=Array.from(list.querySelectorAll(".ranking-entry"));
    rows.forEach(function(row,index){
      const span=row.querySelector(".ranking-position span");
      if(span)span.textContent=String(index+1);
      const select=row.querySelector(".nfl-ranking-position-select");
      if(select)select.value=String(index+1);
      const playoffZone=playoff&&index<7;
      row.classList.toggle("is-playoff",playoffZone);
      const small=row.querySelector(".nfl-ranking-name small");
      if(small){
        const status=String(row.dataset.nflStatus||"").trim();
        const label=String(row.dataset.nflLabel||"").trim();
        small.textContent=status||(playoffZone?(label?label+" · PLAYOFF SEED":"PLAYOFF SEED"):label);
      }
    });
    const warning=document.getElementById("nflDivisionWarning_"+categoryId);
    if(warning&&!missingDivisions(categoryId).length)warning.hidden=true;
    const payload=RANKING_PAGE_STATE.payload||{};
    const category=(payload.categories||[]).find(function(row){return key(row.id)===key(categoryId);});
    if(category&&isPlayoffRaceGame(RANKING_PAGE_STATE.gameId)){
      const old=category.activeSnapshot;
      const savedPct=old&&old.teamMultipliers||{};
      const ranks={};(old&&old.rankings||[]).forEach(function(row){ranks[key(row.nomineeId)]=Number(row.rank)||0;});
      const pct=Number(category.finalizeMultiplier===undefined?payload.nflPlayoffRace&&payload.nflPlayoffRace.saveMultiplier:category.finalizeMultiplier)||1;
      rows.forEach(function(row,index){
        const id=key(row.dataset.nomineeId),prior=Object.prototype.hasOwnProperty.call(savedPct,id)?Number(savedPct[id]):old?Number(old.multiplier)||1:pct;
        const next=old&&ranks[id]!==index+1?Math.min(prior,pct):prior;
        const label=row.querySelector("[data-team-pct]");if(label)label.textContent=Math.round(next*100)+"%";
      });
    }
  };

  root.rankingMove_=function(categoryId,nomineeId,direction){
    BASE_MOVE(categoryId,nomineeId,direction);
    root.nflRankingSync_(categoryId);
  };

  root.nflRankingMoveTo_=function(categoryId,nomineeId,position){
    const list=document.getElementById("rankingList_"+categoryId);
    const row=rowFor(categoryId,nomineeId);
    if(!list||!row)return;
    const without=Array.from(list.querySelectorAll(".ranking-entry")).filter(function(item){return item!==row;});
    const target=Math.max(0,Math.min(without.length,Number(position||1)-1));
    if(target>=without.length)list.appendChild(row);
    else list.insertBefore(row,without[target]);
    root.nflRankingSync_(categoryId);
  };

  root.nflRankingPointerDown_=function(event,categoryId,nomineeId){
    if(event.pointerType==="mouse"&&event.button!==0)return;
    const row=rowFor(categoryId,nomineeId);
    const list=document.getElementById("rankingList_"+categoryId);
    if(!row||!list)return;
    POINTER_DRAG={categoryId:categoryId,nomineeId:nomineeId,row:row,list:list,pointerId:event.pointerId};
    row.classList.add("is-dragging");
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch(err){}
    event.preventDefault();
  };

  root.nflRankingPointerMove_=function(event){
    if(!POINTER_DRAG||POINTER_DRAG.pointerId!==event.pointerId)return;
    const hit=document.elementFromPoint(event.clientX,event.clientY);
    const target=hit&&hit.closest?hit.closest(".nfl-ranking-entry"):null;
    if(!target||target===POINTER_DRAG.row||target.parentNode!==POINTER_DRAG.list)return;
    const rect=target.getBoundingClientRect();
    if(event.clientY<rect.top+rect.height/2)POINTER_DRAG.list.insertBefore(POINTER_DRAG.row,target);
    else POINTER_DRAG.list.insertBefore(POINTER_DRAG.row,target.nextSibling);
    root.nflRankingSync_(POINTER_DRAG.categoryId);
    event.preventDefault();
  };

  root.nflRankingPointerEnd_=function(event){
    if(!POINTER_DRAG||POINTER_DRAG.pointerId!==event.pointerId)return;
    POINTER_DRAG.row.classList.remove("is-dragging");
    root.nflRankingSync_(POINTER_DRAG.categoryId);
    POINTER_DRAG=null;
  };

  root.nflRankingDragStart_=function(event,categoryId,nomineeId){
    const row=rowFor(categoryId,nomineeId);
    if(!row)return;
    HTML_DRAG={categoryId:categoryId,nomineeId:nomineeId,row:row};
    row.classList.add("is-dragging");
    if(event.dataTransfer){
      event.dataTransfer.effectAllowed="move";
      event.dataTransfer.setData("text/plain",nomineeId);
    }
  };
  root.nflRankingDragOver_=function(event){event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect="move";};
  root.nflRankingDrop_=function(event,categoryId,targetId){
    event.preventDefault();
    if(!HTML_DRAG||HTML_DRAG.categoryId!==categoryId)return;
    const list=document.getElementById("rankingList_"+categoryId);
    const target=rowFor(categoryId,targetId);
    const row=HTML_DRAG.row;
    if(!list||!target||!row||target===row)return;
    const rect=target.getBoundingClientRect();
    if(event.clientY<rect.top+rect.height/2)list.insertBefore(row,target);
    else list.insertBefore(row,target.nextSibling);
    root.nflRankingSync_(categoryId);
  };
  root.nflRankingDragEnd_=function(){
    if(HTML_DRAG&&HTML_DRAG.row)HTML_DRAG.row.classList.remove("is-dragging");
    if(HTML_DRAG)root.nflRankingSync_(HTML_DRAG.categoryId);
    HTML_DRAG=null;
  };

  root.nflRankingDismissWarning_=function(categoryId){
    const warning=document.getElementById("nflDivisionWarning_"+categoryId);
    if(warning)warning.hidden=true;
  };

  root.nflRankingSaveCategory_=async function(categoryId,saveAnyway,mode){
    mode=mode||"draft";
    const message=document.getElementById("rankingMessage_"+categoryId);
    const gameId=String(RANKING_PAGE_STATE.gameId||"");
    const playoffRace=isPlayoffRaceGame(gameId);
    if(playoffRace&&isPlayoffCategory(categoryId)&&!saveAnyway){
      const missing=missingDivisions(categoryId);
      if(missing.length){
        const warning=document.getElementById("nflDivisionWarning_"+categoryId);
        const text=document.getElementById("nflDivisionWarningText_"+categoryId);
        if(text)text.textContent="Your top seven are missing "+missing.join(", ")+" division"+(missing.length===1?"":"s")+". A playoff field should include at least one team from every division.";
        if(warning)warning.hidden=false;
        root.NFL_RANKING_WARNING_MODE_R3_[categoryId]=mode;
        if(message)message.textContent="Review the division warning before saving.";
        return;
      }
    }
    const session=typeof getSession==="function"?(getSession()||{}):{};
    const rankings=currentRankings(categoryId);
    if(playoffRace&&mode==="finalize"){
      const category=(RANKING_PAGE_STATE.payload.categories||[]).find(function(row){return key(row.id)===key(categoryId);});
      const old=category&&category.activeSnapshot;
      const oldRanks={};(old&&old.rankings||[]).forEach(function(row){oldRanks[key(row.nomineeId)]=Number(row.rank)||0;});
      const pct=Number(category&&category.finalizeMultiplier!==undefined?category.finalizeMultiplier:RANKING_PAGE_STATE.payload.nflPlayoffRace&&RANKING_PAGE_STATE.payload.nflPlayoffRace.saveMultiplier)||1;
      const changed=rankings.filter(function(row){return old&&oldRanks[key(row.nomineeId)]!==row.rank;});
      const details=changed.map(function(row){return row.nomineeId+" (#"+oldRanks[key(row.nomineeId)]+" → #"+row.rank+")";});
      const notice=old
        ?"Finalize this adjustment? "+changed.length+" team positions change. All changed teams, including those shifted by reordering, retain the lower of their previous value and "+Math.round(pct*100)+"%. Unchanged teams keep their previous value.\n"+details.join(", ")
        :"Finalize this original forecast at "+Math.round(pct*100)+"%? It will lock until the next eligible adjustment window.";
      if(!window.confirm(notice))return;
    }
    if(message){message.textContent=mode==="finalize"?"Finalizing…":"Saving Draft…";message.classList.remove("error");}
    try{
      const request={username:session.username||"",gameId:gameId,categoryId:categoryId,rankings:rankings};
      const res=playoffRace
        ?(mode==="finalize"?await apiFinalizeNflPlayoffRaceForecast(request):await apiSaveNflPlayoffRaceDraft(request))
        :await apiSaveRanking(request);
      if(!res||res.success===false)throw new Error(res&&(res.error||res.message)||"Could not save ranking.");
      if(message)message.textContent=mode==="finalize"?"Forecast finalized ✓":"Draft saved ✓ — you can return and edit later";
      window.setTimeout(function(){navigate("ranking",{skipUnsavedCheck:true});},350);
    }catch(err){
      if(message){
        message.textContent=err&&err.message?err.message:"Could not save ranking.";
        message.classList.add("error");
      }
    }
  };

  root.renderRankingPage=async function(){
    const gameId=typeof APP_STATE!=="undefined"?String(APP_STATE.gameId||"").trim():"";
    if(!gameId)return BASE_RENDER();
    setPageLoadStep(55,"Loading NFL forecast…");
    const playoffRace=isPlayoffRaceGame(gameId);
    const payload=playoffRace&&typeof apiGetNflPlayoffRaceState==="function"
      ?await apiGetNflPlayoffRaceState(gameId)
      :await apiGetRankingState(gameId);
    if(!payload||payload.success===false)return BASE_RENDER();
    if(!isNfl(gameId,payload))return BASE_RENDER();
    RANKING_PAGE_STATE.gameId=gameId;
    RANKING_PAGE_STATE.payload=payload;
    const categories=Array.isArray(payload.categories)?payload.categories:[];
    const saved=categories.filter(function(c){return playoffRace?!!c.activeSnapshot:!!(c.ballot&&c.ballot.length);}).length;
    const max=categories.reduce(function(sum,c){return sum+(Number(c.points)||0);},0);
    return '<div class="page ranking-page nfl-ranking-r1">'+
      '<header class="nfl-ranking-hero"><div><span>NFL SEASON MINI GAME</span><h1>'+esc(payload.gameName||"NFL Forecast")+'</h1><p>Build your order. Every team\'s final position scores independently.</p></div><button type="button" onclick="navigate(\'leaderboard\')">STANDINGS</button></header>'+
      raceStatus(payload)+
      (playoffRace?scoreSummary(payload):"")+
      '<section class="nfl-ranking-score-curve"><div><strong>20</strong><span>EXACT</span></div><div><strong>15</strong><span>±1</span></div><div><strong>10</strong><span>±2</span></div><div><strong>6</strong><span>±3</span></div><div><strong>3</strong><span>±4</span></div><div><strong>0</strong><span>5+</span></div></section>'+
      '<section class="nfl-ranking-stats"><div><span>'+(playoffRace?'Finalized':'Saved')+'</span><strong>'+saved+'/'+categories.length+'</strong></div><div><span>Season Game</span><strong>'+(playoffRace?'CHECKPOINTS':'RANKING')+'</strong></div><div><span>Scoring</span><strong>20·15·10·6·3</strong></div></section>'+
      (categories.length?categories.map(card).join(""):'<div class="nfl-ranking-empty">No NFL ranking sections have been created yet.</div>')+
      '<section class="nfl-ranking-help"><details open><summary><strong>HOW TO PLAY</strong><span>Tap to collapse</span></summary><div><p>Rank all 16 AFC teams and all 16 NFC teams. Seeds 1–7 are your predicted playoff teams.</p><p>Finalize the Original Forecast, then return at the Week 4, 8, 12 and 15 checkpoints. Decide whether a change is worth lowering that team\'s forecast value; unchanged early predictions keep their higher value.</p><p><strong>Save Picks (Draft)</strong> is editable and never scores or burns value. <strong>Finalize Picks</strong> is required for the official forecast.</p></div></details><details><summary><strong>SCORING</strong><span>Tap to expand</span></summary><div><p><strong>Final seed:</strong> 20 exact · 15 for ±1 · 10 for ±2 · 6 for ±3 · 3 for ±4 · 0 for 5+.</p><p><strong>Checkpoint scoring:</strong> +3 exact current seed, +1 within one seed, and +1 when a team you predicted in the Top 7 is currently in the Top 7. Checkpoint points are banked and cannot be lost later.</p><p><strong>Final playoff field:</strong> +3 per correctly predicted Top-7 team, plus the existing +5 Perfect 7 bonus when all seven are correct. <strong>Original Hold:</strong> +5 for a team kept in its exact Original Forecast seed through every finalized update that finishes there.</p><p>Only teams whose finalized predicted position changes take the current forecast value: Week 4 95%, Week 8 85%, Week 12 65%, Week 15 40%.</p></div></details><details><summary><strong>SEASON TIMELINE</strong><span>Tap to expand</span></summary><div><p><strong>Original 100% → W4 95% → W8 85% → W12 65% → W15 40% → FINAL</strong></p><p>Automatic update windows open after the prior NFL week is final and close at the first kickoff of the adjustment week. Completed checkpoint points appear in the timeline above.</p></div></details></section>'+
    '</div>';
  };
})(window);
