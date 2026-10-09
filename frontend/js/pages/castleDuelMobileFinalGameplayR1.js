/* PATTC Castle Mobile Final Gameplay Integration R2
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
  var PROOF_BASE_PORTRAIT=null;
  var PROOF_TARGET_SELECTION={};
  var GRAND_ENTRANCE_ASSET='./assets/castle/rooms/grand-entrance-modern.webp';
  var GRAND_ENTRANCE_FALLBACK='./assets/castle/rooms/strategy-chamber-modern.webp';
  var PROOF_OVERLAY_STATES={
    TV:'normal-tv',PLAYER:'pattc-player',ALLY:'castle-five-ally',SUSPECT:'suspect',
    HIDDEN_TRAITOR:'hidden-traitor',REVEALED_TRAITOR:'revealed-traitor',ELIMINATED:'eliminated',
    SHIELD:'shield',DANGER:'murder-danger',HOST:'host'
  };
  var PROOF_OVERLAY_ASSETS={
    TV:'./assets/castle/overlays/portrait-normal.svg',
    PLAYER:'./assets/castle/overlays/portrait-pattc-player.svg',
    ALLY:'./assets/castle/overlays/portrait-castle-five.svg',
    SUSPECT:'./assets/castle/overlays/portrait-suspect.svg',
    HIDDEN_TRAITOR:'./assets/castle/overlays/portrait-hidden-traitor.svg',
    REVEALED_TRAITOR:'./assets/castle/overlays/portrait-revealed-traitor.svg',
    ELIMINATED:'./assets/castle/overlays/portrait-eliminated.svg',
    SHIELD:'./assets/castle/overlays/portrait-shield.svg',
    DANGER:'./assets/castle/overlays/portrait-murder-danger.svg',
    HOST:'./assets/castle/overlays/portrait-host.svg'
  };

  function proofEnabled_(){try{return new URLSearchParams(window.location.search||'').get(PROOF_FLAG)==='1';}catch(e){return false;}}
  if(!proofEnabled_())return;

  function loadSpecialCards_(){
    if(window.CastleSpecialEncounterCardsR2||window.CASTLE_DUEL_SPECIAL_CARDS_R2_LOADING)return;
    window.CASTLE_DUEL_SPECIAL_CARDS_R2_LOADING=true;
    var script=document.createElement('script');
    script.src='./js/pages/castleDuelSpecialCardsR1.js?v=castle-special-card-pack-r2';
    script.async=true;
    script.onerror=function(){window.CASTLE_DUEL_SPECIAL_CARDS_R2_LOADING=false;};
    document.head.appendChild(script);
  }
  loadSpecialCards_();

  function esc_(v){return typeof window.castleEscape_==='function'?window.castleEscape_(v):String(v==null?'':v);}
  function array_(v){return Array.isArray(v)?v:[];}
  function num_(v){var n=Number(v);return Number.isFinite(n)?n:0;}
  function roundKey_(s){return String(s&&s.round&&s.round.key||'');}
  function phase_(s){return String(s&&s.config&&s.config.phase||'REGULAR').toUpperCase();}
  function isFinalRound_(s){return !!(s&&s.round&&s.round.finale);}
  function activeStatus_(m){return ['OPEN','TARGET_REQUIRED','IDENTIFY_REQUIRED','FATE_REQUIRED','HOST_REQUIRED','MASK_DUEL_REQUIRED'].indexOf(String(m&&m.status||''))>=0;}
  function hiddenTraitor_(m){return !!(m&&(String(m.opponent||'').toLowerCase()==='a traitor'||(m.traitorStage&&m.identityRevealed!==true&&m.status!=='IDENTIFY_REQUIRED')));}
  function proofResetForRound_(s){var key=roundKey_(s);if(key!==PROOF_ROUND_KEY){PROOF_ROUND_KEY=key;PROOF_VIEW='entrance';PROOF_SELECTED_EPISODE=null;PROOF_HISTORY_OPEN=false;PROOF_TARGET_SELECTION={};}}

  function portraitLookup_(s,name){
    var key=String(name||'').trim().toLowerCase(),rows=array_(s&&s.cast).concat(array_(s&&s.leaderboard));
    if(s&&s.player)rows.push(s.player);
    return rows.find(function(x){return String(x&&((x.name||x.user||x.displayName)||'')).trim().toLowerCase()===key;})||{};
  }
  function proofPortraitState_(entry){
    if(entry&&entry.hiddenTraitor)return 'HIDDEN_TRAITOR';
    if(entry&&entry.revealedTraitor)return 'REVEALED_TRAITOR';
    if(entry&&entry.suspect)return 'SUSPECT';
    if(entry&&entry.host)return 'HOST';
    if(entry&&entry.shieldUsed)return 'SHIELD';
    if(entry&&entry.danger)return 'DANGER';
    if(entry&&entry.eliminated)return 'ELIMINATED';
    if(entry&&entry.allied)return 'ALLY';
    if(entry&&entry.kind==='HUMAN')return 'PLAYER';
    return 'TV';
  }
  function proofPortrait_(s,entry,compact){
    entry=entry||{};
    var hidden=!!entry.hiddenTraitor,state=proofPortraitState_(entry);
    var name=hidden?'A Traitor':String(entry.name||entry.opponent||entry.victim||entry.user||'Castle Player');
    var row=hidden?{}:portraitLookup_(s,name);
    var image=hidden?'':String(entry.imageUrl||entry.profileImageUrl||row.imageUrl||row.profileImageUrl||'').trim();
    var overlay=PROOF_OVERLAY_ASSETS[state]||PROOF_OVERLAY_ASSETS.TV;
    var fallback=hidden?'?':(name.split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x.charAt(0);}).join('').toUpperCase()||'P');
    var role=hidden?'Hidden Traitor':String(entry.status||entry.roleLabel||(state==='PLAYER'?'PATTC Player':state==='ALLY'?'Castle Five Ally':state==='REVEALED_TRAITOR'?'Revealed Traitor':state==='HOST'?'Host':'TV Contestant'));
    return '<figure class="castle-proof-portrait '+(compact?'castle-r2-summary-avatar':'castle-r2-portrait')+'" data-overlay-state="'+esc_(PROOF_OVERLAY_STATES[state]||PROOF_OVERLAY_STATES.TV)+'">'+
      '<div class="castle-proof-photo">'+(image?'<img class="castle-proof-person-image" src="'+esc_(image)+'" alt="" loading="eager" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="castle-proof-fallback" hidden>'+esc_(fallback)+'</span>':'<span class="castle-proof-fallback">'+esc_(fallback)+'</span>')+
      '<img class="castle-proof-portrait-overlay" src="'+esc_(overlay)+'" alt="" aria-hidden="true"></div>'+
      '<figcaption><strong class="castle-proof-live-name">'+esc_(name)+'</strong><span class="castle-proof-live-role">'+esc_(role)+'</span></figcaption></figure>';
  }
  function proofR2Portrait_(m,compact){
    m=m||{};var hidden=hiddenTraitor_(m);
    return proofPortrait_(window.CASTLE_DUEL_STATE,{name:hidden?'A Traitor':m.opponent,kind:m.kind,imageUrl:hidden?'':m.imageUrl,profileImageUrl:hidden?'':m.profileImageUrl,allied:!!m.allied,host:m.kind==='HOST',hiddenTraitor:hidden,revealedTraitor:!!(m.identityRevealed&&m.role==='TRAITOR')},compact);
  }

  function cards_(){return window.CastleSpecialEncounterCardsR2||null;}
  function normalizeSpecialPaths_(html){return String(html||'').replace(/frontend\/assets\//g,'./assets/');}
  function specialStyle_(){var c=cards_();return c?'<style id="castleSpecialEncounterCardsR2Styles">'+normalizeSpecialPaths_(c.style)+'</style>':'';}
  function decorateSpecialPortraits_(html,state){
    var asset=PROOF_OVERLAY_ASSETS[state]||PROOF_OVERLAY_ASSETS.TV;
    return String(html||'').replace(/<span class="csp2-portrait-hook" aria-hidden="true"><\/span>/g,'<img class="castle-proof-csp-overlay" src="'+asset+'" alt="" aria-hidden="true">');
  }
  function specialHtml_(method,args,state){var c=cards_();if(!c||typeof c[method]!=='function')return '';var html=normalizeSpecialPaths_(c[method](args||{}));return state?decorateSpecialPortraits_(html,state):html;}
  function personForMatch_(s,m,state){
    var hidden=state==='HIDDEN_TRAITOR'||hiddenTraitor_(m),name=hidden?'A Traitor':String(m&&m.opponent||'Castle Opponent'),row=hidden?{}:portraitLookup_(s,name);
    return {id:m&&m.contestantId||'',name:name,image:hidden?'':String(m&&m.imageUrl||row.imageUrl||''),alt:hidden?'':name};
  }

  function proofAnnouncementHistory_(s){
    var supplied=[];
    if(Array.isArray(s&&s.revealHistory))supplied=s.revealHistory.slice();
    else if(s&&s.history&&Array.isArray(s.history.announcements))supplied=s.history.announcements.slice();
    else if(Array.isArray(s&&s.announcements))supplied=s.announcements.slice();
    if(s&&s.announcement&&s.announcement.episode!==undefined){var exists=supplied.some(function(x){return Number(x&&x.episode)===Number(s.announcement.episode);});if(!exists)supplied.push(s.announcement);}
    return supplied.filter(function(x){return x&&x.episode!==undefined;}).sort(function(a,b){return num_(b.episode)-num_(a.episode);});
  }
  function proofCurrentAnnouncement_(s){var history=proofAnnouncementHistory_(s);if(PROOF_SELECTED_EPISODE!==null){var selected=history.find(function(x){return Number(x.episode)===Number(PROOF_SELECTED_EPISODE);});if(selected)return selected;}return history.length?history[0]:(s&&s.announcement||null);}
  function proofEventText_(e){
    if(!e)return '';var who=String(e.victim||e.name||e.user||'').trim();
    if(e.publicText)return (who?who+' — ':'')+String(e.publicText);
    if(e.tvEliminated||e.eventType==='TV_ELIMINATED')return (who||'Contestant')+' — Eliminated from the TV season';
    if(e.finalLifeLost||e.eliminated)return (who||'Player')+' — Lost final Castle life — Out of Castle championship';
    if(e.shieldUsed)return (who||'Player')+' — Murder avoided — Secret Shield used';
    if(e.lost)return (who||'Player')+' — Lost 1 Castle life';
    if(e.banishLife)return (who||'Player')+' — Castle life affected by Banish pressure';
    return '';
  }
  function proofFeatured_(s,a){
    var entries=[];array_(a&&a.events).forEach(function(e){var text=proofEventText_(e);if(!text)return;entries.push({name:e.victim||e.name||e.user,status:text.replace(/^.*? — /,''),shieldUsed:!!e.shieldUsed,danger:!!(!e.shieldUsed&&!e.lost&&e.source&&e.source!=='ABSENCE'),eliminated:!!(e.finalLifeLost||e.eliminated||e.tvEliminated),kind:e.tvEliminated?'TV':'HUMAN'});});
    if(!entries.length&&s&&s.privateNotice){var n=s.privateNotice,who=s.player&&s.player.user||'You';entries.push({name:who,status:n.shieldUsed?'Secret Shield protected you':n.lost?'Lost 1 Castle life':'Castle event recorded',shieldUsed:!!n.shieldUsed,danger:!n.shieldUsed&&!n.lost,kind:'HUMAN'});}
    var seen={};entries=entries.filter(function(x){var k=String(x.name||'').toLowerCase();if(!k||seen[k])return false;seen[k]=true;return true;}).slice(0,4);
    return entries.length?'<div class="castle-proof-featured">'+entries.map(function(x){return proofPortrait_(s,x,false);}).join('')+'</div>':'';
  }
  function proofLedger_(a){var rows=array_(a&&a.events).map(proofEventText_).filter(Boolean);if(!rows.length)return '<div class="castle-proof-empty">No Castle reveal events were supplied for this episode.</div>';return '<div class="castle-proof-ledger">'+rows.map(function(x){return '<div class="castle-proof-ledger-row"><span class="castle-proof-dot"></span><span>'+esc_(x)+'</span></div>';}).join('')+'</div>';}
  function proofHistoryControl_(s,current){var history=proofAnnouncementHistory_(s);if(history.length<2)return '<div class="castle-proof-history-empty">History becomes available after additional settled episodes.</div>';return '<div class="castle-proof-history"><button type="button" class="castle-proof-history-toggle" onclick="castleProofToggleHistory_()">Earlier Castle Reveals '+(PROOF_HISTORY_OPEN?'▴':'▾')+'</button>'+(PROOF_HISTORY_OPEN?'<div class="castle-proof-history-list">'+history.map(function(x){var selected=current&&Number(current.episode)===Number(x.episode);return '<button type="button" class="'+(selected?'is-selected':'')+'" onclick="castleProofSelectEpisode_('+Number(x.episode)+')">Episode '+esc_(x.episode)+'</button>';}).join('')+'</div>':'')+'</div>';}
  function proofHasOpenEncounters_(s){return array_(s&&s.matches).some(activeStatus_);}
  function proofEntranceCta_(s){if(isFinalRound_(s)&&array_(s.matches).length)return '<button class="castle-proof-primary" onclick="castleProofGoFinalThree_()">CONTINUE TO THE FINAL THREE</button>';if(proofHasOpenEncounters_(s))return '<button class="castle-proof-primary" onclick="castleProofEnterEncounters_()">STEP INTO TONIGHT\'S ENCOUNTERS</button>';if(array_(s&&s.matches).length)return '<div class="castle-proof-state-line">YOUR NIGHT IS SEALED</div>';return '<div class="castle-proof-state-line">THE CASTLE AWAITS THE NEXT EPISODE</div>';}
  function proofEntrance_(s){var a=proofCurrentAnnouncement_(s),ep=a&&a.episode!==undefined?a.episode:(s&&s.round&&Math.max(1,num_(s.round.number)-1)||'—');return '<section class="castle-proof-entrance"><div class="castle-proof-entrance-head"><div><div class="castle-proof-kicker">PREVIOUS CASTLE REVEAL</div><h1>Episode '+esc_(ep)+'</h1></div><div class="castle-proof-jackpot"><span>CASTLE JACKPOT</span><strong>'+esc_(s&&s.config&&s.config.jackpot!==undefined?s.config.jackpot:'—')+'</strong></div></div>'+(a?proofFeatured_(s,a):'<div class="castle-proof-empty">The previous Castle reveal becomes available after settlement.</div>')+(a?proofLedger_(a):'')+proofHistoryControl_(s,a)+proofEntranceCta_(s)+'</section>';}

  function wireTraitorGuess_(s,m){
    var list=array_(m.traitorCandidates),selected=window.CASTLE_DUEL_R3_TRAITOR_GUESSES&&window.CASTLE_DUEL_R3_TRAITOR_GUESSES[m.id]||'';
    var candidates=list.map(function(x){var row=portraitLookup_(s,x.name);return {id:x.id,name:x.name,image:row.imageUrl||''};});
    var html=specialHtml_('traitorGuess',{candidates:candidates,selectedId:selected},'REVEALED_TRAITOR');
    candidates.forEach(function(x,i){html=html.replace('data-candidate-index="'+i+'"','data-candidate-index="'+i+'" onclick="castleR3TraitorPick_(\''+esc_(m.id)+'\',\''+esc_(x.id)+'\')"');});
    return html+'<button class="castle-proof-primary" '+(selected?'':'disabled')+' onclick="castleR3SubmitTraitor_(\''+esc_(m.id)+'\')">LOCK IN TRAITOR</button>';
  }
  function wireFate_(m,masked){
    var intro='';if(masked&&m.opponent&&m.opponent!=='A Traitor')intro=specialHtml_('maskedTraitor',{traitor:personForMatch_(window.CASTLE_DUEL_STATE,m,'REVEALED_TRAITOR')},'REVEALED_TRAITOR');
    else if(!masked&&array_(m.traitorCandidates).length<=1)intro=specialHtml_('singleTraitorFate',{},'HIDDEN_TRAITOR');
    var html=specialHtml_('fate',{});html=html.replace('data-choice-index="0"','data-choice-index="0" onclick="castleR3ChooseFate_(\''+esc_(m.id)+'\',1,'+(masked?'true':'false')+')"').replace('data-choice-index="1"','data-choice-index="1" onclick="castleR3ChooseFate_(\''+esc_(m.id)+'\',2,'+(masked?'true':'false')+')"');return intro+html;
  }
  function wireHost_(m){var html=specialHtml_('hostEnvelopes',{});[0,1,2].forEach(function(i){html=html.replace('data-choice-index="'+i+'"','data-choice-index="'+i+'" onclick="castleR3ChooseHost_(\''+esc_(m.id)+'\','+(i+1)+')"');});return html;}
  function wireMaskedIntro_(m){var html=specialHtml_('maskedIntro',{wagerLabel:String(m.wager||0)+' pts'});html=html.replace('<button class="csp2-btn" type="button">Decline</button>','<button class="csp2-btn" type="button" onclick="castleR2Mask_(\''+esc_(m.id)+'\',false)">Decline</button>').replace('<button class="csp2-btn" type="button">Accept</button>','<button class="csp2-btn" type="button" onclick="castleR2Mask_(\''+esc_(m.id)+'\',true)">Accept</button>');return html;}
  function proofEligibleTargets_(s){var own=s&&s.player&&s.player.user;return array_(s&&s.leaderboard).filter(function(x){return x&&x.user!==own&&num_(x.lives)>0;}).map(function(x){return {id:x.user,name:x.user,image:x.imageUrl||x.profileImageUrl||''};});}
  function wireMurderTargets_(s,m){
    var targets=proofEligibleTargets_(s),selected=PROOF_TARGET_SELECTION[m.id]||'',html=specialHtml_('murdererCard',{})+specialHtml_('murderTargets',{targets:targets,selectedId:selected},'PLAYER');
    targets.forEach(function(x,i){html=html.replace('data-target-index="'+i+'"','data-target-index="'+i+'" onclick="castleProofPickTarget_(\''+esc_(m.id)+'\',\''+esc_(x.id)+'\')"');});
    html=html.replace('<button class="csp2-btn" type="button">SEAL THE MARK</button>','<button class="csp2-btn" type="button" '+(selected?'':'disabled')+' onclick="castleProofSealTarget_(\''+esc_(m.id)+'\')">SEAL THE MARK</button>');
    return html+'<input type="hidden" id="castleR2Target-'+esc_(m.id)+'" value="'+esc_(selected)+'">';
  }
  function proofNextHtml_(index,matches){return typeof window.castleR2NextButton_==='function'?window.castleR2NextButton_(index,matches):'';}
  function proofDecisionSealed_(m,index,matches){var html=specialHtml_('decisionSealed',{prediction:m.guess||'—',decision:m.choice||'—'}),action=index+1<matches.length?'castleR2Next_()':'castleR2ShowSummary_()',label=index+1<matches.length?'NEXT ROOM':'COMPLETE THE NIGHT';return html.replace('<button class="csp2-nav" type="button">Continue</button>','<button class="csp2-nav" type="button" onclick="'+action+'">'+label+'</button>');}
  function proofFateResult_(m,index,matches){return specialHtml_('fate',{state:String(m.fateResult||'').toLowerCase()})+proofNextHtml_(index,matches);}
  function proofHostResult_(m,index,matches){var reward=String(m.hostReward||'').toUpperCase(),detail=reward==='GOLD'?'Your authorized Gold reward is recorded.':reward==='PROTECTION'?'Your authorized Protection reward is recorded.':reward==='MERCY'?'Your authorized Mercy reward is recorded.':'';return specialHtml_('hostReveal',{type:reward,title:reward,detail:detail})+proofNextHtml_(index,matches);}
  function proofSpecialEncounter_(s,m,index,matches){
    if(!m)return '';
    if(typeof window.castleR2WasRevealed_==='function'&&activeStatus_(m)&&!window.castleR2WasRevealed_(m)&&typeof window.castleR2RoundLocked_==='function'&&!window.castleR2RoundLocked_(s.round))return '';
    if(m.status==='IDENTIFY_REQUIRED')return wireTraitorGuess_(s,m);
    if(m.status==='FATE_REQUIRED')return wireFate_(m,m.kind==='MASK');
    if(m.status==='HOST_REQUIRED')return wireHost_(m);
    if(m.status==='TARGET_REQUIRED')return wireMurderTargets_(s,m);
    if(m.status==='MASK_DUEL_REQUIRED'&&m.outcome==='FAITHFUL')return specialHtml_('maskedFaithful',{person:personForMatch_(s,m,'TV')},'TV')+(typeof window.castleR2SwipePaper_==='function'?window.castleR2SwipePaper_(m):'');
    if(m.kind==='MASK'&&m.status==='OPEN')return wireMaskedIntro_(m);
    if(m.traitorStage==='DUEL'&&m.identityRevealed===true&&m.status==='OPEN')return specialHtml_('traitorReveal',{traitor:personForMatch_(s,m,'REVEALED_TRAITOR')},'REVEALED_TRAITOR')+(typeof window.castleR2SwipePaper_==='function'?window.castleR2SwipePaper_(m):'');
    if(m.kind==='HUMAN'&&m.status==='OPEN')return specialHtml_('humanEncounter',{player:personForMatch_(s,m,'PLAYER')},'PLAYER')+(typeof window.castleR2SwipePaper_==='function'?window.castleR2SwipePaper_(m):'');
    if(m.status==='LOCKED'&&m.fateResult)return proofFateResult_(m,index,matches);
    if(m.status==='LOCKED'&&m.kind==='MASK'&&m.outcome==='HOST'&&m.hostReward)return proofHostResult_(m,index,matches);
    if(m.status==='LOCKED'&&m.guess&&m.choice)return proofDecisionSealed_(m,index,matches);
    return '';
  }

  function proofRoundComplete_(s){var round=s&&s.round||{},finale=!!round.finale;return '<section class="castle-proof-complete"><div class="castle-proof-kicker">'+(finale?'FINALE COMPLETE':'ROUND COMPLETE')+'</div><h1>'+(finale?'YOUR FINALE IS SEALED':'YOUR NIGHT IS SEALED')+'</h1><p>'+(String(round.status||'').toUpperCase()==='SETTLED'?(finale?'The Throne Room has closed. The winner remains sealed until authorized.':'The Castle has spoken. Your next entry will begin with the latest Castle Reveal.'):'Opponent decisions remain hidden until episode settlement.')+'</p><div class="castle-proof-state-line">'+(round.lockAt?'Castle deadline · '+esc_(new Date(round.lockAt).toLocaleString()):'Settlement pending')+'</div></section>';}
  function proofEncounter_(s){
    if(typeof window.castleR2EnsureState_==='function')window.castleR2EnsureState_(s);
    var matches=array_(s.matches),index=Number(window.CASTLE_DUEL_R2_ROOM_INDEX||0),m=matches[index];
    if(window.CASTLE_DUEL_R2_SUMMARY||!m)return proofRoundComplete_(s);
    var special=proofSpecialEncounter_(s,m,index,matches);if(special)return '<section class="castle-proof-special-stage">'+(typeof window.castleR2ProgressHtml_==='function'?window.castleR2ProgressHtml_(matches,index):'')+special+'</section>';
    return '<div class="castle-proof-encounter-wrap">'+window.castleR2RoomHtml_(s,index)+'</div>';
  }
  function proofFinaleEncounter_(s){
    if(typeof window.castleR2EnsureState_==='function')window.castleR2EnsureState_(s);
    var matches=array_(s.matches),index=Number(window.CASTLE_DUEL_R2_ROOM_INDEX||0),m=matches[index];
    if(window.CASTLE_DUEL_R2_SUMMARY||!m)return proofRoundComplete_(s);
    if(m.status==='LOCKED')return '<section class="castle-proof-special-stage">'+(typeof window.castleR2ProgressHtml_==='function'?window.castleR2ProgressHtml_(matches,index):'')+proofDecisionSealed_(m,index,matches)+'</section>';
    if(typeof window.castleR2WasRevealed_==='function'&&!window.castleR2WasRevealed_(m)&&!window.castleR2RoundLocked_(s.round))return window.castleR2SpinnerHtml_(m,index,matches);
    if(typeof window.castleMatchHtml_==='function')return '<section class="castle-proof-finale-match">'+(typeof window.castleR2ProgressHtml_==='function'?window.castleR2ProgressHtml_(matches,index):'')+window.castleMatchHtml_(m,s.round,s.player,array_(s.leaderboard))+'</section>';
    return proofEncounter_(s);
  }

  function proofFinalistAuthorized_(s){return isFinalRound_(s)&&array_(s&&s.matches).length>0;}
  function proofFinalThree_(s){
    var finale=s&&s.finale||{},finalists=array_(finale.finalists||s&&s.round&&s.round.finalists),c=cards_();
    if(!finalists.length)return '<section class="castle-proof-finale-shell"><div class="castle-proof-kicker">THE FINAL THREE</div><h1>Finalist portraits are awaiting an authorized finalist list from Castle state.</h1><div class="castle-proof-jackpot"><span>CASTLE JACKPOT</span><strong>'+esc_(s&&s.config&&s.config.jackpot!==undefined?s.config.jackpot:'—')+'</strong></div><button class="castle-proof-primary" onclick="castleProofGoArmory_()">ENTER THE FINALE ARMORY</button></section>';
    var people=finalists.slice(0,3).map(function(x){var name=typeof x==='string'?x:(x.name||x.user),row=portraitLookup_(s,name);return {name:name,image:row.imageUrl||row.profileImageUrl||''};});
    var html=c?specialHtml_('finalThree',{finalists:people,jackpotLabel:String(s.config&&s.config.jackpot!==undefined?s.config.jackpot:'—')+' pts'},'PLAYER'):'';
    return html+'<button class="castle-proof-primary" onclick="castleProofGoArmory_()">ENTER THE FINALE ARMORY</button>';
  }
  function proofArmory_(s){
    var p=s&&s.player||{},armory=s&&s.finaleArmory||{},items=array_(armory.items);
    var body=items.length?specialHtml_('finaleArmory',{items:items}):'<section class="castle-proof-finale-shell"><div class="castle-proof-kicker">FINALE ARMORY</div><h1>Authorized Armory inventory is not available yet.</h1><div class="castle-proof-armory-grid"><div><span>Finale Tokens</span><strong>'+esc_(p.finaleTokens!==undefined?p.finaleTokens:'—')+'</strong></div><div><span>Finale Shield</span><strong>'+esc_(p.finaleShield!==undefined?p.finaleShield:'—')+'</strong></div></div><div class="castle-proof-empty">CLUE / DOUBLE / SHIELD / BANISH / RECRUIT availability and prices require the sanitized Finale Armory payload.</div></section>';
    return body+'<button class="castle-proof-primary" onclick="castleProofEnterThrone_()">ENTER THE THRONE ROOM</button>';
  }
  function proofThrone_(s){if(!array_(s&&s.matches).length)return '<section class="castle-proof-finale-shell"><div class="castle-proof-kicker">THRONE ROOM</div><h1>The final encounters are not available yet.</h1></section>';return '<section class="castle-proof-throne"><div class="castle-proof-throne-head"><div class="castle-proof-kicker">THRONE ROOM</div><h1>Finale Encounters</h1><p>'+esc_(array_(s.matches).length)+' private encounters supplied by the Castle.</p></div>'+proofFinaleEncounter_(s)+'</section>';}
  function proofWinner_(s){
    var f=s&&s.finale;if(!f||phase_(s)!=='COMPLETE')return '<section class="castle-proof-finale-shell"><div class="castle-proof-kicker">CASTLE FINALE</div><h1>The winner remains sealed.</h1></section>';
    var row=portraitLookup_(s,f.winner),winner={name:f.winner||'Castle Champion',image:row.imageUrl||row.profileImageUrl||''};
    return specialHtml_('winnerJackpot',{winner:winner,jackpotLabel:String(f.jackpot!==undefined?f.jackpot:'—')+' pts'},'PLAYER');
  }
  function proofFinale_(s){if(phase_(s)==='COMPLETE')return proofWinner_(s);if(!proofFinalistAuthorized_(s))return '<section class="castle-proof-finale-shell"><div class="castle-proof-kicker">THE FINAL THREE</div><h1>Finale status is waiting on authorized Castle state.</h1></section>';if(PROOF_VIEW==='armory')return proofArmory_(s);if(PROOF_VIEW==='throne')return proofThrone_(s);return proofFinalThree_(s);}

  function proofStyles_(){return '<style id="castleMobileFinalGameplayR2Styles">'+
    '.castle-proof-page{max-width:880px;margin:0 auto;padding:7px 5px 96px;color:#f7f0e3;font-family:Georgia,"Times New Roman",serif;overflow-x:hidden}.castle-proof-page *{box-sizing:border-box}.castle-proof-page button{font-family:inherit}.castle-proof-entrance,.castle-proof-complete,.castle-proof-finale-shell{position:relative;overflow:hidden;border:1px solid rgba(215,178,105,.42);border-radius:5px;padding:42px 14px 16px;background-image:linear-gradient(180deg,rgba(9,8,10,.38),rgba(9,8,10,.82)),url("'+GRAND_ENTRANCE_ASSET+'"),url("'+GRAND_ENTRANCE_FALLBACK+'");background-size:cover;background-position:center top;background-repeat:no-repeat;box-shadow:0 18px 42px rgba(0,0,0,.32)}'+
    '.castle-proof-entrance-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.castle-proof-kicker{font:700 11px/1.1 system-ui,sans-serif;letter-spacing:.13em;color:#dfc17b}.castle-proof-entrance h1,.castle-proof-complete h1,.castle-proof-finale-shell h1{margin:3px 0 10px;font-size:clamp(26px,8vw,38px);line-height:1}.castle-proof-jackpot{min-width:112px;padding:7px 9px;border:1px solid rgba(220,186,115,.36);border-radius:4px;background:rgba(15,13,15,.58);text-align:right}.castle-proof-jackpot span{display:block;font:700 9px/1 system-ui,sans-serif;letter-spacing:.08em;color:#d8c08a}.castle-proof-jackpot strong{font-size:22px;color:#fff0bc}.castle-proof-featured{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}'+
    '.castle-proof-portrait{position:relative;margin:0!important;overflow:visible!important;border:0!important;border-radius:4px!important;background:transparent!important;height:auto!important;aspect-ratio:auto!important;box-shadow:none!important;color:inherit!important;font-size:inherit!important;display:block!important}.castle-proof-photo{position:relative;aspect-ratio:320/420;background:radial-gradient(circle at 50% 28%,#5b4a50,#171419 75%);display:grid;place-items:center;overflow:hidden;border-radius:3px}.castle-proof-person-image{position:absolute;inset:7% 7% 18%;width:86%!important;height:75%!important;object-fit:cover!important;z-index:1}.castle-proof-fallback{position:absolute;inset:7% 7% 18%;z-index:1;display:grid;place-items:center;color:#ead39b;background:radial-gradient(circle at 50% 28%,#4b4147,#171419 74%);font:700 34px/1 system-ui,sans-serif}.castle-proof-fallback[hidden]{display:none!important}.castle-proof-portrait-overlay,.castle-proof-csp-overlay{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;z-index:2!important;pointer-events:none!important}.castle-proof-portrait figcaption{position:absolute;left:7%;right:7%;bottom:3%;z-index:3;text-align:center;padding:0 5px;background:transparent}.castle-proof-live-name,.castle-proof-live-role{display:block;text-shadow:0 2px 5px #000}.castle-proof-live-name{font-size:clamp(15px,4.5vw,20px);color:#fff1ca}.castle-proof-live-role{margin-top:2px;font:700 9px/1.15 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em;color:#d7bd83}.csp2-portrait{overflow:visible!important}.csp2-portrait-hook{display:none!important}.csp2-portrait .castle-proof-csp-overlay{z-index:3!important}'+
    '.castle-proof-ledger{max-height:166px;overflow:auto;margin:8px 0;padding:4px 10px;border:1px solid rgba(255,255,255,.12);border-radius:4px;background:rgba(11,10,12,.52)}.castle-proof-ledger-row{display:grid;grid-template-columns:8px 1fr;gap:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,.08);font-size:13px}.castle-proof-ledger-row:first-child{border-top:0}.castle-proof-dot{width:6px;height:6px;margin-top:5px;border-radius:50%;background:#d4ad5c}.castle-proof-history{margin:9px 0}.castle-proof-history-toggle,.castle-proof-history-list button{width:100%;border:1px solid rgba(218,181,108,.32);border-radius:4px;background:rgba(18,16,19,.58);color:#f1e4c5;min-height:44px;text-align:left;padding:8px 10px}.castle-proof-history-list{display:grid;gap:4px;margin-top:4px}.castle-proof-history-list button.is-selected{background:rgba(202,158,77,.18);border-color:#c9a25d}.castle-proof-primary,.castle-proof-secondary{width:100%;min-height:46px;border-radius:4px;font-weight:700;letter-spacing:.035em}.castle-proof-primary{margin-top:12px;border:1px solid #dfc17b;background:rgba(211,172,93,.92);color:#25190c}.castle-proof-secondary{margin-top:10px;border:1px solid rgba(223,193,123,.5);background:rgba(21,18,22,.56);color:#f5e4b9}.castle-proof-state-line,.castle-proof-empty,.castle-proof-history-empty,.castle-proof-muted{margin:9px 0;padding:9px 10px;border:1px solid rgba(255,255,255,.11);border-radius:4px;background:rgba(14,12,15,.5);font-size:12px}.castle-proof-special-stage{position:relative;margin-top:6px}.castle-proof-special-stage>.castle-r2-progress{justify-content:center}.castle-proof-special-stage>.castle-r2-progress b{display:none}.castle-proof-encounter-wrap .castle-r2-stage{margin-top:0}.castle-proof-armory-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.castle-proof-armory-grid>div{padding:12px;border:1px solid rgba(216,180,109,.3);border-radius:4px;background:rgba(14,12,15,.56)}.castle-proof-armory-grid span,.castle-proof-armory-grid strong{display:block}.castle-proof-armory-grid strong{font-size:30px;color:#f0d38d}.castle-proof-throne-head{padding:36px 14px 12px;border:1px solid rgba(216,180,109,.38);border-radius:4px;background:linear-gradient(180deg,rgba(8,7,9,.3),rgba(8,7,9,.78)),url("./assets/castle/rooms/throne-room-modern.webp") center top/cover no-repeat}.castle-proof-throne-head h1{margin:2px 0;font-size:30px}.castle-proof-finale-match>.card{margin:8px 0!important;border-radius:5px!important;background:rgba(22,18,22,.72)!important;border:1px solid rgba(216,180,109,.3)!important}.castle-proof-page .castle-r2-sealed,.castle-proof-page .castle-r2-stage,.castle-proof-page .castle-r2-room-scene,.castle-proof-page .castle-r2-paper{border-radius:5px!important}'+
    '@media(max-width:375px){.castle-proof-page{padding-left:3px;padding-right:3px}.castle-proof-entrance,.castle-proof-complete,.castle-proof-finale-shell{padding-left:10px;padding-right:10px}.castle-proof-featured{gap:6px}.castle-proof-jackpot{min-width:102px}.castle-proof-live-name{font-size:15px}}'+
    '@media(min-width:390px) and (max-width:429px){.castle-proof-page{padding-left:5px;padding-right:5px}.castle-proof-featured{gap:8px}}'+
    '@media(min-width:430px) and (max-width:560px){.castle-proof-page{padding-left:7px;padding-right:7px}.castle-proof-featured{gap:10px}}'+
    '</style>';}

  function proofMarkup_(s){
    if(!s||!s.player||!s.round)return PROOF_BASE_PLAYER_MARKUP?PROOF_BASE_PLAYER_MARKUP(s):'';
    proofResetForRound_(s);var body='';
    if(isFinalRound_(s)||phase_(s)==='FINAL'||phase_(s)==='COMPLETE')body=proofFinale_(s);else if(PROOF_VIEW==='encounters')body=proofEncounter_(s);else body=proofEntrance_(s);
    return window.castleStyles_()+window.castleR2Styles_()+specialStyle_()+proofStyles_()+'<div class="page castle-proof-page csp2-root" data-castle-proof="1">'+body+'</div>';
  }
  function proofRender_(){var app=document.getElementById('app');if(app&&window.CASTLE_DUEL_STATE)app.innerHTML=proofMarkup_(window.CASTLE_DUEL_STATE);}

  window.castleProofToggleHistory_=function(){PROOF_HISTORY_OPEN=!PROOF_HISTORY_OPEN;proofRender_();};
  window.castleProofSelectEpisode_=function(ep){PROOF_SELECTED_EPISODE=Number(ep);PROOF_HISTORY_OPEN=true;proofRender_();};
  window.castleProofEnterEncounters_=function(){PROOF_VIEW='encounters';window.CASTLE_DUEL_R2_SUMMARY=false;var matches=array_(window.CASTLE_DUEL_STATE&&window.CASTLE_DUEL_STATE.matches),first=matches.findIndex(activeStatus_);window.CASTLE_DUEL_R2_ROOM_INDEX=first>=0?first:0;proofRender_();};
  window.castleProofGoFinalThree_=function(){PROOF_VIEW='final-three';proofRender_();};
  window.castleProofGoArmory_=function(){PROOF_VIEW='armory';proofRender_();};
  window.castleProofEnterThrone_=function(){PROOF_VIEW='throne';window.CASTLE_DUEL_R2_SUMMARY=false;window.CASTLE_DUEL_R2_ROOM_INDEX=0;proofRender_();};
  window.castleProofReturnEntrance_=function(){PROOF_VIEW='entrance';proofRender_();};
  window.castleProofPickTarget_=function(id,user){PROOF_TARGET_SELECTION[id]=user;proofRender_();};
  window.castleProofSealTarget_=function(id){if(!PROOF_TARGET_SELECTION[id])return;if(typeof window.castleR2Target_==='function')window.castleR2Target_(id);};

  function install_(){
    if(window.CASTLE_DUEL_MOBILE_FINAL_GAMEPLAY_R1_INSTALLED)return true;
    if(!proofEnabled_()||!window.CastleSpecialEncounterCardsR2||typeof window.castlePlayerMarkup_!=='function'||typeof window.castleR2RoomHtml_!=='function'||typeof window.castleR2Styles_!=='function')return false;
    PROOF_BASE_PLAYER_MARKUP=window.castlePlayerMarkup_;PROOF_BASE_PORTRAIT=window.castleR2Portrait_;
    window.CASTLE_DUEL_MOBILE_FINAL_GAMEPLAY_R1_INSTALLED=true;
    window.castleProofAnnouncementHistory_=proofAnnouncementHistory_;window.castleProofEventText_=proofEventText_;window.castleProofPortrait_=proofPortrait_;window.castleProofMarkup_=proofMarkup_;
    window.castleR2Portrait_=proofR2Portrait_;
    window.castlePlayerMarkup_=function(s){return proofEnabled_()?proofMarkup_(s):PROOF_BASE_PLAYER_MARKUP(s);};
    if(window.CASTLE_DUEL_STATE)proofRender_();return true;
  }
  if(!install_()){var tries=0,timer=setInterval(function(){tries+=1;if(install_()||tries>240)clearInterval(timer);},25);}
})();
