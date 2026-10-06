/* PATTC Castle Duel Player Reveal R2
 * Presentation-only layer over the already-frozen Castle Duel match engine.
 * The backend remains authoritative for opponent selection, hidden answers,
 * settlement, wagers, murder targets, shields, lives, and scoring.
 */

var CASTLE_DUEL_R2_ROUND_KEY = '';
var CASTLE_DUEL_R2_ROOM_INDEX = 0;
var CASTLE_DUEL_R2_SUMMARY = false;
var CASTLE_DUEL_R2_DRAFTS = {};
var CASTLE_DUEL_R2_SPIN_TIMER = null;
var CASTLE_DUEL_R1_PLAYER_MARKUP_ = typeof castlePlayerMarkup_ === 'function' ? castlePlayerMarkup_ : null;

function castleR2Styles_(){return `<style>
.castle-r2-page{max-width:880px;margin:0 auto;padding:14px 12px 96px}.castle-r2-hero{background:linear-gradient(145deg,#171016,#2a1c23);border:1px solid rgba(244,212,138,.28);border-radius:22px;padding:22px;color:#fff;box-shadow:0 22px 60px rgba(0,0,0,.28)}.castle-r2-hero h1{margin:5px 0 8px;color:#f4d48a;font-size:clamp(30px,6vw,48px)}.castle-r2-kicker{font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#f4d48a}.castle-r2-meta{display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;margin-top:16px;font-weight:800}.castle-r2-stage{margin-top:14px;background:#313950;border:1px solid rgba(255,255,255,.15);border-radius:22px;padding:18px;overflow:hidden}.castle-r2-progress{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}.castle-r2-progress b{font-size:20px}.castle-r2-dots{display:flex;gap:6px}.castle-r2-dot{width:9px;height:9px;border-radius:999px;background:rgba(255,255,255,.28)}.castle-r2-dot.is-current,.castle-r2-dot.is-done{background:#f4d48a}.castle-r2-spinner{min-height:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(circle at 50% 40%,rgba(244,212,138,.18),transparent 42%),#17131a;border-radius:18px;padding:24px}.castle-r2-spinner-window{width:min(100%,520px);padding:22px;border:1px solid rgba(244,212,138,.45);border-radius:18px;background:rgba(255,255,255,.05);font-size:clamp(26px,6vw,44px);font-weight:900;color:#f7e6b8;min-height:100px;display:flex;align-items:center;justify-content:center;transform:scale(1);transition:transform .16s ease,background .16s ease}.castle-r2-spinner-window.is-spinning{animation:castleR2Pulse .32s infinite alternate}.castle-r2-spinner-copy{max-width:500px;color:#d8d9e4}.castle-r2-primary{min-height:52px;border:0;border-radius:14px;padding:0 22px;font-size:17px;font-weight:900;cursor:pointer;background:#f4d48a;color:#25180c}.castle-r2-primary:disabled{opacity:.5;cursor:not-allowed}.castle-r2-room{text-align:center}.castle-r2-portrait-wrap{position:relative;width:min(100%,390px);margin:2px auto 14px}.castle-r2-portrait{aspect-ratio:4/3;border-radius:24px;overflow:hidden;border:2px solid rgba(244,212,138,.48);background:radial-gradient(circle at 50% 32%,#5d4b59,#1c161d 72%);display:flex;align-items:center;justify-content:center;color:#f4d48a;font-size:72px;font-weight:900;box-shadow:0 18px 45px rgba(0,0,0,.35)}.castle-r2-portrait img{width:100%;height:100%;object-fit:cover}.castle-r2-portrait.is-mask{font-size:88px}.castle-r2-ally{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);white-space:nowrap;background:#f4d48a;color:#2b1b09;border-radius:999px;padding:8px 15px;font-weight:1000;letter-spacing:.08em;box-shadow:0 5px 22px rgba(0,0,0,.4)}.castle-r2-opponent{font-size:clamp(28px,6vw,42px);margin:6px 0}.castle-r2-sub{opacity:.82;margin:0 0 14px}.castle-r2-insight{background:#fff5d7;color:#39280e;border-radius:16px;padding:13px 15px;text-align:left;margin:14px 0}.castle-r2-history{margin:12px 0;text-align:left;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:12px}.castle-r2-history summary{font-weight:900;cursor:pointer}.castle-r2-history-row{display:grid;grid-template-columns:auto 1fr auto;gap:9px;padding:8px 0;border-top:1px solid rgba(255,255,255,.1)}.castle-r2-history-row:first-of-type{margin-top:8px}.castle-r2-question{text-align:left;margin:20px 0 10px;font-size:17px;font-weight:900}.castle-r2-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.castle-r2-choice{min-height:68px;border-radius:18px;border:2px solid rgba(255,255,255,.18);background:#182033;color:#fff;font-size:19px;font-weight:1000;cursor:pointer}.castle-r2-choice.is-selected{border-color:#f4d48a;background:#3b2b27;color:#ffe7aa;box-shadow:0 0 0 3px rgba(244,212,138,.12)}.castle-r2-seal{margin-top:18px;width:100%}.castle-r2-sealed{background:#e4f4e9;color:#16331d;border-radius:18px;padding:18px;text-align:center}.castle-r2-sealed h2{margin:0 0 7px}.castle-r2-mask-card{background:#18131a;border:1px solid rgba(244,212,138,.4);border-radius:20px;padding:18px;margin-top:14px}.castle-r2-wager{font-size:clamp(32px,7vw,54px);font-weight:1000;color:#f4d48a}.castle-r2-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.castle-r2-secondary{min-height:50px;border-radius:14px;border:1px solid rgba(255,255,255,.25);background:#20283a;color:#fff;font-weight:900;cursor:pointer}.castle-r2-danger{background:#531d24;color:#fff}.castle-r2-target{width:100%;min-height:50px;border-radius:12px;margin:10px 0;padding:8px}.castle-r2-summary{margin-top:14px}.castle-r2-summary-grid{display:grid;gap:12px}.castle-r2-summary-card{display:grid;grid-template-columns:74px 1fr;gap:14px;align-items:center;background:#313950;border-radius:18px;padding:13px;border:1px solid rgba(255,255,255,.12)}.castle-r2-summary-avatar{width:74px;height:74px;border-radius:16px;background:#1a1720;display:flex;align-items:center;justify-content:center;color:#f4d48a;font-size:26px;font-weight:1000;overflow:hidden}.castle-r2-summary-avatar img{width:100%;height:100%;object-fit:cover}.castle-r2-summary-card h3{margin:0 0 6px;font-size:19px}.castle-r2-summary-line{font-size:14px;opacity:.9;margin:3px 0}.castle-r2-result{color:#f7e1a4;font-weight:900}.castle-r2-standings{margin-top:14px;background:#313950;border-radius:18px;padding:16px}.castle-r2-standing{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid rgba(255,255,255,.09)}.castle-r2-standing:first-of-type{border-top:0}.castle-r2-lock-warning{background:#fff1e9;color:#512617;border-radius:16px;padding:14px;margin:14px 0;font-weight:900}.castle-r2-next{margin-top:14px;width:100%}@keyframes castleR2Pulse{from{transform:scale(.98);background:rgba(255,255,255,.04)}to{transform:scale(1.025);background:rgba(244,212,138,.1)}}@media(max-width:560px){.castle-r2-page{padding-left:8px;padding-right:8px}.castle-r2-stage{padding:13px}.castle-r2-choice{min-height:64px;font-size:17px}.castle-r2-summary-card{grid-template-columns:58px 1fr}.castle-r2-summary-avatar{width:58px;height:58px}}
</style>`;}

