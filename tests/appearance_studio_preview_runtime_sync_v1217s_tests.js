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

assert(shared.includes('Shared Appearance Theme Runtime'));
assert(shared.includes('confidencePresentation'));
assert(shared.includes('pagePresentation'));
assert(picks.includes('window.AppearanceThemeRuntime.confidencePresentation(theme)'));
assert(picks.includes('window.AppearanceThemeRuntime.pagePresentation(theme)'));
assert(manager.includes('appearanceRuntimeMatchupPreview'));
assert(manager.includes('appearancePagePreviewShell'));
assert(manager.includes('window.AppearanceThemeRuntime.confidencePresentation(theme)'));
assert(manager.includes('window.AppearanceThemeRuntime.pagePresentation(theme)'));
['matchup','text','compact','image','list','short-answer','wager'].forEach(surface => {
  assert(manager.includes(`data-preview-surface="${surface}"`), `missing ${surface} preview tab`);
});
['text','compact','image','list','short-answer','wager'].forEach(surface => {
  assert(manager.includes(`questionCard('${surface}'`), `missing ${surface} preview surface`);
});
assert(manager.includes('data-question-preview="matchup"'), 'missing matchup preview surface');
assert(manager.includes('event.target.id === "appearanceThemeQuestionDefault"'));
assert(css.includes('Studio preview uses the same page/card markup and theme CSS as runtime'));
assert(css.includes('[data-preview-surface="short-answer"]'));
assert(picksCss.includes('picks-theme-image-text-overlay'));
assert(picks.includes('page.classList.toggle("picks-theme-image-text-overlay"'));
assert(html.includes('appearanceThemeRuntime.js?v=v1217s-preview-runtime-sync'));
assert(sw.includes('./js/appearanceThemeRuntime.js'));
assert(sw.includes('v1217s-preview-runtime-sync'));
console.log('PASS appearance_studio_preview_runtime_sync_v1217s_tests');
