const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const manager = read('frontend/js/pages/adminAppearance.js');
const appearanceCss = read('frontend/css/appearance.css');
const picks = read('frontend/js/pages/picks.js');
const picksCss = read('frontend/css/picks.css');
const app = read('frontend/js/app.js');
const mirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');
const html = read('frontend/app.html');

assert.strictEqual(app, mirror, 'Frontend app mirrors must remain synchronized.');

// Appearance Studio is a visual editor rather than a simple theme color form.
assert(manager.includes('appearance-studio-shell'));
assert(manager.includes('Layout & Density'));
assert(manager.includes('Typography'));
assert(manager.includes('Images'));
assert(manager.includes('Selection & Results'));
assert(manager.includes('Background & Overlay'));
assert(manager.includes('Scoreboard & Confidence'));
assert(manager.includes('appearanceThemeRowHeight'));
assert(manager.includes('appearanceThemeImageSize'));
assert(manager.includes('appearanceThemeSelectedTintOpacity'));
assert(manager.includes('appearanceThemeGradientAngle'));
assert(manager.includes('appearanceThemeConfidenceStyle'));
assert(manager.includes('adminAppearanceReadThemeControls_'));

// Preview is interactive and covers the four critical Confidence states.
['pregame', 'live', 'final-win', 'final-loss'].forEach(state => {
  assert(manager.includes(`data-preview-state="${state}"`), `Missing preview state ${state}`);
});
assert(manager.includes('adminAppearanceSetPreviewState_'));
assert(manager.includes('adminAppearancePreviewEntities_'));
assert(manager.includes('Live preview uses the first two entities'));

// Theme actions support the edit workflow without changing gameplay logic.
assert(manager.includes('adminAppearanceDuplicateTheme_'));
assert(manager.includes('adminAppearanceSaveThemeAsNew_'));
assert(manager.includes('adminAppearanceApplyThemeToGame_'));
assert(manager.includes('adminAppearanceResetTheme_'));
assert(manager.includes('Theme changes affect appearance only. Picks, scoring, schedules and Image Packs are untouched.'));

// Confidence runtime consumes the numeric studio controls via CSS variables.
[
  '--confidence-row-height:',
  '--confidence-row-padding:',
  '--confidence-team-gap:',
  '--confidence-value-width:',
  '--confidence-city-size:',
  '--confidence-name-size:',
  '--confidence-image-size:',
  '--confidence-selected-bg:',
  '--confidence-unselected-gray:',
  '--confidence-result-width:',
  '--confidence-gradient:',
  '--confidence-value-radius:'
].forEach(token => assert(picks.includes(token), `Missing runtime theme variable ${token}`));
assert(picks.includes('confidence-theme-image-shape-'));
assert(picks.includes('confidence-theme-background-'));
assert(picks.includes('confidence-theme-confidence-'));
assert(picks.includes('confidence-theme-live-badge-'));

// CSS maps the studio variables onto the compact weekly card.
assert(appearanceCss.includes('v1.2.17k — Appearance Studio Core'));
assert(appearanceCss.includes('.appearance-studio-preview-tabs'));
assert(appearanceCss.includes('.appearance-studio-preview-state-final-loss'));
assert(picksCss.includes('v1.2.17k — Appearance Studio runtime controls'));
assert(picksCss.includes('grid-template-columns:minmax(0,1fr) var(--confidence-versus-width) minmax(0,1fr) var(--confidence-value-width)'));
assert(picksCss.includes('filter:grayscale(var(--confidence-unselected-gray))'));
assert(picksCss.includes('.confidence-theme-confidence-outline'));

// Force iPhone/PWA and route module cache refresh for the new studio assets.
assert(app.includes('v1217k-appearance-studio'));
assert(pwa.includes('v1217k-appearance-studio'));
assert(sw.includes('v1217k-appearance-studio'));
assert(html.includes('picks.css?v=v1217k-appearance-studio'));

console.log('PASS: Appearance Studio Core v1.2.17k');