function castleR2RoundLocked_(round){
  if(!round)return true;
  if(String(round.status||'').toUpperCase()!=='OPEN')return true;
  var lockMs=new Date(round.lockAt||0).getTime();
  return !!lockMs&&Date.now()>=lockMs;
}

function castleR2EnsureState_(s){
  var round=s&&s.round;
  var matches=s&&Array.isArray(s.matches)?s.matches:[];
  var key=round?String(round.key||''):'';
  if(key!==CASTLE_DUEL_R2_ROUND_KEY){
    CASTLE_DUEL_R2_ROUND_KEY=key;
    CASTLE_DUEL_R2_DRAFTS={};
    CASTLE_DUEL_R2_SUMMARY=!!(round&&String(round.status||'').toUpperCase()==='SETTLED');
    CASTLE_DUEL_R2_ROOM_INDEX=0;
    if(!CASTLE_DUEL_R2_SUMMARY&&matches.length){
      var firstOpen=matches.findIndex(function(m){return m.status==='OPEN'||m.status==='TARGET_REQUIRED';});
      CASTLE_DUEL_R2_ROOM_INDEX=firstOpen>=0?firstOpen:matches.length;
      if(firstOpen<0)CASTLE_DUEL_R2_SUMMARY=true;
    }
  }
  if(CASTLE_DUEL_R2_ROOM_INDEX<0)CASTLE_DUEL_R2_ROOM_INDEX=0;
  if(CASTLE_DUEL_R2_ROOM_INDEX>=matches.length&&matches.length)CASTLE_DUEL_R2_SUMMARY=true;
}

