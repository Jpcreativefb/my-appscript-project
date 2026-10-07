'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const presentationPath = path.join(root, 'frontend/js/pages/castleDuelMobilePresentationR1.js');
const revealPath = path.join(root, 'frontend/js/pages/castleDuelRevealR2.js');
const swipePath = path.join(root, 'frontend/js/pages/castleDuelRevealR2Swipe.js');
const presentation = fs.readFileSync(presentationPath, 'utf8');
const reveal = fs.readFileSync(revealPath, 'utf8');
const swipe = fs.readFileSync(swipePath, 'utf8');

function functionBody(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, name + ' must exist');
  const next = source.indexOf('\n  function ', start + 12);
  return source.slice(start, next >= 0 ? next : source.length);
}

const roomKeys = ['STRATEGY','PORTRAIT','MASKED','TRAITOR','MURDER','HOST','FINALE'];
roomKeys.forEach((key) => {
  assert(new RegExp('\\b' + key + ':\\{').test(presentation), 'theme registry must define ' + key);
});
assert(presentation.includes('window.CASTLE_DUEL_ROOM_THEMES = CASTLE_DUEL_ROOM_THEMES'), 'theme registry must be exposed as the Castle presentation source of truth');
assert(presentation.includes("window.castleR2RoomTheme_=function(m,round){return castleMobileTheme_(m,round);}"), 'existing room renderer must reuse the registry');

const context = {
  window: {
    CASTLE_DUEL_STATE: null,
    castleR2SwipeStyles_: () => '',
    castleR2RoomHtml_: () => '',
    castleR2SpinnerHtml_: () => '',
    matchMedia: () => ({ matches: false })
  },
  Math,
  setInterval: () => 0,
  clearInterval: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {}
};
vm.runInNewContext(presentation, context, { filename: presentationPath });
roomKeys.forEach((key) => {
  const theme = context.window.CASTLE_DUEL_ROOM_THEMES[key];
  assert(theme && typeof theme.cls === 'string' && theme.cls.trim(), key + ' theme must provide non-empty cls');
  assert(theme && typeof theme.title === 'string' && theme.title.trim(), key + ' theme must provide non-empty title');
  assert(theme && typeof theme.sub === 'string' && theme.sub.trim(), key + ' theme must provide non-empty sub');
});
assert(/castleEscape_\(theme\.sub\)/.test(swipe), 'existing castleR2RoomHtml_ renderer must continue consuming theme.sub');

assert(presentation.includes('castle-mobile-random-card'), 'randomizer must render visual cards');
assert(presentation.includes('castle-mobile-random-image'), 'randomizer must include portrait presentation');
assert(presentation.includes('castle-mobile-random-copy'), 'randomizer must include styled name presentation');

const profiles = context.window.CASTLE_MOBILE_REVEAL_PROFILES;
const profileKeys = ['SLOW_CREEP','RAPID_SNAP','FALSE_STOP','HEARTBEAT','CHAOTIC_BURST'];
profileKeys.forEach((key) => {
  assert(profiles[key], 'reveal profile must exist: ' + key);
  assert(Array.isArray(profiles[key].timings) && profiles[key].timings.length >= 6, key + ' must define a multi-step local timing sequence');
});
const timingSignatures = profileKeys.map((key) => profiles[key].timings.join(','));
assert(new Set(timingSignatures).size === profileKeys.length, 'reveal profiles must use different timing sequences');
assert(!timingSignatures.includes(Array(18).fill(90).join(',')), 'fixed 18 x 90ms cycle must not remain as a reveal profile');

const spin = functionBody(presentation, 'castleMobileSpin_');
assert(!spin.includes('castleCall_'), 'animation cycle must not make Castle API calls');
assert(spin.includes('castleMobileCandidates_'), 'animation must use already-loaded candidates');
assert(spin.includes('castleMobileRevealProfile_'), 'animation must choose a presentation-only reveal profile');
assert(spin.includes('setTimeout'), 'variable animation timing must be scheduled locally');
assert(!spin.includes('setInterval(function(){'), 'spin must no longer rely on one fixed interval loop');
assert(spin.includes("kind:m.kind||'TV'"), 'final card kind must come from sealed match m');
assert(spin.includes('name:castleMobileName_(m)'), 'final card name must come from sealed match m');
assert(spin.includes('imageUrl:castleMobileSafeImage_(m)'), 'final card portrait must come from sealed match m');
assert(spin.indexOf('var profile=castleMobileRevealProfile_()') < spin.indexOf('var finalEntry={'), 'motion profile may only affect presentation before the sealed final card is constructed');

assert(presentation.includes('CASTLE_MOBILE_PALETTES'), 'theme-aware Castle palette system must exist');
roomKeys.forEach((key) => assert(presentation.includes(key+':['), 'palette mapping must include ' + key));
assert(presentation.includes('castleMobilePalette_(theme,step)'), 'spinning cards must rotate theme-aware Castle accents');
assert(presentation.includes('castle-final-slow-landing'), 'slow landing final effect must exist');
assert(presentation.includes('castle-final-snap'), 'snap final effect must exist');
assert(presentation.includes('castle-final-shadow-reveal'), 'shadow reveal final effect must exist');
assert(presentation.includes('castle-final-door-slam'), 'door slam final effect must exist');

