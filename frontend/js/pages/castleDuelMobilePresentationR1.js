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
  Object.keys(CASTLE_DUEL_ROOM_THEMES).forEach(function(key){CASTLE_DUEL_ROOM_THEMES[key].sub=CASTLE_DUEL_ROOM_THEMES[key].subtitle;});

  var CASTLE_MOBILE_REVEAL_PROFILES = {
    SLOW_CREEP:{timings:[72,78,86,98,116,142,178,224,286],finalEffect:'slow-landing'},
    RAPID_SNAP:{timings:[170,58,48,42,38,36,34,32],finalEffect:'snap'},
    FALSE_STOP:{timings:[70,76,86,105,138,190,270,105,235],finalEffect:'door-slam'},
    HEARTBEAT:{timings:[118,210,105,245,82,72,62,54],finalEffect:'shadow-reveal'},
    CHAOTIC_BURST:{timings:[118,86,64,48,40,34,30,145,38],finalEffect:'snap'}
  };
  var CASTLE_MOBILE_REDUCED_PROFILE = {key:'REDUCED',timings:[140,180],finalEffect:'slow-landing'};
  var CASTLE_MOBILE_PROFILE_KEYS = Object.keys(CASTLE_MOBILE_REVEAL_PROFILES);
  var CASTLE_MOBILE_BUTTON_STATES = [
    'THE CASTLE IS WATCHING…',
    'THE DOOR IS OPENING…',
    'WHO CAN YOU TRUST?',
    'THE CASTLE HAS CHOSEN…'
  ];
  var CASTLE_MOBILE_COPY = [
    'The Castle has made its choice.',
    'Someone is waiting.',
    'The door knows who stands behind it.',
    'Not every face in the Castle can be trusted.'
  ];
  var CASTLE_MOBILE_PALETTES = {
    STRATEGY:['amber','gold','forest'],
    PORTRAIT:['gold','burgundy','parchment'],
    MASKED:['violet','black','silver'],
    TRAITOR:['deep-red','black','shadow'],
    MURDER:['crimson','charcoal','deep-red'],
    HOST:['amber','wood','gold'],
    FINALE:['burgundy','royal-gold','deep-red']
  };

  window.CASTLE_DUEL_ROOM_THEMES = CASTLE_DUEL_ROOM_THEMES;
  window.CASTLE_MOBILE_REVEAL_PROFILES = CASTLE_MOBILE_REVEAL_PROFILES;

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

  function castleMobilePalette_(theme,index){
    var palette=CASTLE_MOBILE_PALETTES[theme&&theme.key]||CASTLE_MOBILE_PALETTES.PORTRAIT;
    return palette[index%palette.length];
  }

  function castleMobileCard_(entry,theme,finalCard,options){
    entry=entry||{};
    options=options||{};
    var hidden=castleMobileHiddenTraitor_(entry);
    var name=hidden?'A Traitor':String(entry.name||entry.opponent||'The Castle');
    var image=hidden?'':String(entry.imageUrl||entry.profileImageUrl||'').trim();
    var kind=String(entry.kind||'TV').toUpperCase();
    var faux={kind:kind==='HUMAN'?'HUMAN':kind==='MASK'?'MASK':kind==='HOST'?'HOST':'TV',opponent:name,imageUrl:image,hiddenTraitor:hidden};
    var tag=hidden?'HIDDEN ENCOUNTER':kind==='HUMAN'?'PATTC PLAYER':kind==='MASK'?'MASKED':kind==='HOST'?'HOST':'TV CONTESTANT';
    var pace=options.pace||'medium';
    var accent=options.accent||castleMobilePalette_(theme,0);
    var tilt=options.tilt||'0';
    var effect=finalCard&&options.effect?' castle-final-'+options.effect:'';
    return '<div class="castle-mobile-random-card castle-mobile-random-card--'+window.castleEscape_(theme.randomizerCard)+' castle-pace-'+window.castleEscape_(pace)+' castle-accent-'+window.castleEscape_(accent)+(finalCard?' is-final':'')+effect+'" style="--castle-card-tilt:'+window.castleEscape_(tilt)+'deg">'+
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

  function castleMobileReducedMotion_(){
    return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function castleMobileRevealProfile_(){
    if(castleMobileReducedMotion_())return CASTLE_MOBILE_REDUCED_PROFILE;
    var key=CASTLE_MOBILE_PROFILE_KEYS[Math.floor(Math.random()*CASTLE_MOBILE_PROFILE_KEYS.length)];
    var base=CASTLE_MOBILE_REVEAL_PROFILES[key];
    return {key:key,timings:base.timings.slice(),finalEffect:base.finalEffect};
  }

  function castleMobilePace_(delay){
    if(delay<=60)return 'fast';
    if(delay>=175)return 'slow';
    return 'medium';
  }

  function castleMobileAtmosphereCopy_(index){
    return CASTLE_MOBILE_COPY[index%CASTLE_MOBILE_COPY.length];
  }

  function castleMobileSpinnerHtml_(m,index,matches){
    var theme=castleMobileTheme_(m,window.CASTLE_DUEL_STATE&&window.CASTLE_DUEL_STATE.round);
    return '<section class="castle-r2-stage castle-mobile-spinner-stage">'+window.castleR2ProgressHtml_(matches,index)+
      '<div class="castle-r2-spinner castle-mobile-atmosphere '+theme.cls+'" style="--castle-room-art:url(\''+window.castleEscape_(theme.background)+'\')">'+
      '<div class="castle-r2-kicker">'+window.castleEscape_(theme.title)+'</div><h2>Who is behind Door '+(index+1)+'?</h2>'+
      '<div id="castleR2SpinnerWindow" class="castle-r2-spinner-window castle-mobile-spinner-window">'+castleMobileCard_({kind:'MASK',name:'The Castle'},theme,false,{pace:'slow',accent:castleMobilePalette_(theme,0)})+'</div>'+
      '<p class="castle-r2-spinner-copy">'+window.castleEscape_(castleMobileAtmosphereCopy_(index))+'</p>'+
      '<button class="castle-r2-primary" onclick="castleR2Spin_('+index+',this)">SPIN THE CASTLE</button></div></section>';
  }

  function castleMobileSpin_(index,button){
    var matches=window.CASTLE_DUEL_STATE&&window.CASTLE_DUEL_STATE.matches||[],m=matches[index];
    if(!m)return;
    var windowEl=document.getElementById('castleR2SpinnerWindow');
    if(!windowEl)return;
    var theme=castleMobileTheme_(m,window.CASTLE_DUEL_STATE&&window.CASTLE_DUEL_STATE.round);
    var cards=castleMobileCandidates_(m);
    var profile=castleMobileRevealProfile_();
    var timings=profile.timings;
    var atmosphere=windowEl.closest?windowEl.closest('.castle-mobile-atmosphere'):null;
    var step=0;
    var reduced=profile.key==='REDUCED';
    if(button){button.disabled=true;button.textContent=reduced?'THE CASTLE HAS CHOSEN…':CASTLE_MOBILE_BUTTON_STATES[0];}
    windowEl.classList.add('is-spinning');
    if(atmosphere)atmosphere.classList.add('is-castle-spinning');

    if(window.CASTLE_DUEL_R2_SPIN_TIMER)clearTimeout(window.CASTLE_DUEL_R2_SPIN_TIMER);

    function finishReveal_(){
      window.CASTLE_DUEL_R2_SPIN_TIMER=null;
      windowEl.classList.remove('is-spinning');
      if(atmosphere){
        atmosphere.classList.remove('is-castle-spinning');
        atmosphere.classList.add('castle-stop-'+profile.finalEffect);
      }
      var finalEntry={
        kind:m.kind||'TV',
        name:castleMobileName_(m),
        imageUrl:castleMobileSafeImage_(m),
        profileImageUrl:castleMobileSafeImage_(m),
        hiddenTraitor:castleMobileHiddenTraitor_(m)
      };
      windowEl.innerHTML=castleMobileCard_(finalEntry,theme,true,{pace:'slow',accent:castleMobilePalette_(theme,0),tilt:'0',effect:profile.finalEffect});
      if(button)button.textContent='THE CASTLE HAS CHOSEN…';
      if(typeof window.castleR2MarkRevealed_==='function')window.castleR2MarkRevealed_(m);
      setTimeout(function(){
        if(atmosphere)atmosphere.classList.remove('castle-stop-'+profile.finalEffect);
        if(typeof window.castleR2Render_==='function')window.castleR2Render_();
      },460);
    }

    function advance_(){
      if(step>=timings.length){finishReveal_();return;}
      var delay=timings[step];
      var entry=cards[step%cards.length];
      var tilt=reduced?'0':String((step%5)-2);
      windowEl.innerHTML=castleMobileCard_(entry,theme,false,{
        pace:castleMobilePace_(delay),
        accent:castleMobilePalette_(theme,step),
        tilt:tilt
      });
      if(button&&!reduced)button.textContent=CASTLE_MOBILE_BUTTON_STATES[Math.min(CASTLE_MOBILE_BUTTON_STATES.length-1,Math.floor(step*CASTLE_MOBILE_BUTTON_STATES.length/timings.length))];
      step+=1;
      window.CASTLE_DUEL_R2_SPIN_TIMER=setTimeout(advance_,delay);
    }

    window.CASTLE_DUEL_R2_SPIN_TIMER=setTimeout(advance_,reduced?60:90);
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
    '.castle-mobile-portrait-shell{position:relative}.castle-mobile-portrait-shell>img{width:100%;height:100%;object-fit:cover}.castle-mobile-fallback-slot{display:contents}.castle-mobile-fallback-slot[hidden]{display:none!important}.castle-mobile-fallback{width:100%;height:100%;min-height:100%;display:grid;place-items:center;background:radial-gradient(circle at 50% 30%,rgba(244,212,138,.22),rgba(18,14,20,.96) 72%);color:#f4d48a;font-weight:1000}.castle-mobile-fallback span{display:grid;place-items:center;width:38%;aspect-ratio:1;border-radius:50%;border:2px solid currentColor;font-size:clamp(28px,11vw,72px);background:rgba(0,0,0,.28)}'+
    '.castle-mobile-fallback--mask{background:radial-gradient(ellipse at 50% 35%,rgba(151,112,210,.32),rgba(12,10,17,.98) 72%)}.castle-mobile-fallback--shadow{background:linear-gradient(160deg,#0b090d,#2b0d13 55%,#09080b)}.castle-mobile-fallback--player{background:radial-gradient(circle at 50% 25%,rgba(211,166,94,.3),#16131a 72%)}'+
    '.castle-mobile-spinner-stage{overflow:hidden}.castle-mobile-atmosphere{position:relative;overflow:hidden;transition:filter .14s ease,box-shadow .14s ease}.castle-mobile-atmosphere:after{content:"";pointer-events:none;position:absolute;inset:0;box-shadow:inset 0 0 48px rgba(0,0,0,.18);opacity:.4;transition:opacity .15s ease}.castle-mobile-atmosphere.is-castle-spinning:after{opacity:.78}.castle-mobile-spinner-window{padding:0!important;min-height:0!important;overflow:hidden;background:#151219!important}'+
    '.castle-mobile-random-card{--castle-spin-accent:#c79a52;width:100%;max-width:430px;margin:0 auto;position:relative;overflow:hidden;border-radius:11px 14px 10px 13px;border:1px solid var(--castle-spin-accent);box-shadow:0 16px 34px rgba(0,0,0,.46),0 0 0 1px rgba(244,212,138,.08) inset;background:#151219;transform:rotate(var(--castle-card-tilt,0deg)) scale(.995);transition:transform .12s ease,filter .12s ease,box-shadow .12s ease,border-color .12s ease}.castle-mobile-random-card:after{content:"";pointer-events:none;position:absolute;inset:0;background:radial-gradient(circle at 35% 15%,rgba(255,238,190,.07),transparent 24%),repeating-linear-gradient(93deg,rgba(255,255,255,.014) 0 1px,transparent 1px 4px);mix-blend-mode:screen;opacity:.7}.castle-mobile-random-image{aspect-ratio:4/3;overflow:hidden;filter:saturate(.92) contrast(1.03)}.castle-mobile-random-image .castle-r2-portrait{width:100%;height:100%;aspect-ratio:auto;border:0;border-radius:0;box-shadow:none}.castle-mobile-random-copy{position:absolute;z-index:2;left:0;right:0;bottom:0;padding:42px 15px 13px;text-align:left;background:linear-gradient(transparent,rgba(5,5,8,.94));transition:opacity .08s ease,transform .08s ease}.castle-mobile-random-copy span{display:block;color:#f4d48a;font-size:10px;font-weight:1000;letter-spacing:.13em}.castle-mobile-random-copy strong{display:block;color:#fff;font-size:clamp(25px,7vw,36px);line-height:1.02;text-shadow:0 2px 8px #000}.castle-pace-fast{filter:blur(.55px) brightness(.88);transform:rotate(var(--castle-card-tilt,0deg)) scale(.985)}.castle-pace-fast .castle-mobile-random-copy{opacity:.52;transform:translateY(3px)}.castle-pace-medium .castle-mobile-random-copy{opacity:.78}.castle-pace-slow .castle-mobile-random-copy,.castle-mobile-random-card.is-final .castle-mobile-random-copy{opacity:1;transform:none}.castle-mobile-random-card--portrait .castle-mobile-random-copy strong{font-family:Georgia,serif}.castle-mobile-random-card--mask .castle-mobile-random-copy strong,.castle-mobile-random-card--shadow .castle-mobile-random-copy strong{letter-spacing:.08em}'+
    '.castle-accent-amber{--castle-spin-accent:#b97835}.castle-accent-gold{--castle-spin-accent:#d2ad62}.castle-accent-forest{--castle-spin-accent:#405f43}.castle-accent-burgundy{--castle-spin-accent:#743344}.castle-accent-parchment{--castle-spin-accent:#bda77b}.castle-accent-violet{--castle-spin-accent:#77618d}.castle-accent-black{--castle-spin-accent:#3c3940}.castle-accent-silver{--castle-spin-accent:#9a9ca2}.castle-accent-deep-red{--castle-spin-accent:#6d222b}.castle-accent-shadow{--castle-spin-accent:#352b31}.castle-accent-crimson{--castle-spin-accent:#7c2831}.castle-accent-charcoal{--castle-spin-accent:#4b4745}.castle-accent-wood{--castle-spin-accent:#715036}.castle-accent-royal-gold{--castle-spin-accent:#c0a04c}'+
    '.castle-mobile-random-card.is-final{filter:none;transform:none;box-shadow:0 0 0 2px color-mix(in srgb,var(--castle-spin-accent) 45%,transparent),0 22px 44px rgba(0,0,0,.55)}.castle-final-slow-landing{animation:castleFinalLand .28s ease-out}.castle-final-snap{animation:castleFinalSnap .18s steps(2,end)}.castle-final-shadow-reveal .castle-mobile-random-image{animation:castleShadowImage .3s ease-out}.castle-final-shadow-reveal .castle-mobile-random-copy{animation:castleShadowName .34s ease-out}.castle-final-door-slam{animation:castleDoorSlam .22s ease-out}'+
    '@keyframes castleFinalLand{from{transform:scale(1.025);filter:brightness(.7)}to{transform:scale(1);filter:none}}@keyframes castleFinalSnap{0%{transform:scale(.96)}60%{transform:scale(1.018)}100%{transform:scale(1)}}@keyframes castleShadowImage{from{filter:brightness(.22)}to{filter:none}}@keyframes castleShadowName{0%,35%{opacity:0;transform:translateY(5px)}100%{opacity:1;transform:none}}@keyframes castleDoorSlam{0%{transform:translateX(-2px)}35%{transform:translateX(3px)}70%{transform:translateX(-1px)}100%{transform:none}}'+
    '@media(max-width:560px){.castle-r2-page{padding-left:5px!important;padding-right:5px!important}.castle-r2-hero{padding:12px 13px!important;border-radius:15px!important}.castle-r2-hero h1{font-size:28px!important;margin:2px 0 4px!important}.castle-r2-hero>p{font-size:13px;margin:4px 0!important}.castle-r2-meta{margin-top:8px!important;font-size:12px!important}.castle-r2-stage{margin-top:8px!important;padding:8px!important;border-radius:14px!important}.castle-r2-progress{margin-bottom:6px!important}.castle-r2-progress b{font-size:15px!important}.castle-r2-room-scene{padding:8px!important;min-height:0!important}.castle-r2-room-heading{margin-bottom:6px!important}.castle-r2-room-heading h2{font-size:21px!important;margin:1px 0!important}.castle-r2-room-heading p{font-size:12px!important}.castle-r2-play-stage .castle-r2-portrait-wrap{width:calc(100% + 16px)!important;margin-left:-8px!important;margin-right:-8px!important}.castle-r2-play-stage .castle-r2-portrait{aspect-ratio:4/3!important}.castle-r3-photo-label{padding:38px 12px 9px!important}.castle-r3-photo-label strong{font-size:27px!important}.castle-r2-paper{padding:10px!important}.castle-r2-choice,.castle-r2-swipe-back,.castle-r2-swipe-next,.castle-r2-primary{min-height:52px!important}.castle-r2-spinner{min-height:0!important;padding:10px!important;border-radius:12px!important}.castle-r2-spinner h2{font-size:21px;margin:5px 0 8px}.castle-r2-spinner-copy{font-size:12px;margin:8px 0}.castle-mobile-random-card{border-radius:10px 12px 9px 11px}.castle-mobile-random-image{aspect-ratio:4/3}.castle-mobile-random-copy{padding:38px 12px 10px}.castle-r2-standings{margin-top:8px!important}}'+
    '@media(max-width:375px){.castle-r2-page{padding-left:3px!important;padding-right:3px!important}.castle-r2-stage{padding:6px!important}.castle-r2-play-stage .castle-r2-portrait{aspect-ratio:1.22!important}.castle-r2-room-heading p{display:none}.castle-r2-paper{padding:8px!important}.castle-mobile-random-copy strong{font-size:25px}}'+
    '@media(min-width:410px) and (max-width:560px){.castle-r2-play-stage .castle-r2-portrait{aspect-ratio:1.38!important}.castle-mobile-random-image{aspect-ratio:1.38}}'+
    '@media(prefers-reduced-motion:reduce){.castle-mobile-random-card,.castle-mobile-random-copy,.castle-mobile-atmosphere,.castle-mobile-atmosphere:after{animation:none!important;transition:none!important}.castle-pace-fast{filter:none!important;transform:none!important}.castle-pace-fast .castle-mobile-random-copy{opacity:1!important;transform:none!important}}'+
    '</style>'; }

  function castleMobilePolishStyles_(){return '<style id="castleMobilePresentationR1Polish">'+
    '.castle-r2-hero,.castle-r2-stage,.castle-r2-room-scene,.castle-r2-spinner,.castle-r2-paper,.castle-r2-insight,.castle-r2-history,.castle-r2-choice,.castle-r2-sealed,.castle-r2-mask-card,.castle-r2-summary-card,.castle-r2-summary-avatar,.castle-r2-standings,.castle-r2-lock-warning,.castle-r2-confirm-card,.castle-r2-submitting,.castle-r2-envelope,.castle-r3-banish,.castle-r3-traitor-card,.castle-r3-traitor-option,.castle-r3-fate-card,.castle-r3-mask-outcome,.castle-r3-host-envelope,.castle-r3-fate-result,.castle-mobile-random-card{border-radius:5px!important}'+
    '.castle-r2-primary,.castle-r2-secondary,.castle-r2-target,.castle-r2-swipe-back,.castle-r2-swipe-next,.castle-r2-click-seal,.castle-r3-full{border-radius:5px!important}'+
    '.castle-r2-portrait,.castle-r2-spinner-window{border-radius:4px!important}.castle-r2-check,.castle-r2-check input{border-radius:4px!important}'+
    '.castle-r2-room-heading h2,.castle-r2-opponent,.castle-r2-hero h1,.castle-r2-confirm-card .castle-r2-snark,.castle-r2-envelope-title{font-family:Georgia,"Times New Roman",serif!important;font-weight:700!important;letter-spacing:.01em!important}.castle-r2-room-heading p,.castle-r2-sub,.castle-r2-spinner-copy,.castle-r2-swipe-hint{font-family:Georgia,"Times New Roman",serif!important;letter-spacing:.01em!important}.castle-r2-primary,.castle-r2-secondary,.castle-r2-swipe-back,.castle-r2-swipe-next,.castle-r2-choice,.castle-r2-click-seal{font-weight:700!important;letter-spacing:.02em!important}'+
    '@media(max-width:560px){'+
      '.castle-r2-play-stage,.castle-mobile-spinner-stage{position:relative!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;margin-top:6px!important;overflow:visible!important}'+
      '.castle-r2-play-stage>.castle-r2-progress,.castle-mobile-spinner-stage>.castle-r2-progress{position:absolute!important;top:10px!important;left:0!important;right:0!important;z-index:6!important;justify-content:center!important;align-items:center!important;margin:0!important;pointer-events:none!important}.castle-r2-play-stage>.castle-r2-progress b,.castle-mobile-spinner-stage>.castle-r2-progress b{display:none!important}.castle-r2-dots{justify-content:center!important;gap:8px!important}.castle-r2-dot{width:9px!important;height:9px!important;border-radius:50%!important}.castle-r2-dot.is-current{box-shadow:0 0 0 3px rgba(244,212,138,.15)!important}'+
      '.castle-r2-room-scene{padding:38px 12px 16px!important;min-height:0!important;border-radius:5px!important;background-position:center top!important}.castle-r2-room-heading{margin:0 0 8px!important}.castle-r2-room-heading h2{font-size:22px!important;line-height:1.08!important;margin:0 0 3px!important}.castle-r2-room-heading p{font-size:13px!important;line-height:1.25!important;margin:0 auto!important;max-width:30ch!important}'+
      '.castle-r2-play-stage .castle-r2-portrait-wrap{width:calc(100% - 34px)!important;max-width:342px!important;margin:8px auto 12px!important}.castle-r2-play-stage .castle-r2-portrait{width:100%!important;aspect-ratio:4/3!important;border-radius:4px!important;box-shadow:0 12px 28px rgba(0,0,0,.34)!important}.castle-r3-photo-label{left:0!important;right:0!important;padding:34px 11px 8px!important}.castle-r3-photo-label strong{font-family:Georgia,"Times New Roman",serif!important;font-size:26px!important;font-weight:700!important;line-height:1.04!important}'+
      '.castle-r2-swipe-wrap{margin:12px 8px 6px!important}.castle-r2-swipe-progress{margin:0 0 8px!important}.castle-r2-paper{width:auto!important;margin:0 4px!important;padding:12px 13px!important;border-radius:4px!important;box-shadow:0 12px 28px rgba(0,0,0,.24),inset 0 0 32px rgba(125,91,45,.08)!important}.castle-r2-script{font-size:23px!important;line-height:1.08!important}.castle-r2-paper-sub{font-size:10px!important;font-weight:700!important;letter-spacing:.08em!important}'+
      '.castle-r2-swipe-actions{display:grid!important;grid-template-columns:auto auto!important;justify-content:end!important;align-items:center!important;gap:8px!important;margin:9px 4px 0!important}.castle-r2-swipe-actions>span:empty{display:none!important}.castle-r2-swipe-next,.castle-r2-swipe-back{min-height:44px!important;width:auto!important;min-width:94px!important;padding:0 14px!important;border:1px solid rgba(244,212,138,.42)!important;background:rgba(31,25,31,.46)!important;color:#f5e4ba!important;box-shadow:none!important;font-size:13px!important;font-weight:700!important}.castle-r2-swipe-next:not(:disabled){background:rgba(244,212,138,.14)!important}.castle-r2-swipe-next:disabled{opacity:.38!important}.castle-r2-swipe-hint{margin:7px 4px 4px!important;font-size:11px!important;opacity:.68!important}'+
      '.castle-r2-spinner{padding:38px 12px 14px!important;border-radius:5px!important}.castle-mobile-spinner-window{width:calc(100% - 26px)!important;max-width:368px!important}.castle-mobile-random-card{border-radius:5px!important}.castle-mobile-random-copy strong{font-family:Georgia,"Times New Roman",serif!important;font-weight:700!important}'+
      '.castle-r2-summary-card,.castle-r2-standings,.castle-r3-banish,.castle-r2-insight,.castle-r2-history{border-radius:5px!important}'+
    '}'+
    '@media(max-width:375px){.castle-r2-room-scene{padding-left:10px!important;padding-right:10px!important}.castle-r2-play-stage .castle-r2-portrait-wrap{width:calc(100% - 28px)!important}.castle-r2-swipe-wrap{margin-left:6px!important;margin-right:6px!important}.castle-r2-swipe-next,.castle-r2-swipe-back{min-width:88px!important;padding-left:11px!important;padding-right:11px!important}}'+
    '@media(min-width:410px) and (max-width:560px){.castle-r2-play-stage .castle-r2-portrait-wrap{width:calc(100% - 46px)!important;max-width:360px!important}.castle-r2-swipe-wrap{margin-left:12px!important;margin-right:12px!important}.castle-mobile-spinner-window{width:calc(100% - 40px)!important}}'+
    '</style>';}

  function castleMobileInstall_(){
    if(window.CASTLE_DUEL_MOBILE_PRESENTATION_R1_INSTALLED)return true;
    if(typeof window.castleR2SwipeStyles_!=='function'||typeof window.castleR2RoomHtml_!=='function'||typeof window.castleR2SpinnerHtml_!=='function')return false;
    window.CASTLE_DUEL_MOBILE_PRESENTATION_R1_INSTALLED=true;

    var baseSwipeStyles=window.castleR2SwipeStyles_;
    window.castleR2SwipeStyles_=function(){return baseSwipeStyles()+castleMobileStyles_()+castleMobilePolishStyles_();};
    window.castleR2RoomTheme_=function(m,round){return castleMobileTheme_(m,round);};
    window.castleR2Portrait_=castleMobilePortrait_;
    window.castleR2SpinnerHtml_=castleMobileSpinnerHtml_;
    window.castleR2Spin_=castleMobileSpin_;
    window.castleMobileThemeKey_=castleMobileThemeKey_;
    window.castleMobileHiddenTraitor_=castleMobileHiddenTraitor_;
    window.castleMobileCandidates_=castleMobileCandidates_;
    window.castleMobileRevealProfile_=castleMobileRevealProfile_;

    if(window.CASTLE_DUEL_STATE&&typeof window.castleR2Render_==='function')window.castleR2Render_();
    return true;
  }

  if(!castleMobileInstall_()){
    var attempts=0,installer=setInterval(function(){attempts+=1;if(castleMobileInstall_()||attempts>240)clearInterval(installer);},25);
  }
})();
