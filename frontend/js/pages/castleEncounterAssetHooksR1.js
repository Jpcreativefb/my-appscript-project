(function(){
  'use strict';

  var ROOM_ROOT='./assets/castle/rooms/';
  var OVERLAY_ROOT='./assets/castle/overlays/';
  var PRODUCTION_ROOT='./assets/castle/production/';
  var HOST_ROOT=PRODUCTION_ROOT+'host/';
  var HALL_ROOT=PRODUCTION_ROOT+'masked-hall/';
  var FAITHFUL_ROOT=PRODUCTION_ROOT+'masked-faithful/';
  var WHEEL_ROOT=PRODUCTION_ROOT+'murder-wheel/';
  var WHEEL_SYMBOL_ROOT=WHEEL_ROOT+'symbols/';
  var FATE_ROOT=PRODUCTION_ROOT+'fate/';
  var MURDER_ROOT=PRODUCTION_ROOT+'masked-murderer/';

  var H={
    version:'r1-production-art-r3-integrated',
    sourceCheckpoints:{
      rooms:'02df8dd6ec4f5cc019ef1c583110ac3b39360a76',
      overlays:'23745a1a27d25b9330b4f58d3ac0b30a2ba140fb',
      productionArt:'14b69c5da52bd705fcfcc8fd25f70afdb9348f66'
    },
    layerOrder:['room backdrop','dynamic portrait','approved transparent overlay','approved physical prop','live HTML labels/status/explanations','controls'],
    rooms:{
      REGULAR_HOST:ROOM_ROOT+'host-study-modern.webp',
      MASKED_HALL:ROOM_ROOT+'masked-hall-modern.webp',
      MASKED_HOST:ROOM_ROOT+'host-study-modern.webp',
      MASKED_FAITHFUL:ROOM_ROOT+'portrait-gallery-modern.webp',
      MASKED_MURDERER:ROOM_ROOT+'murder-passage-modern.webp',
      MASKED_TRAITOR_FATE:ROOM_ROOT+'murder-passage-modern.webp',
      MURDER_TARGET:ROOM_ROOT+'murder-passage-modern.webp',
      CASTLE_FIVE:ROOM_ROOT+'portrait-gallery-modern.webp'
    },
    overlays:{
      NORMAL:OVERLAY_ROOT+'portrait-normal.svg',
      PATTC_PLAYER:OVERLAY_ROOT+'portrait-pattc-player.svg',
      CASTLE_FIVE:OVERLAY_ROOT+'portrait-castle-five.svg',
      CASTLE_FIVE_WELCOME:OVERLAY_ROOT+'portrait-castle-five-welcome.svg',
      ALLIANCE_NEW_MEMBER:OVERLAY_ROOT+'portrait-alliance-new-member.svg',
      FAITHFUL_SELECTED:OVERLAY_ROOT+'portrait-masked-faithful-selected.svg',
      UNSELECTED_FADED:OVERLAY_ROOT+'portrait-unselected-faded.svg',
      SUSPECT:OVERLAY_ROOT+'portrait-suspect.svg',
      HIDDEN_TRAITOR:OVERLAY_ROOT+'portrait-fate-traitor.svg',
      REVEALED_TRAITOR:OVERLAY_ROOT+'portrait-revealed-traitor.svg',
      ELIMINATED:OVERLAY_ROOT+'portrait-eliminated.svg',
      SHIELD:OVERLAY_ROOT+'portrait-shield.svg',
      MURDER_TARGET:OVERLAY_ROOT+'portrait-murder-target.svg',
      MURDER_DANGER:OVERLAY_ROOT+'portrait-murder-danger.svg',
      HOST:OVERLAY_ROOT+'portrait-host.svg'
    },
    props:{
      HOST_PORTRAIT_SOURCE:HOST_ROOT+'host-teal-source.svg',
      MASKED_HALL_MASK:HALL_ROOT+'masked-hall-entrance-hero.svg',
      MASKED_OFFER:HALL_ROOT+'sealed-wager-envelope.svg',
      HOST_CARD_BACK:HOST_ROOT+'host-card-back.svg',
      HOST_PROTECTION:HOST_ROOT+'host-life-shield.svg',
      HOST_BONUS:HOST_ROOT+'host-big-bonus.svg',
      HOST_MERCY:HOST_ROOT+'host-banish-reduction.svg',
      HOST_SELECTED:HOST_ROOT+'host-selected.svg',
      HOST_UNSELECTED_FADED:HOST_ROOT+'host-unselected-faded.svg',
      HOST_FINAL_REWARD:HOST_ROOT+'host-final-reward.svg',
      FAITHFUL_FACEDOWN:FAITHFUL_ROOT+'facedown-contestant-card.svg',
      FAITHFUL_NON_ALLIANCE_BADGE:FAITHFUL_ROOT+'faithful-non-alliance-badge.svg',
      FAITHFUL_WAGER_2X:FAITHFUL_ROOT+'wager-2x.svg',
      FAITHFUL_WAGER_3X:FAITHFUL_ROOT+'wager-3x.svg',
      FAITHFUL_WAGER_RETURNED:FAITHFUL_ROOT+'wager-returned.svg',
      MURDER_WHEEL:WHEEL_ROOT+'murder-wheel-r3.svg',
      MURDER_WHEEL_POINTER:WHEEL_ROOT+'murder-wheel-pointer.svg',
      MURDER_RESULT_SHELL:WHEEL_ROOT+'result-panel-shell.svg',
      TECHNOLOGY_PHONE:WHEEL_SYMBOL_ROOT+'technology.svg',
      DAGGER:WHEEL_SYMBOL_ROOT+'dagger.svg',
      POISON:WHEEL_SYMBOL_ROOT+'poison.svg',
      ROPE:WHEEL_SYMBOL_ROOT+'rope.svg',
      SKULL:WHEEL_SYMBOL_ROOT+'skull.svg',
      WRENCH:WHEEL_SYMBOL_ROOT+'wrench.svg',
      TOASTER:WHEEL_SYMBOL_ROOT+'toaster.svg',
      MURDERER_CARD:WHEEL_SYMBOL_ROOT+'murderer-card.svg',
      MURDER_KEY:WHEEL_SYMBOL_ROOT+'murder-key.svg',
      CANDLESTICK:WHEEL_SYMBOL_ROOT+'candlestick.svg',
      STANDARD_MURDER:MURDER_ROOT+'standard-murder.svg',
      WEAPON_MATCH:MURDER_ROOT+'weapon-match.svg',
      MURDER_KEY_BENEFIT:MURDER_ROOT+'murder-key.svg',
      MURDERER_CARD_BENEFIT:MURDER_ROOT+'murderer-card.svg',
      SELECTED_TARGET:MURDER_ROOT+'selected-target-overlay.svg',
      MURDER_CONFIRMATION:MURDER_ROOT+'murder-confirmation.svg',
      FATE_SEALED:FATE_ROOT+'cards/fate-sealed.svg',
      FATE_SAFE:FATE_ROOT+'cards/fate-safe.svg',
      FATE_SAFE_DUCK:FATE_ROOT+'cards/fate-safe-duck.svg',
      FATE_DAGGER:FATE_ROOT+'cards/fate-dagger.svg',
      FATE_POISON:FATE_ROOT+'cards/fate-poison.svg',
      FATE_ROPE:FATE_ROOT+'cards/fate-rope.svg',
      FATE_WRENCH:FATE_ROOT+'cards/fate-wrench.svg',
      FATE_TOASTER:FATE_ROOT+'cards/fate-toaster.svg',
      FATE_TECHNOLOGY:FATE_ROOT+'cards/fate-technology.svg',
      FATE_SELECTED:FATE_ROOT+'states/fate-selected-overlay.svg',
      FATE_UNSELECTED_FADED:FATE_ROOT+'states/fate-unselected-faded-overlay.svg',
      FATE_DANGER:FATE_ROOT+'states/fate-danger-progression-overlay.svg',
      FATE_RESULT_SAFE:FATE_ROOT+'results/safe-lifesaver.svg',
      FATE_RESULT_SAFE_DUCK:FATE_ROOT+'results/safe-duck.svg',
      FATE_RESULT_MURDERED:FATE_ROOT+'results/murdered.svg',
      FATE_DEATH_DAGGER:FATE_ROOT+'results/death-dagger.svg',
      FATE_DEATH_POISON:FATE_ROOT+'results/death-poison.svg',
      FATE_DEATH_ROPE:FATE_ROOT+'results/death-rope.svg',
      FATE_DEATH_WRENCH:FATE_ROOT+'results/death-wrench.svg',
      FATE_DEATH_TOASTER:FATE_ROOT+'results/death-toaster.svg',
      FATE_DEATH_TECHNOLOGY:FATE_ROOT+'results/death-technology.svg'
    }
  };

  function esc_(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function assetSlot_(key,label){return '<div class="castle-encounter-prop-slot" data-prop-slot="'+esc_(key)+'" aria-label="'+esc_(label)+'"><span class="castle-encounter-prop-slot__label">PRODUCTION ART</span><span class="castle-encounter-prop-slot__name">'+esc_(label)+'</span></div>';}
  function portraitStack_(o){o=o||{};var image=String(o.imageUrl||''),overlay=String(o.overlayUrl||H.overlays.NORMAL),name=String(o.name||''),status=String(o.status||''),pending=String(o.pending||'PORTRAIT SOURCE PENDING');return '<figure class="castle-encounter-portrait-stack"><div class="castle-encounter-portrait-stack__media">'+(image?'<img class="castle-encounter-portrait-stack__portrait" src="'+esc_(image)+'" alt="'+esc_(name)+'">':'<div class="castle-encounter-portrait-stack__portrait castle-encounter-portrait-stack__portrait--empty"><span>'+esc_(pending)+'</span></div>')+'<img class="castle-encounter-portrait-stack__overlay" src="'+esc_(overlay)+'" alt="" aria-hidden="true"></div><figcaption class="castle-encounter-portrait-stack__caption"><strong>'+esc_(name)+'</strong>'+(status?'<span>'+esc_(status)+'</span>':'')+'</figcaption></figure>';}
  function maskedFlowContract_(){return ['MASKED_HALL','MASKED_OFFER','IDENTITY_REVEAL','BRANCH'];}
  function findSection_(needle){return Array.prototype.find.call(document.querySelectorAll('section.card'),function(el){return el.textContent.indexOf(needle)!==-1;});}
  function addLayer_(host,src,cls){if(!host||!src||host.querySelector('img.'+cls+'[src="'+src+'"]'))return;var img=document.createElement('img');img.className=cls;img.src=src;img.alt='';img.setAttribute('aria-hidden','true');host.appendChild(img);}
  function replaceHostPortraits_(){document.querySelectorAll('figure.portrait-stack,figure.castle-encounter-portrait-stack').forEach(function(fig){var cap=fig.querySelector('figcaption strong');if(!cap||cap.textContent.trim()!=='THE HOST')return;var media=fig.querySelector('.portrait-media,.castle-encounter-portrait-stack__media');if(!media)return;var empty=media.querySelector('.portrait-source.empty,.castle-encounter-portrait-stack__portrait--empty');if(empty){var img=document.createElement('img');img.className=empty.classList.contains('portrait-source')?'portrait-source':'castle-encounter-portrait-stack__portrait';img.src=H.props.HOST_PORTRAIT_SOURCE;img.alt='THE HOST';empty.replaceWith(img);}var overlay=media.querySelector('.portrait-overlay,.castle-encounter-portrait-stack__overlay');if(overlay)overlay.src=H.overlays.HOST;});}
  function decorateHostCards_(){var section=findSection_('MASKED IDENTITY REVEAL · HOST');if(!section)return;section.querySelectorAll('.grid6 .tile').forEach(function(tile){var first=tile.querySelector(':scope > img:not(.production-card-state)'),open=tile.classList.contains('revealed'),faded=tile.classList.contains('faded');if(first&&!open)first.src=H.props.HOST_CARD_BACK;if(open)addLayer_(tile,H.props.HOST_SELECTED,'production-card-state');if(faded)addLayer_(tile,H.props.HOST_UNSELECTED_FADED,'production-card-state');});}
  function faithfulReward_(text){if(text.indexOf('3×')!==-1)return H.props.FAITHFUL_WAGER_3X;if(text.indexOf('2×')!==-1)return H.props.FAITHFUL_WAGER_2X;if(text.indexOf('returned')!==-1)return H.props.FAITHFUL_WAGER_RETURNED;if(text.indexOf('+Alliance')!==-1)return H.props.FAITHFUL_NON_ALLIANCE_BADGE;return '';}
  function decorateFaithful_(){var section=findSection_('MASKED IDENTITY REVEAL · FAITHFUL');if(!section)return;section.querySelectorAll('.grid6 .tile').forEach(function(tile){var revealed=tile.classList.contains('revealed'),faded=tile.classList.contains('faded'),media=tile.querySelector('.portrait-media'),overlay=tile.querySelector('.portrait-overlay');if(!revealed&&!faded){if(media&&!media.querySelector('.production-facedown'))media.innerHTML='<img class="production-facedown" src="'+esc_(H.props.FAITHFUL_FACEDOWN)+'" alt="Facedown contestant card">';return;}if(overlay)overlay.src=revealed?H.overlays.FAITHFUL_SELECTED:H.overlays.UNSELECTED_FADED;if(revealed&&media)addLayer_(media,faithfulReward_(tile.textContent),'production-portrait-state');});}
  function wheelAsset_(label){return {'DAGGER':H.props.DAGGER,'POISON':H.props.POISON,'ROPE':H.props.ROPE,'SKULL':H.props.SKULL,'WRENCH':H.props.WRENCH,'TOASTER':H.props.TOASTER,'MURDERER CARD':H.props.MURDERER_CARD,'MURDER KEY':H.props.MURDER_KEY,'CANDLESTICK':H.props.CANDLESTICK,'TECHNOLOGY · MOBILE PHONE':H.props.TECHNOLOGY_PHONE,'TECHNOLOGY':H.props.TECHNOLOGY_PHONE}[label]||'';}
  function decorateWheel_(){var section=findSection_('Murder Wheel');if(!section)return;section.querySelectorAll('.wheel-token').forEach(function(token){var label=token.textContent.replace(/APPROVED ITEM · PRODUCTION ART PENDING/g,'').trim(),src=wheelAsset_(label);if(src){token.classList.remove('pending');token.innerHTML='<img src="'+esc_(src)+'" alt=""><strong>'+esc_(label)+'</strong>';}});var grid=section.querySelector('.wheel-art');if(grid&&!Array.prototype.some.call(grid.querySelectorAll('.wheel-token strong'),function(el){return el.textContent.trim()==='SKULL';})){var skull=document.createElement('div');skull.className='wheel-token';skull.innerHTML='<img src="'+esc_(H.props.SKULL)+'" alt=""><strong>SKULL</strong>';grid.appendChild(skull);}var benefit=section.querySelector('.benefit');if(benefit&&!benefit.querySelector('.production-benefit-art')){var mode=((benefit.querySelector('strong')||{}).textContent||'').trim(),src=mode==='STANDARD MURDER'?H.props.STANDARD_MURDER:mode==='MURDER KEY'?H.props.MURDER_KEY_BENEFIT:mode==='MURDERER CARD'?H.props.MURDERER_CARD_BENEFIT:H.props.WEAPON_MATCH;if(src){var img=document.createElement('img');img.className='production-benefit-art';img.src=src;img.alt='';benefit.insertBefore(img,benefit.firstChild);}}}
  function decorateTargets_(){var section=findSection_('PATTC MURDER TARGET');if(!section)return;section.querySelectorAll('.player').forEach(function(row){var selected=!!row.querySelector('.btn.blood'),media=row.querySelector('.portrait-media'),overlay=row.querySelector('.portrait-overlay');if(overlay)overlay.src=selected?H.overlays.MURDER_DANGER:H.overlays.MURDER_TARGET;if(selected&&media)addLayer_(media,H.props.SELECTED_TARGET,'production-portrait-state');});}
  function fateCard_(value){return {'SEALED':H.props.FATE_SEALED,'SAFE':H.props.FATE_SAFE,'DAGGER':H.props.FATE_DAGGER,'POISON':H.props.FATE_POISON,'ROPE':H.props.FATE_ROPE,'WRENCH':H.props.FATE_WRENCH,'TOASTER':H.props.FATE_TOASTER,'TECHNOLOGY':H.props.FATE_TECHNOLOGY}[value]||H.props.FATE_SEALED;}
  function decorateFate_(){var section=findSection_('MASKED IDENTITY REVEAL · TRAITOR / FATE');if(!section)return;section.querySelectorAll('.fate-card').forEach(function(card){var value=((card.querySelector('strong')||{}).textContent||'SEALED').trim(),img=card.querySelector(':scope > img:not(.production-card-state)');if(img)img.src=fateCard_(value);if(value!=='SEALED')addLayer_(card,H.props.FATE_SELECTED,'production-card-state');if(card.classList.contains('faded'))addLayer_(card,H.props.FATE_UNSELECTED_FADED,'production-card-state');});var status=section.querySelector('.status'),portrait=section.querySelector('.portrait-media');if(status&&portrait){var m=status.textContent.match(/MURDER\s+(\d+)\/3/);if(m&&+m[1]>0)addLayer_(portrait,H.props.FATE_DANGER,'production-portrait-state');}}
  function insertResultArt_(panel,src,alt){if(!panel||!src||panel.querySelector('img.production-result-art[src="'+src+'"]'))return;var img=document.createElement('img');img.className='result-prop production-result-art';img.src=src;img.alt=alt||'';panel.insertBefore(img,panel.firstChild);}
  function decorateResults_(){var full=document.getElementById('full');if(!full||!full.classList.contains('show'))return;var panel=full.querySelector('.panel'),text=full.textContent,img=full.querySelector('img.result-prop:not(.production-result-art)');if(text.indexOf('MASKED HOST RESULT')!==-1)insertResultArt_(panel,H.props.HOST_FINAL_REWARD,'Host final reward');if(text.indexOf('WELCOME TO THE CASTLE 5 ALLIANCE')!==-1){var media=full.querySelector('.portrait-media'),overlay=full.querySelector('.portrait-overlay');if(overlay)overlay.src=H.overlays.CASTLE_FIVE_WELCOME;if(media)addLayer_(media,H.overlays.ALLIANCE_NEW_MEMBER,'production-portrait-state');}if(text.indexOf('YOU MURDERER — YOU KILLED IT!')!==-1){if(img)img.src=H.props.MURDER_CONFIRMATION;else insertResultArt_(panel,H.props.MURDER_CONFIRMATION,'Murder confirmation');}if(/\bSAFE\b/.test(text)&&text.indexOf('FATE RESULT')!==-1&&img)img.src=H.props.FATE_RESULT_SAFE;var death=text.match(/DEATH BY (DAGGER|POISON|ROPE|WRENCH|TOASTER|TECHNOLOGY)/);if(death&&img)img.src={DAGGER:H.props.FATE_DEATH_DAGGER,POISON:H.props.FATE_DEATH_POISON,ROPE:H.props.FATE_DEATH_ROPE,WRENCH:H.props.FATE_DEATH_WRENCH,TOASTER:H.props.FATE_DEATH_TOASTER,TECHNOLOGY:H.props.FATE_DEATH_TECHNOLOGY}[death[1]];}
  function injectCss_(){if(document.getElementById('castle-production-r3-css'))return;var s=document.createElement('style');s.id='castle-production-r3-css';s.textContent='.wheel{background:url("'+H.props.MURDER_WHEEL+'") center/contain no-repeat!important;border:0!important;border-radius:50%!important}.wheel span,.wheel:after{display:none!important}.pointer{width:44px!important;height:42px!important;border:0!important;background:url("'+H.props.MURDER_WHEEL_POINTER+'") center/contain no-repeat!important;margin-bottom:-12px!important}.production-card-state,.production-portrait-state{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;pointer-events:none!important;z-index:2!important}.tile>img:not(.production-card-state),.fate-card>img:not(.production-card-state){position:relative;z-index:1}.tile strong,.tile .reward-note,.fate-card strong{position:relative;z-index:3}.portrait-overlay{z-index:2}.production-portrait-state{z-index:3!important}.portrait-caption,.btn,.status{position:relative;z-index:4}.production-benefit-art{width:100%;max-height:160px;object-fit:contain;display:block;margin:0 auto 7px}.production-facedown{width:100%;height:100%;object-fit:contain;display:block}.production-result-art{width:min(62vw,220px);max-height:210px;object-fit:contain;margin:4px auto 8px;display:block}.wheel-token img{width:100%;height:58px;object-fit:contain}@media(max-width:390px){.wheel{width:min(72vw,270px)!important;height:min(72vw,270px)!important}}@media(max-width:360px){.wheel{width:min(76vw,252px)!important;height:min(76vw,252px)!important}}';document.head.appendChild(s);}
  function decorate_(){injectCss_();replaceHostPortraits_();decorateHostCards_();decorateFaithful_();decorateWheel_();decorateTargets_();decorateFate_();decorateResults_();}

  window.CASTLE_ENCOUNTER_REAL_ASSET_HOOKS_R1=H;
  window.castleEncounterAssetSlotR1_=assetSlot_;
  window.castleEncounterPortraitStackR1_=portraitStack_;
  window.castleEncounterMaskedFlowR1_=maskedFlowContract_;
  if(typeof document!=='undefined'){
    injectCss_();
    var queued=false,queue=function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;decorate_();});};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
    new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }
})();
