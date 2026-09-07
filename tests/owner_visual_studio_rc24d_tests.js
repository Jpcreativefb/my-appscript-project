'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const studio=fs.readFileSync(path.join(root,'frontend/js/ownerVisualStudio.js'),'utf8');
const app=fs.readFileSync(path.join(root,'frontend/app.html'),'utf8');
const index=fs.readFileSync(path.join(root,'frontend/index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'frontend/sw.js'),'utf8');
const adminGames=fs.readFileSync(path.join(root,'frontend/js/pages/adminGames.js'),'utf8');

// Shared release boundary and shell loading.
assert(app.includes('v1219rc24d-launch-cleanup-visual-studio-r1'));
assert(index.includes('v1219rc24d-launch-cleanup-visual-studio-r1'));
assert(app.includes('./js/ownerVisualStudio.js?release=v1219rc24d-launch-cleanup-visual-studio-r1'));
assert(sw.includes('"./js/ownerVisualStudio.js"'));
assert(sw.includes('v1219rc24d-launch-cleanup-visual-studio-r1'));

// Cross-Mac persistence deliberately reuses the existing AppearanceOverrides API.
assert(studio.includes('visual-studio-draft'));
assert(studio.includes('visual-studio-published'));
assert(studio.includes('visual-studio-version'));
assert(studio.includes('apiAdminSaveAppearanceOverride'));
assert(studio.includes('apiGetGameAppearance'));

// Required first usable milestone controls.
[
  'Pick on Page','Element','Section','Whole Page','New Section','1 Column','2 Columns','3 Columns',
  'Move into section','Remove / Hide','Apply to Similar','Universal Buttons',
  'Universal Headers','Universal Sections','Preview Open','Preview Closed',
  'Demo Values','Save Element','Save Section','Save Page Draft','Publish Page',
  'Last Saved','Original Preview'
].forEach(text=>assert(studio.includes(text), 'missing Visual Studio feature: '+text));

// Chrome DevTools must not be mistaken for a coarse-pointer phone.
assert(studio.includes('@media(max-width:700px) and (hover:none) and (pointer:coarse)'));

// Manage Games cleanup workflow is visible but does not auto-delete.
assert(adminGames.includes('Game List Cleanup'));
assert(adminGames.includes('Cleanup Candidates'));
assert(adminGames.includes('adminGamesIsCleanupCandidate_'));
assert(adminGames.includes('Danger Zone · Permanent Game Purge'));

// Visual Studio must remain appearance/layout-only.
['adminPermanentGamePurge','adminSavePick','savePick','submitBet','settle'].forEach(forbidden=>{
  assert(!studio.includes(forbidden), 'Visual Studio must not call gameplay/destructive API: '+forbidden);
});

console.log('RC24D Owner Visual Studio + cleanup foundation tests: PASS');
