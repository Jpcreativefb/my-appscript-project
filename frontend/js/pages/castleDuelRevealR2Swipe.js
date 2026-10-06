/* PATTC Castle Duel R2.1 — swipe decision rooms + sealed-envelope confirmation.
 * Presentation-only override loaded after castleDuelRevealR2.js.
 * No backend scoring, draw, settlement, wager, shield, or murder logic changes.
 */

var CASTLE_DUEL_R2_SWIPE_PANELS = {};
var CASTLE_DUEL_R2_CONFIRMING = {};
var CASTLE_DUEL_R2_SUBMITTING = {};
var CASTLE_DUEL_R2_TOUCH = null;

function castleR2SwipeStyles_(){return `<style>
.castle-r2-room-scene{position:relative;overflow:hidden;border-radius:20px;padding:18px;background:#17131a;border:1px solid rgba(244,212,138,.28);box-shadow:inset 0 0 60px rgba(0,0,0,.36)}
.castle-r2-room-scene:before,.castle-r2-room-scene:after{content:"";position:absolute;pointer-events:none;z-index:0}.castle-r2-room-scene>*{position:relative;z-index:1}
.castle-r2-room-human{background:radial-gradient(circle at 18% 22%,rgba(255,186,90,.19),transparent 18%),radial-gradient(circle at 82% 25%,rgba(255,186,90,.16),transparent 16%),linear-gradient(180deg,#262028 0 58%,#17131a 58% 100%)}
.castle-r2-room-human:after{left:9%;right:9%;bottom:7%;height:24%;border-radius:50% 50% 10px 10px;background:linear-gradient(180deg,rgba(80,50,35,.92),rgba(39,24,20,.96));box-shadow:0 -8px 30px rgba(0,0,0,.4)}
.castle-r2-room-tv{background:linear-gradient(90deg,rgba(82,58,45,.72) 2px,transparent 2px) 0 0/92px 100%,radial-gradient(circle at 50% 18%,rgba(243,207,141,.18),transparent 28%),linear-gradient(180deg,#30251f,#17131a)}
.castle-r2-room-tv:after{inset:8% 7% 36%;border:2px solid rgba(218,179,98,.25);box-shadow:inset 0 0 0 8px rgba(80,52,28,.18);border-radius:10px}
.castle-r2-room-host{background:radial-gradient(circle at 50% 18%,rgba(255,215,130,.22),transparent 28%),linear-gradient(90deg,rgba(91,51,27,.18),transparent 30%,rgba(91,51,27,.18)),linear-gradient(180deg,#34251c,#17131a)}
.castle-r2-room-host:after{left:12%;right:12%;bottom:5%;height:31%;background:linear-gradient(180deg,#5a3822,#271811);clip-path:polygon(8% 0,92% 0,100% 100%,0 100%);opacity:.78}
.castle-r2-room-mask{background:radial-gradient(ellipse at 50% 28%,rgba(173,127,255,.23),transparent 25%),linear-gradient(115deg,#111016 0 28%,#2b1d35 49%,#111016 71% 100%)}
.castle-r2-room-mask:after{left:35%;right:35%;top:7%;bottom:35%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.12),transparent 60%);filter:blur(2px)}
.castle-r2-room-murder{background:radial-gradient(circle at 50% 22%,rgba(142,15,24,.35),transparent 24%),repeating-linear-gradient(90deg,#161014 0 34px,#211319 34px 38px)}
.castle-r2-room-murder:after{left:38%;right:38%;top:7%;bottom:7%;border:1px solid rgba(165,39,49,.45);background:linear-gradient(180deg,rgba(91,12,22,.23),rgba(0,0,0,.45));box-shadow:0 0 35px rgba(115,15,25,.4)}
.castle-r2-room-finale{background:radial-gradient(circle at 50% 15%,rgba(255,213,107,.26),transparent 23%),linear-gradient(90deg,#35151d,#17131a 28%,#17131a 72%,#35151d)}
.castle-r2-room-finale:after{left:38%;right:38%;top:12%;height:36%;background:linear-gradient(180deg,#8b6b30,#4f3519);clip-path:polygon(18% 0,82% 0,100% 100%,0 100%);opacity:.5}
.castle-r2-room-heading{text-align:center;margin:0 0 16px}.castle-r2-room-heading h2{margin:2px 0 4px;color:#f4d48a;font-size:clamp(24px,5vw,34px)}.castle-r2-room-heading p{margin:0;opacity:.78}
.castle-r2-swipe-wrap{margin-top:16px;touch-action:pan-y}.castle-r2-swipe-progress{display:flex;gap:8px;justify-content:center;align-items:center;margin:4px 0 12px}.castle-r2-swipe-progress span{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.28)}.castle-r2-swipe-progress span.is-active{background:#f4d48a;box-shadow:0 0 0 4px rgba(244,212,138,.13)}
.castle-r2-paper{position:relative;color:#392714;border-radius:18px;padding:24px 20px 22px;background:linear-gradient(135deg,rgba(255,252,236,.97),rgba(237,219,175,.98));border:1px solid rgba(100,70,30,.42);box-shadow:0 18px 40px rgba(0,0,0,.28),inset 0 0 45px rgba(125,91,45,.09);overflow:hidden}
.castle-r2-paper:before,.castle-r2-paper:after{content:"";position:absolute;left:-4%;right:-4%;height:1px;background:rgba(112,79,40,.22);transform-origin:center}.castle-r2-paper:before{top:29%;transform:rotate(7deg)}.castle-r2-paper:after{bottom:29%;transform:rotate(-7deg)}
.castle-r2-paper>*{position:relative;z-index:1}.castle-r2-script{font-family:"Apple Chancery","Segoe Script","Brush Script MT",cursive;font-size:clamp(26px,5.5vw,38px);line-height:1.12;margin:0 0 18px;color:#3c2616}.castle-r2-paper-sub{font-size:13px;letter-spacing:.11em;text-transform:uppercase;font-weight:900;color:#715534;margin-bottom:8px}
.castle-r2-check-list{display:grid;gap:12px}.castle-r2-check{display:flex;align-items:center;gap:14px;border:1px solid rgba(88,58,27,.35);border-radius:14px;padding:15px 16px;background:rgba(255,255,255,.36);cursor:pointer;font-family:"Apple Chancery","Segoe Script","Brush Script MT",cursive;font-size:29px;font-weight:700}.castle-r2-check.is-selected{background:rgba(127,29,36,.11);border-color:#7d1f28;box-shadow:inset 0 0 0 2px rgba(125,31,40,.1)}.castle-r2-check input{appearance:none;-webkit-appearance:none;width:27px;height:27px;min-width:27px;border:2px solid #50371f;border-radius:4px;background:#fffdf3;display:grid;place-items:center;margin:0}.castle-r2-check input:checked{background:#7d1f28;border-color:#7d1f28}.castle-r2-check input:checked:after{content:"✓";color:#fff;font-family:Arial,sans-serif;font-size:20px;font-weight:900;line-height:1}
.castle-r2-swipe-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.castle-r2-swipe-back,.castle-r2-swipe-next{min-height:50px;border-radius:13px;font-weight:900;cursor:pointer}.castle-r2-swipe-back{background:#20283a;border:1px solid rgba(255,255,255,.22);color:#fff}.castle-r2-swipe-next{border:0;background:#f4d48a;color:#281b0d}.castle-r2-swipe-next:disabled{opacity:.45;cursor:not-allowed}.castle-r2-swipe-hint{text-align:center;font-size:12px;opacity:.65;margin-top:10px}
.castle-r2-confirm-card{margin-top:16px;border-radius:18px;padding:20px;text-align:center;background:linear-gradient(145deg,#6c1d29,#3c1119);border:1px solid rgba(255,214,142,.3);box-shadow:0 15px 34px rgba(0,0,0,.32)}.castle-r2-confirm-card .castle-r2-snark{font-family:"Apple Chancery","Segoe Script","Brush Script MT",cursive;font-size:clamp(30px,6vw,44px);color:#ffe3a3;margin:2px 0 8px}.castle-r2-confirm-card p{margin:6px 0 14px;color:#f5e9de}.castle-r2-click-seal{width:100%;min-height:58px;border:1px solid rgba(255,225,168,.45);border-radius:14px;background:#8f2734;color:#fff6df;font-weight:1000;font-size:17px;letter-spacing:.06em;cursor:pointer}.castle-r2-click-seal:disabled{opacity:.55}.castle-r2-change-link{margin-top:12px;border:0;background:transparent;color:#f7dfb0;text-decoration:underline;cursor:pointer;font-weight:800}
.castle-r2-submitting{margin-top:16px;border-radius:18px;padding:22px;text-align:center;background:#20171d;border:1px solid rgba(244,212,138,.32)}.castle-r2-sealing-dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#f4d48a;margin:0 4px;animation:castleR2SealPulse .8s infinite alternate}.castle-r2-sealing-dot:nth-child(2){animation-delay:.15s}.castle-r2-sealing-dot:nth-child(3){animation-delay:.3s}@keyframes castleR2SealPulse{from{opacity:.25;transform:translateY(0)}to{opacity:1;transform:translateY(-4px)}}
.castle-r2-envelope{position:relative;margin:18px auto 6px;max-width:590px;min-height:300px;padding:68px 24px 36px;color:#392714;text-align:center;border-radius:10px;background:linear-gradient(145deg,#fff9e8,#e8d0a0);border:1px solid #b9955f;box-shadow:0 20px 45px rgba(0,0,0,.34);overflow:hidden}.castle-r2-envelope:before{content:"";position:absolute;left:-1px;right:-1px;top:-1px;height:52%;background:linear-gradient(145deg,transparent 49.5%,rgba(117,82,42,.28) 50%,transparent 50.8%),linear-gradient(215deg,transparent 49.5%,rgba(117,82,42,.28) 50%,transparent 50.8%);pointer-events:none}.castle-r2-envelope-title{font-family:"Apple Chancery","Segoe Script","Brush Script MT",cursive;font-size:42px;line-height:1;color:#4b2d18;margin-bottom:20px}.castle-r2-envelope-choice{font-family:"Apple Chancery","Segoe Script","Brush Script MT",cursive;font-size:25px;margin:9px 0}.castle-r2-wax-seal{width:78px;height:78px;border-radius:50%;margin:24px auto 10px;display:grid;place-items:center;color:#f4d7ab;background:radial-gradient(circle at 35% 28%,#c14950,#7e1722 48%,#4f0c14 100%);border:5px double rgba(70,5,11,.55);box-shadow:0 7px 15px rgba(74,11,18,.38);font-family:Georgia,serif;font-size:30px;font-weight:900}.castle-r2-hidden-note{font-size:13px;font-weight:900;letter-spacing:.04em;color:#69513a;margin-top:12px}
@media(max-width:560px){.castle-r2-room-scene{padding:12px}.castle-r2-paper{padding:20px 14px}.castle-r2-check{font-size:25px}.castle-r2-swipe-actions{grid-template-columns:1fr}.castle-r2-envelope{min-height:270px;padding-left:15px;padding-right:15px}.castle-r2-envelope-title{font-size:36px}}
</style>`;}

