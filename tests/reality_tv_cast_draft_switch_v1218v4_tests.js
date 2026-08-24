const fs = require('fs');
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } }
const engine = fs.readFileSync('backend/engines/RealityTvSeasonEngine.js','utf8');
const app = fs.readFileSync('frontend/js/app.js','utf8');
const appMirror = fs.readFileSync('frontend/app.js','utf8');
const html = fs.readFileSync('frontend/app.html','utf8');
const sw = fs.readFileSync('frontend/sw.js','utf8');
assert(engine.includes('REALITY CAST DRAFT SWITCH v1.2.18v4'), 'v1.2.18v4 backend marker missing');
assert(engine.includes('const generatedDraftSeasonId = "draft-" + realityTvSlug_([gameId, showName, seasonName, year, format.id].join("-"));'), 'show-aware deterministic draft id missing');
assert(!engine.includes('const draftSeasonId = realityTvString_(payload.draftSeasonId) || ("draft-" + gameId);'), 'stale payload draft id is still authoritative');
assert(engine.includes('realityTvKey_(row.GameId) === realityTvKey_(gameId)'), 'existing draft GameId match missing');
assert(engine.includes('realityTvKey_(row.ShowName) === realityTvKey_(showName)'), 'existing draft show match missing');
assert(engine.includes('realityTvKey_(row.SeasonName) === realityTvKey_(seasonName)'), 'existing draft season match missing');
assert(engine.includes('realityTvKey_(row.ShowFormat) === realityTvKey_(format.id)'), 'existing draft format match missing');
assert(engine.includes('sheetUrl: realityTvCastImportSheetUrl_(ss, sheet, "A" + firstPreparedRow)'), 'prepared-block deep link missing');
assert(engine.includes('&range=" + encodeURIComponent(rangePart)'), 'sheet range URL support missing');
for (const [name,text] of [['js/app',app],['app mirror',appMirror],['app.html',html],['sw',sw]]) {
  assert(text.includes('v1218v4-reality-draft-switch'), `${name} cache marker missing`);
}
console.log('PASS: Reality TV cast draft switching v1.2.18v4 contract');
