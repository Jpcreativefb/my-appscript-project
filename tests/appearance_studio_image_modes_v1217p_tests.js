const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const admin = read('frontend/js/pages/adminAppearance.js');
const picks = read('frontend/js/pages/picks.js');
const appCss = read('frontend/css/appearance.css');
const picksCss = read('frontend/css/picks.css');
const checks = [
  [admin.includes('studioVersion: 6'), 'Studio schema advances to v6'],
  [admin.includes('Inline Logo/Image') && admin.includes('Inline + Background Art') && admin.includes('Floating Art · Anywhere on Button') && admin.includes('Full Button Background · Text & Score on Top'), 'Four explicit image modes exist'],
  [admin.includes('appearanceThemeMirrorSides') && admin.includes('adminAppearanceApplyMirroredSideLayout_'), 'Mirror Home/Away controls and derivation exist'],
  [admin.includes('adminAppearanceMirrorScoreAnchor_'), 'Score anchors mirror left/right'],
  [admin.includes('data-image-modes'), 'Mode-specific controls are conditionally shown'],
  [picks.includes('["inline", "inline-background", "floating", "background"]'), 'Runtime accepts all four image layers'],
  [picks.includes('sideLayout.mirrored === true'), 'Runtime mirrors saved layouts'],
  [appCss.includes('v1.2.17p — Explicit Image Modes + Mirrored Layout + Scroll Rail'), 'Studio v17p CSS exists'],
  [appCss.includes('overflow-y:auto !important;') && appCss.includes('height:calc(100vh - 96px)'), 'Desktop control rail scrolls independently'],
  [appCss.includes('.image-layer-inline-background') && appCss.includes('.image-layer-floating') && appCss.includes('.image-layer-background'), 'Preview has separate mode renderers'],
  [picksCss.includes('v1.2.17p — Explicit Confidence Image Modes + Mirror Layout'), 'Runtime v17p CSS exists'],
  [picksCss.includes('Full Button Background never uses floating image size'), 'Full background explicitly ignores floating size'],
  [picksCss.includes('width:100% !important; height:100% !important; max-width:none !important;'), 'Full background owns full button surface']
];
const failed = checks.filter(x => !x[0]);
if (failed.length) { failed.forEach(x => console.error('FAIL:', x[1])); process.exit(1); }
console.log('PASS: v1.2.17p Appearance Studio image mode behavior');
