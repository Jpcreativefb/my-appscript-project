'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(root, 'backend/engines/AppearanceEngine.js'), 'utf8');
const adminSource = fs.readFileSync(path.join(root, 'frontend/js/pages/adminAppearance.js'), 'utf8');
const picksSource = fs.readFileSync(path.join(root, 'frontend/js/pages/picks.js'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'frontend/js/appearanceThemeRuntime.js'), 'utf8');

class FakeRange {
  constructor(sheet, row, col, numRows, numCols) {
    this.sheet = sheet; this.row = row; this.col = col; this.numRows = numRows; this.numCols = numCols;
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) row.push((this.sheet.rows[this.row - 1 + r] || [])[this.col - 1 + c] ?? '');
      out.push(row);
    }
    return out;
  }
  setValues(values) {
    for (let r = 0; r < this.numRows; r++) {
      while (this.sheet.rows.length < this.row - 1 + r + 1) this.sheet.rows.push(new Array(this.sheet.getLastColumn()).fill(''));
      const target = this.sheet.rows[this.row - 1 + r];
      while (target.length < this.sheet.getLastColumn()) target.push('');
      for (let c = 0; c < this.numCols; c++) target[this.col - 1 + c] = values[r][c];
    }
    return this;
  }
}

class FakeSheet {
  constructor(headers, data) { this.rows = [headers.slice()].concat((data || []).map(r => r.slice())); }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.rows[0] ? this.rows[0].length : 0; }
  getRange(row, col, numRows, numCols) { return new FakeRange(this, row, col, numRows, numCols); }
  getDataRange() { return new FakeRange(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  appendRow(row) { this.rows.push(row.slice()); return this; }
}

class FakeSpreadsheet {
  constructor(sheets) { this.sheets = sheets; }
  getSheetByName(name) { return this.sheets[name] || null; }
}

const headers = {
  AppearanceImagePacks: ['PackId','PackName','ScopeType','ScopeValue','Description','Active','IsDefault','CreatedAt','UpdatedAt'],
  AppearanceImagePackItems: ['PackId','EntityType','EntityId','EntityName','Variant','ImageUrl','ImageFileId','SourceType','SourceUrl','AltText','Active','UpdatedAt'],
  AppearanceThemePacks: ['ThemePackId','ThemeName','Description','BaseThemeId','ThemeJSON','Active','IsDefault','CreatedAt','UpdatedAt'],
  GameAppearance: ['GameId','ImagePackId','ThemePackId','ImageMode','ThemeMode','ThemeOverrideJSON','Active','UpdatedAt'],
  AppearanceOverrides: ['GameId','EntityType','EntityId','ImageUrl','ImageFileId','SourceType','SourceUrl','ThemeOverrideJSON','Active','UpdatedAt'],
  AppearanceHubSettings: ['SettingKey','HubCategory','HubGroup','DisplayName','Color','ColorMode','GradientStart','GradientEnd','GradientAngle','ImageUrl','ImageFileId','ImageSourceType','ImageSourceUrl','ImageOpacity','ImageDarken','PanelTint','IconText','IconUrl','IconFileId','IconSourceType','IconSourceUrl','ShowNavLabel','ShowNavIcon','Active','UpdatedAt']
};

const sheets = {};
Object.keys(headers).forEach(name => { sheets[name] = new FakeSheet(headers[name]); });
const ss = new FakeSpreadsheet(sheets);
let flushCount = 0;
const backend = {
  console,
  SpreadsheetApp: { flush() { flushCount += 1; } },
  Utilities: { sleep() {} }
};
vm.createContext(backend);
vm.runInContext(engineSource, backend);
backend.appearanceSetupSystem = () => ({ success: true, setupComplete: true });
backend.appearanceSpreadsheet_ = () => ss;

// Seed only the rows required by the runtime bundle. No production workbook is touched.
sheets.AppearanceImagePacks.appendRow(['img-emmy-fixture','Emmy Fixture','staked-prediction','','',true,false,'','']);
sheets.AppearanceThemePacks.appendRow(['app-default','App Default','','','{}',true,true,'','']);
sheets.AppearanceThemePacks.appendRow(['theme-emmy-fixture','Emmy Fixture Theme','','app-default',JSON.stringify({questions:{cardBackground:'#123456'}}),true,false,'','']);
sheets.GameAppearance.appendRow(['fixture-game-a','img-emmy-fixture','theme-emmy-fixture','pack','pack','{}',true,'']);
sheets.GameAppearance.appendRow(['fixture-game-b','','app-default','default','pack','{}',true,'']);

const savedItem = backend.adminSaveAppearanceImagePackItem({
  packId: 'img-emmy-fixture',
  entityType: 'nominee',
  entityId: 'the-pitt',
  entityName: 'The Pitt',
  variant: 'default',
  imageUrl: 'https://example.test/the-pitt-pack.png',
  sourceType: 'external-url',
  sourceUrl: 'https://example.test/the-pitt-pack.png',
  active: true
});

assert.strictEqual(savedItem.success, true);
assert.strictEqual(savedItem.item.PackId, 'img-emmy-fixture');
assert.strictEqual(savedItem.item.EntityType, 'nominee');
assert.strictEqual(savedItem.item.EntityId, 'the-pitt');
assert.strictEqual(savedItem.item.Variant, 'default');
assert.strictEqual(savedItem.item.ImageUrl, 'https://example.test/the-pitt-pack.png');
assert(flushCount >= 1, 'pack-item write must flush before exact-key read-back');

const bundleA = backend.appearanceGetRuntimeBundle('fixture-game-a');
assert.strictEqual(bundleA.imagePackId, 'img-emmy-fixture');
assert.strictEqual(bundleA.imagePackItems.length, 1, 'assigned game runtime bundle must contain persisted pack item');
assert.strictEqual(bundleA.imagePackItems[0].EntityId, 'the-pitt');
let resolvedA = backend.appearanceResolveImage('fixture-game-a', 'nominee', 'the-pitt', 'https://example.test/default.png', 'default');
assert.strictEqual(resolvedA.source, 'image-pack');
assert.strictEqual(resolvedA.imageUrl, 'https://example.test/the-pitt-pack.png');

// Game-only override wins for Game A only.
sheets.AppearanceOverrides.appendRow(['fixture-game-a','nominee','the-pitt','https://example.test/the-pitt-override.png','','external-url','','{}',true,'']);
resolvedA = backend.appearanceResolveImage('fixture-game-a', 'nominee', 'the-pitt', 'https://example.test/default.png', 'default');
assert.strictEqual(resolvedA.source, 'override');
assert.strictEqual(resolvedA.imageUrl, 'https://example.test/the-pitt-override.png');
const resolvedB = backend.appearanceResolveImage('fixture-game-b', 'nominee', 'the-pitt', 'https://example.test/default.png', 'default');
assert.strictEqual(resolvedB.source, 'default', 'game-only override must not leak to another GameId');
assert.strictEqual(resolvedB.imageUrl, 'https://example.test/default.png');

// Assignment Apply returns the exact persisted IDs/modes that the frontend verifies.
const assignmentResult = backend.adminSaveGameAppearance({
  gameId: 'fixture-game-a',
  imagePackId: 'img-emmy-fixture',
  themePackId: 'theme-emmy-fixture',
  imageMode: 'pack',
  themeMode: 'pack',
  themeOverride: {},
  active: true
});
assert.strictEqual(assignmentResult.assignment.GameId, 'fixture-game-a');
assert.strictEqual(assignmentResult.assignment.ImagePackId, 'img-emmy-fixture');
assert.strictEqual(assignmentResult.assignment.ThemePackId, 'theme-emmy-fixture');
assert.strictEqual(assignmentResult.assignment.ImageMode, 'pack');
assert.strictEqual(assignmentResult.assignment.ThemeMode, 'pack');

// Player Staked/Picks cards now consume the same Appearance image precedence helper.
assert(picksSource.includes('confidenceAppearanceResolvedImage_(category, nominee).imageUrl || nominee.image || ""'));
assert(picksSource.includes('const resolvedAppearanceImage = confidenceAppearanceResolvedImage_(category, nominee).imageUrl || nominee.image || "";'));

// Selected-question Studio preview must resolve the same artwork as live Picks/Staked.
const parityBaseContext = () => ({
  console,
  localStorage: { setItem() {}, getItem() { return ''; } },
  sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  window: {},
  document: { getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; } },
  setTimeout, clearTimeout, setInterval() { return 1; }, clearInterval() {}, Promise, Date,
  location: { hash:'' }
});
const adminParity = parityBaseContext(); adminParity.window = adminParity; adminParity.window.location = adminParity.location;
vm.createContext(adminParity); vm.runInContext(adminSource, adminParity);
const picksParity = parityBaseContext(); picksParity.window = picksParity; picksParity.window.location = picksParity.location;
vm.createContext(picksParity); vm.runInContext(picksSource, picksParity);
function parityImages(overrides, items, selectedPack) {
  const dashboard = { overrides:overrides || [], imagePackItems:items || [] };
  const category = { id:'q1', nominees:[{ id:'the-pitt', name:'The Pitt', image:'https://example.test/original.png' }] };
  const studio = vm.runInContext(`(function(){
    ADMIN_APPEARANCE_STATE.selectedGameId='fixture-game-a';
    ADMIN_APPEARANCE_STATE.selectedImagePackId=${JSON.stringify(selectedPack || '')};
    ADMIN_APPEARANCE_STATE.dashboard=${JSON.stringify(dashboard)};
    ADMIN_APPEARANCE_STATE.gameSetup={game:{gameId:'fixture-game-a'},categories:[${JSON.stringify(category)}]};
    return adminAppearancePreviewNominees_(ADMIN_APPEARANCE_STATE.gameSetup.categories[0])[0].image;
  })()`, adminParity);
  const liveBundle = { assignment:{ImagePackId:selectedPack || '',ImageMode:selectedPack ? 'pack':'default'}, imagePackId:selectedPack || '', imagePackItems:items || [], overrides:overrides || [] };
  const live = vm.runInContext(`(function(){
    PICKS_PAGE_DATA.gameId='fixture-game-a'; PICKS_PAGE_DATA.appearance=${JSON.stringify(liveBundle)};
    return confidenceAppearanceResolvedImage_(${JSON.stringify(category)}, ${JSON.stringify(category.nominees[0])}).imageUrl;
  })()`, picksParity);
  return {studio,live};
}
let parity = parityImages([], [], '');
assert.strictEqual(parity.studio, 'https://example.test/original.png');
assert.strictEqual(parity.studio, parity.live, 'original-only artwork must match Studio/live');
const packItem = {PackId:'img-emmy-fixture',EntityType:'nominee',EntityId:'the-pitt',EntityName:'The Pitt',Variant:'default',ImageUrl:'https://example.test/pack.png',Active:true};
parity = parityImages([], [packItem], 'img-emmy-fixture');
assert.strictEqual(parity.studio, 'https://example.test/pack.png');
assert.strictEqual(parity.studio, parity.live, 'Image Pack artwork must match Studio/live');
const gameOverride = {GameId:'fixture-game-a',EntityType:'nominee',EntityId:'the-pitt',ImageUrl:'https://example.test/override.png',Active:true};
parity = parityImages([gameOverride], [packItem], 'img-emmy-fixture');
assert.strictEqual(parity.studio, 'https://example.test/override.png');
assert.strictEqual(parity.studio, parity.live, 'game-only override must win over pack in Studio/live');

