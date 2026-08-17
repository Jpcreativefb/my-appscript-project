const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const picks = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/picks.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

// Confidence review/sort contract.
assert(picks.includes('function setConfidenceSortMode_'));
assert(picks.includes('function buildConfidenceSortOrder_'));
assert(picks.includes('function getCompactConfidenceDisplayCategories_'));
assert(picks.includes('PICKS_CONFIDENCE_SORT_STALE = true'));
assert(picks.includes('Re-sort Confidence'));
assert(picks.includes('Game Time'));
assert(picks.includes('Confidence ↓'));

// Live scoreboard contract.
assert(picks.includes('function refreshConfidenceLiveSports_'));
assert(picks.includes('function fetchConfidenceLiveScores_'));
assert(picks.includes('PICKS_CONFIDENCE_LIVE_REFRESH_MS = 30000'));
assert(picks.includes('category.sportsClock'));
assert(picks.includes('category.sportsPeriod'));
assert(picks.includes('confidence-team-score'));
assert(picks.includes('getConfidenceLiveResult_'));
assert(picks.includes('confidenceResultPointsLabel_'));

// Details load odds only when a row is expanded.
assert(picks.includes('function toggleConfidenceDetails_'));
assert(picks.includes('function loadConfidenceOdds_'));
assert(picks.includes('getSportsOdds'));
assert(picks.includes('Odds · Records · Favorite'));
assert(picks.includes('confidenceFavoriteName_'));

// Draft picks remain client-side; live refresh updates category data, not baseline/draft maps.
const liveFnStart = picks.indexOf('async function refreshConfidenceLiveSports_');
const liveFnEnd = picks.indexOf('function mountConfidenceLiveSports_', liveFnStart);
const liveFn = picks.slice(liveFnStart, liveFnEnd);
assert(!liveFn.includes('PICKS_CONFIDENCE_BASELINE_PICKS'));
assert(!liveFn.includes('PICKS_PAGE_DATA.picks ='));

// Styling contract for final results and expanded info.
assert(css.includes('.confidence-team-choice.not-selected.actual-winner'));
assert(css.includes('.confidence-result-points.correct'));
assert(css.includes('.confidence-result-points.wrong'));
assert(css.includes('.confidence-game-details'));
assert(css.includes('.confidence-toolbar-sort button.stale'));
assert(sw.includes('v1217b-confidence-live'));

console.log('confidence live review v1.2.17b tests passed');
