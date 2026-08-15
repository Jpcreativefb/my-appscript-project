'use strict';
const fs = require('fs');
const assert = require('assert');
const setup = fs.readFileSync('frontend/js/pages/adminGameSetup.js', 'utf8');
const categories = fs.readFileSync('backend/admin/AdminCategories.js', 'utf8');
const css = fs.readFileSync('frontend/css/styles.css', 'utf8');

assert(setup.includes('Pick Changes Before Lock'), 'Manage Games must expose the pick-change setting near Lock Date / Time.');
assert(setup.includes('Unlimited until lock'), 'Unlimited pick changes option missing.');
assert(setup.includes('No changes after first pick'), 'No-change option missing.');
assert(setup.includes('Limit number of changes'), 'Limited change option missing.');
assert(setup.includes('function adminSetupReadMaxChangesControl_'), 'Pick-change control reader missing.');
assert(setup.includes('maxChanges: maxChanges'), 'Manage Games save payload must persist MaxChanges.');
assert(categories.includes('maxChanges:') && categories.includes('payload.maxChanges'), 'Backend category create/update path must persist MaxChanges.');
assert(css.includes('.admin-pick-change-control') && css.includes('@media (max-width: 640px)'), 'Pick-change control must remain mobile friendly.');
console.log('PASS: Manage Games pick-change controls tests');