function castleR2SwipePanel_(m){
  return Number(CASTLE_DUEL_R2_SWIPE_PANELS[m.id]||0)===1?1:0;
}
function castleR2SwipeSetPanel_(id,panel){
  var m=(CASTLE_DUEL_STATE.matches||[]).find(function(x){return x.id===id;});
  if(!m)return;
  panel=panel===1?1:0;
  var draft=castleR2Draft_(m);
  if(panel===1&&!draft.guess){
    if(typeof castleNotify_==='function')castleNotify_('Choose what you think your opponent will do first.',true);
    return;
  }
  CASTLE_DUEL_R2_SWIPE_PANELS[id]=panel;
  CASTLE_DUEL_R2_CONFIRMING[id]=false;
  castleR2Render_();
}
function castleR2SwipeSelect_(id,field,value){
  var m=(CASTLE_DUEL_STATE.matches||[]).find(function(x){return x.id===id;});
  if(!m)return;
  var draft=castleR2Draft_(m);
  draft[field]=value;
  CASTLE_DUEL_R2_CONFIRMING[id]=false;
  castleR2Render_();
}
function castleR2SwipeChoice_(m,field,value,label){
  var draft=castleR2Draft_(m),selected=draft[field]===value;
  return `<label class="castle-r2-check${selected?' is-selected':''}"><input type="checkbox" ${selected?'checked':''} onchange="castleR2SwipeSelect_('${castleEscape_(m.id)}','${field}','${value}')"><span>${castleEscape_(label)}</span></label>`;
}
function castleR2SwipeTouchStart_(event,id){
  var t=event&&event.touches&&event.touches[0];
  if(!t)return;
  CASTLE_DUEL_R2_TOUCH={id:id,x:t.clientX,y:t.clientY};
}
function castleR2SwipeTouchEnd_(event,id){
  var start=CASTLE_DUEL_R2_TOUCH,t=event&&event.changedTouches&&event.changedTouches[0];
  CASTLE_DUEL_R2_TOUCH=null;
  if(!start||start.id!==id||!t)return;
  var dx=t.clientX-start.x,dy=t.clientY-start.y;
  if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy))return;
  var m=(CASTLE_DUEL_STATE.matches||[]).find(function(x){return x.id===id;});
  if(!m)return;
  var panel=castleR2SwipePanel_(m);
  if(dx<0&&panel===0)castleR2SwipeSetPanel_(id,1);
  if(dx>0&&panel===1)castleR2SwipeSetPanel_(id,0);
}

