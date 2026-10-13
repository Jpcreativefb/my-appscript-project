(function(){
  'use strict';

  var ROOM_ROOT='./assets/castle/rooms/';
  var OVERLAY_ROOT='./assets/castle/overlays/';

  var CASTLE_ENCOUNTER_REAL_ASSET_HOOKS_R1={
    version:'r1-prepare-only',
    sourceCheckpoints:{
      rooms:'02df8dd6ec4f5cc019ef1c583110ac3b39360a76',
      overlays:'23745a1a27d25b9330b4f58d3ac0b30a2ba140fb'
    },
    layerOrder:[
      'room backdrop',
      'dynamic portrait',
      'approved transparent overlay',
      'physical encounter prop',
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
      REGULAR_HOST:null,
      MASKED_OFFER:null,
      MASKED_HOST:null,
      MASKED_FAITHFUL:null,
      MASKED_MURDERER:null,
      MASKED_TRAITOR_FATE:null,
      MURDER_TARGET:null
    }
  };

  function esc_(value){
    return String(value==null?'':value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function assetSlot_(slotKey,label){
    return '<div class="castle-encounter-prop-slot" data-prop-slot="'+esc_(slotKey)+'" aria-label="'+esc_(label)+'">'
      +'<span class="castle-encounter-prop-slot__label">PRODUCTION ART SLOT</span>'
      +'<span class="castle-encounter-prop-slot__name">'+esc_(label)+'</span>'
      +'</div>';
  }

  function portraitStack_(opts){
    opts=opts||{};
    var imageUrl=String(opts.imageUrl||'');
    var overlayUrl=String(opts.overlayUrl||CASTLE_ENCOUNTER_REAL_ASSET_HOOKS_R1.overlays.NORMAL);
    var name=String(opts.name||'');
    var status=String(opts.status||'');
    return '<figure class="castle-encounter-portrait-stack">'
      +'<div class="castle-encounter-portrait-stack__media">'
      +(imageUrl?'<img class="castle-encounter-portrait-stack__portrait" src="'+esc_(imageUrl)+'" alt="'+esc_(name)+'">':'<div class="castle-encounter-portrait-stack__portrait castle-encounter-portrait-stack__portrait--empty" aria-hidden="true"></div>')
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
