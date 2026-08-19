const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const admin = read('frontend/js/pages/adminAppearance.js');
const picks = read('frontend/js/pages/picks.js');
const appCss = read('frontend/css/appearance.css');
const picksCss = read('frontend/css/picks.css');

const checks = [
  [admin.includes('studioVersion: 6'), 'Studio theme schema advances to v6 while preserving the v17o canvas'],
  [admin.includes('Floating Art · Anywhere on Button'), 'Image canvas exposes floating full-button positioning'],
  [admin.includes('Full Button Background · Text & Score on Top'), 'Image canvas exposes full background mode'],
  [admin.includes('Inline Left') && admin.includes('Inline Right') && admin.includes('Center'), 'Score anchors include inline/center positions'],
  [admin.includes('appearanceThemeScoreboardBg') && admin.includes('appearanceThemeScoreboardHeight'), 'Scoreboard styling controls exist'],
  [admin.includes('confidence-team-text'), 'Preview city/name use the runtime movable text layer'],
  [picks.includes('confidence-team-text'), 'Runtime city/name use one movable text layer'],
  [picks.includes('scoreOffsetX') && picks.includes('scoreOffsetY'), 'Runtime accepts independent score offsets'],
  [picks.includes('theme.scoreboard || {}'), 'Runtime consumes scoreboard theme settings'],
  [picksCss.includes('v1.2.17o — Team Button Canvas Architecture'), 'Runtime canvas architecture CSS exists'],
  [picksCss.includes('width:100% !important;\n  height:100% !important;\n  object-position:var(--confidence-image-x)'), 'Background image fills whole team button'],
  [appCss.includes('v1.2.17o — Studio Canvas Architecture Repair'), 'Preview canvas architecture CSS exists'],
  [appCss.includes('position:sticky !important;') && appCss.includes('overflow:visible !important;'), 'Preview sticky behavior avoids nested vertical scroll'],
  [appCss.includes('--ap-scoreboard-bg') && picksCss.includes('--confidence-scoreboard-bg'), 'Preview/runtime scoreboard variables exist']
];
const failed = checks.filter(x => !x[0]);
if (failed.length) {
  failed.forEach(x => console.error('FAIL:', x[1]));
  process.exit(1);
}
console.log('PASS: v1.2.17o Appearance Studio team canvas behavior');