function castleR2SwipeSnarkKey_(m){
  var user=CASTLE_DUEL_STATE&&CASTLE_DUEL_STATE.player?CASTLE_DUEL_STATE.player.user:'';
  return 'pattcCastleSnarkR2:'+String(user||'')+':'+String(CASTLE_DUEL_R2_ROUND_KEY||'')+':'+String(m&&m.id||'');
}
function castleR2SwipeSnark_(m){
  var lines=[
    'Are You Sure?',
    'Seems Good to Me...',
    "That Wasn't That Difficult, Was It?",
    'Nice Choice... Maybe.',
    'Bold Move. Probably.',
    "Trust Your Gut. Or Don't.",
    'Interesting... Very Interesting.',
    'The Castle Is Watching.',
    'Feeling Confident?',
    'No Turning Back... Almost.',
    'Well... You Picked Something.',
    'Courageous. Or Suspicious.',
    'Would You Bet a Life on That?',
    'The Walls Have Ears.',
    'Your Opponent Would Love to Know That.'
  ];
  var key=castleR2SwipeSnarkKey_(m),saved='';
  try{saved=sessionStorage.getItem(key)||'';}catch(e){}
  if(saved)return saved;
  var used={};
  try{
    (CASTLE_DUEL_STATE.matches||[]).forEach(function(x){
      var value=sessionStorage.getItem(castleR2SwipeSnarkKey_(x))||'';
      if(value)used[value]=true;
    });
  }catch(e){}
  var available=lines.filter(function(line){return !used[line];});
  if(!available.length)available=lines.slice();
  var pick=available[Math.floor(Math.random()*available.length)];
  try{sessionStorage.setItem(key,pick);}catch(e){}
  return pick;
}
function castleR2SwipeBeginConfirm_(id){
  var m=(CASTLE_DUEL_STATE.matches||[]).find(function(x){return x.id===id;});
  if(!m)return;
  var draft=castleR2Draft_(m);
  if(!draft.guess||!draft.choice){
    if(typeof castleNotify_==='function')castleNotify_('Choose both your prediction and your decision.',true);
    return;
  }
  castleR2SwipeSnark_(m);
  CASTLE_DUEL_R2_CONFIRMING[id]=true;
  castleR2Render_();
}
function castleR2SwipeCancelConfirm_(id){
  CASTLE_DUEL_R2_CONFIRMING[id]=false;
  castleR2Render_();
}
async function castleR2SwipeSeal_(id){
  if(CASTLE_DUEL_R2_SUBMITTING[id])return;
  var m=(CASTLE_DUEL_STATE.matches||[]).find(function(x){return x.id===id;});
  if(!m)return;
  var draft=castleR2Draft_(m);
  if(!draft.guess||!draft.choice)return;
  CASTLE_DUEL_R2_SUBMITTING[id]=true;
  castleR2Render_();
  try{
    await castleCall_('castleDuelSubmit',{roundKey:CASTLE_DUEL_STATE.round.key,matchId:id,guess:draft.guess,choice:draft.choice});
    CASTLE_DUEL_R2_CONFIRMING[id]=false;
    await castleR2ReloadState_();
  }catch(e){
    CASTLE_DUEL_R2_SUBMITTING[id]=false;
    castleR2Render_();
    if(typeof castleNotify_==='function')castleNotify_(e.message||'Could not seal your decision.',true);
  }finally{
    CASTLE_DUEL_R2_SUBMITTING[id]=false;
  }
}

