const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const api = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const browserApi = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'frontend/app.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'frontend/sw.js'), 'utf8');

assert(api.includes('if (action === "adminCreateRealityTvSeason")'), 'Create-season POST action is missing');
assert(api.includes('apiAdminCreateRealityTvSeason(body)'), 'Create-season POST dispatcher is not wired');
assert(api.includes('if (action === "adminBulkAddRealityTvContestants")'), 'Bulk contestant POST action is missing');
assert(browserApi.includes('function apiAdminRealityTvPostRequest_'), 'Reality TV POST helper is missing');
assert(browserApi.includes('apiAdminRealityTvPostRequest_("adminCreateRealityTvSeason"'), 'Create season still uses GET/JSONP');
assert(browserApi.includes('apiAdminRealityTvPostRequest_("adminBulkAddRealityTvContestants"'), 'Bulk add still uses GET/JSONP');
assert(engine.includes('function realityTvBulkUpsertObjects_'), 'Batch sheet upsert helper is missing');
assert(engine.includes('const subjectRows = contestants.map'), 'Hub subjects are not batched');
assert(engine.includes('const mappingRows = contestants.map'), 'Hub mappings are not batched');
assert(engine.includes('The interrupted Reality TV season setup was repaired'), 'Interrupted setup repair message is missing');
assert(engine.includes('missingContestants'), 'Episode resume logic for missing answers is missing');
assert(page.includes('res.error || res.message'), 'Detailed create errors are not surfaced');

console.log('Reality TV large roster creation tests passed.');
