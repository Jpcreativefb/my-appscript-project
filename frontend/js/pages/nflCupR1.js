/* PATTC NFL CUP R2 — reuse the Season Hub API payload and existing Cup leaderboard. */
(function(root){'use strict';
  const BASE=root.renderSeasonHubPage;
  if(typeof BASE!=='function')return;
  const esc=function(v){return typeof escapeHtml==='function'?escapeHtml(String(v===undefined||v===null?'':v)):String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  const js=function(v){return String(v||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/</g,'\\x3c');};
  const fmt=function(v){return (Number(v)||0).toLocaleString(undefined,{maximumFractionDigits:2});};
  const key=function(v){return String(v||'').trim().toLowerCase();};
  function gameCard(g,isPast){
    const blocked=!isPast&&(g.disableEnter===true||g.available===false);
    const type=String(g.type||'prediction'),gid=String(g.gameId||''),name=String(g.name||gid);
    const isFutures=/^nfl-futures-/.test(gid);
    const status=isPast?'FINISHED':blocked?'LOCKED':isFutures?'FUTURES OPEN':String(g.status||'OPEN').toUpperCase();
    const button=isPast
      ?`<button type="button" onclick="viewGameLeaderboard('${js(gid)}','${js(type)}','')">RESULTS →</button>`
      :`<button type="button" ${blocked?'disabled':''} onclick="enterGame('${js(gid)}','${js(type)}',typeof getDashboardSelectedLeagueId_==='function'?getDashboardSelectedLeagueId_('${js(gid)}'):'','mini','${js(g.hubMode||'playable-aggregate')}')">${blocked?'LOCKED':'PLAY / VIEW →'}</button>`;
    return `<article class="nfl-cup-tile"><div class="nfl-cup-tile-icon">${esc(g.icon||'🏈')}</div><div class="nfl-cup-tile-main"><small>${esc(status)}</small><strong>${esc(name)}</strong><span>${esc(g.availabilityLabel||g.description||'')}</span></div>${button}</article>`;
  }
  root.renderSeasonHubPage=async function(){
    const gameId=(typeof getFrontendGameId==='function'&&getFrontendGameId())||(typeof APP_STATE!=='undefined'&&APP_STATE.gameId)||'';
    const html=await BASE();
    if(!/^nfl-cup-\d{4}$/i.test(String(gameId)))return html;
    const d=root.__PATTC_NFL_CUP_CONTEXT__;
    if(!d||d.gameId!==gameId)return String(html).replace('class="page season-hub-page"','class="page season-hub-page nfl-cup-r2"');
    const parent=d.parentGame||{}, rows=Array.isArray(d.leaderboardRows)?d.leaderboardRows:[];
    const session=typeof getSession==='function'?(getSession()||{}):{};
    const username=key(session.username);
    const index=rows.findIndex(r=>key(r.username||r.user)===username),me=index>=0?rows[index]:null;
    const places=rows.map((r,i)=>({rank:i+1,name:r.displayName||r.username||r.user||'Player',total:Number(r.total)||0,self:key(r.username||r.user)===username}));
    const gameGroups=[['OPEN MINI GAMES',d.openChildren||[],false],['UPCOMING / LOCKED',d.upcomingChildren||[],false],['COMPLETED GAMES',d.completedChildren||[],true]];
    const contribs=me&&Array.isArray(me.miniGameContributions)?me.miniGameContributions:[];
    const cupStatus=parent.active===true?'SEASON IN PROGRESS':'CUP PREVIEW / SETUP';
    const standings=places.length?places.slice(0,10).map(p=>`<div class="nfl-cup-standing ${p.self?'is-me':''}"><b>#${p.rank}</b><strong>${esc(p.name)}</strong><span>${fmt(p.total)} CUP</span></div>`).join(''):'<div class="nfl-cup-empty">No Cup standings yet. Child-game results will appear here.</div>';
    const breakdown=contribs.length?contribs.map(c=>`<div class="nfl-cup-contribution"><div><strong>${esc(c.gameName||c.gameId)}</strong><small>${c.placementRank?'#'+c.placementRank+' · ':''}${c.weeklyWin?'🏆 WEEKLY WINNER · ':''}${Number(c.seasonCupFieldSize)||0} entrants${c.seasonCupQualified===false?' · field below minimum':''}</small></div><b>${fmt(c.contribution)} Cup</b></div>`).join(''):'<div class="nfl-cup-empty">No qualifying Cup contributions yet.</div>';
    return `<div class="page season-hub-page nfl-cup-r2">
      <section class="nfl-cup-r2-hero"><div class="nfl-cup-r2-identity"><span>🏆 NFL SEASON CUP · ${esc(String(gameId).slice(-4))}</span><h1>${esc(parent.name||'NFL CUP 2026')}</h1><p>One season. Every mini-game counts. Your position in each game becomes protected Cup points.</p><small>${esc(cupStatus)}</small></div><div class="nfl-cup-r2-my"><span>MY CUP</span><strong>${me?fmt(me.total):'—'}</strong><small>CUP POINTS</small><b>${me?'#'+(index+1)+' OVERALL':'NOT RANKED YET'}</b></div></section>
      <section class="nfl-cup-r2-summary"><div><span>YOUR PLACE</span><b>${me?'#'+(index+1):'—'}</b></div><div><span>COUNTED AWARDS</span><b>${me?Number(me.miniGamesCounted)||0:0}</b></div><div><span>CUP FIELD</span><b>${rows.length}</b></div></section>
      <section class="nfl-cup-r2-panel"><header><div><span>SEASON TABLE</span><h2>Overall Cup Standings</h2></div><button onclick="viewGameLeaderboard('${js(gameId)}','season-cup','')">FULL TABLE →</button></header><div class="nfl-cup-standings">${standings}</div></section>
      <section class="nfl-cup-r2-panel"><header><div><span>YOUR SCORE EXPLAINED</span><h2>Cup Point Breakdown</h2></div></header><div class="nfl-cup-breakdown">${breakdown}</div><small class="nfl-cup-note">Placement points are field-adjusted and weighted. Futures stays pending until all its markets settle. Other in-season rankings may change as results arrive.</small></section>
      ${gameGroups.map(group=>group[1].length?`<section class="nfl-cup-r2-panel"><header><div><span>PLAY THE SEASON</span><h2>${group[0]}</h2></div><span class="nfl-cup-count">${group[1].length}</span></header><div class="nfl-cup-tiles">${group[1].map(g=>gameCard(g,group[2])).join('')}</div></section>`:'').join('')}
      <details class="nfl-cup-r2-rules"><summary>CUP RULES · HOW SCORING WORKS</summary><p>Each included mini-game has its own scoring. The Cup converts that game's placement to 25, 20, 16, 13, 11, 9, 7, 6 … points, then applies field protection and its configured Cup weight. A field smaller than four does not qualify. Winners in an eight-person field receive full placement points before weighting. Best-N is controlled by the Cup administrator. Futures contributions remain pending until every Futures market is resolved.</p></details>
    </div>`;
  };
})(window);
