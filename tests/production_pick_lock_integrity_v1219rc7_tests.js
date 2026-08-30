const fs = require('fs');
const assert = require('assert');

const read = (file) => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const picksEngine = read('backend/engines/PicksEngine.js');
const appData = read('backend/engines/AppDataEngine.js');
const picksUi = read('frontend/js/pages/picks.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const appHtml = read('frontend/app.html');
const routes = JSON.parse(read('frontend/_routes.json'));
const sw = read('frontend/sw.js');

function body(source, functionName, nextFunctionName) {
  const start = source.indexOf('function ' + functionName);
  assert(start >= 0, functionName + ' must exist');
  const end = nextFunctionName ? source.indexOf('function ' + nextFunctionName, start + 1) : source.length;
  assert(end > start, 'Could not isolate ' + functionName);
  return source.slice(start, end);
}

assert(['1.2.19-rc.7', '1.2.19-rc.8'].includes(pkg.version), 'package version must identify rc7 or a certified successor');
assert(routes.include.includes('/api/app'), 'Cloudflare /api/app route must remain enabled');
assert.strictEqual(app, appMirror, 'frontend app mirrors must remain synchronized');
assert(appHtml.includes('v1219rc7-pick-lock-integrity'), 'app shell must bust cache for rc7');
assert(sw.includes('v1219rc7-pick-lock-integrity'), 'service worker must bust cache for rc7');
assert(app.includes('pattcStartupPayload:v1219rc7:'), 'old durable startup snapshots must be retired on rc7');

const lockHelper = body(picksEngine, 'isGamePickEntryLocked_(gameConfig)', 'normalizePickNumber_(');
assert(lockHelper.includes('gameConfig.lockAllPicks === true'), 'global Player Entries lock must be authoritative');
assert(lockHelper.includes('status === "preview"'), 'Preview must remain non-editable even if legacy flags drift');
assert(lockHelper.includes('gameConfig.resultsFinalized === true'), 'finalized games must reject new picks');

const standardBatch = body(picksEngine, 'savePicksBatch(payload)', 'savePick(payload)');
assert(standardBatch.includes('isGamePickEntryLocked_(gameConfig)'), 'batched standard predictions must enforce the game lock on the server');
assert(standardBatch.includes('Picks are locked for this game'), 'batched save should return a clear lock error');

const singleSave = body(picksEngine, 'savePick(payload)');
assert(singleSave.includes('isGamePickEntryLocked_(gameConfig)'), 'single prediction saves must enforce the game lock on the server');

const confidenceBatch = body(picksEngine, 'saveConfidencePicksBatch(payload)', 'savePicksBatch(payload)');
assert(confidenceBatch.includes('isGamePickEntryLocked_(gameConfig)'), 'Confidence batch saves must enforce the game lock on the server');

assert(appData.includes('lockAllPicks:\n      game.lockAllPicks === true'), 'Home/dashboard payload must expose the authoritative global lock');
assert(picksUi.includes('dashboardGame.lockAllPicks'), 'Picks should merge a newer Home/dashboard lock into a warm startup snapshot');

const categoryLocked = body(picksUi, 'isCategoryLocked(category)', 'getLockLabel(category)');
assert(categoryLocked.includes('PICKS_PAGE_DATA.game.lockAllPicks === true'), 'every pick control must disable under the global game lock');

const patchStartup = body(picksUi, 'picksPatchStartupPayload_(result)', 'picksScheduleStandardAutosave_');
assert(patchStartup.includes('appStoreStartupPayload_(APP_STATE.startupPayload)'), 'successful autosaves must persist the updated pick into the durable startup snapshot');

const flushAutosave = body(picksUi, 'picksFlushStandardAutosave_()', 'picksQueueStandardSave_');
assert(flushAutosave.includes('permanentFailure'), 'permanent lock failures must not remain in the retry queue');
assert(flushAutosave.includes('picksRecoverStandardSaveFailure_'), 'locked save failures must rehydrate authoritative saved picks');

const profilePrompt = app.includes('function maybeOfferGameProfileOnce_(gameId)')
  ? body(app, 'maybeOfferGameProfileOnce_(gameId)', 'maybeOfferGameProfile_(gameId)')
  : body(app, 'maybeOfferGameProfile_(gameId)', 'enterGame(');
const localDone = profilePrompt.indexOf('localStorage.setItem(cacheKey, "done")');
const remoteChoice = profilePrompt.indexOf('apiSetGameProfilePromptChoice(gameId, "general")');
assert(localDone >= 0 && remoteChoice >= 0 && localDone < remoteChoice, 'Keep regular profile must dismiss locally before the network round-trip');

console.log('production-pick-lock-integrity-v1.2.19-rc7-tests: PASS');
