(function(){
  'use strict';

  var ROOM_ROOT='./assets/castle/rooms/';
  var OVERLAY_ROOT='./assets/castle/overlays/';
  var SPECIAL_ROOT='./assets/castle/special/';

  var CASTLE_ENCOUNTER_REAL_ASSET_HOOKS_R1={
    version:'r1-integrated',
    sourceCheckpoints:{
      rooms:'02df8dd6ec4f5cc019ef1c583110ac3b39360a76',
      overlays:'23745a1a27d25b9330b4f58d3ac0b30a2ba140fb'
    },
    layerOrder:[
      'room backdrop',
      'dynamic portrait',
      'approved transparent overlay',
      'approved physical prop',
      'live HTML labels/status/explanations',
      'controls'
    ],
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
      SUSPECT:OVERLAY_ROOT+'portrait-suspect.svg',
      HIDDEN_TRAITOR:OVERLAY_ROOT+'portrait-hidden-traitor.svg',
      REVEALED_TRAITOR:OVERLAY_ROOT+'portrait-revealed-traitor.svg',
      ELIMINATED:OVERLAY_ROOT+'portrait-eliminated.svg',
      SHIELD:OVERLAY_ROOT+'portrait-shield.svg',
      MURDER_DANGER:OVERLAY_ROOT+'portrait-murder-danger.svg',
      HOST:OVERLAY_ROOT+'portrait-host.svg'
    },
    props:{
      MASKED_HALL_MASK:SPECIAL_ROOT+'masked-hall-mask.svg',
      MASKED_OFFER:SPECIAL_ROOT+'host-envelope-sealed.svg',
      HOST_PROTECTION:SPECIAL_ROOT+'host-protection.svg',
      HOST_BONUS:SPECIAL_ROOT+'host-gold.svg',
      HOST_MERCY:SPECIAL_ROOT+'host-mercy.svg',
      MURDERER_CARD:SPECIAL_ROOT+'murderer-card.svg',
      FATE_SEALED:SPECIAL_ROOT+'fate-card-sealed.svg',
      FATE_SAFE:SPECIAL_ROOT+'fate-card-safe.svg',
      FATE_MURDERED:SPECIAL_ROOT+'fate-card-murdered.svg',
      TRAITOR_CHOICE:SPECIAL_ROOT+'traitor-choice-frame.svg',
      DAGGER:null,
      POISON:null,
      ROPE:null,
      WRENCH:null,
      MURDER_KEY:null,
      CANDLESTICK:null,
      TOASTER:null,
      TECHNOLOGY_PHONE:null,
      HOST_PORTRAIT_SOURCE:null
    }
  };

  function esc_(value){
    return String(value==null?'':value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function assetSlot_(slotKey,label){
    return '<div class="castle-encounter-prop-slot" data-prop-slot="'+esc_(slotKey)+'" aria-label="'+esc_(label)+'">'
      +'<span class="castle-encounter-prop-slot__label">PRODUCTION ART PENDING</span>'
      +'<span class="castle-encounter-prop-slot__name">'+esc_(label)+'</span>'
      +'</div>';
  }

  function portraitStack_(opts){
    opts=opts||{};
    var imageUrl=String(opts.imageUrl||'');
    var overlayUrl=String(opts.overlayUrl||CASTLE_ENCOUNTER_REAL_ASSET_HOOKS_R1.overlays.NORMAL);
    var name=String(opts.name||'');
    var status=String(opts.status||'');
    var pending=String(opts.pending||'PORTRAIT SOURCE PENDING');
    return '<figure class="castle-encounter-portrait-stack">'
      +'<div class="castle-encounter-portrait-stack__media">'
      +(imageUrl?'<img class="castle-encounter-portrait-stack__portrait" src="'+esc_(imageUrl)+'" alt="'+esc_(name)+'">':'<div class="castle-encounter-portrait-stack__portrait castle-encounter-portrait-stack__portrait--empty"><span>'+esc_(pending)+'</span></div>')
      +'<img class="castle-encounter-portrait-stack__overlay" src="'+esc_(overlayUrl)+'" alt="" aria-hidden="true">'
      +'</div>'
      +'<figcaption class="castle-encounter-portrait-stack__caption">'
      +'<strong>'+esc_(name)+'</strong>'
      +(status?'<span>'+esc_(status)+'</span>':'')
      +'</figcaption>'
      +'</figure>';
  }

  function maskedFlowContract_(){
    return ['MASKED_HALL','MASKED_OFFER','IDENTITY_REVEAL','BRANCH'];
  }

  window.CASTLE_ENCOUNTER_REAL_ASSET_HOOKS_R1=CASTLE_ENCOUNTER_REAL_ASSET_HOOKS_R1;
  window.castleEncounterAssetSlotR1_=assetSlot_;
  window.castleEncounterPortraitStackR1_=portraitStack_;
  window.castleEncounterMaskedFlowR1_=maskedFlowContract_;
})();