function castleR2RevealKey_(match){
  var user=CASTLE_DUEL_STATE&&CASTLE_DUEL_STATE.player?CASTLE_DUEL_STATE.player.user:'';
  return 'pattcCastleRevealR2:'+String(user||'')+':'+String(CASTLE_DUEL_R2_ROUND_KEY||'')+':'+String(match&&match.id||'');
}
function castleR2WasRevealed_(match){
  if(!match)return false;
  if(match.status!=='OPEN')return true;
  try{return sessionStorage.getItem(castleR2RevealKey_(match))==='1';}catch(e){return false;}
}
function castleR2MarkRevealed_(match){try{sessionStorage.setItem(castleR2RevealKey_(match),'1');}catch(e){}}
function castleR2OpponentName_(m){
  if(!m)return 'Unknown';
  if(m.kind==='MASK')return 'The Masked';
  if(m.kind==='HOST')return 'The Host';
  if(m.kind==='HUMAN')return m.opponent||'PATTC Player';
  return m.opponent||'Castle Opponent';
}
function castleR2Initials_(value){
  var parts=String(value||'?').trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return '?';
  return (parts[0].charAt(0)+(parts.length>1?parts[parts.length-1].charAt(0):'')).toUpperCase();
}
function castleR2ImageUrl_(m){return String(m&&((m.imageUrl||m.profileImageUrl)||'')||'').trim();}
function castleR2Portrait_(m,compact){
  var image=castleR2ImageUrl_(m),name=castleR2OpponentName_(m),special=m&&m.kind==='MASK'?'🎭':m&&m.kind==='HOST'?'🏰':m&&m.kind==='HUMAN'?'👤':'';
  if(image)return `<${compact?'div':'div'} class="${compact?'castle-r2-summary-avatar':'castle-r2-portrait'}"><img src="${castleEscape_(image)}" alt="${castleEscape_(name)}"></div>`;
  if(compact)return `<div class="castle-r2-summary-avatar">${castleEscape_(special||castleR2Initials_(name))}</div>`;
  return `<div class="castle-r2-portrait${m&&m.kind==='MASK'?' is-mask':''}">${castleEscape_(special||castleR2Initials_(name))}</div>`;
}
function castleR2HistoryHtml_(m){
  var history=m&&Array.isArray(m.history)?m.history:[];
  if(!history.length)return '';
  return `<details class="castle-r2-history"><summary>Previous encounters with ${castleEscape_(castleR2OpponentName_(m))} · ${history.length}</summary>${history.map(function(h){return `<div class="castle-r2-history-row"><b>E${castleEscape_(h.episode)}</b><span>You: ${castleEscape_(h.choice||'—')} · Them: ${castleEscape_(h.answer||'—')}</span><b>${Number(h.points||0)>=0?'+':''}${castleEscape_(h.points||0)}</b></div>`;}).join('')}</details>`;
}
function castleR2ProgressHtml_(matches,index){
  return `<div class="castle-r2-progress"><b>Encounter ${Math.min(index+1,matches.length)} of ${matches.length}</b><div class="castle-r2-dots">${matches.map(function(m,i){var cls=i<index?' is-done':i===index?' is-current':'';return `<span class="castle-r2-dot${cls}"></span>`;}).join('')}</div></div>`;
}
function castleR2AnnouncementHtml_(s){
  var out='';
  if(s&&s.announcement&&Array.isArray(s.announcement.events)&&s.announcement.events.length){
    out+=`<section class="castle-r2-stage castle-r2-hero"><div class="castle-r2-kicker">Castle Reveal · Episode ${castleEscape_(s.announcement.episode)}</div>${s.announcement.events.map(function(e){return `<p><b>${castleEscape_(e.victim)}</b> ${e.source==='ABSENCE'?'missed the episode and lost 1 life.':e.lost?'was murdered and lost 1 life.':'was targeted, but a Secret Shield saved them.'}${e.source==='HUMAN'||e.source==='BOTH'?' The human murderer remains secret until the finale.':''}</p>`;}).join('')}</section>`;
  }
  if(s&&s.privateNotice){
    var n=s.privateNotice;
    out+=`<section class="castle-r2-stage"><div class="castle-r2-lock-warning"><b>${n.source==='ABSENCE'?'Missed Castle episode':n.shieldUsed?'Your Secret Shield saved you!':'You have been murdered!'}</b><br>${n.source==='HUMAN'||n.source==='BOTH'?'One of your fellow PATTC players targeted you. ':''}${n.lost?'You lost one life.':n.shieldUsed?'Your shield was used. No life was lost.':''}</div></section>`;
  }
  return out;
}
function castleR2StandingsHtml_(s){
  var p=s.player,players=s.leaderboard||[];
  return `<section class="castle-r2-standings"><h2>Castle Standings</h2>${players.map(function(x){var own=p&&String(x.user).toLowerCase()===String(p.user).toLowerCase();var lives=own?p.lives:x.lives;return `<div class="castle-r2-standing"><span>${castleEscape_(x.user)}${own?' · YOU':''}</span><b>${castleEscape_(lives)} lives · ${castleEscape_(x.points)} pts</b></div>`;}).join('')}</section>`;
}
function castleR2HeaderHtml_(s){
  var p=s.player||{};
  return `<section class="castle-r2-hero"><div class="castle-r2-kicker">THE TRAITORS · CASTLE DUEL</div><h1>Enter the Castle</h1><p>One room at a time. Read your opponent. Choose who to trust.</p><div class="castle-r2-meta"><span>Jackpot: ${castleEscape_(s.config&&s.config.jackpot||0)} pts</span><span>Lives: ${castleEscape_(p.lives)} · Secret shields: ${castleEscape_(p.shield)}</span></div></section>`;
}
function castleR2SpinnerHtml_(m,index,matches){
  return `<section class="castle-r2-stage">${castleR2ProgressHtml_(matches,index)}<div class="castle-r2-spinner"><div class="castle-r2-kicker">THE CASTLE IS WAITING</div><h2>Who is behind Door ${index+1}?</h2><div id="castleR2SpinnerWindow" class="castle-r2-spinner-window">?</div><p class="castle-r2-spinner-copy">The encounter is already sealed for fairness. Spin the Castle to reveal who you are facing.</p><button class="castle-r2-primary" onclick="castleR2Spin_(${index},this)">SPIN THE CASTLE</button></div></section>`;
}
function castleR2Draft_(m){
  if(!CASTLE_DUEL_R2_DRAFTS[m.id])CASTLE_DUEL_R2_DRAFTS[m.id]={guess:m.guess||'',choice:m.choice||''};
  return CASTLE_DUEL_R2_DRAFTS[m.id];
}
function castleR2ChoiceButton_(m,field,value,label){
  var draft=castleR2Draft_(m),selected=draft[field]===value;
  return `<button type="button" class="castle-r2-choice${selected?' is-selected':''}" onclick="castleR2Select_('${castleEscape_(m.id)}','${field}','${value}')">${label}</button>`;
}
function castleR2NextButton_(index,matches){
  if(index+1<matches.length)return `<button class="castle-r2-primary castle-r2-next" onclick="castleR2Next_()">ENTER ENCOUNTER ${index+2}</button>`;
  return `<button class="castle-r2-primary castle-r2-next" onclick="castleR2ShowSummary_()">VIEW EPISODE SUMMARY</button>`;
}
function castleR2MaskControls_(m,index,matches,round,players){
  var locked=castleR2RoundLocked_(round);
  if(m.status==='OPEN'){
    if(locked)return `<div class="castle-r2-lock-warning">ROUND LOCKED · This Masked encounter expired.</div>`;
    return `<div class="castle-r2-mask-card"><div class="castle-r2-kicker">MASKED WAGER</div><div class="castle-r2-wager">${castleEscape_(m.wager)} pts</div><p>Accept to reveal what is behind the mask. Half of an accepted wager is added separately to the Castle jackpot.</p><div class="castle-r2-actions"><button class="castle-r2-primary" onclick="castleR2Mask_('${castleEscape_(m.id)}',true)">ACCEPT & REVEAL</button><button class="castle-r2-secondary" onclick="castleR2Mask_('${castleEscape_(m.id)}',false)">DECLINE</button></div></div>`;
  }
  if(m.status==='TARGET_REQUIRED'){
    var targets=(players||[]).filter(function(x){return x.user!==CASTLE_DUEL_STATE.player.user&&x.lives>0;});
    return `<div class="castle-r2-mask-card castle-r2-danger"><div class="castle-r2-kicker">SECRET POWER</div><h2>YOU DREW THE MURDERER CARD</h2><p>Use it now. Your identity remains secret until the finale.</p><select id="castleR2Target-${castleEscape_(m.id)}" class="castle-r2-target">${targets.map(function(x){return `<option value="${castleEscape_(x.user)}">${castleEscape_(x.user)}</option>`;}).join('')}</select><button class="castle-r2-primary" onclick="castleR2Target_('${castleEscape_(m.id)}')">CONFIRM SECRET TARGET</button></div>`;
  }
  if(m.status==='DECLINED')return `<div class="castle-r2-sealed"><h2>Wager Declined</h2><p>No wager was charged. No jackpot contribution was made.</p></div>${castleR2NextButton_(index,matches)}`;
  if(m.status==='LOCKED')return `<div class="castle-r2-sealed"><h2>Behind the Mask: ${castleEscape_(m.outcome||'REVEALED')}</h2><p>Your Masked result is sealed until episode settlement.</p></div>${castleR2NextButton_(index,matches)}`;
  if(m.status==='SETTLED')return `<div class="castle-r2-sealed"><h2>${m.outcome?`Behind the Mask: ${castleEscape_(m.outcome)}`:'Masked Encounter'}</h2><p>You earned <b>${castleEscape_(m.points||0)} points</b>.</p></div>${castleR2NextButton_(index,matches)}`;
  return '';
}
function castleR2NormalControls_(m,index,matches,round){
  var locked=castleR2RoundLocked_(round);
  if(m.status==='OPEN'){
    if(locked)return `<div class="castle-r2-lock-warning">ROUND LOCKED · No additional decisions can be submitted.</div>`;
    var draft=castleR2Draft_(m),ready=!!(draft.guess&&draft.choice);
    return `<div class="castle-r2-question">What do you think ${castleEscape_(castleR2OpponentName_(m))} will do?</div><div class="castle-r2-choice-grid">${castleR2ChoiceButton_(m,'guess','COOPERATE','COOPERATE')}${castleR2ChoiceButton_(m,'guess','BETRAY','BETRAY')}</div><div class="castle-r2-question">What will YOU do?</div><div class="castle-r2-choice-grid">${castleR2ChoiceButton_(m,'choice','COOPERATE','COOPERATE')}${castleR2ChoiceButton_(m,'choice','BETRAY','BETRAY')}</div><button class="castle-r2-primary castle-r2-seal" ${ready?'':'disabled'} onclick="castleR2LockDecision_('${castleEscape_(m.id)}')">LOCK THIS DECISION</button>`;
  }
  if(m.status==='LOCKED')return `<div class="castle-r2-sealed"><h2>DECISION SEALED</h2><p>Your prediction: <b>${castleEscape_(m.guess)}</b><br>Your decision: <b>${castleEscape_(m.choice)}</b></p><p>The opponent decision stays hidden until settlement.</p></div>${castleR2NextButton_(index,matches)}`;
  if(m.status==='SETTLED'){
    if(!m.choice)return `<div class="castle-r2-sealed"><h2>Encounter Expired</h2><p>No decision submitted · 0 points.</p></div>${castleR2NextButton_(index,matches)}`;
    var base=castleR2BaseScore_(m.choice,m.answer),bonus=Number(m.points||0)-base;
    return `<div class="castle-r2-sealed"><h2>RESULT</h2><p>You chose <b>${castleEscape_(m.choice)}</b> · Opponent chose <b>${castleEscape_(m.answer)}</b></p><p>Base: ${base>=0?'+':''}${base}${bonus?` · Bonus/adjustment: ${bonus>=0?'+':''}${bonus}`:''}</p><p class="castle-r2-result">TOTAL: ${Number(m.points||0)>=0?'+':''}${castleEscape_(m.points||0)} pts</p></div>${castleR2NextButton_(index,matches)}`;
  }
  return '';
}
function castleR2BaseScore_(own,other){if(own==='COOPERATE'&&other==='COOPERATE')return 20;if(own==='BETRAY'&&other==='COOPERATE')return 30;if(own==='BETRAY'&&other==='BETRAY')return -10;return 0;}
function castleR2RoomHtml_(s,index){
  var matches=s.matches||[],m=matches[index],round=s.round,players=s.leaderboard||[];
  if(!m)return castleR2SummaryHtml_(s);
  if(!castleR2WasRevealed_(m)&&!castleR2RoundLocked_(round))return castleR2SpinnerHtml_(m,index,matches);
  var title=castleR2OpponentName_(m);
  return `<section class="castle-r2-stage">${castleR2ProgressHtml_(matches,index)}<div class="castle-r2-room"><div class="castle-r2-portrait-wrap">${castleR2Portrait_(m,false)}${m.allied?'<div class="castle-r2-ally">CASTLE FIVE ALLY</div>':''}</div><div class="castle-r2-kicker">${m.kind==='HUMAN'?'PATTC PLAYER':m.kind==='MASK'?'MASKED ENCOUNTER':m.kind==='HOST'?'SPECIAL ENCOUNTER':'TV CONTESTANT'}</div><h2 class="castle-r2-opponent">${castleEscape_(title)}</h2>${m.allied?'<p class="castle-r2-sub">One of your chosen Castle Five has appeared.</p>':''}${m.clue?`<div class="castle-r2-insight"><b>ALLIANCE INSIGHT</b><br>Your ally suggests <b>${castleEscape_(m.clue)}</b>. This clue is 75% accurate.${m.allied?' A correct read earns the Alliance bonus.':''}</div>`:''}${castleR2HistoryHtml_(m)}${m.kind==='MASK'?castleR2MaskControls_(m,index,matches,round,players):castleR2NormalControls_(m,index,matches,round)}</div></section>`;
}
function castleR2SummaryCard_(m){
  var settled=m.status==='SETTLED',missed=settled&&!m.choice&&m.kind!=='MASK';
  var body='';
  if(m.kind==='MASK'){
    body=`<div class="castle-r2-summary-line">Wager: ${castleEscape_(m.wager||0)} pts</div><div class="castle-r2-summary-line">Result: ${castleEscape_(m.outcome||m.status==='DECLINED'?'Declined':m.status)}</div>${settled?`<div class="castle-r2-summary-line castle-r2-result">Points: ${castleEscape_(m.points||0)}</div>`:'<div class="castle-r2-summary-line">Settlement pending</div>'}`;
  }else if(missed){
    body='<div class="castle-r2-summary-line">No decision submitted</div><div class="castle-r2-summary-line castle-r2-result">0 pts</div>';
  }else{
    body=`<div class="castle-r2-summary-line">Prediction: ${castleEscape_(m.guess||'—')}</div><div class="castle-r2-summary-line">Your choice: ${castleEscape_(m.choice||'—')}</div><div class="castle-r2-summary-line">Opponent: ${settled?castleEscape_(m.answer||'—'):'Hidden until settlement'}</div>${settled?`<div class="castle-r2-summary-line castle-r2-result">Points: ${Number(m.points||0)>=0?'+':''}${castleEscape_(m.points||0)}</div>`:''}`;
  }
  return `<article class="castle-r2-summary-card">${castleR2Portrait_(m,true)}<div><div class="castle-r2-kicker">Encounter ${castleEscape_(m.number)}${m.allied?' · ALLY':''}</div><h3>${castleEscape_(castleR2OpponentName_(m))}</h3>${body}</div></article>`;
}
function castleR2SummaryHtml_(s){
  var round=s.round,matches=s.matches||[],settled=round&&String(round.status||'').toUpperCase()==='SETTLED';
  return `<section class="castle-r2-stage castle-r2-summary"><div class="castle-r2-kicker">EPISODE ${castleEscape_(round&&round.number||'')} ${settled?'RESULTS':'SUMMARY'}</div><h2>${settled?'The Castle has spoken':'Your three encounters are sealed'}</h2><p>${settled?'Review each outcome and point result below.':'Opponent choices stay hidden until the episode is settled.'}</p><div class="castle-r2-summary-grid">${matches.map(castleR2SummaryCard_).join('')}</div><button class="castle-r2-secondary castle-r2-next" onclick="castleRefresh_()">REFRESH CASTLE</button></section>`;
}

