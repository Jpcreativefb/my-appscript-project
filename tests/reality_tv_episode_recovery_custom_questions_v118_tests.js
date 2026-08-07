const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const season = read('backend/engines/RealityTvSeasonEngine.js');
const questions = read('backend/engines/RealityTvQuestionPackEngine.js');
const anchor = read('backend/engines/SeasonAnchorEngine.js');
const admin = read('frontend/js/pages/adminRealityTv.js');
const picks = read('frontend/js/pages/picks.js');
const picksCss = read('frontend/css/picks.css');
const styles = read('frontend/css/styles.css');
const app = read('frontend/js/app.js');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

// Missing RealityEpisodes rows must repair automatically and retain the category lock.
assert(questions.includes('function realityTvResolveQuestionBuildEpisode_'));
assert(questions.includes('realityTvCreateEpisode_(season, currentNumber'));
assert(questions.includes('skipHubSync: true'));
assert(questions.includes('skipQuestionPack: true'));
assert.strictEqual((questions.match(/realityTvResolveQuestionBuildEpisode_\(season, payload\.episodeId, true\)/g) || []).length, 4);
assert(!questions.includes('throw new Error("Current Reality TV episode not found.")'));
assert(season.includes('existingCategory && (existingCategory.lockDateTime || existingCategory.LockDateTime)'));
assert(season.indexOf('const setup = adminGetGameSetup({ gameId: season.GameId });') < season.indexOf('const timing = {'));

// Sole Survivor can use the live main category when a normalized episode row is absent.
assert(anchor.includes('function seasonAnchorResolveRealityEpisodeView_'));
assert(anchor.includes('derivedFromCategory: true'));
assert(anchor.includes('"episode-" + currentNumber + "-eliminated"'));
assert(anchor.includes('const episode = seasonAnchorResolveRealityEpisodeView_(view);'));


// Runtime checks for episode resolution.
const resolverStart = questions.indexOf('function realityTvResolveQuestionBuildEpisode_');
const resolverEnd = questions.indexOf('function apiAdminUpdateRealityTvQuestionPack', resolverStart);
const resolverContext = {
  realityTvGetEpisode_: () => null,
  realityTvEpisodesForSeason_: () => [],
  realityTvNumber_: (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  },
  realityTvString_: value => String(value || ''),
  realityTvCreateEpisode_: (seasonRow, number, options) => ({ EpisodeId: seasonRow.SeasonId + '-episode-' + number, EpisodeNumber: number, options })
};
vm.createContext(resolverContext);
vm.runInContext(questions.slice(resolverStart, resolverEnd), resolverContext);
const repaired = resolverContext.realityTvResolveQuestionBuildEpisode_({ SeasonId: 's1', CurrentEpisodeNumber: 4 }, '', true);
assert.strictEqual(repaired.EpisodeNumber, 4);
assert.strictEqual(repaired.autoRepaired, true);
assert.strictEqual(repaired.options.skipHubSync, true);
assert.strictEqual(repaired.options.skipQuestionPack, true);

const anchorStart = anchor.indexOf('function seasonAnchorResolveRealityEpisodeView_');
const anchorEnd = anchor.indexOf('function seasonAnchorRealityEntities_', anchorStart);
const futureLock = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const anchorContext = {
  seasonAnchorNumber_: (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  },
  seasonAnchorKey_: value => String(value || '').trim().toLowerCase(),
  seasonAnchorString_: value => String(value || ''),
  seasonAnchorBool_: value => value === true || ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase()),
  getCategoriesCached: () => [{ id: 'episode-2-eliminated', name: 'Who leaves?', lockDateTime: futureLock, locked: false }]
};
vm.createContext(anchorContext);
vm.runInContext(anchor.slice(anchorStart, anchorEnd), anchorContext);
const derived = anchorContext.seasonAnchorResolveRealityEpisodeView_({
  season: { gameId: 'g1', seasonId: 's1', currentEpisodeNumber: 2, periodLabel: 'Episode' },
  episodes: []
});
assert.strictEqual(derived.episodeNumber, 2);
assert.strictEqual(derived.derivedFromCategory, true);
assert.strictEqual(derived.lockDateTime, futureLock);

// Individual weekly question cards have a real collapsible body and accessible state.
assert(picks.includes('<div class="pick-card-body">'));
assert(picks.includes('aria-expanded="${collapsedClass ? "false" : "true"}"'));
assert(picks.includes('header.setAttribute("aria-expanded"'));
assert(picksCss.includes('.pick-category-card.collapsed .pick-card-body'));
assert(picksCss.includes('.pick-card-body {\n  padding: 0;'));

// Custom questions are visible, repeatable, and show where answers come from.
assert(admin.includes('<summary>5. Custom Questions</summary>'));
assert(admin.includes('You can create more than one.'));
assert(admin.includes('Saved Custom Questions (${custom.length})'));
assert(admin.includes('Save & Build This Custom Question'));
assert(admin.includes('Clear Form / Add Another'));
assert(admin.includes('Manual answers / judges / special choices'));
assert(admin.includes('Answer Preview'));
assert(admin.includes('function adminRealityTvRenderCustomAnswerPreview_'));
assert(admin.includes('function adminRealityTvClearCustomQuestion_'));
assert(admin.includes('Save & Build will now repair'));
assert(styles.includes('Reality TV current-period recovery and custom question builder — v1.1.8'));

// Release cache contract.
assert(app.includes('310-reality-tv-historical-results'));
assert(html.includes('310-reality-tv-historical-results'));
assert(sw.includes('310-reality-tv-historical-results'));

console.log('Reality TV episode recovery, question collapse, and custom-question v1.1.8 tests passed.');
