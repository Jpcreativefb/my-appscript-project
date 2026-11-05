const assert = require('assert');
const fs = require('fs');
const path = require('path');

const pageSource = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/voting.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../frontend/css/pages.css'), 'utf8');
const windowStub = { matchMedia: () => ({ matches: true }), scrollTo: () => {} };
const platformImgHtml = (url) => '<img src="' + url + '">';
const page = new Function('window', 'platformImgHtml', pageSource +
  '\nreturn { state: VOTING_PAGE_STATE, sections: votingPageSections_, compact: votingPageCompactWorkspace_, order: votingPageOrderWorkspaceHtml_, color: votingPageColorHex_, mobile: votingPageIsCompactMobile_ };'
)(windowStub, platformImgHtml);
const entries = [
  { entryId: 'red', entryName: 'Red Chili', displayColor: 'Red', displayNumber: '1', imageUrl: 'https://example.test/red.jpg' },
  { entryId: 'blue', entryName: 'Blue Chili', displayColor: 'Blue', displayNumber: '2' },
  { entryId: 'green', entryName: 'Green Chili', displayColor: 'Green', displayNumber: '3' }
];
const settings = { evaluatedOnly: true, minimumEvaluatedEntries: 1, votingMethod: 'top-n', rankLimit: 2, judgingMode: 'rank', colorAssignment: 'auto' };
const payload = { success: true, settings, entries, registrationOpen: true, votingOpen: false, resultsVisible: false, ballotCount: 0 };
page.state.payload = payload;
page.state.evaluatedEntryIds = ['red', 'blue'];
page.state.selectedEntryIds = ['blue', 'red'];

assert.strictEqual(page.mobile(), true, 'mobile breakpoint was not selected');
let html = page.sections(payload);
assert(html.includes('data-cookoff-tab="entry"'), 'Entry tab missing during registration');
assert(html.includes('data-cookoff-tab="vote"'), 'Vote tab missing');
assert(html.includes('data-cookoff-tab="results"'), 'Results tab missing');
assert(html.includes('data-cookoff-panel="vote" hidden'), 'Vote should not be initial panel before opening');

payload.registrationOpen = false;
payload.votingOpen = true;
html = page.sections(payload);
assert(!html.includes('data-cookoff-tab="entry"'), 'Entry tab must disappear once registration closes');
assert(html.includes('data-cookoff-panel="vote"'), 'Vote area missing when voting opens');
assert(html.includes('Ate / Tasted'), 'Tasted checkbox missing');
assert(html.includes('Info / Ingredients'), 'Expandable detail control missing');
assert(html.includes('cookoff-r9-grip'), 'Touch ranking handle missing');
assert(html.includes('Move dish up'), 'Arrow ranking fallback missing');
assert(html.includes('Red Chili') && html.includes('Blue Chili'), 'Ranked dishes missing');
assert(html.includes('Green Chili'), 'Unranked dish should remain visible');
assert(html.includes('is-untasted'), 'Untasted style missing');
assert(html.includes('#d64b42'), 'Assigned red identifier missing');
assert(!html.includes('data-cookoff-panel="entry"><section'), 'Entry form must be hidden after close');

const rankingHtml = page.compact(payload);
assert(rankingHtml.indexOf('Blue Chili') < rankingHtml.indexOf('Red Chili'), 'Existing ranking order not preserved');
assert.strictEqual(page.state.selectedEntryIds.length, 2, 'Eligible ranking was changed unexpectedly');
page.state.evaluatedEntryIds = ['red'];
page.compact(payload);
assert.deepStrictEqual(page.state.selectedEntryIds, ['red'], 'Untasted entry must be removed from selected ranking');

payload.votingOpen = false;
payload.resultsVisible = true;
html = page.sections(payload);
assert(html.includes('data-cookoff-tab="results" aria-pressed="true"'), 'Results must open after voting closes and results release');

assert(css.includes('.cookoff-r9-dish') && css.includes('.cookoff-r9-nav'), 'R9 mobile CSS missing');
console.log('cookoff-r9-mobile-smoke: PASS');