function castlePlayerMarkup_(s){
  if(!s||!s.player||!s.round||s.round.finale||!Array.isArray(s.matches)||!s.matches.length){
    return CASTLE_DUEL_R1_PLAYER_MARKUP_?CASTLE_DUEL_R1_PLAYER_MARKUP_(s):'';
  }
  castleR2EnsureState_(s);
  var round=s.round;
  var locked=castleR2RoundLocked_(round);
  var mode=CASTLE_DUEL_R2_SUMMARY||String(round.status||'').toUpperCase()==='SETTLED'?'summary':'room';
  return castleStyles_()+castleR2Styles_()+`<div class="page castle-r2-page">${castleR2HeaderHtml_(s)}${castleR2AnnouncementHtml_(s)}${locked&&round.status==='OPEN'?'<div class="castle-r2-lock-warning">This Castle round is locked. Unfinished encounters can no longer be changed.</div>':''}${mode==='summary'?castleR2SummaryHtml_(s):castleR2RoomHtml_(s,CASTLE_DUEL_R2_ROOM_INDEX)}${castleR2StandingsHtml_(s)}</div>`;
}

function castleR2Render_(){var app=document.getElementById('app');if(app&&CASTLE_DUEL_STATE)app.innerHTML=castlePlayerMarkup_(CASTLE_DUEL_STATE);}
function castleR2Select_(matchId,field,value){
  var match=(CASTLE_DUEL_STATE.matches||[]).find(function(m){return m.id===matchId;});
  if(!match)return;
  var draft=castleR2Draft_(match);draft[field]=value;castleR2Render_();
}
function castleR2Spin_(index,button){
  var matches=CASTLE_DUEL_STATE&&CASTLE_DUEL_STATE.matches||[],m=matches[index];
  if(!m)return;
  var windowEl=document.getElementById('castleR2SpinnerWindow');
  if(!windowEl)return;
  if(button){button.disabled=true;button.textContent='THE CASTLE IS CHOOSING…';}
  var cast=CASTLE_DUEL_STATE.cast||[],labels=cast.map(function(x){return x.name;});
  labels.push('PATTC PLAYER','THE HOST','THE MASKED','MURDERER CARD');
  var ticks=0,maxTicks=24;
  windowEl.classList.add('is-spinning');
  if(CASTLE_DUEL_R2_SPIN_TIMER)clearInterval(CASTLE_DUEL_R2_SPIN_TIMER);
  CASTLE_DUEL_R2_SPIN_TIMER=setInterval(function(){
    ticks+=1;windowEl.textContent=labels[Math.floor(Math.random()*labels.length)]||'THE CASTLE';
    if(ticks>=maxTicks){
      clearInterval(CASTLE_DUEL_R2_SPIN_TIMER);CASTLE_DUEL_R2_SPIN_TIMER=null;
      windowEl.classList.remove('is-spinning');windowEl.textContent=castleR2OpponentName_(m);castleR2MarkRevealed_(m);
      setTimeout(castleR2Render_,650);
    }
  },85);
}
async function castleR2ReloadState_(){CASTLE_DUEL_STATE=await castleCall_('castleDuelGetState');castleR2Render_();}
async function castleR2LockDecision_(id){
  try{
    var m=(CASTLE_DUEL_STATE.matches||[]).find(function(x){return x.id===id;});if(!m)return;
    var draft=castleR2Draft_(m);if(!draft.guess||!draft.choice)throw new Error('Choose both your prediction and your decision.');
    await castleCall_('castleDuelSubmit',{roundKey:CASTLE_DUEL_STATE.round.key,matchId:id,guess:draft.guess,choice:draft.choice});
    await castleR2ReloadState_();
  }catch(e){castleNotify_(e.message,true);}
}
async function castleR2Mask_(id,accept){
  try{
    if(accept&&!window.confirm('Accept this wager and reveal what is behind the mask?'))return;
    await castleCall_('castleDuelMaskedAccept',{roundKey:CASTLE_DUEL_STATE.round.key,matchId:id,accept:accept});
    await castleR2ReloadState_();
  }catch(e){castleNotify_(e.message,true);}
}
async function castleR2Target_(id){
  try{
    var el=document.getElementById('castleR2Target-'+id);if(!el||!el.value)throw new Error('No eligible human target is available.');
    if(!window.confirm('Use your Murderer Card against '+el.value+'? This cannot be changed.'))return;
    await castleCall_('castleDuelTarget',{roundKey:CASTLE_DUEL_STATE.round.key,matchId:id,targetUsername:el.value});
    await castleR2ReloadState_();
  }catch(e){castleNotify_(e.message,true);}
}
function castleR2Next_(){
  var matches=CASTLE_DUEL_STATE&&CASTLE_DUEL_STATE.matches||[];
  if(CASTLE_DUEL_R2_ROOM_INDEX+1>=matches.length){CASTLE_DUEL_R2_SUMMARY=true;}else{CASTLE_DUEL_R2_ROOM_INDEX+=1;}
  castleR2Render_();
  try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){}
}
function castleR2ShowSummary_(){CASTLE_DUEL_R2_SUMMARY=true;castleR2Render_();try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){}}
