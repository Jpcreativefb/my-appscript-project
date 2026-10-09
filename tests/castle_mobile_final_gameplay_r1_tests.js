'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const proofPath = path.join(root, 'frontend/js/pages/castleDuelMobileFinalGameplayR1.js');
const mobilePath = path.join(root, 'frontend/js/pages/castleDuelMobilePresentationR1.js');
const revealPath = path.join(root, 'frontend/js/pages/castleDuelRevealR2.js');
const proof = fs.readFileSync(proofPath, 'utf8');
const mobile = fs.readFileSync(mobilePath, 'utf8');
const reveal = fs.readFileSync(revealPath, 'utf8');

function functionBody(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, name + ' must exist');
  const next = source.indexOf('\n  function ', start + 12);
  return source.slice(start, next >= 0 ? next : source.length);
}

assert(mobile.includes("get('castleProof')==='1'"), 'proof loader must require castleProof=1');
assert(mobile.includes('castleDuelMobileFinalGameplayR1.js?v=castle-mobile-final-gameplay-r1'), 'proof loader must target the final gameplay module');
assert(mobile.includes('if(!enabled||window.CASTLE_DUEL_MOBILE_FINAL_GAMEPLAY_R1_LOADING)return;'), 'no proof flag must leave default path unchanged');
assert(proof.includes("if(!proofEnabled_())return;"), 'proof module must independently refuse installation without the query flag');
assert(proof.includes('PROOF_BASE_PLAYER_MARKUP=window.castlePlayerMarkup_'), 'proof must preserve the accepted default renderer');
assert(proof.includes("window.castlePlayerMarkup_=function(s){return proofEnabled_()?proofMarkup_(s):PROOF_BASE_PLAYER_MARKUP(s);}"), 'default renderer must remain authoritative when proof flag is absent');

assert(proof.includes("var PROOF_VIEW='entrance'"), 'Grand Entrance must be the first proof view');
assert(proof.includes('PREVIOUS CASTLE REVEAL'), 'Grand Entrance must present Previous Castle Reveal');
assert(proof.includes('CASTLE JACKPOT'), 'Grand Entrance must show supplied Castle Jackpot');
assert(proof.includes("s&&s.config&&s.config.jackpot!==undefined?s.config.jackpot:'—'"), 'Jackpot must come from supplied Castle state');
assert(proof.includes('grand-entrance-modern.webp'), 'Grand Entrance asset hook must be present');
assert(proof.includes('strategy-chamber-modern.webp'), 'Grand Entrance must have an intentional local room fallback');

const history = functionBody(proof, 'proofAnnouncementHistory_');
assert(history.includes('s&&s.revealHistory'), 'proof history must accept supplied revealHistory');
assert(history.includes('s.history.announcements'), 'proof history must accept supplied historical announcement data');
assert(history.includes('s&&s.announcements'), 'proof history must accept supplied announcements');
assert(history.includes('sort(function(a,b){return num_(b.episode)-num_(a.episode);})'), 'history must sort reverse chronologically');
assert(!history.includes('castleCall_'), 'history selection must not make an API request');
assert(proof.includes('PROOF_SELECTED_EPISODE'), 'history selection must be dynamic rather than hardcoded');
assert(proof.includes('History becomes available after additional settled episodes.'), 'missing history must render an intentional empty state');

const eventText = functionBody(proof, 'proofEventText_');
assert(eventText.includes("e.shieldUsed"), 'event ledger must support Secret Shield events');
assert(eventText.includes("e.lost"), 'event ledger must support life-loss events');
assert(eventText.includes("e.tvEliminated"), 'event ledger must support supplied TV elimination events');
assert(!eventText.includes('e.actor'), 'event ledger must not render attacker identity');
assert(!eventText.includes('e.murderer'), 'event ledger must not render murderer identity');
assert(!proof.includes('attacker:'), 'proof must not invent or expose attacker fields');