// Studio question preview is no longer the Film Alpha/Bravo fixture and is driven by selected-game categories/nominees.
assert(!adminSource.includes('Film Alpha'));
assert(!adminSource.includes('Film Bravo'));
assert(adminSource.includes('function adminAppearancePreviewQuestion_()'));
assert(adminSource.includes('function adminAppearancePreviewNominees_(category)'));
assert(adminSource.includes('Real game question'));
assert(adminSource.includes('adminAppearanceQuestionLayoutRows_()'));

// Studio and live runtime continue to share the canonical theme serializer, not a second style system.
assert(runtimeSource.includes('Canonical theme -> CSS/class serialization used by both Appearance Studio preview'));
assert(adminSource.includes('AppearanceThemeRuntime.confidencePresentation'));
assert(adminSource.includes('AppearanceThemeRuntime.pagePresentation'));
assert(picksSource.includes('AppearanceThemeRuntime.confidencePresentation'));
assert(picksSource.includes('AppearanceThemeRuntime.pagePresentation'));

// Manager explicitly explains when a game-only override masks the selected pack.
assert(adminSource.includes('This Game Only is currently winning for this item.'));
assert(adminSource.includes('adminAppearanceVerifyPackItemResult_'));
assert(adminSource.includes('ImageMode", expectedImagePackId ? "pack" : "default"'));
assert(adminSource.includes('ThemeMode", "pack"'));