assert(presentation.includes("matchMedia('(prefers-reduced-motion: reduce)')"), 'reduced-motion preference must be detected');
assert(presentation.includes('@media(prefers-reduced-motion:reduce)'), 'reduced-motion CSS path must exist');
assert(presentation.includes('CASTLE_MOBILE_REDUCED_PROFILE'), 'reduced-motion users must receive a short simple reveal profile');

assert(presentation.includes('onerror="this.hidden=true;this.nextElementSibling.hidden=false"'), 'remote portrait errors must switch to intentional fallback');
assert(presentation.includes('.castle-mobile-fallback-slot[hidden]{display:none!important}'), 'successful portrait must keep fallback slot hidden');
assert(presentation.includes('castle-mobile-fallback--player'), 'human portrait fallback must exist');
assert(presentation.includes('castle-mobile-fallback--mask'), 'masked fallback must exist');
assert(presentation.includes('castle-mobile-fallback--shadow'), 'hidden Traitor fallback must exist');

const portrait = functionBody(presentation, 'castleMobilePortrait_');
assert(portrait.includes('class="castle-mobile-fallback-slot" hidden'), 'valid portrait markup must start with fallback hidden');
assert(portrait.includes('this.hidden=true;this.nextElementSibling.hidden=false'), 'failed portrait must hide image and reveal fallback');

const hidden = functionBody(presentation, 'castleMobileSafeImage_');
assert(hidden.includes("if(castleMobileHiddenTraitor_(m))return '';"), 'hidden Traitor must never return a portrait URL');
const candidates = functionBody(presentation, 'castleMobileCandidates_');
assert(candidates.includes("if(castleMobileHiddenTraitor_(m))return [{kind:'MASK',name:'A Traitor',hiddenTraitor:true}];"), 'hidden Traitor animation must not preload identifying candidates');
assert(!presentation.includes('data-traitor-id'), 'hidden identity must not be placed in data attributes');

assert(!presentation.includes('The encounter is already sealed. The reveal uses only Castle state already loaded on this page.'), 'player copy must not expose implementation/debug language');
assert(presentation.includes('The Castle has made its choice.'), 'atmospheric randomizer copy must exist');
assert(presentation.includes('THE CASTLE IS WATCHING…'), 'atmospheric spin-button state must exist');
assert(presentation.includes('THE DOOR IS OPENING…'), 'door-opening spin-button state must exist');
assert(presentation.includes('WHO CAN YOU TRUST?'), 'trust spin-button state must exist');
assert(presentation.includes('THE CASTLE HAS CHOSEN…'), 'final spin-button state must exist');

const polish = functionBody(presentation, 'castleMobilePolishStyles_');
assert(polish.includes('.castle-r2-play-stage,.castle-mobile-spinner-stage{position:relative!important'), 'mobile framing must be scoped to encounter and spinner stages only');
assert(polish.includes('.castle-r2-play-stage>.castle-r2-progress b,.castle-mobile-spinner-stage>.castle-r2-progress b{display:none!important}'), 'mobile room framing must hide the redundant Encounter X of Y label');
assert(polish.includes('.castle-r2-play-stage>.castle-r2-progress,.castle-mobile-spinner-stage>.castle-r2-progress{position:absolute!important'), 'encounter dots must overlay the room so room art starts higher');
assert(polish.includes('justify-content:center!important'), 'encounter progress dots must be centered');
assert(polish.includes('.castle-r2-play-stage .castle-r2-portrait-wrap{width:calc(100% - 34px)!important'), '390px portrait must leave visible room slivers at both sides');
assert(polish.includes('.castle-r2-paper{width:auto!important;margin:0 4px!important'), 'parchment must remain inset so room art stays visible beside it');
assert(polish.includes('.castle-r2-swipe-wrap{margin:12px 8px 6px!important'), 'note area must leave room visible around and below the parchment');
assert(polish.includes('.castle-r2-swipe-next,.castle-r2-swipe-back{min-height:44px!important'), 'mobile Next and Back controls must use the smaller tap-safe treatment');
assert(polish.includes('background:rgba(31,25,31,.46)!important'), 'mobile navigation controls must use a lighter ghosted treatment');
assert(polish.includes('font-family:Georgia,"Times New Roman",serif!important'), 'Castle presentation must use softer web-safe serif typography for themed copy');
assert(polish.includes('border-radius:5px!important'), 'rectangular Castle surfaces must use small architectural corner radii');
assert(polish.includes('@media(max-width:375px)'), '360px room framing protection must exist');
assert(polish.includes('@media(min-width:410px) and (max-width:560px)'), '430px room framing protection must exist');
assert(presentation.includes('baseSwipeStyles()+castleMobileStyles_()+castleMobilePolishStyles_()'), 'mobile polish layer must be appended after accepted Castle styles');

['strategy-chamber.svg','portrait-gallery.svg','masked-hall.svg','traitor-gallery.svg','murder-passage.svg','host-study.svg','throne-room.svg'].forEach((file) => {
  assert(fs.existsSync(path.join(root, 'frontend/assets/castle', file)), 'missing Castle room asset: ' + file);
});

assert(reveal.includes('castleDuelMobilePresentationR1.js?v=castle-mobile-presentation-r1'), 'existing Castle reveal module must load the presentation layer');
assert(presentation.includes('@media(max-width:375px)'), '360px mobile treatment must exist');
assert(presentation.includes('@media(min-width:410px) and (max-width:560px)'), '430px mobile treatment must exist');
assert(presentation.includes('@media(max-width:560px)'), '390px primary mobile treatment must exist');

console.log('PASS castle_mobile_presentation_r1_tests');
