const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const manager = read('frontend/js/pages/adminAppearance.js');
const shared = read('frontend/js/appearanceThemeRuntime.js');
const css = read('frontend/css/appearance.css');
const picksCss = read('frontend/css/picks.css');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

// Device visibility has a dedicated bottom horizontal scroller and room for all columns.
assert(manager.includes('appearance-visibility-scroll'));
assert(css.includes('.appearance-visibility-scroll{display:block'));
assert(css.includes('overflow-x:scroll!important'));
assert(css.includes('.appearance-visibility-matrix{min-width:520px!important'));

// Confidence width is contained in both Studio and live runtime cards.
assert(css.includes('minmax(44px,min(var(--ap-confidence-width),28%))'));
assert(picksCss.includes('minmax(44px,min(var(--confidence-value-width),28%))'));
assert(picksCss.includes('.confidence-row-value{width:100%!important'));

// Main Image X/Y is a base position; side controls become relative adjustments.
assert(shared.includes('imageX + (awayImageXRaw - 50)'));
assert(shared.includes('imageY + (homeImageYRaw - 50)'));
assert(manager.includes('theme.images.x + (theme.sideLayout.away.imageX - 50)'));

// Correct / incorrect overlays support gradient, second colors, independent opacities and angle.
['appearanceThemeCorrectOverlayMode','appearanceThemeCorrectOverlayColor2','appearanceThemeCorrectOverlayOpacity2','appearanceThemeCorrectOverlayAngle',
 'appearanceThemeIncorrectOverlayMode','appearanceThemeIncorrectOverlayColor2','appearanceThemeIncorrectOverlayOpacity2','appearanceThemeIncorrectOverlayAngle']
 .forEach(id => assert(manager.includes(id), `missing ${id}`));
assert(shared.includes('overlays.correctMode'));
assert(shared.includes('overlays.correctOpacity2'));
assert(shared.includes('overlays.incorrectMode'));
assert(shared.includes('linear-gradient('));

// Image question gradient has independent opacity stops.
assert(manager.includes('appearanceThemeQuestionImageOverlay2'));
assert(manager.includes('imageOverlayOpacity2'));
assert(shared.includes('--picks-theme-image-overlay2:'));
assert(shared.includes('q.imageOverlayOpacity2'));

// Cache/version bump ensures the repaired Studio reaches browsers/PWA.
assert(html.includes('v1217v-studio-control-fixes'));
assert(sw.includes('v1217v-studio-control-fixes'));
console.log('PASS appearance_studio_control_fixes_v1217v_tests');
