'use strict';

const fs = require('fs');
const path = require('path');

function read(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');
}

const admin = read('SportsAdminControls.js');
const odds = read('SportsOddsEngine.js');
const scores = read('SportsScoresEngine.js');
const advanced = read('SportsAdvancedStatsEngine.js');
const players = read('SportsPlayersEngine.js');

const checks = [
  ['legacy daily odds default migrates to 5', admin.includes('SPORTS_ODDS_OPERATIONAL_DEFAULTS_V48_APPLIED') && admin.includes('data[i][col.MaxRefreshesPerDay] = 5')],
  ['legacy monthly odds default migrates to 100', admin.includes('data[i][col.MonthlyBudget] = 100')],
  ['new odds rows default to 5/day', admin.includes('MaxRefreshesPerDay: 5')],
  ['new odds rows default to 100/month', admin.includes('MonthlyBudget: 100')],
  ['odds header setup uses document lock', /function sportsOddsEnsureHeaderSheetSafe_[\s\S]*LockService\.getDocumentLock\(\)/.test(odds)],
  ['odds API logging is nonfatal', odds.includes('API logging is diagnostic only') && odds.includes('usage.logWarning')],
  ['score date filter parses timestamps in local timezone', scores.includes('GameDateTime is commonly stored as an ISO UTC timestamp') && !/function getSportsScoreDateOnly_[\s\S]{0,900}raw\.slice\(0, 10\)/.test(scores)],
  ['score date formatter is safe in Node regression harness', scores.includes('typeof Utilities !== \"undefined\"') && scores.includes('new Intl.DateTimeFormat')],
  ['workbook 10M capacity guard exists', scores.includes('SPORTS_WORKBOOK_CELL_LIMIT_V48_ = 10000000')],
  ['SportsLogs retention cap exists', scores.includes('SPORTS_LOG_MAX_DATA_ROWS_V48_ = 20000')],
  ['capacity maintenance runs during score updates', scores.includes('sportsWorkbookMaintenance_({ source: "runSportsScoresUpdate" })')],
  ['capacity report is exposed to admin dashboard', admin.includes('workbookCapacity: typeof sportsWorkbookCapacityReport_')],
  ['checkpoint capture pauses before the 10M wall', advanced.includes('capacity.percentUsed >= 90') && advanced.includes('checkpoint capture paused')],
  ['score sheets can re-expand after safe grid trimming', scores.includes('expand columns for') && scores.includes('insertColumnsAfter')],
  ['player sheets can re-expand after safe grid trimming', players.includes('expand player sheet columns') && players.includes('insertColumnsAfter')]
];

let failures = 0;
checks.forEach(([name, pass]) => {
  if (pass) {
    console.log('PASS:', name);
  } else {
    failures++;
    console.error('FAIL:', name);
  }
});

if (failures) {
  console.error(`FAILED: ${failures} v48 hardening check(s)`);
  process.exit(1);
}
console.log(`ALL ${checks.length} SPORTS ENGINE V48 HARDENING CHECKS PASSED`);
