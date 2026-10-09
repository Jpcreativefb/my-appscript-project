'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const proofPath = path.join(root, 'frontend/js/pages/castleDuelMobileFinalGameplayR1.js');
const mobilePath = path.join(root, 'frontend/js/pages/castleDuelMobilePresentationR1.js');
const revealPath = path.join(root, 'frontend/js/pages/castleDuelRevealR2.js');
const swipePath = path.join(root, 'frontend/js/pages/castleDuelRevealR2Swipe.js');
const specialPath = path.join(root, 'frontend/js/pages/castleDuelSpecialCardsR1.js');
const proof = fs.readFileSync(proofPath, 'utf8');
const mobile = fs.readFileSync(mobilePath, 'utf8');
const reveal = fs.readFileSync(revealPath, 'utf8');
const swipe = fs.readFileSync(swipePath, 'utf8');
const special = fs.readFileSync(specialPath, 'utf8');

function functionBody(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, name + ' must exist');
  const next = source.indexOf('\n  function ', start + 12);
  return source.slice(start, next >= 0 ? next : source.length);
}

assert(mobile.includes("get('castleProof')==='1'"), 'proof loader must require castleProof=1');
assert(mobile.includes('castleDuelMobileFinalGameplayR1.js?v=castle-mobile-final-gameplay-r1'), 'accepted mobile layer must load the proof module only behind its proof gate');
assert(proof.includes("if(!proofEnabled_())return;"), 'proof module must independently refuse installation without castleProof=1');
assert(proof.includes('PROOF_BASE_PLAYER_MARKUP=window.castlePlayerMarkup_'), 'proof must preserve the accepted default renderer');
assert(proof.includes("window.castlePlayerMarkup_=function(s){return proofEnabled_()?proofMarkup_(s):PROOF_BASE_PLAYER_MARKUP(s);}"), 'no flag must preserve the normal renderer');
assert(!reveal.includes('castleDuelMobileFinalGameplayR1.js'), 'default reveal module must not directly load the proof renderer');

assert(proof.includes("var PROOF_VIEW='entrance'"), 'Grand Entrance must be the first proof view');
assert(proof.includes('PREVIOUS CASTLE REVEAL'), 'Grand Entrance must present Previous Castle Reveal');
assert(proof.includes('CASTLE JACKPOT'), 'Grand Entrance must show supplied Castle Jackpot');
assert(proof.includes("s&&s.config&&s.config.jackpot!==undefined?s.config.jackpot:'—'"), 'Jackpot must come from supplied state');
assert(proof.includes('grand-entrance-modern.webp'), 'Grand Entrance final asset hook must remain');
assert(proof.includes('strategy-chamber-modern.webp'), 'Grand Entrance must retain the approved local fallback');

const history = functionBody(proof, 'proofAnnouncementHistory_');
assert(history.includes('s&&s.revealHistory'), 'history must accept supplied revealHistory');
assert(history.includes('s.history.announcements'), 'history must accept supplied historical announcements');
assert(history.includes('sort(function(a,b){return num_(b.episode)-num_(a.episode);})'), 'history must sort reverse chronologically');
assert(!history.includes('castleCall_'), 'history selection must remain local when history is already supplied');
assert(proof.includes('History becomes available after additional settled episodes.'), 'missing history must use an intentional unavailable state');

const eventText = functionBody(proof, 'proofEventText_');
assert(eventText.includes('e.shieldUsed'), 'event ledger must support shield events');
assert(eventText.includes('e.lost'), 'event ledger must support life loss');
assert(eventText.includes('e.tvEliminated'), 'event ledger must support supplied TV elimination events');
assert(!eventText.includes('e.actor') && !eventText.includes('e.murderer'), 'public ledger must not expose attacker identity');

const overlayMap = {
  TV: 'portrait-normal.svg',
  PLAYER: 'portrait-pattc-player.svg',
  ALLY: 'portrait-castle-five.svg',
  SUSPECT: 'portrait-suspect.svg',
  HIDDEN_TRAITOR: 'portrait-hidden-traitor.svg',
  REVEALED_TRAITOR: 'portrait-revealed-traitor.svg',
  ELIMINATED: 'portrait-eliminated.svg',
  SHIELD: 'portrait-shield.svg',
  DANGER: 'portrait-murder-danger.svg',
  HOST: 'portrait-host.svg'
};
Object.entries(overlayMap).forEach(([state,file]) => {
  assert(proof.includes(state+":'./assets/castle/overlays/"+file+"'"), state + ' must map centrally to approved overlay ' + file);
  assert(fs.existsSync(path.join(root, 'frontend/assets/castle/overlays', file)), 'approved overlay must exist: ' + file);
});
assert(proof.includes('castle-proof-portrait-overlay'), 'actual approved SVG overlay must be visibly layered over proof portraits');
assert(proof.includes('castle-proof-csp-overlay'), 'special-card portrait hooks must receive approved overlays');
const portrait = functionBody(proof, 'proofPortrait_');
assert(portrait.includes("var row=hidden?{}:portraitLookup_"), 'hidden Traitor must never perform a real-person portrait lookup');
assert(portrait.includes("var image=hidden?'':"), 'hidden Traitor must suppress real image URLs');
assert(portrait.includes("var name=hidden?'A Traitor':"), 'hidden Traitor must use generic live name copy');
assert(portrait.includes('aria-hidden="true"'), 'portrait overlay must be decorative and not leak identity through alt text');
assert(portrait.includes('onerror="this.hidden=true;this.nextElementSibling.hidden=false"'), 'failed portrait must reveal intentional fallback');

