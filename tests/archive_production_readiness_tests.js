const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const normalized = read('backend/engines/NormalizedQuestionStorageEngine.js');
const history = read('backend/engines/ArchiveHistoryEngine.js');
const backendApi = read('backend/Api.js');
const frontendApi = read('frontend/js/api.js');
const admin = read('frontend/js/pages/admin.js');
const leaderboard = read('frontend/js/pages/leaderboard.js');
const profile = read('frontend/js/pages/profile.js');
const historyPage = read('frontend/js/pages/archiveHistory.js');
const appRouter = read('frontend/js/app.js');
const appHtml = read('frontend/app.html');
const serviceWorker = read('frontend/sw.js');

assert(normalized.includes('"Current"'));
assert(normalized.includes('"SupersededByArchiveId"'));
assert(normalized.includes('"SupersededAt"'));
assert(normalized.includes('"LifecycleVersion"'));
assert(normalized.includes('function normalizedStorageSupersedePreviousManifestRecords_'));
assert(normalized.includes('function normalizedStorageNormalizeManifestLifecycle_'));
assert(normalized.includes('function normalizedStorageGetArchiveDashboard_'));
assert(normalized.includes('function normalizedStorageGetManifestRecordsByGame_'));
assert(normalized.includes('function normalizedStorageCurrentGamesHashMap_'));
assert(normalized.includes('Current: true'));
assert(normalized.includes('LifecycleVersion: "2.1.0"'));

const finalizeStart = normalized.indexOf('function normalizedStorageFinalizeArchiveJob_');
const finalizeEnd = normalized.indexOf('function archiveGameData', finalizeStart);
const finalizeBlock = normalized.slice(finalizeStart, finalizeEnd);
assert(finalizeBlock.includes('normalizedStorageSupersedePreviousManifestRecords_'));
assert(
  finalizeBlock.indexOf('normalizedStorageSupersedePreviousManifestRecords_') <
  finalizeBlock.indexOf('const manifestObject')
);

assert(backendApi.includes('"adminGetArchiveDashboard"'));
assert(backendApi.includes('requireAdminFromToken_(params.token || "")'));
assert(backendApi.includes('Valid session required for archived profile history.'));
assert(backendApi.includes('Valid session required for archived game history.'));
assert(backendApi.includes('Valid session required for archived games.'));

assert(frontendApi.includes('async function apiAdminGetArchiveDashboard()'));
assert(frontendApi.includes('token: session && session.token ? session.token : ""'));
assert(admin.includes('adminArchiveBadgeForGame_'));
assert(normalized.includes('Copy outdated'));
assert(admin.includes("navigate('history')"));

assert(appRouter.includes('case "history":'));
assert(appHtml.includes('./css/archive-history.css'));
assert(appHtml.includes('./js/pages/archiveHistory.js'));
assert(profile.includes("navigate('history')"));
assert(historyPage.includes('async function renderArchiveHistoryPage()'));
assert(historyPage.includes('Final Leaderboard'));
assert(historyPage.includes('Wager Standings'));
assert(historyPage.includes('archivePageOpenGame_'));

assert(leaderboard.includes('openLeaderboardCareerProfile_'));
assert(leaderboard.includes('renderCareerProfileModalShell_'));
assert(leaderboard.includes('Career stats'));

const careerModalShellCount =
  (leaderboard.match(/\$\{renderCareerProfileModalShell_\(\)\}/g) || []).length;
assert.strictEqual(careerModalShellCount, 0);
assert(leaderboard.includes('const host = document.body;'));
assert(leaderboard.includes('function showLeaderboardModal_(modal, content, html)'));
assert(serviceWorker.includes('awards-app-v250-standalone-stat-comparison'));
assert(serviceWorker.includes('./css/frontend-leaderboard-profile.css'));
assert(serviceWorker.includes('./js/pages/archiveHistory.js'));
assert(serviceWorker.includes('./css/archive-history.css'));
assert(history.includes('const ARCHIVE_HISTORY_CACHE_VERSION = "v2"'));
assert(history.includes('function archiveHistoryLoadWorkbookData_'));
assert(history.includes('const workbookCache = {}'));

const context = {
  console,
  JSON,
  Date,
  Math,
  String,
  Number,
  Object,
  Array,
  isNaN,
  isFinite
};
vm.createContext(context);
vm.runInContext(history, context);

assert.strictEqual(context.archiveHistoryManifestCurrent_({ Current: '' }), true);
assert.strictEqual(context.archiveHistoryManifestCurrent_({ Current: true }), true);
assert.strictEqual(context.archiveHistoryManifestCurrent_({ Current: 'TRUE' }), true);
assert.strictEqual(context.archiveHistoryManifestCurrent_({ Current: false }), false);
assert.strictEqual(context.archiveHistoryManifestCurrent_({ Current: 'FALSE' }), false);

console.log('archive-production-readiness-tests: PASS');
