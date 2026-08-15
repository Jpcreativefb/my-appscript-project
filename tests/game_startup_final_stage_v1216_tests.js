'use strict';
const fs = require('fs');
const assert = require('assert');
const normalized = fs.readFileSync('backend/engines/NormalizedQuestionStorageEngine.js', 'utf8');
const reality = fs.readFileSync('backend/engines/RealityTvSeasonEngine.js', 'utf8');
const app = fs.readFileSync('frontend/js/app.js', 'utf8');

assert(
  normalized.includes('syncLegacy: options.syncLegacy === true') &&
  normalized.includes('Automatic legacy synchronization is') &&
  normalized.includes('excluded from normal player/game startup requests'),
  'Normal category projection must not run legacy synchronization during player startup.'
);
assert(
  reality.includes('function realityTvHasSeasonForGameCached_') &&
  reality.includes('rtv_season_game_ids_v1') &&
  reality.includes('if (!realityTvHasSeasonForGameCached_(gameId))'),
  'Non-Reality games must use a cached fast season-existence check before loading Reality TV support sheets.'
);
assert(app.includes('325-game-load-question-controls-v1216'), 'v325 frontend asset marker missing.');
console.log('PASS: game startup final-stage optimization tests');
