const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const picks = read('frontend/js/pages/picks.js');
const styles = read('frontend/css/styles.css');
const picksCss = read('frontend/css/picks.css');
const anchor = read('backend/engines/SeasonAnchorEngine.js');
const reality = read('backend/engines/RealityTvSeasonEngine.js');
const questionPack = read('backend/engines/RealityTvQuestionPackEngine.js');
const picksEngine = read('backend/engines/PicksEngine.js');
const api = read('backend/Api.js');
const frontendApi = read('frontend/js/api.js');
const admin = read('frontend/js/pages/adminRealityTv.js');
const app = read('frontend/js/app.js');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

// Sole Survivor preview/finalization flow.
assert(picks.includes('PICKS_SEASON_ANCHOR_DRAFT_ID'));
assert(picks.includes('function previewSeasonAnchorPick_'));
assert(picks.includes('onchange="previewSeasonAnchorPick_(this.value)"'));
assert(picks.includes('Finalize Pick'));
assert(picks.includes('You cannot change this pick unless the contestant is eliminated.'));
assert(picks.includes('Browse contestant bios before finalizing'));
assert(picks.includes('realityTvProfileDetailsHtml_'));
assert(picks.includes('reality-eliminated-overlay'));
assert(picks.indexOf('${pickerHtml}') < picks.indexOf('${summaryHtml}'), 'Picker must render immediately below the portrait.');
assert(!picks.includes('draftProfile || currentProfile || entities[0]'), 'The card must not preview a random contestant before selection.');

assert(anchor.includes('finalized:'));
assert(anchor.includes('canChoose: !locked'));
assert(anchor.includes('This Sole Survivor pick is finalized. You can choose again only after the contestant is eliminated.'));
assert(anchor.includes('Sole Survivor pick finalized.'));
assert(!anchor.slice(anchor.indexOf('function apiSaveSeasonAnchorPick'), anchor.indexOf('function seasonAnchorEpisodeCategoryIds_')).includes('ManualSwitchAllowed'), 'Manual switching must not bypass finalized-pick behavior.');

// Image containment, eliminated state, and condensed stats.
assert(styles.includes('Reality TV Survivor card containment and preview polish — v1.1.7'));
assert(styles.includes('contain: layout paint'));
assert(styles.includes('.season-anchor-current-image'));
assert(styles.includes('filter: grayscale(1)'));
assert(styles.includes('.season-anchor-current-episode'));
assert(styles.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
assert(styles.includes('.season-anchor-finalize-button'));

// Locked group comparison.
assert(reality.includes('function realityTvLockedEpisodeComparisonPayload_'));
assert(reality.includes('function apiGetRealityTvEpisodeComparison'));
assert(reality.includes('Group picks become visible after an episode locks.'));
assert(reality.includes('buildUserPicksMap_(gameId)'));
assert(api.includes('getRealityTvEpisodeComparison'));
assert(frontendApi.includes('function apiGetRealityTvEpisodeComparison'));
assert(picks.includes('renderRealityTvEpisodeComparison_'));
assert(picks.includes('Compare everyone’s finalized Sole Survivor pick and weekly answers.'));
assert(styles.includes('.reality-tv-comparison-grid'));

// Extra-question verification checks the actual local rows and answers.
assert(questionPack.includes('function realityTvQuestionPackMissingTemplateIndex_'));
assert(questionPack.includes('function apiAdminRepairRealityTvQuestionPack'));
assert(questionPack.includes('answerBundle.options.some'));
assert(api.includes('adminRepairRealityTvQuestionPack'));
assert(frontendApi.includes('apiAdminRepairRealityTvQuestionPack'));
assert(admin.includes('Verify & Repair Extra Questions'));
assert(admin.includes('says built or verified but is missing from the game'));

// Pick-saving and auto-advance performance.
assert(picksEngine.includes('getCategorySettingsCached(gameId)'));
assert(picks.includes('scheduleRealityTvPickAutoAdvance_'));
assert(picks.includes('PICKS_TEMP_OPEN_CATEGORY_ID'));
assert(picks.includes('is-saving'));
assert(picksCss.includes('.pick-category-card.is-saving'));

// Release cache contract.
assert(app.includes('307-reality-tv-survivor-comparison'));
assert(html.includes('307-reality-tv-survivor-comparison'));
assert(sw.includes('307-reality-tv-survivor-comparison'));

console.log('Reality TV Survivor and locked comparison v1.1.7 tests passed.');
