const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const manager = read('frontend/js/pages/adminAppearance.js');
const picks = read('frontend/js/pages/picks.js');
const shared = read('frontend/js/appearanceThemeRuntime.js');
const css = read('frontend/css/appearance.css');
const picksCss = read('frontend/css/picks.css');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');

// Visibility matrix can reach Mobile column instead of being clipped by the control rail.
assert(css.includes('.appearance-studio-visibility-panel{overflow-x:auto'));
assert(css.includes('.appearance-visibility-matrix{min-width:360px'));

// Page/header/bar and question gradients.
['appearanceThemePageBgMode','appearanceThemeHeaderBgMode','appearanceThemeSortBgMode','appearanceThemeSaveBgMode',
 'appearanceThemeQuestionCardMode','appearanceThemeQuestionHeaderMode','appearanceThemeAnswerMode','appearanceThemeAnswerSelectedMode']
 .forEach(id => assert(manager.includes(id), `missing ${id}`));
assert(shared.includes('picks-theme-page-bg-'));
assert(shared.includes('--picks-theme-question-gradient:linear-gradient'));
assert(picksCss.includes('.picks-theme-question-bg-gradient'));

// Image questions now have positioning/zoom and a configurable overlay layer.
['appearanceThemeQuestionImageZoom','appearanceThemeQuestionImageX','appearanceThemeQuestionImageY','appearanceThemeQuestionImageOpacity',
 'appearanceThemeQuestionImageOverlayMode','appearanceThemeQuestionImageOverlayColor','appearanceThemeQuestionImageOverlayPlacement']
 .forEach(id => assert(manager.includes(id), `missing ${id}`));
assert(shared.includes('--picks-theme-image-zoom:'));
assert(picksCss.includes('object-position:var(--picks-theme-image-x'));

// Team text readability overlay lives between full-button artwork and team lettering.
assert(manager.includes('Team Text Readability Overlay'));
assert(manager.includes('appearanceThemeTextBackdropEnabled'));
assert(shared.includes('confidence-theme-text-backdrop'));
assert(picksCss.includes('.confidence-theme-text-backdrop .confidence-team-text'));

// Winner overlays / decorations apply to matchup and regular question winners.
assert(manager.includes('Winner Overlay / Decoration'));
['trophy','crown','medal','star','check'].forEach(item => assert(manager.includes(`["${item}"`)));
assert(picks.includes('confidence-winner-decoration'));
assert(picksCss.includes('confidence-theme-winner-decoration-trophy'));
assert(picksCss.includes('.pick-category-card.correct .nominee-choice.selected::after'));

// Confidence width is serialized through the shared runtime and mobile no longer hard-caps it to 64/76px.
assert(shared.includes('"--confidence-value-width:" + confidenceWidth + "px"'));
assert(picksCss.includes('minmax(44px,var(--confidence-value-width))!important'));

// Save/apply controls provide visible confirmation.
assert(manager.includes('appearanceThemeSaveButton'));
assert(manager.includes('Saved ✓'));
assert(manager.includes('Applied ✓'));
assert(manager.includes('adminAppearanceSetThemeActionState_'));

// Presets and no base-game flash while appearance resolves.
['basic','simple','advanced','mobile'].forEach(preset => assert(manager.includes(`adminAppearanceApplyPreset_('${preset}')`)));
assert(picks.includes('picks-appearance-loading'));
assert(picksCss.includes('Loading game style…'));

// All page theme classes from the shared serializer are applied to the live page, not only image overlay.
assert(picks.includes('if (name.indexOf("picks-theme-") === 0) page.classList.remove(name)'));
assert(picks.includes('page.classList.add(name)'));

assert(html.includes('v1217t-studio-refinement'));
assert(sw.includes('v1217t-studio-refinement'));
console.log('PASS appearance_studio_refinement_v1217t_tests');
