'use strict';

const fs = require('fs');
const path = require('path');

const odds = fs.readFileSync(
  path.join(__dirname, '..', 'external-engines', 'sports-scoring-engine', 'src', 'SportsOddsEngine.js'),
  'utf8'
);

const checks = [
  [
    'normal refresh requests moneyline, spread, and total markets',
    /const SPORTS_ODDS_MARKETS\s*=\s*["']h2h,spreads,totals["']/.test(odds)
  ],
  [
    'game freshness is evaluated on the matched row, not any fresh league row',
    odds.includes('const matchedFresh =') &&
      odds.includes('picked.bestScore >= 120') &&
      odds.includes('isSportsOddsFresh_(picked.best)') &&
      !/const hasFresh\s*=\s*rows\.some/.test(odds)
  ],
  [
    'stale matched event triggers refresh',
    /refreshIfStale\s*&&\s*!matchedFresh/.test(odds)
  ],
  [
    'existing provider event id can update the same row when OddsId changes',
    odds.includes('const existingByEvent = {};') &&
      odds.includes('existingByEvent[eventKey]') &&
      odds.includes('existing[item.OddsId] ||')
  ],
  [
    'refresh reports inserted updated and unchanged rows separately',
    odds.includes('let unchanged = 0;') &&
      odds.includes('unchanged: unchanged') &&
      odds.includes('writeResult.unchanged || 0')
  ],
  [
    'one malformed provider event cannot abort the rest of the league',
    odds.includes('function sportsOddsNormalizeEventsSafely_') &&
      /\.forEach\(function\(event\)[\s\S]*?try[\s\S]*?catch \(err\)/.test(odds) &&
      odds.includes('errors: errors')
  ],
  [
    'partial/no-market event is tracked as unavailable rather than throwing away the week',
    odds.includes('unavailable.push({') &&
      /unavailable:\s*normalized\.unavailable/.test(odds)
  ],
  [
    'normal and windowed refresh both use the isolated event normalizer',
    (odds.match(/sportsOddsNormalizeEventsSafely_\(/g) || []).length >= 3
  ]
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
  console.error(`FAILED: ${failures} Confidence Odds Refresh R1 check(s)`);
  process.exit(1);
}

console.log(`ALL ${checks.length} CONFIDENCE ODDS REFRESH R1 CHECKS PASSED`);
