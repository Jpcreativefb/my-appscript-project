#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function need(ok,msg){ if(!ok){ console.error('FAIL:',msg); process.exit(1); } }
const picks = read('frontend/js/pages/picks.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const html = read('frontend/app.html');
const sw = read('frontend/sw.js');
const pwa = read('frontend/js/pwa.js');
need(picks.includes('function refreshConfidenceAppearanceUi_()'), 'Confidence appearance-only redraw helper missing');
need((picks.match(/refreshConfidenceAppearanceUi_\(\);/g)||[]).length >= 2, 'Deferred and cached appearance paths must redraw Confidence slate');
need(picks.includes('list.innerHTML = renderCompactConfidenceSlate_();'), 'Confidence redraw must target compact slate only');
need(!picks.includes('Loading game style'), 'Blocking game-style text returned');
need(app === appMirror, 'frontend app.js mirrors diverged');
need(app.includes('v1218x2c-confidence-appearance'), 'lazy route cache marker missing');
need(html.includes('v1218x2-no-style-block-v1218x2c-confidence-appearance'), 'picks.css cache bust missing');
need(html.includes('v1218x2-batched-picks-v1218x2c-confidence-appearance'), 'api.js cache bust missing');
need(html.includes('v1218x2-fast-nav-batch-picks-v1218x2c-confidence-appearance'), 'app.js cache bust missing');
need(html.includes('v1218x2c-confidence-appearance&brand='), 'PWA script cache bust missing');
need(sw.includes('v1218x2c-confidence-appearance'), 'service worker cache marker missing');
need(pwa.includes('v1218x2c-confidence-appearance'), 'PWA registration version marker missing');
console.log('confidence-appearance-pwa-refresh-v1218x2c-tests: PASS');