assert(proof.includes("STEP INTO TONIGHT\\'S ENCOUNTERS"), 'Entrance CTA wording must be preserved');
const enter = functionBody(proof, 'proofHasOpenEncounters_');
assert(enter.includes('s&&s.matches'), 'CTA availability must come from supplied matches');
assert(!proof.includes("castleCall_('castleDuelGetState'"), 'proof must not introduce a second Castle state API path');
assert(!proof.includes("castleCall_('castleDuelSubmit'"), 'proof must not introduce a second scoring/submission path');
assert(proof.includes('window.castleR2RoomHtml_(s,index)'), 'proof encounters must reuse the existing authoritative room/gameplay renderer');
assert(!proof.includes('Math.random'), 'proof journey must not select opponents or outcomes');

assert(proof.includes('Decision</div><h2>Sealed</h2>'), 'compact Decision Sealed treatment must exist');
assert(proof.includes('Your Prediction:'), 'sealed card must show prediction');
assert(proof.includes('Your Decision:'), 'sealed card must show player decision');
assert(proof.includes('.castle-proof-sealed{max-width:350px'), 'Decision Sealed must use compact presentation');
assert(proof.includes('YOUR NIGHT IS SEALED'), 'round-complete state must exist');
assert(proof.includes('Settlement pending'), 'round-complete waiting state must exist');

assert(proof.includes('THE FINAL THREE'), 'Final Three shell must exist');
assert(proof.includes('FINALE ARMORY'), 'Finale Armory shell must exist');
assert(proof.includes('THRONE ROOM'), 'Throne Room shell must exist');
assert(proof.includes('THE CASTLE HAS SPOKEN'), 'winner shell must exist');
assert(proof.includes("if(!f||phase_(s)!=='COMPLETE')"), 'winner reveal must require authorized complete state');
assert(proof.includes('proofFinalistAuthorized_'), 'live Finale shell must require supplied finalist-authorizing state');
assert(proof.includes('p.finaleTokens'), 'Armory must consume supplied Finale token inventory');
assert(proof.includes('p.finaleShield'), 'Armory must consume supplied Finale shield inventory');

assert(proof.includes('PROOF_OVERLAY_STATES'), 'central portrait overlay-state mapping must exist');
['normal-tv','pattc-player','castle-five-ally','suspect','hidden-traitor','revealed-traitor','eliminated','shield','murder-danger','host'].forEach((state) => {
  assert(proof.includes("'" + state + "'"), 'portrait overlay mapping missing ' + state);
});
const portrait = functionBody(proof, 'proofPortrait_');
assert(portrait.includes("var hidden=!!entry.hiddenTraitor"), 'central portrait renderer must protect hidden Traitors');
assert(portrait.includes("var image=hidden?'':"), 'hidden Traitor must suppress portrait URL');
assert(portrait.includes('onerror="this.hidden=true;this.nextElementSibling.hidden=false"'), 'portrait failures must use intentional fallback');
assert(!portrait.includes('emoji'), 'portrait fallback must not use emoji');

assert(proof.includes('@media(max-width:375px)'), '360px mobile protection must exist');
assert(proof.includes('@media(min-width:410px) and (max-width:560px)'), '430px mobile protection must exist');
assert(proof.includes('.castle-proof-page{max-width:880px'), '390px/default mobile proof frame must exist');
assert(proof.includes('border-radius:5px'), 'architectural small-radius treatment must exist');
assert(!proof.includes('border-radius:20px') && !proof.includes('border-radius:22px') && !proof.includes('border-radius:24px'), 'proof module must not reintroduce giant modern-app radii');
assert(proof.includes('background-size:cover'), 'room backdrops must remain cover-sized');
assert(proof.includes('background:rgba(11,10,12,.52)'), 'primary content must use translucent panels so room remains visible');

assert(reveal.includes('castleR2LockDecision_'), 'existing authoritative decision handler must remain in the accepted renderer');
assert(reveal.includes("castleCall_('castleDuelSubmit'"), 'existing decision submission API path must remain authoritative');
assert(reveal.includes('castleR2Mask_'), 'existing Mask handler must remain available');
assert(reveal.includes('castleR2Target_'), 'existing target handler must remain available');

console.log('PASS castle_mobile_final_gameplay_r1_tests');
