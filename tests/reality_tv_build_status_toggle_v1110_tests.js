const fs = require('fs');
const path = require('path');
const assert = require('assert');

const realityTv = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/adminRealityTv.js'), 'utf8');
const adminUi = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/adminUi.js'), 'utf8');

assert(
  realityTv.includes('class="reality-tv-master-build-button" data-admin-no-progress="true" aria-expanded="false"'),
  'The Current Episode Build Status disclosure must opt out of action progress.'
);
assert(
  adminUi.includes('button.hasAttribute("aria-expanded") || button.closest("summary")'),
  'Shared admin progress must ignore expand/collapse and summary disclosure controls.'
);
assert(
  realityTv.includes('Build / Repair Now') && realityTv.includes('Resume Automatic Build'),
  'The actual build and resume actions must remain available inside the expanded status panel.'
);

console.log('Reality TV build-status toggle v1.1.10 tests passed.');
