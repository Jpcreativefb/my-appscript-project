'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const engine = read('backend/engines/AppDataEngine.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const app = read('frontend/js/app.js');

assert(
  engine.includes('const progress =\n    getDashboardGameProgressLite_('),
  'Lite dashboard cards must calculate real user progress.'
);
assert(
  engine.includes('function getDashboardGameProgressLite_('),
  'Dashboard lite progress helper is missing.'
);
assert(
  engine.includes('function getDashboardUserPickCategoryIdsDirect_('),
  'Dashboard must read saved pick categories directly.'
);
assert(
  engine.includes('function getDashboardUserBetCategoryIdsDirect_('),
  'Dashboard must read saved wager categories directly.'
);
assert(
  engine.includes('normalizedMode === "staked-prediction"'),
  'Staked prediction progress must be supported.'
);
assert(
  engine.includes('normalizedMode === "head-to-head"'),
  'Head-to-head progress must be supported.'
);
assert(
  engine.includes('normalizedMode === "racing-wager"'),
  'Racing wager progress must be supported.'
);
assert(
  engine.includes('normalizedMode === "hybrid"'),
  'Hybrid progress must be supported.'
);
assert(
  engine.includes('progressAvailable:\n      progress.progressAvailable === true'),
  'Dashboard payload must tell the frontend whether percentage progress is meaningful.'
);
assert(
  dashboard.includes('const progressAvailable ='),
  'Dashboard frontend must recognize unavailable progress.'
);
assert(
  dashboard.includes('progressAvailable ? `${progressValue}%` : "—"'),
  'Unavailable progress must not render a misleading 0%.'
);
assert(
  dashboard.includes('progressAvailable\n            ? `'),
  'Progress bar must only render when progress is available.'
);
assert(
  app.includes('327-question-drag-order-v1216'),
  'Current v1.2.16 asset marker is missing after the Awards View Event hotfix.'
);

console.log('Dashboard Home progress v1.2.16 hotfix tests passed.');
