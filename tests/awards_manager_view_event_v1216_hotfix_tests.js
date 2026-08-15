'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const awards = read('frontend/js/pages/adminAwards.js');
const app = read('frontend/js/app.js');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

assert(
  awards.includes('id="awardsInlineWorkspace-${index}"'),
  'Awards Manager Build/Link workspace must expand directly under the selected event.'
);
assert(
  awards.includes('onclick="adminAwardsOpenEvent(${index}, this)"'),
  'View Event must pass the clicked button for visible loading feedback.'
);
assert(
  awards.includes('async function adminAwardsOpenEvent(index, button)'),
  'View Event handler must accept the clicked button.'
);
assert(
  awards.includes('button.textContent = "Loading Event…";'),
  'View Event must show an immediate loading state.'
);
assert(
  awards.includes('workspace.scrollIntoView({'),
  'View Event must navigate the admin to the Build/Link workspace.'
);
assert(
  awards.includes('behavior: "smooth"') &&
  awards.includes('block: "start"'),
  'View Event workspace scrolling should be deliberate and visible.'
);
assert(
  awards.includes('button.textContent = originalButtonText;'),
  'View Event button state must be restored after success or failure.'
);
assert(
  app.includes('323-awards-batch-builder-v1216'),
  'Awards View Event hotfix asset marker is missing from app.js.'
);
assert(
  html.includes('323-awards-batch-builder-v1216'),
  'Awards View Event hotfix asset marker is missing from app.html.'
);
assert(
  sw.includes('awards-app-v323-awards-batch-builder-v1216'),
  'Awards View Event hotfix cache marker is missing from the service worker.'
);

console.log('Awards Manager View Event v1.2.16 hotfix tests passed.');