function castleR2RoomTheme_(m,round){
  if(round&&round.finale)return {cls:'castle-r2-room-finale',title:'The Throne Room',sub:'Ten final tests. Every choice echoes.'};
  if(m.kind==='HUMAN')return {cls:'castle-r2-room-human',title:'The Strategy Chamber',sub:'Across the table sits another PATTC player.'};
  if(m.kind==='HOST')return {cls:'castle-r2-room-host',title:"The Host's Study",sub:'A quieter room. That does not mean a safer one.'};
  if(m.kind==='MASK'&&m.outcome==='MURDERER')return {cls:'castle-r2-room-murder',title:'The Hidden Passage',sub:'Some doors in the Castle should stay closed.'};
  if(m.kind==='MASK')return {cls:'castle-r2-room-mask',title:'The Masked Hall',sub:'The face is hidden. The risk is not.'};
  return {cls:'castle-r2-room-tv',title:'The Portrait Gallery',sub:'A familiar face waits beneath the frames.'};
}

function castleR2SwipePaper_(m){
  var panel=castleR2SwipePanel_(m),draft=castleR2Draft_(m),name=castleR2OpponentName_(m);
  var dots=`<div class="castle-r2-swipe-progress"><span class="is-active"></span><span class="${panel===1?'is-active':''}"></span></div>`;
  if(panel===0){
    return `<div class="castle-r2-swipe-wrap" ontouchstart="castleR2SwipeTouchStart_(event,'${castleEscape_(m.id)}')" ontouchend="castleR2SwipeTouchEnd_(event,'${castleEscape_(m.id)}')">${dots}<div class="castle-r2-paper"><div class="castle-r2-paper-sub">Secret Note I · Read Them</div><div class="castle-r2-script">What do you think ${castleEscape_(name)} will do?</div><div class="castle-r2-check-list">${castleR2SwipeChoice_(m,'guess','COOPERATE','Cooperate')}${castleR2SwipeChoice_(m,'guess','BETRAY','Betray')}</div></div><div class="castle-r2-swipe-actions"><span></span><button class="castle-r2-swipe-next" ${draft.guess?'':'disabled'} onclick="castleR2SwipeSetPanel_('${castleEscape_(m.id)}',1)">NEXT →</button></div><div class="castle-r2-swipe-hint">Swipe left or tap NEXT</div></div>`;
  }
  return `<div class="castle-r2-swipe-wrap" ontouchstart="castleR2SwipeTouchStart_(event,'${castleEscape_(m.id)}')" ontouchend="castleR2SwipeTouchEnd_(event,'${castleEscape_(m.id)}')">${dots}<div class="castle-r2-paper"><div class="castle-r2-paper-sub">Secret Note II · Your Move</div><div class="castle-r2-script">What will YOU do?</div><div class="castle-r2-check-list">${castleR2SwipeChoice_(m,'choice','COOPERATE','Cooperate')}${castleR2SwipeChoice_(m,'choice','BETRAY','Betray')}</div></div><div class="castle-r2-swipe-actions"><button class="castle-r2-swipe-back" onclick="castleR2SwipeSetPanel_('${castleEscape_(m.id)}',0)">← BACK</button><button class="castle-r2-swipe-next" ${draft.choice?'':'disabled'} onclick="castleR2SwipeBeginConfirm_('${castleEscape_(m.id)}')">LOCK IN DECISION</button></div><div class="castle-r2-swipe-hint">Swipe right to review your prediction</div></div>`;
}
function castleR2SwipeConfirmHtml_(m){
  var draft=castleR2Draft_(m);
  if(CASTLE_DUEL_R2_SUBMITTING[m.id]){
    return `<div class="castle-r2-submitting"><div class="castle-r2-kicker">THE CASTLE IS RECORDING YOUR CHOICE</div><h2>SEALING YOUR DECISION...</h2><div><span class="castle-r2-sealing-dot"></span><span class="castle-r2-sealing-dot"></span><span class="castle-r2-sealing-dot"></span></div><p>Your choices are being locked. Please do not tap again.</p></div>`;
  }
  return `<div class="castle-r2-confirm-card"><div class="castle-r2-snark">${castleEscape_(castleR2SwipeSnark_(m))}</div><p>Prediction: <b>${castleEscape_(draft.guess)}</b> · Your move: <b>${castleEscape_(draft.choice)}</b></p><button class="castle-r2-click-seal" onclick="castleR2SwipeSeal_('${castleEscape_(m.id)}')">CLICK TO SEAL IT</button><br><button class="castle-r2-change-link" onclick="castleR2SwipeCancelConfirm_('${castleEscape_(m.id)}')">Change my choices</button></div>`;
}
function castleR2SwipeEnvelope_(m,index,matches,settled){
  var title=settled?'DECISION REVEALED':'DECISION SEALED';
  var body=`<div class="castle-r2-envelope"><div class="castle-r2-envelope-title">${title}</div><div class="castle-r2-envelope-choice">Your Prediction: <b>${castleEscape_(m.guess||'—')}</b></div><div class="castle-r2-envelope-choice">Your Decision: <b>${castleEscape_(m.choice||'—')}</b></div>`;
  if(settled){
    body+=`<div class="castle-r2-envelope-choice">Opponent Decision: <b>${castleEscape_(m.answer||'—')}</b></div><div class="castle-r2-envelope-choice">Result: <b>${Number(m.points||0)>=0?'+':''}${castleEscape_(m.points||0)} pts</b></div>`;
  }
  body+=`<div class="castle-r2-wax-seal">C</div><div class="castle-r2-hidden-note">${settled?'The Castle has opened the record.':'Your opponent\'s decision stays hidden until settlement.'}</div></div>`;
  return body+castleR2NextButton_(index,matches);
}

