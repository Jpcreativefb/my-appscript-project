const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'backend/engines/AppDataEngine.js'), 'utf8');

assert(source.includes('buildDashboardProgressContext_'), 'dashboard must build one batched progress context');
assert(source.includes('suppressProgress: isSeasonHub || isPast === true'), 'past games must skip live progress calculation');
assert(!/games\.forEach\([\s\S]{0,1600}getDashboardUserPickCategoryIdsDirect_/.test(source), 'dashboard loop must not perform direct per-game pick reads');

const context = {
  console,
  getAllCategoriesData_: () => [
    ['GameId','Category','CategoryId','Nominee','NomineeId','Active'],
    ['g1','Q1','q1','A','a',true],
    ['g1','Q1','q1','B','b',true],
    ['g1','Q2','q2','A','a',true],
    ['g2','Q3','q3','A','a',true],
    ['old','Old','old-q','A','a',true]
  ],
  getCategoriesColumnMap_: (headers) => ({
    gameId: headers.indexOf('GameId'), category: headers.indexOf('Category'),
    categoryId: headers.indexOf('CategoryId'), nominee: headers.indexOf('Nominee'),
    nomineeId: headers.indexOf('NomineeId'), active: headers.indexOf('Active')
  }),
  validateCategoriesColumns_: () => true,
  normalizeBoolean_: (v) => v === true || String(v).toLowerCase() === 'true',

  getAllPicksData_: () => [
    ['GameId','Username','CategoryId','NomineeId','Points','OriginalNomineeId','ChangeCount','Timestamp','LastUpdated'],
    ['g1','Joel','q1','a',0,'',0,'2026-08-15T10:00:00Z','2026-08-15T10:00:00Z'],
    ['g1','Joel','q1','b',0,'',1,'2026-08-15T11:00:00Z','2026-08-15T11:00:00Z'],
    ['g2','Joel','q3','a',0,'',0,'2026-08-15T10:00:00Z','2026-08-15T10:00:00Z'],
    ['old','Joel','old-q','a',0,'',0,'2026-08-15T10:00:00Z','2026-08-15T10:00:00Z']
  ],
  getPicksColumnMap_: (headers) => ({
    gameId: headers.indexOf('GameId'), username: headers.indexOf('Username'),
    category: headers.indexOf('CategoryId'), nominee: headers.indexOf('NomineeId'),
    points: headers.indexOf('Points'), original: headers.indexOf('OriginalNomineeId'),
    changes: headers.indexOf('ChangeCount'), timestamp: headers.indexOf('Timestamp'),
    lastUpdated: headers.indexOf('LastUpdated')
  }),
  validatePickColumns_: () => true,
  normalizeLower_: (v) => String(v || '').trim().toLowerCase(),
  normalizeString_: (v) => String(v || '').trim(),

  getAllBetsData_: () => [
    ['GameId','Username','CategoryId','NomineeId','BetAmount','Odds','Timestamp','LastUpdated'],
    ['g1','Joel','q2','a',10,2,'2026-08-15T10:00:00Z','2026-08-15T10:00:00Z'],
    ['old','Joel','old-q','a',10,2,'2026-08-15T10:00:00Z','2026-08-15T10:00:00Z']
  ],
  getBetsColumnMap_: (headers) => ({
    gameId: headers.indexOf('GameId'), username: headers.indexOf('Username'),
    categoryId: headers.indexOf('CategoryId'), nomineeId: headers.indexOf('NomineeId'),
    betAmount: headers.indexOf('BetAmount'), odds: headers.indexOf('Odds'),
    timestamp: headers.indexOf('Timestamp'), lastUpdated: headers.indexOf('LastUpdated')
  }),
  validateBetsColumns_: () => true,
  normalizeBetKey_: (v) => String(v || '').trim().toLowerCase(),
  roundBetMoney_: (v) => Number(v) || 0,

  // harmless stubs for functions referenced elsewhere in the source
  normalizeGameId_: (v) => String(v || '').trim(),
  Utilities: { formatDate: () => '' },
  Session: { getScriptTimeZone: () => 'America/Chicago' }
};
vm.createContext(context);
vm.runInContext(source, context);

const snapshot = context.buildDashboardProgressContext_('Joel', ['g1','g2']);
assert.strictEqual(snapshot.totalCategoriesByGame.g1, 2, 'g1 should count unique questions once despite multiple answers');
assert.strictEqual(snapshot.totalCategoriesByGame.g2, 1, 'g2 category total should be present');
assert.deepStrictEqual(Array.from(snapshot.pickCategoryIdsByGame.g1), ['q1'], 'latest g1 pick should be summarized once');
assert.deepStrictEqual(Array.from(snapshot.pickCategoryIdsByGame.g2), ['q3'], 'g2 pick should be summarized');
assert.deepStrictEqual(Array.from(snapshot.betCategoryIdsByGame.g1), ['q2'], 'g1 wager should be summarized');
assert.strictEqual(snapshot.totalCategoriesByGame.old, undefined, 'past/unrequested games must not be included in active progress snapshot');

console.log('dashboard startup batch progress tests passed');
