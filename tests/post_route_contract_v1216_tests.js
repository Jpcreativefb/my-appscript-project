'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const frontend = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
const backend = fs.readFileSync(path.join(root, 'backend/Api.js'), 'utf8');
const postSection = backend.split('function doGet(e)')[0];

function literals(re) {
  return Array.from(frontend.matchAll(re), match => match[1]);
}

const frontendPostActions = new Set([
  ...literals(/apiPost\(\s*"([^"]+)"/g),
  ...literals(/apiAdminRealityTvPostRequest_\(\s*"([^"]+)"/g),
  ...literals(/apiAdminAwardsPostRequest_\(\s*"([^"]+)"/g)
]);

const backendPostActions = new Set(
  Array.from(postSection.matchAll(/action\s*===\s*"([^"]+)"/g), match => match[1])
);

const missing = Array.from(frontendPostActions)
  .filter(action => !backendPostActions.has(action))
  .sort();

assert.deepStrictEqual(
  missing,
  [],
  `Frontend POST actions missing backend doPost routes: ${missing.join(', ')}`
);

assert(frontendPostActions.size >= 30, 'POST route contract unexpectedly found too few frontend write actions.');

console.log(`POST route contract passed for ${frontendPostActions.size} frontend actions.`);
