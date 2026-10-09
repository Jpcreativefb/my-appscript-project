/* PATTC Castle Mobile Final Gameplay Integration R1
 * Proof-only presentation. Backend/rules/scoring remain authoritative.
 */
(function(){
  'use strict';

  var PROOF_FLAG='castleProof';
  var PROOF_VIEW='entrance';
  var PROOF_ROUND_KEY='';
  var PROOF_SELECTED_EPISODE=null;
  var PROOF_HISTORY_OPEN=false;
  var PROOF_BASE_PLAYER_MARKUP=null;
  var GRAND_ENTRANCE_ASSET='./assets/castle/rooms/grand-entrance-modern.webp';
  var GRAND_ENTRANCE_FALLBACK='./assets/castle/rooms/strategy-chamber-modern.webp';
  var PROOF_OVERLAY_STATES={
    TV:'normal-tv',PLAYER:'pattc-player',ALLY:'castle-five-ally',SUSPECT:'suspect',
    HIDDEN_TRAITOR:'hidden-traitor',REVEALED_TRAITOR:'revealed-traitor',ELIMINATED:'eliminated',
    SHIELD:'shield',DANGER:'murder-danger',HOST:'host'
  };

  function proofEnabled_(){
    try{return new URLSearchParams(window.location.search||'').get(PROOF_FLAG)==='1';}catch(e){return false;}
  }
  if(!proofEnabled_())return;

  function esc_(v){return typeof window.castleEscape_==='function'?window.castleEscape_(v):String(v==null?'':v);}
  function array_(v){return Array.isArray(v)?v:[];}
  function num_(v){var n=Number(v);return Number.isFinite(n)?n:0;}
  function roundKey_(s){return String(s&&s.round&&s.round.key||'');}
  function phase_(s){return String(s&&s.config&&s.config.phase||'REGULAR').toUpperCase();}
  function isFinalRound_(s){return !!(s&&s.round&&s.round.finale);}
  function proofResetForRound_(s){
    var key=roundKey_(s);
    if(key!==PROOF_ROUND_KEY){PROOF_ROUND_KEY=key;PROOF_VIEW='entrance';PROOF_SELECTED_EPISODE=null;PROOF_HISTORY_OPEN=false;}
  }

  function portraitLookup_(s,name){
    var key=String(name||'').trim().toLowerCase(),rows=array_(s&&s.cast).concat(array_(s&&s.leaderboard));
    if(s&&s.player)rows.push(s.player);
    var row=rows.find(function(x){return String(x&&((x.name||x.user||x.displayName)||'')).trim().toLowerCase()===key;});
    return row||{};
  }
  function proofPortraitState_(entry){
    if(entry&&entry.hiddenTraitor)return 'HIDDEN_TRAITOR';
    if(entry&&entry.host)return 'HOST';
    if(entry&&entry.shieldUsed)return 'SHIELD';
    if(entry&&entry.eliminated)return 'ELIMINATED';
    if(entry&&entry.allied)return 'ALLY';
    if(entry&&entry.kind==='HUMAN')return 'PLAYER';
    return 'TV';
  }
  function proofPortrait_(s,entry){
    entry=entry||{};
    var hidden=!!entry.hiddenTraitor;
    var name=hidden?'A Traitor':String(entry.name||entry.victim||entry.user||'Castle Player');
    var row=portraitLookup_(s,name);
    var image=hidden?'':String(entry.imageUrl||entry.profileImageUrl||row.imageUrl||row.profileImageUrl||'').trim();
    var state=proofPortraitState_(entry),overlay=PROOF_OVERLAY_STATES[state]||PROOF_OVERLAY_STATES.TV;
    var fallback=hidden?'?':(name.split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x.charAt(0);}).join('').toUpperCase()||'P');
    return '<figure class="castle-proof-portrait" data-overlay-state="'+esc_(overlay)+'">'+
      '<div class="castle-proof-photo">'+(image?'<img src="'+esc_(image)+'" alt="" loading="eager" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="castle-proof-fallback" hidden>'+esc_(fallback)+'</span>':'<span class="castle-proof-fallback">'+esc_(fallback)+'</span>')+'</div>'+
      '<figcaption><strong>'+esc_(name)+'</strong>'+(entry.status?'<span>'+esc_(entry.status)+'</span>':'')+'</figcaption></figure>';
  }

  function proofAnnouncementHistory_(s){
    var supplied=[];
    if(Array.isArray(s&&s.revealHistory))supplied=s.revealHistory.slice();
    else if(s&&s.history&&Array.isArray(s.history.announcements))supplied=s.history.announcements.slice();
    else if(Array.isArray(s&&s.announcements))supplied=s.announcements.slice();
    if(s&&s.announcement&&s.announcement.episode!==undefined){
      var exists=supplied.some(function(x){return Number(x&&x.episode)===Number(s.announcement.episode);});
      if(!exists)supplied.push(s.announcement);
    }
    return supplied.filter(function(x){return x&&x.episode!==undefined;}).sort(function(a,b){return num_(b.episode)-num_(a.episode);});
  }
  function proofCurrentAnnouncement_(s){
    var history=proofAnnouncementHistory_(s);
    if(PROOF_SELECTED_EPISODE!==null){
      var selected=history.find(function(x){return Number(x.episode)===Number(PROOF_SELECTED_EPISODE);});
      if(selected)return selected;
    }
    return history.length?history[0]:(s&&s.announcement||null);
  }
  function proofEventText_(e){
    if(!e)return '';
    var who=String(e.victim||e.name||e.user||'').trim();
    if(e.publicText)return (who?who+' — ':'')+String(e.publicText);
    if(e.tvEliminated||e.eventType==='TV_ELIMINATED')return (who||'Contestant')+' — Eliminated from the TV season';
    if(e.finalLifeLost||e.eliminated)return (who||'Player')+' — Lost final Castle life — Out of Castle championship';
    if(e.shieldUsed)return (who||'Player')+' — Murder avoided — Secret Shield used';
    if(e.lost)return (who||'Player')+' — Lost 1 Castle life';
    if(e.banishLife)return (who||'Player')+' — Castle life affected by Banish pressure';
    return '';
  }
  function proofFeatured_(s,a){
    var entries=[];
    array_(a&&a.events).forEach(function(e){
      var text=proofEventText_(e);if(!text)return;
      entries.push({name:e.victim||e.name||e.user,status:text.replace(/^.*? — /,''),shieldUsed:!!e.shieldUsed,eliminated:!!(e.finalLifeLost||e.eliminated||e.tvEliminated)});
    });
    if(!entries.length&&s&&s.privateNotice){
      var n=s.privateNotice,who=s.player&&s.player.user||'You';
      entries.push({name:who,status:n.shieldUsed?'Secret Shield protected you':n.lost?'Lost 1 Castle life':'Castle event recorded',shieldUsed:!!n.shieldUsed,kind:'HUMAN'});
    }
    var seen={};
    entries=entries.filter(function(x){var k=String(x.name||'').toLowerCase();if(!k||seen[k])return false;seen[k]=true;return true;}).slice(0,4);
    return entries.length?'<div class="castle-proof-featured">'+entries.map(function(x){return proofPortrait_(s,x);}).join('')+'</div>':'';
  }
  function proofLedger_(a){
    var rows=array_(a&&a.events).map(proofEventText_).filter(Boolean);
    if(!rows.length)return '<div class="castle-proof-empty">No Castle reveal events were supplied for this episode.</div>';
    return '<div class="castle-proof-ledger">'+rows.map(function(x){return '<div class="castle-proof-ledger-row"><span class="castle-proof-dot"></span><span>'+esc_(x)+'</span></div>';}).join('')+'</div>';
  }
  function proofHistoryControl_(s,current){
    var history=proofAnnouncementHistory_(s);
    if(history.length<2)return '<div class="castle-proof-history-empty">History becomes available after additional settled episodes.</div>';
    return '<div class="castle-proof-history"><button type="button" class="castle-proof-history-toggle" onclick="castleProofToggleHistory_()">Earlier Castle Reveals '+(PROOF_HISTORY_OPEN?'▴':'▾')+'</button>'+
      (PROOF_HISTORY_OPEN?'<div class="castle-proof-history-list">'+history.map(function(x){var selected=current&&Number(current.episode)===Number(x.episode);return '<button type="button" class="'+(selected?'is-selected':'')+'" onclick="castleProofSelectEpisode_('+Number(x.episode)+')">Episode '+esc_(x.episode)+'</button>';}).join('')+'</div>':'')+'</div>';
  }
  function proofHasOpenEncounters_(s){return array_(s&&s.matches).some(function(m){return ['OPEN','TARGET_REQUIRED','IDENTIFY_REQUIRED','FATE_REQUIRED','HOST_REQUIRED','MASK_DUEL_REQUIRED'].indexOf(String(m&&m.status||''))>=0;});}
  function proofEntranceCta_(s){
    if(isFinalRound_(s)&&array_(s.matches).length)return '<button class="castle-proof-primary" onclick="castleProofGoFinalThree_()">CONTINUE TO THE FINAL THREE</button>';
    if(proofHasOpenEncounters_(s))return '<button class="castle-proof-primary" onclick="castleProofEnterEncounters_()">STEP INTO TONIGHT\'S ENCOUNTERS</button>';
    if(array_(s&&s.matches).length)return '<div class="castle-proof-state-line">YOUR NIGHT IS SEALED</div>';
    return '<div class="castle-proof-state-line">THE CASTLE AWAITS THE NEXT EPISODE</div>';
  }
  function proofEntrance_(s){
    var a=proofCurrentAnnouncement_(s),ep=a&&a.episode!==undefined?a.episode:(s&&s.round&&Math.max(1,num_(s.round.number)-1)||'—');
    return '<section class="castle-proof-entrance">'+
      '<div class="castle-proof-entrance-head"><div><div class="castle-proof-kicker">PREVIOUS CASTLE REVEAL</div><h1>Episode '+esc_(ep)+'</h1></div><div class="castle-proof-jackpot"><span>CASTLE JACKPOT</span><strong>'+esc_(s&&s.config&&s.config.jackpot!==undefined?s.config.jackpot:'—')+'</strong></div></div>'+
      (a?proofFeatured_(s,a):'<div class="castle-proof-empty">The previous Castle reveal becomes available after settlement.</div>')+
      (a?proofLedger_(a):'')+proofHistoryControl_(s,a)+proofEntranceCta_(s)+'</section>';
  }

  function proofDecisionSealed_(m,index,matches){
    return '<section class="castle-proof-sealed"><div class="castle-proof-seal-mark">C</div><div class="castle-proof-kicker">Decision</div><h2>Sealed</h2><p>Your Prediction: <b>'+esc_(m.guess||'—')+'</b><br>Your Decision: <b>'+esc_(m.choice||'—')+'</b></p>'+
      (index+1<matches.length?'<button class="castle-proof-secondary" onclick="castleR2Next_()">ENTER ENCOUNTER '+(index+2)+'</button>':'<button class="castle-proof-secondary" onclick="castleR2ShowSummary_()">COMPLETE THE NIGHT</button>')+'</section>';
  }
  function proofRoundComplete_(s){
    var round=s&&s.round||{},finale=!!round.finale;
    return '<section class="castle-proof-complete"><div class="castle-proof-kicker">'+(finale?'FINALE COMPLETE':'ROUND COMPLETE')+'</div><h1>'+(finale?'YOUR FINALE IS SEALED':'YOUR NIGHT IS SEALED')+'</h1><p>'+(String(round.status||'').toUpperCase()==='SETTLED'?(finale?'The Throne Room has closed. The winner remains sealed until authorized.':'The Castle has spoken. Your next entry will begin with the latest Castle Reveal.'):'Opponent decisions remain hidden until episode settlement.')+'</p><div class="castle-proof-state-line">'+(round.lockAt?'Castle deadline · '+esc_(new Date(round.lockAt).toLocaleString()):'Settlement pending')+'</div></section>';
  }
  function proofEncounter_(s){
    if(typeof window.castleR2EnsureState_==='function')window.castleR2EnsureState_(s);
    var matches=array_(s.matches),index=Number(window.CASTLE_DUEL_R2_ROOM_INDEX||0),m=matches[index];
    if(window.CASTLE_DUEL_R2_SUMMARY||!m)return proofRoundComplete_(s);
    if(m.status==='LOCKED'&&m.kind!=='MASK')return '<section class="castle-proof-encounter-wrap">'+(typeof window.castleR2ProgressHtml_==='function'?window.castleR2ProgressHtml_(matches,index):'')+proofDecisionSealed_(m,index,matches)+'</section>';
    return '<div class="castle-proof-encounter-wrap">'+window.castleR2RoomHtml_(s,index)+'</div>';
  }
  function proofFinaleEncounter_(s){
    if(typeof window.castleR2EnsureState_==='function')window.castleR2EnsureState_(s);
    var matches=array_(s.matches),index=Number(window.CASTLE_DUEL_R2_ROOM_INDEX||0),m=matches[index];
    if(window.CASTLE_DUEL_R2_SUMMARY||!m)return proofRoundComplete_(s);
    if(m.status==='LOCKED')return '<section class="castle-proof-encounter-wrap">'+(typeof window.castleR2ProgressHtml_==='function'?window.castleR2ProgressHtml_(matches,index):'')+proofDecisionSealed_(m,index,matches)+'</section>';
    if(typeof window.castleR2WasRevealed_==='function'&&!window.castleR2WasRevealed_(m)&&!window.castleR2RoundLocked_(s.round))return window.castleR2SpinnerHtml_(m,index,matches);
    if(typeof window.castleMatchHtml_==='function')return '<section class="castle-proof-finale-match">'+(typeof window.castleR2ProgressHtml_==='function'?window.castleR2ProgressHtml_(matches,index):'')+window.castleMatchHtml_(m,s.round,s.player,array_(s.leaderboard))+'</section>';
    return proofEncounter_(s);
  }

  function proofFinalistAuthorized_(s){return isFinalRound_(s)&&array_(s&&s.matches).length>0;}
  function proofFinalThree_(s){
    var finale=s&&s.finale||{},finalists=array_(finale.finalists||s&&s.round&&s.round.finalists);
    var body=finalists.length?'<div class="castle-proof-finalists">'+finalists.slice(0,3).map(function(x){return proofPortrait_(s,typeof x==='string'?{name:x,kind:'HUMAN'}:x);}).join('')+'</div>':'<div class="castle-proof-empty">Finalist portraits are awaiting an authorized finalist list from Castle state.</div>';
    return '<section class="castle-proof-finale-shell"><div class="castle-proof-kicker">THE FINAL THREE</div><h1>Three remain.</h1><div class="castle-proof-jackpot"><span>CASTLE JACKPOT</span><strong>'+esc_(s&&s.config&&s.config.jackpot!==undefined?s.config.jackpot:'—')+'</strong></div>'+body+'<button class="castle-proof-primary" onclick="castleProofGoArmory_()">ENTER THE FINALE ARMORY</button></section>';
  }
  function proofArmory_(s){
    var p=s&&s.player||{},armory=s&&s.finaleArmory||{};
    var inventory=Array.isArray(armory.murderAdvantages)?armory.murderAdvantages:[];
    return '<section class="castle-proof-finale-shell"><div class="castle-proof-kicker">FINALE ARMORY</div><h1>Prepare before the Throne Room.</h1><div class="castle-proof-armory-grid"><div><span>Finale Tokens</span><strong>'+esc_(p.finaleTokens!==undefined?p.finaleTokens:'—')+'</strong></div><div><span>Finale Shield</span><strong>'+esc_(p.finaleShield!==undefined?p.finaleShield:'—')+'</strong></div></div>'+(inventory.length?'<div class="castle-proof-ledger">'+inventory.map(function(x){return '<div class="castle-proof-ledger-row"><span class="castle-proof-dot"></span><span>'+esc_(x.label||x.type||'Murder Advantage')+'</span></div>';}).join('')+'</div>':'<div class="castle-proof-empty">Murder Advantage inventory is awaiting an authorized Armory payload.</div>')+'<p class="castle-proof-muted">Only server-authorized inventory is shown. Finale powers continue to use the existing Castle handlers.</p><button class="castle-proof-primary" onclick="castleProofEnterThrone_()">ENTER THE THRONE ROOM</button></section>';
  }
  function proofThrone_(s){
    if(!array_(s&&s.matches).length)return '<section class="castle-proof-finale-shell"><div class="castle-proof-kicker">THRONE ROOM</div><h1>The final encounters are not available yet.</h1></section>';
    return '<section class="castle-proof-throne"><div class="castle-proof-throne-head"><div class="castle-proof-kicker">THRONE ROOM</div><h1>Finale Encounters</h1><p>'+esc_(array_(s.matches).length)+' private encounters supplied by the Castle.</p></div>'+proofFinaleEncounter_(s)+'</section>';
  }
  function proofWinner_(s){
    var f=s&&s.finale;
    if(!f||phase_(s)!=='COMPLETE')return '<section class="castle-proof-finale-shell"><div class="castle-proof-kicker">CASTLE FINALE</div><h1>The winner remains sealed.</h1></section>';
    return '<section class="castle-proof-winner"><div class="castle-proof-kicker">THE CASTLE HAS SPOKEN</div><h1>'+esc_(f.winner||'Castle Champion')+'</h1><p>CASTLE JACKPOT</p><strong>'+esc_(f.jackpot!==undefined?f.jackpot:'—')+'</strong></section>';
  }
  function proofFinale_(s){
    if(phase_(s)==='COMPLETE')return proofWinner_(s);
    if(!proofFinalistAuthorized_(s))return '<section class="castle-proof-finale-shell"><div class="castle-proof-kicker">THE FINAL THREE</div><h1>Finale status is waiting on authorized Castle state.</h1></section>';
    if(PROOF_VIEW==='armory')return proofArmory_(s);
    if(PROOF_VIEW==='throne')return proofThrone_(s);
    return proofFinalThree_(s);
  }

  function proofStyles_(){return '<style id="castleMobileFinalGameplayR1Styles">'+
    '.castle-proof-page{max-width:880px;margin:0 auto;padding:7px 5px 96px;color:#f7f0e3;font-family:Georgia,"Times New Roman",serif}.castle-proof-page *{box-sizing:border-box}.castle-proof-page button{font-family:inherit}.castle-proof-entrance,.castle-proof-complete,.castle-proof-finale-shell,.castle-proof-winner{position:relative;overflow:hidden;border:1px solid rgba(215,178,105,.42);border-radius:5px;padding:42px 14px 16px;background-image:linear-gradient(180deg,rgba(9,8,10,.38),rgba(9,8,10,.82)),url("'+GRAND_ENTRANCE_ASSET+'"),url("'+GRAND_ENTRANCE_FALLBACK+'");background-size:cover;background-position:center top;background-repeat:no-repeat;box-shadow:0 18px 42px rgba(0,0,0,.32)}'+
    '.castle-proof-entrance-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.castle-proof-kicker{font:700 11px/1.1 system-ui,sans-serif;letter-spacing:.13em;color:#dfc17b}.castle-proof-entrance h1,.castle-proof-complete h1,.castle-proof-finale-shell h1,.castle-proof-winner h1{margin:3px 0 10px;font-size:clamp(26px,8vw,38px);line-height:1}.castle-proof-jackpot{min-width:112px;padding:7px 9px;border:1px solid rgba(220,186,115,.36);border-radius:4px;background:rgba(15,13,15,.58);text-align:right}.castle-proof-jackpot span{display:block;font:700 9px/1 system-ui,sans-serif;letter-spacing:.08em;color:#d8c08a}.castle-proof-jackpot strong{font-size:22px;color:#fff0bc}.castle-proof-featured,.castle-proof-finalists{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.castle-proof-portrait{margin:0;overflow:hidden;border:1px solid rgba(216,180,109,.42);border-radius:4px;background:rgba(16,14,17,.66)}.castle-proof-photo{position:relative;aspect-ratio:4/3;background:radial-gradient(circle at 50% 28%,#5b4a50,#171419 75%);display:grid;place-items:center;overflow:hidden}.castle-proof-photo img{width:100%;height:100%;object-fit:cover}.castle-proof-fallback{display:grid;place-items:center;width:46%;aspect-ratio:1;border:1px solid #d9bd7e;border-radius:50%;font:700 34px/1 system-ui,sans-serif;color:#ead39b;background:rgba(0,0,0,.3)}.castle-proof-fallback[hidden]{display:none!important}.castle-proof-portrait figcaption{padding:7px 8px;background:linear-gradient(180deg,rgba(18,15,18,.72),rgba(8,7,9,.92))}.castle-proof-portrait strong,.castle-proof-portrait span{display:block}.castle-proof-portrait strong{font-size:16px}.castle-proof-portrait span{margin-top:2px;font:600 10px/1.2 system-ui,sans-serif;color:#dbc995}.castle-proof-ledger{max-height:166px;overflow:auto;margin:8px 0;padding:4px 10px;border:1px solid rgba(255,255,255,.12);border-radius:4px;background:rgba(11,10,12,.52)}.castle-proof-ledger-row{display:grid;grid-template-columns:8px 1fr;gap:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,.08);font-size:13px}.castle-proof-ledger-row:first-child{border-top:0}.castle-proof-dot{width:6px;height:6px;margin-top:5px;border-radius:50%;background:#d4ad5c}.castle-proof-history{margin:9px 0}.castle-proof-history-toggle,.castle-proof-history-list button{width:100%;border:1px solid rgba(218,181,108,.32);border-radius:4px;background:rgba(18,16,19,.58);color:#f1e4c5;min-height:38px;text-align:left;padding:8px 10px}.castle-proof-history-list{display:grid;gap:4px;margin-top:4px}.castle-proof-history-list button.is-selected{background:rgba(202,158,77,.18);border-color:#c9a25d}.castle-proof-primary,.castle-proof-secondary{width:100%;min-height:46px;border-radius:4px;font-weight:700;letter-spacing:.035em}.castle-proof-primary{margin-top:12px;border:1px solid #dfc17b;background:rgba(211,172,93,.92);color:#25190c}.castle-proof-secondary{margin-top:10px;border:1px solid rgba(223,193,123,.5);background:rgba(21,18,22,.56);color:#f5e4b9}.castle-proof-state-line,.castle-proof-empty,.castle-proof-history-empty,.castle-proof-muted{margin:9px 0;padding:9px 10px;border:1px solid rgba(255,255,255,.11);border-radius:4px;background:rgba(14,12,15,.5);font-size:12px}.castle-proof-encounter-wrap .castle-r2-stage{margin-top:0}.castle-proof-sealed{max-width:350px;margin:36px auto 12px;padding:16px 14px;border:1px solid rgba(219,181,105,.46);border-radius:4px;text-align:center;background:linear-gradient(180deg,rgba(36,28,27,.78),rgba(15,13,16,.88));box-shadow:0 14px 34px rgba(0,0,0,.34)}.castle-proof-sealed h2{font-size:31px;margin:0 0 8px}.castle-proof-seal-mark{display:grid;place-items:center;width:48px;height:48px;margin:-38px auto 8px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#a13d3d,#5b1419);border:2px solid #be6b5e;color:#e8b7a1;font-weight:700}.castle-proof-complete{text-align:center;min-height:330px;display:flex;flex-direction:column;justify-content:center}.castle-proof-armory-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.castle-proof-armory-grid>div{padding:12px;border:1px solid rgba(216,180,109,.3);border-radius:4px;background:rgba(14,12,15,.56)}.castle-proof-armory-grid span,.castle-proof-armory-grid strong{display:block}.castle-proof-armory-grid strong{font-size:30px;color:#f0d38d}.castle-proof-throne-head{padding:36px 14px 12px;border:1px solid rgba(216,180,109,.38);border-radius:4px;background:linear-gradient(180deg,rgba(8,7,9,.3),rgba(8,7,9,.78)),url("./assets/castle/rooms/throne-room-modern.webp") center top/cover no-repeat}.castle-proof-throne-head h1{margin:2px 0;font-size:30px}.castle-proof-finale-match>.card{margin:8px 0!important;border-radius:5px!important;background:rgba(22,18,22,.72)!important;border:1px solid rgba(216,180,109,.3)!important}.castle-proof-winner{text-align:center;min-height:440px;display:flex;flex-direction:column;justify-content:center;background-image:linear-gradient(180deg,rgba(9,8,10,.25),rgba(9,8,10,.72)),url("./assets/castle/rooms/throne-room-modern.webp")}.castle-proof-winner>strong{font-size:42px;color:#f3d27f}.castle-proof-winner>p{margin-bottom:2px;letter-spacing:.12em;font-size:11px}.castle-proof-page .castle-r2-sealed{border-radius:4px!important}.castle-proof-page .castle-r2-stage,.castle-proof-page .castle-r2-room-scene,.castle-proof-page .castle-r2-paper{border-radius:5px!important}'+
    '@media(max-width:375px){.castle-proof-page{padding-left:3px;padding-right:3px}.castle-proof-entrance,.castle-proof-complete,.castle-proof-finale-shell{padding-left:10px;padding-right:10px}.castle-proof-featured{gap:6px}.castle-proof-jackpot{min-width:102px}}'+
    '@media(min-width:410px) and (max-width:560px){.castle-proof-page{padding-left:7px;padding-right:7px}.castle-proof-featured,.castle-proof-finalists{gap:10px}.castle-proof-portrait figcaption{padding-left:10px;padding-right:10px}}'+
    '</style>';}

  function proofMarkup_(s){
    if(!s||!s.player||!s.round)return PROOF_BASE_PLAYER_MARKUP?PROOF_BASE_PLAYER_MARKUP(s):'';
    proofResetForRound_(s);
    var body='';
    if(isFinalRound_(s)||phase_(s)==='FINAL'||phase_(s)==='COMPLETE')body=proofFinale_(s);
    else if(PROOF_VIEW==='encounters')body=proofEncounter_(s);
    else body=proofEntrance_(s);
    return window.castleStyles_()+window.castleR2Styles_()+proofStyles_()+'<div class="page castle-proof-page" data-castle-proof="1">'+body+'</div>';
  }
  function proofRender_(){var app=document.getElementById('app');if(app&&window.CASTLE_DUEL_STATE)app.innerHTML=proofMarkup_(window.CASTLE_DUEL_STATE);}

  window.castleProofToggleHistory_=function(){PROOF_HISTORY_OPEN=!PROOF_HISTORY_OPEN;proofRender_();};
  window.castleProofSelectEpisode_=function(ep){PROOF_SELECTED_EPISODE=Number(ep);PROOF_HISTORY_OPEN=true;proofRender_();};
  window.castleProofEnterEncounters_=function(){PROOF_VIEW='encounters';window.CASTLE_DUEL_R2_SUMMARY=false;var matches=array_(window.CASTLE_DUEL_STATE&&window.CASTLE_DUEL_STATE.matches);var first=matches.findIndex(function(m){return ['OPEN','TARGET_REQUIRED','IDENTIFY_REQUIRED','FATE_REQUIRED','HOST_REQUIRED','MASK_DUEL_REQUIRED'].indexOf(String(m&&m.status||''))>=0;});window.CASTLE_DUEL_R2_ROOM_INDEX=first>=0?first:0;proofRender_();};
  window.castleProofGoFinalThree_=function(){PROOF_VIEW='final-three';proofRender_();};
  window.castleProofGoArmory_=function(){PROOF_VIEW='armory';proofRender_();};
  window.castleProofEnterThrone_=function(){PROOF_VIEW='throne';window.CASTLE_DUEL_R2_SUMMARY=false;window.CASTLE_DUEL_R2_ROOM_INDEX=0;proofRender_();};
  window.castleProofReturnEntrance_=function(){PROOF_VIEW='entrance';proofRender_();};

  function install_(){
    if(window.CASTLE_DUEL_MOBILE_FINAL_GAMEPLAY_R1_INSTALLED)return true;
    if(!proofEnabled_()||typeof window.castlePlayerMarkup_!=='function'||typeof window.castleR2RoomHtml_!=='function'||typeof window.castleR2Styles_!=='function')return false;
    PROOF_BASE_PLAYER_MARKUP=window.castlePlayerMarkup_;
    window.CASTLE_DUEL_MOBILE_FINAL_GAMEPLAY_R1_INSTALLED=true;
    window.castleProofAnnouncementHistory_=proofAnnouncementHistory_;
    window.castleProofEventText_=proofEventText_;
    window.castleProofPortrait_=proofPortrait_;
    window.castleProofMarkup_=proofMarkup_;
    window.castlePlayerMarkup_=function(s){return proofEnabled_()?proofMarkup_(s):PROOF_BASE_PLAYER_MARKUP(s);};
    if(window.CASTLE_DUEL_STATE)proofRender_();
    return true;
  }
  if(!install_()){
    var tries=0,timer=setInterval(function(){tries+=1;if(install_()||tries>240)clearInterval(timer);},25);
  }
})();