function castleR2NormalControls_(m,index,matches,round){
  var locked=castleR2RoundLocked_(round);
  if(m.status==='OPEN'){
    if(locked)return `<div class="castle-r2-lock-warning">ROUND LOCKED · No additional decisions can be submitted.</div>`;
    if(CASTLE_DUEL_R2_CONFIRMING[m.id]||CASTLE_DUEL_R2_SUBMITTING[m.id])return castleR2SwipeConfirmHtml_(m);
    return castleR2SwipePaper_(m);
  }
  if(m.status==='LOCKED')return castleR2SwipeEnvelope_(m,index,matches,false);
  if(m.status==='SETTLED')return castleR2SwipeEnvelope_(m,index,matches,true);
  return '';
}

function castleR2RoomHtml_(s,index){
  var matches=s.matches||[],m=matches[index],round=s.round,players=s.leaderboard||[];
  if(!m)return castleR2SummaryHtml_(s);
  if(!castleR2WasRevealed_(m)&&!castleR2RoundLocked_(round))return castleR2SwipeStyles_()+castleR2SpinnerHtml_(m,index,matches);
  var title=castleR2OpponentName_(m),theme=castleR2RoomTheme_(m,round);
  return castleR2SwipeStyles_()+`<section class="castle-r2-stage">${castleR2ProgressHtml_(matches,index)}<div class="castle-r2-room-scene ${theme.cls}"><div class="castle-r2-room-heading"><div class="castle-r2-kicker">${castleEscape_(theme.title)}</div><h2>${castleEscape_(theme.title)}</h2><p>${castleEscape_(theme.sub)}</p></div><div class="castle-r2-room"><div class="castle-r2-portrait-wrap">${castleR2Portrait_(m,false)}${m.allied?'<div class="castle-r2-ally">CASTLE FIVE ALLY</div>':''}</div><div class="castle-r2-kicker">${m.kind==='HUMAN'?'PATTC PLAYER':m.kind==='MASK'?'MASKED ENCOUNTER':m.kind==='HOST'?'SPECIAL ENCOUNTER':'TV CONTESTANT'}</div><h2 class="castle-r2-opponent">${castleEscape_(title)}</h2>${m.allied?'<p class="castle-r2-sub">One of your chosen Castle Five has appeared.</p>':''}${m.clue?`<div class="castle-r2-insight"><b>ALLIANCE INSIGHT</b><br>Your ally suggests <b>${castleEscape_(m.clue)}</b>. This clue is 75% accurate.${m.allied?' A correct read earns the Alliance bonus.':''}</div>`:''}${castleR2HistoryHtml_(m)}${m.kind==='MASK'?castleR2MaskControls_(m,index,matches,round,players):castleR2NormalControls_(m,index,matches,round)}</div></div></section>`;
}
