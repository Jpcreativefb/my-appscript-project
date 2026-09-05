/* PATTC Predicts RC24A — Survivor + Confidence completion pure helpers.
   No transport, auth, provider, or scoring-engine calls live here. */
(function(root, factory){
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PATTCRC24ASportsCompletion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const txt = v => String(v === undefined || v === null ? '' : v).trim();
  const key = v => txt(v).toLowerCase().replace(/_/g,'-');
  const num = (v,d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
  const round = v => Math.round(num(v,0)*1000)/1000;

  function survivorNextWinMultiplier(streak, step, max){
    let m = 1 + Math.max(0, num(streak,0)) * Math.max(0,num(step,1));
    if (num(max,0) > 0) m = Math.min(num(max,0), m);
    return m;
  }

  function survivorTiePoints(settings, currentStreak){
    settings = settings || {};
    if (key(settings.mode) !== 'streak-points-strikes') return 0;
    const multiplier = survivorNextWinMultiplier(currentStreak, settings.kothMultiplierStep, settings.kothMaxMultiplier);
    return round(Math.max(0,num(settings.kothBasePoints,10)) * multiplier * 0.5);
  }

  function survivorResolveRound(state, settings, outcome, pushKind){
    state=Object.assign({alive:true,streak:0,lossesUsed:0,earnedLives:0,totalPoints:0},state||{});
    settings=Object.assign({mode:'sports-survivor',lossesAllowed:0,kothBasePoints:10,kothMultiplierStep:1,kothMaxMultiplier:0,pushRule:'survive'},settings||{});
    let weeklyPoints=0, multiplier=1, status=outcome;
    if(outcome==='push'){
      if(key(settings.pushRule)==='loss') outcome='loss';
      else {
        status=pushKind==='tie'?'tie-survived':'push';
        if(key(settings.mode)==='streak-points-strikes' && pushKind==='tie' && key(settings.pushRule)==='survive'){
          // RC24A narrow correction: an NFL tie is a successful Survivor result for streak continuity.
          // It advances the consecutive-success streak by one while awarding 50% of that week's normal value.
          multiplier=survivorNextWinMultiplier(state.streak,settings.kothMultiplierStep,settings.kothMaxMultiplier);
          weeklyPoints=round(num(settings.kothBasePoints,10)*multiplier*0.5);
          state.streak++;
          state.totalPoints=round(state.totalPoints+weeklyPoints);
        }
        return Object.assign(state,{weeklyPoints,multiplier,status,outcome:'push'});
      }
    }
    if(outcome==='win'){
      state.streak++; multiplier=survivorNextWinMultiplier(state.streak-1,settings.kothMultiplierStep,settings.kothMaxMultiplier);
      if(key(settings.mode)==='streak-points-strikes') weeklyPoints=round(num(settings.kothBasePoints,10)*multiplier);
      state.totalPoints=round(state.totalPoints+weeklyPoints); status='survived';
    } else if(outcome==='loss'){
      state.streak=0; state.lossesUsed++; weeklyPoints=0;
      const allowed=num(settings.lossesAllowed,0)+num(state.earnedLives,0);
      if(state.lossesUsed>allowed){state.alive=false;status='eliminated';} else status=key(settings.mode)==='streak-points-strikes'?'loss-reset':'life-used';
    }
    return Object.assign(state,{weeklyPoints,multiplier,status,outcome});
  }

  function survivorUsedWeekMap(rounds){
    const map = {};
    (rounds || []).forEach(r => {
      const week = Math.max(1, Math.floor(num(r.week || r.round,0)));
      (r.nomineeIds || (r.pickNomineeId ? [r.pickNomineeId] : [])).forEach(id => {
        const k = key(id);
        if (k && !map[k]) map[k] = week;
      });
    });
    return map;
  }

  function survivorGroupMatchups(nominees, rounds){
    const usedWeeks = survivorUsedWeekMap(rounds);
    const groups = {};
    (nominees || []).forEach(n => {
      const gid = txt(n.sportsGameId || n.espnEventId || n.gameId || n.matchupId || ('solo:' + key(n.id)));
      if (!groups[gid]) groups[gid] = { id: gid, kickoff:n.kickoff||'', weather:n.weather||'', total:n.total||n.overUnder||'', teams:[] };
      const copy = Object.assign({}, n);
      const usedWeek = usedWeeks[key(n.id)] || 0;
      copy.usedWeek = usedWeek;
      copy.usedOverlay = !copy.eligible && key(copy.unavailableReason)==='used' && usedWeek ? 'USED — WEEK ' + usedWeek : '';
      groups[gid].teams.push(copy);
      if (!groups[gid].kickoff && n.kickoff) groups[gid].kickoff=n.kickoff;
      if (!groups[gid].weather && n.weather) groups[gid].weather=n.weather;
      if (!groups[gid].total && (n.total||n.overUnder)) groups[gid].total=n.total||n.overUnder;
    });
    return Object.values(groups).map(g => {
      g.away = g.teams.find(t => key(t.side||t.homeAway)==='away') || g.teams[0] || null;
      g.home = g.teams.find(t => key(t.side||t.homeAway)==='home') || g.teams[1] || null;
      return g;
    }).sort((a,b) => new Date(a.kickoff||0).getTime() - new Date(b.kickoff||0).getTime());
  }

  function survivorHistory(rounds, nomineeMeta){
    nomineeMeta = nomineeMeta || {};
    let cumulative = 0;
    return (rounds || []).filter(r => (r.nomineeIds||[]).length || r.pickNomineeId).map(r => {
      cumulative += num(r.earnedPoints,0);
      const id = key((r.nomineeIds||[])[0] || r.pickNomineeId);
      const meta = nomineeMeta[id] || {};
      const sel = (r.selectionResults || [])[0] || {};
      return {
        week:num(r.week||r.round,0), teamId:id, team:meta.name||meta.team||r.team||id,
        logo:meta.image||meta.logoUrl||'', opponent:meta.opponent||r.opponent||'',
        result:r.outcome||'pending', survivorStatus:r.status||'',
        teamScore:sel.teamScore, opponentScore:sel.opponentScore,
        finalScore:Number.isFinite(Number(sel.teamScore)) && Number.isFinite(Number(sel.opponentScore)) ? `${sel.teamScore}-${sel.opponentScore}` : '',
        weeklyPoints:num(r.earnedPoints,0), seasonPoints:cumulative, streak:num(r.winStreak,0),
        lossesUsed:num(r.lossesUsed,0), livesRemaining:num(r.livesRemaining,0), resolved:r.resolved===true
      };
    });
  }

  function survivorFeatured(round, matchups, resultRows){
    round = round || {}; resultRows = resultRows || {};
    const selectedId = key((round.pickNomineeIds||[])[0] || round.pickNomineeId);
    if (!selectedId) return null;
    const match = (matchups||[]).find(m => (m.teams||[]).some(t => key(t.id)===selectedId));
    if (!match) return null;
    const selected = (match.teams||[]).find(t => key(t.id)===selectedId) || null;
    const opponent = selected === match.away ? match.home : match.away;
    const result = resultRows[match.id] || {};
    const completed = result.Completed===true || key(result.Completed)==='true' || key(result.State)==='post' || key(result.Status).includes('final');
    const live = !completed && (key(result.State)==='in' || key(result.Status).includes('progress') || key(result.Status).includes('live'));
    let state = completed ? 'final' : live ? 'live' : 'pregame';
    return { state, selected, opponent, matchup:match, result };
  }

  function filterLeagueRows(rows, memberUsernames){
    if (!Array.isArray(memberUsernames) || !memberUsernames.length) return (rows||[]).slice();
    const allowed = new Set(memberUsernames.map(key));
    return (rows||[]).filter(r => allowed.has(key(r.username||r.user)));
  }

  function compareRevealAllowed(item, nowMs){
    item=item||{}; nowMs = Number.isFinite(nowMs) ? nowMs : Date.now();
    if (item.resolved===true || item.locked===true) return true;
    const t = new Date(item.kickoff||item.lockDateTime||'').getTime();
    return Number.isFinite(t) && t <= nowMs;
  }


  function survivorCompareDefaultWeek(payload){
    payload=payload||{};
    const current=payload.currentRound||{};
    const week=Math.floor(num(current.week||current.round,0));
    if(week>0) return String(week);
    const rounds=payload.rounds||[];
    for(let i=rounds.length-1;i>=0;i--){
      const w=Math.floor(num(rounds[i]&& (rounds[i].week||rounds[i].round),0));
      if(w>0) return String(w);
    }
    return 'all';
  }

  function confidenceGamesRemaining(categories){
    return (categories||[]).reduce((count,c)=>{
      c=c||{};
      const resolved=c.resolved===true || !!txt(c.winnerNomineeId||c.WinnerNomineeId);
      return count + (resolved ? 0 : 1);
    },0);
  }

  function confidenceSeasonStandings(weekly){
    const map={};
    (weekly||[]).forEach(w=>{
      (w&&w.rows||[]).forEach(r=>{
        const username=txt(r.username||r.user); if(!username) return;
        const k=key(username);
        if(!map[k]) map[k]={username,displayName:r.displayName||username,totalPoints:0,weeksPlayed:0};
        map[k].totalPoints=round(map[k].totalPoints+num(r.points!==undefined?r.points:r.total,0));
        map[k].weeksPlayed++;
      });
    });
    const rows=Object.values(map).sort((a,b)=>b.totalPoints-a.totalPoints || b.weeksPlayed-a.weeksPlayed || txt(a.displayName).localeCompare(txt(b.displayName)));
    rows.forEach((r,i)=>{r.seasonRank=i+1;});
    return rows;
  }

  function confidencePossibleRemaining(categories, earnedByCategory, confidenceByCategory){
    earnedByCategory = earnedByCategory || {}; confidenceByCategory = confidenceByCategory || {};
    let earned=0, possible=0, remainingGames=0;
    (categories||[]).forEach(c => {
      const id=txt(c.id); const resolved=c.resolved===true || key(c.state)==='final' || key(c.sportsState)==='post';
      earned += num(earnedByCategory[id],0);
      if (!resolved) { possible += Math.max(0,num(confidenceByCategory[id],0)); remainingGames++; }
    });
    return { currentPoints:round(earned), possibleRemaining:round(possible), maximumPossible:round(earned+possible), gamesRemaining:remainingGames };
  }

  function confidenceElimination(player, standings, winningPlaces){
    const places = Math.floor(num(winningPlaces,0));
    if (places < 1) return { status:'unknown', eliminated:null, reason:'winning-places-not-configured' };
    const max = num(player.maximumPossible !== undefined ? player.maximumPossible : num(player.points,0)+num(player.possibleRemaining,0),0);
    let guaranteedAhead=0;
    (standings||[]).forEach(r => {
      if (key(r.username||r.player)===key(player.username||player.player)) return;
      if (num(r.points,0) > max) guaranteedAhead++;
    });
    return { status: guaranteedAhead >= places ? 'eliminated' : 'alive', eliminated:guaranteedAhead >= places, guaranteedAhead, winningPlaces:places, maximumPossible:max };
  }

  function confidenceStandings(rows, winningPlaces){
    const sorted=(rows||[]).map(r => Object.assign({},r,{points:num(r.points!==undefined?r.points:r.total,0),possibleRemaining:num(r.possibleRemaining!==undefined?r.possibleRemaining:r.remaining,0)}))
      .sort((a,b)=>b.points-a.points || b.possibleRemaining-a.possibleRemaining || txt(a.displayName||a.username).localeCompare(txt(b.displayName||b.username)));
    sorted.forEach((r,i)=>{ r.place=i+1; r.maximumPossible=round(r.points+r.possibleRemaining); });
    sorted.forEach(r=>{ r.elimination=confidenceElimination(r,sorted,winningPlaces); });
    return sorted;
  }

  function confidenceTrends(history){
    const map={};
    (history||[]).forEach(h => {
      const id=key(h.teamId||h.team||h.nomineeId); if(!id) return;
      if(!map[id]) map[id]={teamId:id,team:h.team||h.teamName||id,logo:h.logo||'',selections:0,correct:0,settled:0};
      const row=map[id]; row.selections++;
      if(h.resolved===true || h.result==='correct' || h.result==='wrong' || h.correct===true || h.correct===false){ row.settled++; if(h.correct===true || h.result==='correct') row.correct++; }
    });
    return Object.values(map).map(r=>Object.assign(r,{winPercentage:r.settled ? round(r.correct/r.settled*100) : null})).sort((a,b)=>b.selections-a.selections || b.correct-a.correct || a.team.localeCompare(b.team));
  }

  function confidenceCompare(players, matchupStates, nowMs){
    return (players||[]).map(p=>({
      username:p.username,displayName:p.displayName||p.username,
      matchups:(p.matchups||[]).map(m=>{
        const state=(matchupStates||{})[m.categoryId]||{};
        const reveal=compareRevealAllowed(state,nowMs);
        return Object.assign({},m,reveal?{}:{nomineeId:'',team:'',confidencePoints:null,pointsEarned:null,hidden:true});
      })
    }));
  }

  return {
    version:'rc24a-survivor-confidence-final-2', key, num, round,
    survivorNextWinMultiplier, survivorTiePoints, survivorResolveRound, survivorUsedWeekMap, survivorGroupMatchups,
    survivorHistory, survivorFeatured, filterLeagueRows, compareRevealAllowed, survivorCompareDefaultWeek,
    confidencePossibleRemaining, confidenceGamesRemaining, confidenceElimination, confidenceStandings, confidenceSeasonStandings, confidenceTrends, confidenceCompare
  };
});
