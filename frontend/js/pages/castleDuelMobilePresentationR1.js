/* PATTC Castle Duel Mobile Presentation R1
 * Presentation only. Existing Castle R2/R3 modules remain authoritative for
 * rules, scoring, secrets, submissions, routing, and backend state.
 */
(function(){
  'use strict';

  var CASTLE_ASSET_ROOT = './assets/castle/';
  var CASTLE_DUEL_ROOM_THEMES = {
    STRATEGY:{key:'STRATEGY',cls:'castle-room-theme castle-room-theme--strategy',title:'The Strategy Chamber',subtitle:'Across the table sits another PATTC player.',background:CASTLE_ASSET_ROOT+'strategy-chamber.svg',overlay:'warm-table',frame:'brass',accent:'gold',randomizerCard:'player'},
    PORTRAIT:{key:'PORTRAIT',cls:'castle-room-theme castle-room-theme--portrait',title:'The Portrait Gallery',subtitle:'A familiar face waits beneath the frames.',background:CASTLE_ASSET_ROOT+'portrait-gallery.svg',overlay:'gallery-vignette',frame:'gallery',accent:'parchment',randomizerCard:'portrait'},
    MASKED:{key:'MASKED',cls:'castle-room-theme castle-room-theme--masked',title:'The Masked Hall',subtitle:'The face is hidden. The risk is not.',background:CASTLE_ASSET_ROOT+'masked-hall.svg',overlay:'violet-shadow',frame:'silver',accent:'violet',randomizerCard:'mask'},
    TRAITOR:{key:'TRAITOR',cls:'castle-room-theme castle-room-theme--traitor',title:'The Traitor Passage',subtitle:'Someone in the shadows has chosen you.',background:CASTLE_ASSET_ROOT+'traitor-gallery.svg',overlay:'red-shadow',frame:'iron',accent:'crimson',randomizerCard:'shadow'},
    MURDER:{key:'MURDER',cls:'castle-room-theme castle-room-theme--murder',title:'The Hidden Passage',subtitle:'Some doors in the Castle should stay closed.',background:CASTLE_ASSET_ROOT+'murder-passage.svg',overlay:'blood-vignette',frame:'iron',accent:'crimson',randomizerCard:'murder'},
    HOST:{key:'HOST',cls:'castle-room-theme castle-room-theme--host',title:"The Host's Study",subtitle:'A quieter room. That does not mean a safer one.',background:CASTLE_ASSET_ROOT+'host-study.svg',overlay:'study-glow',frame:'wood',accent:'amber',randomizerCard:'host'},
    FINALE:{key:'FINALE',cls:'castle-room-theme castle-room-theme--finale',title:'The Throne Room',subtitle:'Ten final tests. Every choice echoes.',background:CASTLE_ASSET_ROOT+'throne-room.svg',overlay:'royal-vignette',frame:'royal',accent:'gold',randomizerCard:'finale'}
  };

  window.CASTLE_DUEL_ROOM_THEMES = CASTLE_DUEL_ROOM_THEMES;

  function castleMobileThemeKey_(m,round){
    if(round&&round.finale)return 'FINALE';
    if(m&&(m.traitorStage||m.status==='FATE_REQUIRED'))return 'TRAITOR';
    if(m&&m.kind==='HUMAN')return 'STRATEGY';
    if(m&&m.kind==='HOST')return 'HOST';
    if(m&&m.kind==='MASK'&&m.outcome==='MURDERER')return 'MURDER';
    if(m&&m.kind==='MASK')return 'MASKED';
    return 'PORTRAIT';
  }

  function castleMobileTheme_(m,round){
    return CASTLE_DUEL_ROOM_THEMES[castleMobileThemeKey_(m,round)]||CASTLE_DUEL_ROOM_THEMES.PORTRAIT;
  }

  function castleMobileHiddenTraitor_(m){
    if(!m)return false;
    var opponent=String(m.opponent||'').trim().toLowerCase();
    if(opponent==='a traitor'||opponent==='the traitor'||opponent==='hidden traitor')return true;
    if(m.hiddenTraitor===true&&m.traitorRevealed!==true)return true;
    return false;
  }

  function castleMobileName_(m){
    if(castleMobileHiddenTraitor_(m))return 'A Traitor';
    if(typeof window.castleR2OpponentName_==='function')return window.castleR2OpponentName_(m);
    return String(m&&m.opponent||'Castle Opponent');
  }

  function castleMobileInitials_(name){
    var parts=String(name||'?').trim().split(/\s+/).filter(Boolean);
    if(!parts.length)return '?';
    return (parts[0].charAt(0)+(parts.length>1?parts[parts.length-1].charAt(0):'')).toUpperCase();
  }

  function castleMobileFallbackKind_(m){
    if(castleMobileHiddenTraitor_(m))return 'shadow';
    if(m&&m.kind==='MASK')return 'mask';
    if(m&&m.kind==='HOST')return 'host';
    if(m&&m.kind==='HUMAN')return 'player';
    return 'initials';
  }

  function castleMobileFallbackMarkup_(m,compact){
    var name=castleMobileName_(m),kind=castleMobileFallbackKind_(m),glyph='';
    if(kind==='mask')glyph='MASK';
    else if(kind==='host')glyph='HOST';
    else if(kind==='shadow')glyph='?';
    else if(kind==='player')glyph='P';
    else glyph=castleMobileInitials_(name);
    return '<div class="castle-mobile-fallback castle-mobile-fallback--'+kind+'" aria-label="Portrait unavailable"><span>'+window.castleEscape_(glyph)+'</span></div>';
  }

  function castleMobileSafeImage_(m){
    if(castleMobileHiddenTraitor_(m))return '';
    if(!m)return '';
    return String(m.imageUrl||m.profileImageUrl||'').trim();
  }

  function castleMobilePortrait_(m,compact){
    var cls=compact?'castle-r2-summary-avatar':'castle-r2-portrait';
    var image=castleMobileSafeImage_(m);
    var fallback=castleMobileFallbackMarkup_(m,compact);
    if(!image)return '<div class="'+cls+' castle-mobile-portrait-shell">'+fallback+'</div>';
    return '<div class="'+cls+' castle-mobile-portrait-shell"><img src="'+window.castleEscape_(image)+'" alt="" loading="eager" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="castle-mobile-fallback-slot" hidden>'+fallback+'</span></div>';
  }

  function castleMobileCard_(entry,theme,finalCard){
    entry=entry||{};
    var hidden=castleMobileHiddenTraitor_(entry);
    var name=hidden?'A Traitor':String(entry.name||entry.opponent||'The Castle');
    var image=hidden?'':String(entry.imageUrl||entry.profileImageUrl||'').trim();
    var kind=String(entry.kind||'TV').toUpperCase();
    var faux={kind:kind==='HUMAN'?'HUMAN':kind==='MASK'?'MASK':kind==='HOST'?'HOST':'TV',opponent:name,imageUrl:image,hiddenTraitor:hidden};
    var tag=hidden?'HIDDEN ENCOUNTER':kind==='HUMAN'?'PATTC PLAYER':kind==='MASK'?'MASKED':kind==='HOST'?'HOST':'TV CONTESTANT';
    return '<div class="castle-mobile-random-card castle-mobile-random-card--'+window.castleEscape_(theme.randomizerCard)+(finalCard?' is-final':'')+'">'+
      '<div class="castle-mobile-random-image">'+castleMobilePortrait_(faux,false)+'</div>'+
      '<div class="castle-mobile-random-copy"><span>'+window.castleEscape_(tag)+'</span><strong>'+window.castleEscape_(name)+'</strong></div></div>';
  }

  function castleMobileCandidates_(m){
    if(castleMobileHiddenTraitor_(m))return [{kind:'MASK',name:'A Traitor',hiddenTraitor:true}];
    if(m&&m.kind==='MASK')return [{kind:'MASK',name:'The Masked'}];
    if(m&&m.kind==='HOST')return [{kind:'HOST',name:'The Host'}];
    if(m&&m.kind==='HUMAN'){
      var people=(window.CASTLE_DUEL_STATE&&window.CASTLE_DUEL_STATE.leaderboard)||[];
      var cards=people.slice(0,12).map(function(x){return {kind:'HUMAN',name:x.displayName||x.user||'PATTC Player',profileImageUrl:x.profileImageUrl||x.imageUrl||''};});
      if(!cards.length)cards=[{kind:'HUMAN',name:castleMobileName_(m),profileImageUrl:castleMobileSafeImage_(m)}];
      return cards;
    }
    var cast=(window.CASTLE_DUEL_STATE&&window.CASTLE_DUEL_STATE.cast)||[];
    var tv=cast.filter(function(x){return x&&x.active!==false;}).slice(0,18).map(function(x){return {kind:'TV',name:x.name||'Contestant',imageUrl:x.imageUrl||''};});
    if(!tv.length)tv=[{kind:'TV',name:castleMobileName_(m),imageUrl:castleMobileSafeImage_(m)}];
    return tv;
  }

  function castleMobileSpinnerHtml_(m,index,matches){
    var theme=castleMobileTheme_(m,window.CASTLE_DUEL_STATE&&window.CASTLE_DUEL_STATE.round);
    return '<section class="castle-r2-stage castle-mobile-spinner-stage">'+window.castleR2ProgressHtml_(matches,index)+
      '<div class="castle-r2-spinner '+theme.cls+'" style="--castle-room-art:url(\''+window.castleEscape_(theme.background)+'\')">'+
      '<div class="castle-r2-kicker">'+window.castleEscape_(theme.title)+'</div><h2>Who is behind Door '+(index+1)+'?</h2>'+ 
      '<div id="castleR2SpinnerWindow" class="castle-r2-spinner-window castle-mobile-spinner-window">'+castleMobileCard_({kind:'MASK',name:'The Castle'},theme,false)+'</div>'+ 
      '<p class="castle-r2-spinner-copy">The encounter is already sealed. The reveal uses only Castle state already loaded on this page.</p>'+ 
      '<button class="castle-r2-primary" onclick="castleR2Spin_('+index+',this)">SPIN THE CASTLE</button></div></section>';
  }

  function castleMobileSpin_(index,button){
    var matches=window.CASTLE_DUEL_STATE&&window.CASTLE_DUEL_STATE.matches||[],m=matches[index];
    if(!m)return;
    var windowEl=document.getElementById('castleR2SpinnerWindow');
    if(!windowEl)return;
    if(button){button.disabled=true;button.textContent='THE CASTLE IS CHOOSING…';}
    var theme=castleMobileTheme_(m,window.CASTLE_DUEL_STATE&&window.CASTLE_DUEL_STATE.round);
    var cards=castleMobileCandidates_(m),ticks=0,maxTicks=18;
    windowEl.classList.add('is-spinning');
    if(window.CASTLE_DUEL_R2_SPIN_TIMER)clearInterval(window.CASTLE_DUEL_R2_SPIN_TIMER);
    window.CASTLE_DUEL_R2_SPIN_TIMER=setInterval(function(){
      var entry=cards[ticks%cards.length];
      ticks+=1;
      windowEl.innerHTML=castleMobileCard_(entry,theme,false);
      if(ticks>=maxTicks){
        clearInterval(window.CASTLE_DUEL_R2_SPIN_TIMER);window.CASTLE_DUEL_R2_SPIN_TIMER=null;
        windowEl.classList.remove('is-spinning');
        var finalEntry={kind:m.kind||'TV',name:castleMobileName_(m),imageUrl:castleMobileSafeImage_(m),profileImageUrl:castleMobileSafeImage_(m),hiddenTraitor:castleMobileHiddenTraitor_(m)};
        windowEl.innerHTML=castleMobileCard_(finalEntry,theme,true);
        if(typeof window.castleR2MarkRevealed_==='function')window.castleR2MarkRevealed_(m);
        setTimeout(function(){if(typeof window.castleR2Render_==='function')window.castleR2Render_();},460);
      }
    },90);
  }

  function castleMobileStyles_(){return '<style id="castleMobilePresentationR1Styles">'+
    '.castle-room-theme{background-color:#151219!important;background-image:linear-gradient(180deg,rgba(10,8,12,.12),rgba(10,8,12,.76)),var(--castle-room-art)!important;background-size:cover!important;background-position:center!important;}'+
    '.castle-room-theme--strategy{--castle-room-art:url("./assets/castle/strategy-chamber.svg")}'+
    '.castle-room-theme--portrait{--castle-room-art:url("./assets/castle/portrait-gallery.svg")}'+
    '.castle-room-theme--masked{--castle-room-art:url("./assets/castle/masked-hall.svg")}'+
    '.castle-room-theme--traitor{--castle-room-art:url("./assets/castle/traitor-gallery.svg")}'+
    '.castle-room-theme--murder{--castle-room-art:url("./assets/castle/murder-passage.svg")}'+
    '.castle-room-theme--host{--castle-room-art:url("./assets/castle/host-study.svg")}'+
    '.castle-room-theme--finale{--castle-room-art:url("./assets/castle/throne-room.svg")}'+
    '.castle-mobile-portrait-shell{position:relative}.castle-mobile-portrait-shell>img{width:100%;height:100%;object-fit:cover}.castle-mobile-fallback-slot{display:contents}.castle-mobile-fallback{width:100%;height:100%;min-height:100%;display:grid;place-items:center;background:radial-gradient(circle at 50% 30%,rgba(244,212,138,.22),rgba(18,14,20,.96) 72%);color:#f4d48a;font-weight:1000}.castle-mobile-fallback span{display:grid;place-items:center;width:38%;aspect-ratio:1;border-radius:50%;border:2px solid currentColor;font-size:clamp(28px,11vw,72px);background:rgba(0,0,0,.28)}'+
    '.castle-mobile-fallback--mask{background:radial-gradient(ellipse at 50% 35%,rgba(151,112,210,.32),rgba(12,10,17,.98) 72%)}.castle-mobile-fallback--shadow{background:linear-gradient(160deg,#0b090d,#2b0d13 55%,#09080b)}.castle-mobile-fallback--player{background:radial-gradient(circle at 50% 25%,rgba(211,166,94,.3),#16131a 72%)}'+
    '.castle-mobile-spinner-stage{overflow:hidden}.castle-mobile-spinner-window{padding:0!important;min-height:0!important;overflow:hidden;background:#151219!important}.castle-mobile-random-card{width:100%;max-width:430px;margin:0 auto;position:relative;overflow:hidden;border-radius:16px;border:1px solid rgba(244,212,138,.45);box-shadow:0 18px 36px rgba(0,0,0,.38);background:#151219}.castle-mobile-random-image{aspect-ratio:4/3;overflow:hidden}.castle-mobile-random-image .castle-r2-portrait{width:100%;height:100%;aspect-ratio:auto;border:0;border-radius:0;box-shadow:none}.castle-mobile-random-copy{position:absolute;left:0;right:0;bottom:0;padding:42px 15px 13px;text-align:left;background:linear-gradient(transparent,rgba(5,5,8,.94))}.castle-mobile-random-copy span{display:block;color:#f4d48a;font-size:10px;font-weight:1000;letter-spacing:.13em}.castle-mobile-random-copy strong{display:block;color:#fff;font-size:clamp(25px,7vw,36px);line-height:1.02;text-shadow:0 2px 8px #000}.castle-mobile-random-card--portrait .castle-mobile-random-copy strong{font-family:Georgia,serif}.castle-mobile-random-card--mask .castle-mobile-random-copy strong,.castle-mobile-random-card--shadow .castle-mobile-random-copy strong{letter-spacing:.08em}.castle-mobile-random-card.is-final{box-shadow:0 0 0 2px rgba(244,212,138,.34),0 22px 44px rgba(0,0,0,.55)}'+
    '@media(max-width:560px){.castle-r2-page{padding-left:5px!important;padding-right:5px!important}.castle-r2-hero{padding:12px 13px!important;border-radius:15px!important}.castle-r2-hero h1{font-size:28px!important;margin:2px 0 4px!important}.castle-r2-hero>p{font-size:13px;margin:4px 0!important}.castle-r2-meta{margin-top:8px!important;font-size:12px!important}.castle-r2-stage{margin-top:8px!important;padding:8px!important;border-radius:14px!important}.castle-r2-progress{margin-bottom:6px!important}.castle-r2-progress b{font-size:15px!important}.castle-r2-room-scene{padding:8px!important;min-height:0!important}.castle-r2-room-heading{margin-bottom:6px!important}.castle-r2-room-heading h2{font-size:21px!important;margin:1px 0!important}.castle-r2-room-heading p{font-size:12px!important}.castle-r2-play-stage .castle-r2-portrait-wrap{width:calc(100% + 16px)!important;margin-left:-8px!important;margin-right:-8px!important}.castle-r2-play-stage .castle-r2-portrait{aspect-ratio:4/3!important}.castle-r3-photo-label{padding:38px 12px 9px!important}.castle-r3-photo-label strong{font-size:27px!important}.castle-r2-paper{padding:10px!important}.castle-r2-choice,.castle-r2-swipe-back,.castle-r2-swipe-next,.castle-r2-primary{min-height:52px!important}.castle-r2-spinner{min-height:0!important;padding:10px!important;border-radius:12px!important}.castle-r2-spinner h2{font-size:21px;margin:5px 0 8px}.castle-r2-spinner-copy{font-size:12px;margin:8px 0}.castle-mobile-random-card{border-radius:11px}.castle-mobile-random-image{aspect-ratio:4/3}.castle-mobile-random-copy{padding:38px 12px 10px}.castle-r2-standings{margin-top:8px!important}}'+
    '@media(max-width:375px){.castle-r2-page{padding-left:3px!important;padding-right:3px!important}.castle-r2-stage{padding:6px!important}.castle-r2-play-stage .castle-r2-portrait{aspect-ratio:1.22!important}.castle-r2-room-heading p{display:none}.castle-r2-paper{padding:8px!important}.castle-mobile-random-copy strong{font-size:25px}}'+
    '@media(min-width:410px) and (max-width:560px){.castle-r2-play-stage .castle-r2-portrait{aspect-ratio:1.38!important}.castle-mobile-random-image{aspect-ratio:1.38}}'+
    '</style>';}

  function castleMobileInstall_(){
    if(window.CASTLE_DUEL_MOBILE_PRESENTATION_R1_INSTALLED)return true;
    if(typeof window.castleR2SwipeStyles_!=='function'||typeof window.castleR2RoomHtml_!=='function'||typeof window.castleR2SpinnerHtml_!=='function')return false;
    window.CASTLE_DUEL_MOBILE_PRESENTATION_R1_INSTALLED=true;

    var baseSwipeStyles=window.castleR2SwipeStyles_;
    window.castleR2SwipeStyles_=function(){return baseSwipeStyles()+castleMobileStyles_();};
    window.castleR2RoomTheme_=function(m,round){return castleMobileTheme_(m,round);};
    window.castleR2Portrait_=castleMobilePortrait_;
    window.castleR2SpinnerHtml_=castleMobileSpinnerHtml_;
    window.castleR2Spin_=castleMobileSpin_;
    window.castleMobileThemeKey_=castleMobileThemeKey_;
    window.castleMobileHiddenTraitor_=castleMobileHiddenTraitor_;
    window.castleMobileCandidates_=castleMobileCandidates_;

    if(window.CASTLE_DUEL_STATE&&typeof window.castleR2Render_==='function')window.castleR2Render_();
    return true;
  }

  if(!castleMobileInstall_()){
    var attempts=0,installer=setInterval(function(){attempts+=1;if(castleMobileInstall_()||attempts>240)clearInterval(installer);},25);
  }
})();
