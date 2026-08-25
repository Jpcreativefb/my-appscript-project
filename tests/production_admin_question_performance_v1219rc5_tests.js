const fs = require("fs");
const assert = require("assert");

const admin = fs.readFileSync("backend/admin/AdminCategories.js", "utf8");
const normalized = fs.readFileSync("backend/engines/NormalizedQuestionStorageEngine.js", "utf8");
const setupUi = fs.readFileSync("frontend/js/pages/adminGameSetup.js", "utf8");
const routes = JSON.parse(fs.readFileSync("frontend/_routes.json", "utf8"));

function body(source, functionName, nextFunctionName) {
  const start = source.indexOf("function " + functionName);
  assert(start >= 0, functionName + " must exist");
  const end = nextFunctionName
    ? source.indexOf("function " + nextFunctionName, start + 1)
    : source.length;
  assert(end > start, "Could not isolate " + functionName);
  return source.slice(start, end);
}

assert(routes.include.includes("/api/app"), "Cloudflare /api/app route must remain enabled");
assert(admin.includes('getCategorySettingsDataForGameScoped_(gameId)'), "Admin setup must use scoped CategorySettings reads");
assert(admin.includes('bypassRuntimeCache: false') && admin.includes('trustIndex: true'), "Admin setup must allow indexed normalized reads");

const createCategory = body(admin, "adminCreateCategory(payload)", "adminUpdateCategory(payload)");
assert(createCategory.includes("normalizedStorageGetQuestionSetup_"), "Question create should validate against normalized storage directly");
assert(!/const setup\s*=\s*adminGetGameSetup/.test(createCategory), "Question create must not build full Admin setup just to check duplicates");

const createNominee = body(admin, "adminCreateNominee(payload)", "adminUpdateNominee(payload)");
assert(createNominee.includes("normalizedStorageGetQuestionSetup_"), "Answer create should validate against normalized storage directly");
assert(createNominee.includes("getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1))"), "Answer create should read only the Categories header row");
assert(!createNominee.includes("sh.getDataRange()"), "Answer create must not read the full Categories sheet");

const upsertQuestion = body(normalized, "normalizedStorageUpsertQuestion_(payload)", "normalizedStorageUpsertOption_(payload)");
assert(upsertQuestion.includes("normalizedStorageUpsertIndexEntry_"), "Question upsert must update only the affected index entry");
assert(!upsertQuestion.includes("normalizedStorageRebuildIndexForSheet_"), "Single question upsert must not rebuild the whole Questions index");
assert(upsertQuestion.includes("trustIndex: true"), "Question upsert should trust the maintained game index");

const upsertOption = body(normalized, "normalizedStorageUpsertOption_(payload)", "normalizedStorageUpsertOptionsBulk_(payloads)");
assert(upsertOption.includes("normalizedStorageUpsertIndexEntry_"), "Answer upsert must update only the affected index entry");
assert(!upsertOption.includes("normalizedStorageRebuildIndexForSheet_"), "Single answer upsert must not rebuild the whole QuestionOptions index");
assert(upsertOption.includes("trustIndex: true"), "Answer upsert should trust the maintained game index");

const adminProjection = body(normalized, "getAdminCategoriesDataForGameScoped_(gameId)", "getCategoriesDataForGameScoped_(gameId, options)");
assert(adminProjection.includes("syncLegacy: false"), "Admin setup should not synchronize legacy rows on every editor open");
assert(adminProjection.includes("trustIndex: true"), "Admin setup projection should use the game index");

const settingsRead = body(normalized, "normalizedStorageReadSettingsRowsForGame_(", "normalizedStorageCopySettingsByQuestionIds_(");
assert(settingsRead.includes("createTextFinder"), "CategorySettings scoped reader should use exact GameId TextFinder fast path");
assert(settingsRead.includes("if (!rowNumbers.length)"), "CategorySettings must retain legacy fallback when GameId rows are absent");

assert(setupUi.includes('navigate("admin-game-setup:" + gameId, { skipUnsavedCheck: true, suppressLoader: true });'), "Question/answer same-page refresh should suppress the full-screen loader");
assert(setupUi.includes("{ skipUnsavedCheck: true, suppressLoader: true }"), "Inline answer refresh should suppress the full-screen loader");

console.log("production-admin-question-performance-v1.2.19-rc5-tests: PASS");