// Selected-game async race: a slow Game A response must not overwrite faster Game B.
const adminContext = {
  console,
  localStorage: { setItem() {}, getItem() { return ''; } },
  sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  window: {},
  document: { getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; } },
  setTimeout,
  clearTimeout,
  Promise
};
adminContext.window = adminContext;
vm.createContext(adminContext);
const racePromise = vm.runInContext(adminSource + `\n(async function(){\n  let releaseA;\n  const slowA = new Promise(function(resolve){ releaseA = resolve; });\n  apiAdminGetGameSetup = function(id){\n    if (id === 'game-a') return slowA;\n    return Promise.resolve({success:true, game:{gameId:id,name:'Game B'}, categories:[{id:'q-b',title:'Question B',nominees:[{id:'n-b',name:'Nominee B'}]}]});\n  };\n  apiAdminGetAppearanceDashboard = function(id){\n    return Promise.resolve({success:true,imagePacks:[],imagePackItems:[],themePacks:[],gameAppearance:{GameId:id},overrides:[]});\n  };\n  const a = adminAppearanceLoadGame_('game-a');\n  const b = adminAppearanceLoadGame_('game-b');\n  const bResult = await b;\n  releaseA({success:true, game:{gameId:'game-a',name:'Game A'}, categories:[{id:'q-a',title:'Question A'}]});\n  const aResult = await a;\n  return {selectedGameId:ADMIN_APPEARANCE_STATE.selectedGameId, setupGameId:String(ADMIN_APPEARANCE_STATE.gameSetup.game.gameId), bResult:bResult, aResult:aResult};\n})()` , adminContext);

Promise.resolve(racePromise).then(result => {
  assert.strictEqual(result.bResult, true);
  assert.strictEqual(result.aResult, false);
  assert.strictEqual(result.selectedGameId, 'game-b');
  assert.strictEqual(result.setupGameId, 'game-b');
  console.log('ED Appearance launch-blocker tests: PASS');
}).catch(err => {
  console.error(err);
  process.exitCode = 1;
});