assert(fs.existsSync(specialPath), 'accepted Special Encounter Card R2 module must be transplanted');
assert(special.includes('root.CastleSpecialEncounterCardsR2='), 'accepted Special Card R2 global must exist');
['traitorGuess','traitorReveal','fate','singleTraitorFate','maskedIntro','maskedFaithful','maskedTraitor','hostEnvelopes','hostReveal','murdererCard','murderTargets','humanEncounter','decisionSealed','finalThree','finaleArmory','winnerJackpot'].forEach((name) => {
  assert(special.includes(name+':'+name), 'accepted special component must expose ' + name);
  assert(proof.includes("specialHtml_('"+name+"'"), 'proof flow must wire accepted special component ' + name);
});
assert(proof.includes('castleDuelSpecialCardsR1.js?v=castle-special-card-pack-r2'), 'proof must load accepted Special Card module only after proof activation');
assert(!proof.includes("castleCall_('castleDuelGetState'"), 'proof must not create a second Castle state API path');
assert(!proof.includes("castleCall_('castleDuelSubmit'"), 'proof must not create alternate scoring/submission authority');
assert(!proof.includes('Math.random'), 'proof presentation must never select opponent/outcome');

assert(proof.includes('castleR3TraitorPick_'), 'Traitor Guess must use existing selection handler');
assert(proof.includes('castleR3SubmitTraitor_'), 'Traitor Guess must use existing identify submission handler');
assert(proof.includes('castleR3ChooseFate_'), 'Fate cards must use existing authoritative Fate handler');
assert(proof.includes('castleR3ChooseHost_'), 'Host envelopes must use existing authoritative Host handler');
assert(proof.includes('castleR2Mask_'), 'Masked Hall must use existing Mask handler');
assert(proof.includes('castleR2Target_'), 'Murder target seal must use existing target handler');
assert(proof.includes('castleR2SwipePaper_'), 'special duel branches must return to existing duel controls');
assert(proof.includes('window.castleMatchHtml_'), 'Finale must preserve existing token/submission controls');
assert(swipe.includes("step:'TRAITOR_IDENTITY'"), 'existing Traitor identify API step must remain authoritative');
assert(swipe.includes("step='FATE'"), 'existing masked Fate API step must remain authoritative');
assert(swipe.includes("payload.step='TRAITOR_FATE'"), 'existing Traitor Fate API step must remain authoritative');
assert(swipe.includes("step:'HOST'"), 'existing Host API step must remain authoritative');

const fate = functionBody(special, 'fate');
assert(fate.includes('fate-card-sealed.svg') || special.includes("fateSealed:BASE+'fate-card-sealed.svg'"), 'pre-choice Fate must use the sealed asset');
assert(fate.includes('data-choice-index="0"') && fate.includes('data-choice-index="1"'), 'pre-choice Fate must contain two equal choices');
assert(!fate.includes('fateSafeSlot'), 'presentation component must not know the safe Fate slot');
const host = functionBody(special, 'hostEnvelopes');
assert(host.includes('hostSealed'), 'pre-choice Host must use identical sealed envelope art');
assert(!host.includes('GOLD') && !host.includes('PROTECTION') && !host.includes('MERCY'), 'pre-choice Host DOM must not encode reward contents');

assert(proof.includes('STEP INTO TONIGHT') && proof.includes('ENCOUNTERS'), 'Entrance CTA must remain');
assert(proof.includes("specialHtml_('decisionSealed'"), 'Decision Sealed must use accepted premium card');
assert(proof.includes('YOUR NIGHT IS SEALED'), 'round-complete state must exist');
assert(proof.includes("specialHtml_('finalThree'"), 'Final Three must use accepted premium component when authorized data exists');
assert(proof.includes("specialHtml_('finaleArmory'"), 'Armory must use accepted premium component only with supplied items');
assert(proof.includes("specialHtml_('winnerJackpot'"), 'Winner must use accepted premium component only when authorized');
assert(proof.includes("if(!f||phase_(s)!=='COMPLETE')"), 'winner must remain sealed until supplied COMPLETE state');
assert(proof.includes('Authorized Armory inventory is not available yet.'), 'missing Armory payload must not be invented');

assert(proof.includes('@media(max-width:375px)'), '360px protection must exist');
assert(proof.includes('@media(min-width:390px) and (max-width:429px)'), '390px design-authority treatment must exist');
assert(proof.includes('@media(min-width:430px) and (max-width:560px)'), '430px protection must exist');
assert(proof.includes('overflow-x:hidden'), 'proof must prevent horizontal scroll');
assert(proof.includes('border-radius:5px'), 'proof must preserve small architectural radii');
assert(!proof.includes('border-radius:20px') && !proof.includes('border-radius:22px') && !proof.includes('border-radius:24px'), 'proof must not reintroduce giant rounded app surfaces');

assert(reveal.includes('castleR2LockDecision_'), 'existing decision handler must remain');
assert(reveal.includes("castleCall_('castleDuelSubmit'"), 'existing decision submission path must remain authoritative');
assert(reveal.includes('castleR2Mask_') && reveal.includes('castleR2Target_'), 'existing Mask/target handlers must remain');

console.log('PASS castle_mobile_final_gameplay_r1_tests');
