const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const pageSource = fs.readFileSync(path.join(root, 'frontend/js/pages/adminRealityTv.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const browserApiSource = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(root, 'frontend/css/styles.css'), 'utf8');

assert(pageSource.includes('Mass Enter Contestants'), 'Initial season mass-entry panel is missing');
assert(pageSource.includes('Mass add contestants'), 'Existing-season mass-entry panel is missing');
assert(pageSource.includes('adminRealityTvParseBulkContestants_'), 'Bulk contestant parser is missing');
assert(pageSource.includes('Replace Current Rows'), 'Replace-roster bulk action is missing');
assert(pageSource.includes('Add to Current Rows'), 'Append-roster bulk action is missing');
assert(pageSource.includes('External Subject ID'), 'External subject ID bulk field is missing');
assert(pageSource.includes('Biography'), 'Biography bulk field is missing');
assert(engineSource.includes('function apiAdminBulkAddRealityTvContestants'), 'Bulk contestant backend action is missing');
assert(apiSource.includes('"adminBulkAddRealityTvContestants"'), 'Bulk contestant action is not registered');
assert(browserApiSource.includes('apiAdminBulkAddRealityTvContestants'), 'Bulk contestant frontend API wrapper is missing');
assert(cssSource.includes('.reality-tv-bulk-import'), 'Bulk importer styles are missing');

const context = {
  console,
  ADMIN_REALITY_TV_DASHBOARD: null,
  escapeHtml_: value => String(value),
};
vm.createContext(context);
vm.runInContext(pageSource, context);

const tsv = [
  'Name\tFull Name\tImage URL\tTeam / Tribe\tAge\tHometown\tOccupation\tBiography\tExternal Subject ID',
  'Contestant A\tAlex Example\thttps://example.com/a.jpg\tBlue\t31\tChicago, IL\tTeacher\tBio A\talex-example',
  'Contestant B\tBailey Example\t\tRed\t27\tAustin, TX\tDesigner\tBio B\tbailey-example'
].join('\n');
const parsedTsv = context.adminRealityTvParseBulkContestants_(tsv);
assert.deepStrictEqual(Array.from(parsedTsv.errors), []);
assert.strictEqual(parsedTsv.items.length, 2);
assert.strictEqual(parsedTsv.items[0].name, 'Contestant A');
assert.strictEqual(parsedTsv.items[0].teamOrTribe, 'Blue');
assert.strictEqual(parsedTsv.items[0].externalSubjectId, 'alex-example');

const simpleNames = context.adminRealityTvParseBulkContestants_('One\nTwo\nTwo\nThree');
assert.strictEqual(simpleNames.items.length, 3, 'One-name-per-line import should deduplicate rows');
assert(simpleNames.warnings.some(message => message.includes('Skipped duplicate')), 'Duplicate warning is missing');

const csv = 'Name,Age,Hometown\n"Smith, Jo",29,"New York, NY"';
const parsedCsv = context.adminRealityTvParseBulkContestants_(csv);
assert.strictEqual(parsedCsv.items.length, 1);
assert.strictEqual(parsedCsv.items[0].name, 'Smith, Jo');
assert.strictEqual(parsedCsv.items[0].hometown, 'New York, NY');

const multilineTsv = [
  'Full Name\tAge\tHometown\tTeam/Tribe\tOccupation\tImage URL',
  'Jenna Lewis-Dougherty\t47\t"Woodland,',
  'California"\tCila\tRealtor\thttps://example.com/jenna.jpg',
  'Kyle Fraser\t31\t"Brooklyn,',
  'New York"\tVatu\tDefense Attorney\thttps://example.com/kyle.jpg'
].join('\n');
const parsedMultilineTsv = context.adminRealityTvParseBulkContestants_(multilineTsv);
assert.deepStrictEqual(Array.from(parsedMultilineTsv.errors), []);
assert.strictEqual(parsedMultilineTsv.items.length, 2, 'Quoted multiline spreadsheet cells must remain in one contestant row');
assert.strictEqual(parsedMultilineTsv.items[0].name, 'Jenna Lewis-Dougherty');
assert.strictEqual(parsedMultilineTsv.items[0].fullName, 'Jenna Lewis-Dougherty');
assert.strictEqual(parsedMultilineTsv.items[0].hometown, 'Woodland, California');
assert.strictEqual(parsedMultilineTsv.items[0].teamOrTribe, 'Cila');
assert.strictEqual(parsedMultilineTsv.items[1].hometown, 'Brooklyn, New York');
assert.strictEqual(parsedMultilineTsv.items[1].occupation, 'Defense Attorney');

console.log('Reality TV bulk contestant import tests passed.');
