const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const html = read('frontend/app.html');
const app = read('frontend/js/app.js');
const api = read('frontend/js/api.js');
const adminUi = read('frontend/js/pages/adminUi.js');
const styles = read('frontend/css/styles.css');
const sw = read('frontend/sw.js');
const backendApi = read('backend/Api.js');
const reality = read('backend/engines/RealityTvSeasonEngine.js');
const picksRepo = read('backend/repositories/PicksRepo.js');
const picks = read('backend/engines/PicksEngine.js');

assert(html.includes('id="loaderBar"'), 'Gold progress loader bar missing');
assert(html.includes('id="loaderPercent"'), 'Player percentage label missing');
assert(!html.includes('<script src="./js/pages/admin.js"></script>'), 'Admin code is still eagerly loaded');
assert(app.includes('APP_PAGE_MODULES'), 'Route module registry missing');
assert(app.includes('loadPageScript_'), 'Lazy page loader missing');
assert(app.includes('loader.classList.toggle("is-admin"'), 'Role-aware admin loader missing');
assert(styles.includes('linear-gradient(90deg, #9f7418, #d4af37'), 'Gold progress styling missing');
assert(styles.includes('.loader.is-admin .app-loader-detail'), 'Admin-only detail styling missing');
assert(sw.includes('awards-app-v300-production-hardening'), 'Production service worker cache missing');
assert(api.includes('awards:api-start') && api.includes('awards:api-end'), 'API progress events missing');
assert(adminUi.includes('adminUiEnhanceHelp_'), 'Common admin help enhancement missing');
assert(adminUi.includes('adminUiStartButton_') && adminUi.includes('adminUiFinishButton_'), 'Common save progress states missing');
assert(backendApi.includes('adminGetRealityTvDashboardSummary'), 'Reality TV summary route missing');
assert(backendApi.includes('adminGetRealityTvSeasonDetails'), 'Reality TV detail route missing');
assert(reality.includes('function apiAdminGetRealityTvDashboardSummary'), 'Lightweight Reality TV dashboard missing');
assert(reality.includes('function apiAdminGetRealityTvSeasonDetails'), 'Lazy Reality TV details missing');
assert(reality.includes('rtv_user_view_'), 'Reality TV user payload cache missing');
assert(picksRepo.includes('function findPickRecord_'), 'Indexed exact pick lookup missing');
assert(picksRepo.includes('pick_row_'), 'Pick row cache missing');
assert(picks.includes('PicksRepo.findPick'), 'Pick save does not use exact lookup');
assert(picks.includes('getCategorySettingsCached') && picks.includes('getCategoriesCached'), 'Pick save metadata caches missing');

console.log('Production hardening v1.1.0 tests passed.');
