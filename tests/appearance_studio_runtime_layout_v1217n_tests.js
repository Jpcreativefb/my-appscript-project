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

// Full Button is deterministic: full-bleed always resolves to the background layer.
assert(manager.includes('layer: images.fit === "full-bleed" ? "background"'));
assert(manager.includes('String(adminAppearanceStudioValue_("appearanceThemeImageFit", "contain")) === "full-bleed" ? "background"'));
assert(picks.includes('const imageLayer = imageFit === "full-bleed"'));
assert(appearanceCss.includes('inset:-1px !important;'));
assert(picksCss.includes('inset:-1px !important;'));
assert(picksCss.includes('max-width:none !important;'));
assert(picksCss.includes('object-fit:cover !important;'));

// Home/Away positioning is truly independent from shared positioning.
[
  'appearanceThemeAwayTextVertical', 'appearanceThemeHomeTextVertical',
  'appearanceThemeAwayTextX', 'appearanceThemeAwayTextY',
  'appearanceThemeHomeTextX', 'appearanceThemeHomeTextY',
  'appearanceThemeAwayImageY', 'appearanceThemeHomeImageY'
].forEach(token => assert(manager.includes(token), `Missing side control ${token}`));
assert(picks.includes('confidence-theme-away-vertical-'));
assert(picks.includes('confidence-theme-home-vertical-'));
assert(picks.includes('--confidence-away-text-x:'));
assert(picks.includes('--confidence-home-text-x:'));
assert(picksCss.includes('transform:translate(var(--confidence-away-text-x),var(--confidence-away-text-y)) !important;'));
assert(picksCss.includes('transform:translate(var(--confidence-home-text-x),var(--confidence-home-text-y)) !important;'));
assert(picksCss.includes('object-position:var(--confidence-away-image-x) var(--confidence-away-image-y) !important;'));
assert(picksCss.includes('object-position:var(--confidence-home-image-x) var(--confidence-home-image-y) !important;'));

// Preview remains visible while the control rail/page scrolls on desktop.
assert(appearanceCss.includes('position:sticky !important;'));
assert(appearanceCss.includes('max-height:calc(100vh - 16px);'));
assert(appearanceCss.includes('overscroll-behavior:contain;'));

// iPhone confidence selector removes native arrows and uses a controllable arrow.
assert(manager.includes('appearanceThemeMobileArrowSize'));
assert(manager.includes('appearanceThemeMobileArrowColor'));
assert(picks.includes('--confidence-mobile-arrow-size:'));
assert(picks.includes('--confidence-mobile-arrow-color:'));
assert(picksCss.includes('-webkit-appearance:none !important;'));
assert(picksCss.includes('text-align-last:center !important;'));
assert(picksCss.includes('border-top:calc(var(--confidence-mobile-arrow-size) * .8) solid var(--confidence-mobile-arrow-color);'));
assert(picksCss.includes('.confidence-game-row[data-locked="true"] .confidence-row-value::after'));

// Force a frontend/PWA cache rollover.
assert(app.includes('v1217n-layout-repair'));
assert(pwa.includes('v1217n-layout-repair'));
assert(sw.includes('v1217n-layout-repair'));
assert(html.includes('v1217n-layout-repair'));

console.log('PASS: Appearance Studio runtime layout repair v1.2.17n');
