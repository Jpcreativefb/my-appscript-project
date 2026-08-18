const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const admin = read('frontend/js/pages/adminAppearance.js');
const picks = read('frontend/js/pages/picks.js');
const appCss = read('frontend/css/appearance.css');
const picksCss = read('frontend/css/picks.css');
const appHtml = read('frontend/app.html');
const checks = [
  [admin.includes('<summary>Score Styling</summary>'), 'Score Styling panel exists'],
  [admin.includes('appearanceThemeScoreBg') && admin.includes('appearanceThemeScoreBgOpacity'), 'Score background controls exist'],
  [admin.includes('appearanceThemeScoreText'), 'Score font color control exists'],
  [admin.includes('appearanceThemeScoreBorder') && admin.includes('appearanceThemeScoreBorderOpacity'), 'Score border controls exist'],
  [admin.includes('appearanceThemeScorePaddingX') && admin.includes('appearanceThemeScorePaddingY') && admin.includes('appearanceThemeScoreRadius'), 'Score shape controls exist'],
  [admin.includes('score: {') && admin.includes('--ap-score-bg'), 'Preview score theme is stored and exposed'],
  [picks.includes('const score = theme.score || {}') && picks.includes('--confidence-score-bg:'), 'Runtime consumes score styling'],
  [appCss.includes('v1.2.17q — Independent Score Badge Styling') && appCss.includes('background:var(--ap-score-bg)'), 'Studio preview renders score styling'],
  [picksCss.includes('v1.2.17q — Independent Score Badge Styling') && picksCss.includes('background:var(--confidence-score-bg)'), 'Confidence runtime renders score styling'],
  [picksCss.includes('color:var(--confidence-correct-score)') && picksCss.includes('color:var(--confidence-wrong-score)'), 'Final result score font colors still override normal score color'],
  [appHtml.includes('v1217q-score-style'), 'Frontend cache is bumped']
];
const failed = checks.filter(x => !x[0]);
if (failed.length) { failed.forEach(x => console.error('FAIL:', x[1])); process.exit(1); }
console.log('PASS: v1.2.17q Appearance Studio score styling');
