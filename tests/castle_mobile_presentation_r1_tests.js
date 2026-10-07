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
    castleR2SpinnerHtml_: () => ''
  },
  setInterval: () => 0,
  clearInterval: () => {}
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

const spin = functionBody(presentation, 'castleMobileSpin_');
assert(!spin.includes('castleCall_'), 'animation cycle must not make Castle API calls');
assert(spin.includes('castleMobileCandidates_'), 'animation must use already-loaded candidates');
assert(spin.includes('setInterval'), 'animation must cycle local cards');

assert(presentation.includes('onerror="this.hidden=true;this.nextElementSibling.hidden=false"'), 'remote portrait errors must switch to intentional fallback');
assert(presentation.includes('castle-mobile-fallback--player'), 'human portrait fallback must exist');
assert(presentation.includes('castle-mobile-fallback--mask'), 'masked fallback must exist');
assert(presentation.includes('castle-mobile-fallback--shadow'), 'hidden Traitor fallback must exist');

const hidden = functionBody(presentation, 'castleMobileSafeImage_');
assert(hidden.includes("if(castleMobileHiddenTraitor_(m))return '';"), 'hidden Traitor must never return a portrait URL');
const candidates = functionBody(presentation, 'castleMobileCandidates_');
assert(candidates.includes("if(castleMobileHiddenTraitor_(m))return [{kind:'MASK',name:'A Traitor',hiddenTraitor:true}];"), 'hidden Traitor animation must not preload identifying candidates');
assert(!presentation.includes('data-traitor-id'), 'hidden identity must not be placed in data attributes');

['strategy-chamber.svg','portrait-gallery.svg','masked-hall.svg','traitor-gallery.svg','murder-passage.svg','host-study.svg','throne-room.svg'].forEach((file) => {
  assert(fs.existsSync(path.join(root, 'frontend/assets/castle', file)), 'missing Castle room asset: ' + file);
});

assert(reveal.includes('castleDuelMobilePresentationR1.js?v=castle-mobile-presentation-r1'), 'existing Castle reveal module must load the presentation layer');
assert(presentation.includes('@media(max-width:375px)'), '360px mobile treatment must exist');
assert(presentation.includes('@media(min-width:410px) and (max-width:560px)'), '430px mobile treatment must exist');
assert(presentation.includes('@media(max-width:560px)'), '390px primary mobile treatment must exist');

console.log('PASS castle_mobile_presentation_r1_tests');
