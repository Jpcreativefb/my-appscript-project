const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const appData = fs.readFileSync(path.join(root, 'backend/engines/AppDataEngine.js'), 'utf8');
const picks = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'frontend/css/styles.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

assert(appData.includes('getCategoryResultsResolutionMap(gameId)'), 'Reality TV startup must read authoritative CategoryResults resolutions.');
assert(appData.includes('winnerNomineeIds'), 'Reality TV startup must expose all winner IDs, not only the first winner.');
assert(appData.includes('realityTvView.enabled === true'), 'CategoryResults decoration must stay scoped to Reality TV startup.');
assert(picks.includes('function realityTvWinnerIds_'), 'Multi-winner resolver is missing.');
assert(picks.includes('function realityTvNomineeResultState_'), 'Per-question historical result state is missing.');
assert(picks.includes('winners.indexOf(pick) !== -1'), 'A user pick must be considered correct when it matches any valid winner.');
assert(picks.includes('winnerNominees.map(function(item) { return item.name; }).join(", ")'), 'Historical question summaries must show all winners.');
assert(!picks.includes('Number(meta.eliminatedEpisode || 0) === categoryEpisodeNumber'), 'Contestant elimination status must not style unrelated questions in the same episode.');
assert(picks.includes('resultState.elimination'), 'Elimination overlay must be scoped to the elimination question result.');
assert(picks.includes('reality-result-overlay'), 'Non-elimination result overlay is missing.');
assert(picks.includes('"safety-winner": "SAFE"'), 'Safety result label is missing.');
assert(picks.includes('"reward-winner": "REWARD"'), 'Reward result label is missing.');
assert(picks.includes('"immunity-winner": "IMMUNITY"'), 'Immunity result label is missing.');
assert(css.includes('.reality-profile-choice.is-result:not(.is-eliminated)'), 'Historical winner highlight style is missing.');
assert(css.includes('.reality-result-badge'), 'Historical result badge style is missing.');
assert(css.includes('.reality-eliminated-overlay'), 'Elimination overlay style must remain available.');
assert(app.includes('313-external-results-hub-end-to-end'), 'App asset cache version not bumped.');
assert(html.includes('313-external-results-hub-end-to-end'), 'HTML asset cache version not bumped.');
assert(sw.includes('v313-external-results-hub-end-to-end'), 'Service worker cache version not bumped.');

console.log('Reality TV historical settled-result display v1.2.5 tests passed.');
