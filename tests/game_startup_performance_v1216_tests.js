'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const categories = read('backend/engines/CategoriesEngine.js');
const normalized = read('backend/engines/NormalizedQuestionStorageEngine.js');
const hub = read('backend/engines/ExternalResultsHubBridgeEngine.js');
const cache = read('backend/services/AppCache.js');

assert(
  categories.includes('typeof getCategorySettingsCached === "function"') &&
  categories.includes('? getCategorySettingsCached(gameId)'),
  'Category projection must reuse the per-game settings cache during startup.'
);

assert(
  normalized.includes('const runtimeKey = "data-index:all"') &&
  normalized.includes('NORMALIZED_STORAGE_RUNTIME_CACHE[runtimeKey] = output'),
  'Normalized DataIndex must be read only once per Apps Script execution.'
);

assert(
  normalized.includes('const scriptCacheKey = "normalized_question_game_map_v1"') &&
  normalized.includes('CacheService.getScriptCache().get(scriptCacheKey)') &&
  normalized.includes('safeScriptCachePut_('),
  'Global question/game map must use ScriptCache instead of rescanning all Questions/Categories on every game load.'
);

assert(
  hub.includes('externalResultsBridgeReadLiveProbabilityCache_') &&
  hub.includes('externalResultsBridgeWriteLiveProbabilityCache_') &&
  hub.includes('externalResultsBridgeApplyLiveProbabilityLookup_'),
  'Live K/P probabilities need a compact per-game startup cache.'
);

assert(
  hub.includes('config.showMarketProbabilities === false'),
  'Hidden market probabilities must avoid the external Hub read entirely.'
);

assert(
  cache.includes('"normalized_question_game_map_v1"') &&
  cache.includes('"external_live_probabilities_v1_"'),
  'Startup performance caches must be invalidated by normal game/app cache clears.'
);

console.log('PASS: game startup performance cache tests');
