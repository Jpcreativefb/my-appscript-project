const fs = require('fs');
const assert = require('assert');

const read = (file) => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const admin = read('backend/admin/AdminCategories.js');
const normalized = read('backend/engines/NormalizedQuestionStorageEngine.js');
const settings = read('backend/engines/SettingsEngine.js');
const questionModes = read('backend/engines/QuestionModeEngine.js');
const appCache = read('backend/services/AppCache.js');
const setupUi = read('frontend/js/pages/adminGameSetup.js');
const appHtml = read('frontend/app.html');
const sw = read('frontend/sw.js');

function body(source, functionName, nextFunctionName) {
  const start = source.indexOf('function ' + functionName);
  assert(start >= 0, functionName + ' must exist');
  const end = nextFunctionName
    ? source.indexOf('function ' + nextFunctionName, start + 1)
    : source.length;
  assert(end > start, 'Could not isolate ' + functionName);
  return source.slice(start, end);
}

assert(['1.2.19-rc.6', '1.2.19-rc.7'].includes(pkg.version), 'package version must be rc6 or a certified successor');
assert(appHtml.includes('v1219rc6-admin-question-ux-performance'), 'app shell must bust cache for rc6');
assert(sw.includes('v1219rc6-admin-question-ux-performance'), 'service worker must bust cache for rc6');

const getSetup = body(admin, 'adminGetGameSetup(payload)', 'adminCreateCategory(payload)');
assert(getSetup.includes('const adminGame ='), 'Admin setup should resolve the game once');
assert(getSetup.includes('adminGameType === "ranking"'), 'CategoryResults ranking decoration must not block ordinary prediction setup loads');
assert(getSetup.includes('game:\n      adminGame'), 'Admin setup should reuse the resolved game object');

const ensureHeaders = body(admin, 'adminCatEnsureHybridHeaders_()', 'adminCatValidateQuestionSettingsPayload_(payload)');
assert(ensureHeaders.includes('admin_cat_hybrid_headers_v1219rc6'), 'schema header checks should be cached across requests');
assert(ensureHeaders.includes('21600'), 'schema cache should survive ordinary admin navigation');

const upsertSettings = body(admin, 'adminCatUpsertCategorySettings_(', 'adminGetGameSetup(payload)');
assert(upsertSettings.includes('[adminCatNormalizeId_(payload.categoryId)],\n      null'), 'settings writes must not eagerly rebuild the global question/game map');

const settingsScoped = body(settings, 'getCategorySettingsDataForGameScoped_(gameId)', 'getCategorySettings(gameId)');
assert(settingsScoped.includes('Object.keys(allowed),\n    null'), 'settings reads must defer the legacy question/game map');

const settingsRows = body(normalized, 'normalizedStorageReadSettingsRowsForGame_(', 'normalizedStorageCopySettingsByQuestionIds_(');
assert(settingsRows.includes('if (!questionGameMap && typeof normalizedStorageBuildQuestionGameMap_ === "function")'), 'legacy question/game map must be lazy-only');
assert(settingsRows.indexOf('createTextFinder') < settingsRows.indexOf('normalizedStorageBuildQuestionGameMap_()'), 'GameId fast path must run before legacy map rebuild');

const createQuestion = body(admin, 'adminCreateCategory(payload)', 'adminUpdateCategory(payload)');
assert(createQuestion.includes('deferCacheClear: true'), 'question create should defer duplicate normalized cache clearing');
assert(!createQuestion.includes('SpreadsheetApp.flush();'), 'question create must not force a synchronous spreadsheet flush');

const createAnswer = body(admin, 'adminCreateNominee(payload)', 'adminUpdateNominee(payload)');
assert(createAnswer.includes('deferCacheClear: true'), 'answer create should defer duplicate normalized cache clearing');
assert(!createAnswer.includes('SpreadsheetApp.flush();'), 'answer create must not force a synchronous spreadsheet flush');

const qModeUpsert = body(questionModes, 'questionModeUpsert_(gameId, questionId, scoreMode, source)', 'questionModeBackfillFromCategorySettings_');
assert(qModeUpsert.includes('createTextFinder(gameId)'), 'question mode writes should target only this game');
assert(!qModeUpsert.includes('clearAppCaches()'), 'question mode writes must not clear every application cache');
assert(qModeUpsert.includes('clearGameDataCaches(gameId, [QUESTION_MODES_SHEET])'), 'question mode writes should invalidate only the affected game');

const gameKeys = body(appCache, 'appGameCacheKeys_(gameId, username)', 'clearPlayerActionCaches(gameId, sheetNames, username)');
assert(!gameKeys.includes('"normalized_question_game_map_v1"'), 'game-scoped invalidation must preserve the global compatibility map');
assert(normalized.includes('normalizedStorageRememberQuestionGame_'), 'question writes must update an existing global compatibility map incrementally');

assert(setupUi.includes('let adminSetupPageState = null;'), 'Admin setup must keep an in-page state snapshot');
assert(setupUi.includes('id="adminSetupQuestionList"'), 'Admin setup needs a stable DOM target for local question updates');
assert(setupUi.includes('adminSetupRenderQuestionListFromState_'), 'Admin setup must re-render changed question/answer cards locally');

const uiCreateQuestion = body(setupUi, 'adminSetupCreateCategory(gameId)', 'adminSetupCreateNominee(gameId)');
assert(uiCreateQuestion.includes('adminSetupAddStateCategory_'), 'new questions should appear without a server page reload');
assert(uiCreateQuestion.includes('if (!adminSetupRenderQuestionListFromState_'), 'server navigation should be fallback-only after question create');

const uiCreateAnswer = body(setupUi, 'adminSetupCreateNominee(gameId)', 'adminSetupAutoFillInlineNomineeFields(categoryId)');
assert(uiCreateAnswer.includes('adminSetupAddStateNominee_'), 'new answers should appear without a server page reload');
assert(uiCreateAnswer.includes('if (!adminSetupRenderQuestionListFromState_'), 'server navigation should be fallback-only after answer create');

const uiInlineAnswer = body(setupUi, 'adminSetupCreateInlineNominee(', 'adminSetupSetSaveButtonState_');
assert(uiInlineAnswer.includes('adminSetupAddStateNominee_'), 'inline answers should appear without a server page reload');
assert(uiInlineAnswer.includes('if (!adminSetupRenderQuestionListFromState_'), 'inline answer navigation should be fallback-only');

console.log('production-admin-question-ux-performance-v1.2.19-rc6-tests: PASS');
