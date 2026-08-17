'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(
  path.join(root, 'backend', 'engines', 'AppearanceEngine.js'),
  'utf8'
);
const apiSource = fs.readFileSync(path.join(root, 'backend', 'Api.js'), 'utf8');
const schemaSource = fs.readFileSync(path.join(root, 'backend', 'Schema.js'), 'utf8');

const context = { console };
vm.createContext(context);
vm.runInContext(engineSource, context);

// Foundation sheets / reusable entity model.
assert(engineSource.includes('AppearanceImagePacks'));
assert(engineSource.includes('AppearanceImagePackItems'));
assert(engineSource.includes('AppearanceThemePacks'));
assert(engineSource.includes('GameAppearance'));
assert(engineSource.includes('AppearanceOverrides'));
assert(engineSource.includes('EntityType'));
assert(engineSource.includes('EntityId'));

// Seed packs establish a safe existing-image default plus our first Confidence theme.
assert(engineSource.includes('sports-default'));
assert(engineSource.includes('Sports Default Logos'));
assert(engineSource.includes('confidence-pro'));
assert(engineSource.includes('Confidence Pro'));

// Image precedence: entity override > pack > supplied/default game image > generic fallback.
const imageInput = {
  assignment: { ImagePackId: 'nfl-helmets', ImageMode: 'pack' },
  imagePackItems: [
    {
      PackId: 'nfl-helmets',
      EntityType: 'team',
      EntityId: 'CHI',
      Variant: 'default',
      ImageUrl: 'https://example.test/bears-helmet.png',
      Active: true
    }
  ],
  entityType: 'team',
  entityId: 'CHI',
  variant: 'default',
  defaultImageUrl: 'https://example.test/bears-logo.png'
};

let resolved = context.appearanceResolveImageFromRows_(imageInput);
assert.strictEqual(resolved.source, 'image-pack');
assert.strictEqual(resolved.imageUrl, 'https://example.test/bears-helmet.png');

resolved = context.appearanceResolveImageFromRows_(Object.assign({}, imageInput, {
  entityOverride: {
    GameId: 'game-1',
    EntityType: 'team',
    EntityId: 'CHI',
    ImageUrl: 'https://example.test/custom-bears.png',
    Active: true
  }
}));
assert.strictEqual(resolved.source, 'override');
assert.strictEqual(resolved.imageUrl, 'https://example.test/custom-bears.png');

resolved = context.appearanceResolveImageFromRows_(Object.assign({}, imageInput, {
  assignment: { ImagePackId: '', ImageMode: 'default' },
  imagePackItems: []
}));
assert.strictEqual(resolved.source, 'default');
assert.strictEqual(resolved.imageUrl, 'https://example.test/bears-logo.png');

resolved = context.appearanceResolveImageFromRows_({
  assignment: {},
  entityType: 'nominee',
  entityId: 'nominee-1',
  imagePackItems: [],
  defaultImageUrl: ''
});
assert.strictEqual(resolved.source, 'fallback');
assert.strictEqual(resolved.imageUrl, '');

// Theme inheritance and overrides are semantic JSON, not hard-coded game CSS.
const themeRows = [
  {
    ThemePackId: 'app-default',
    ThemeName: 'App Default',
    ThemeJSON: JSON.stringify({ density: 'standard', team: { cityScale: 'medium', nameScale: 'medium' } }),
    Active: true,
    IsDefault: true
  },
  {
    ThemePackId: 'confidence-pro',
    ThemeName: 'Confidence Pro',
    BaseThemeId: 'app-default',
    ThemeJSON: JSON.stringify({ density: 'compact', team: { cityScale: 'small', nameScale: 'large' } }),
    Active: true,
    IsDefault: false
  }
];

const themeResolved = context.appearanceResolveThemeFromRows_({
  themePacks: themeRows,
  assignment: {
    ThemePackId: 'confidence-pro',
    ThemeOverrideJSON: JSON.stringify({ row: { spacing: 'tight' } })
  },
  entityOverride: {
    Active: true,
    ThemeOverrideJSON: JSON.stringify({ team: { nameScale: 'xlarge' } })
  }
});

assert.strictEqual(themeResolved.themePackId, 'confidence-pro');
assert.strictEqual(themeResolved.theme.density, 'compact');
assert.strictEqual(themeResolved.theme.team.cityScale, 'small');
assert.strictEqual(themeResolved.theme.team.nameScale, 'xlarge');
assert.strictEqual(themeResolved.theme.row.spacing, 'tight');

// Admin write/read routes are protected automatically by the existing admin-prefix security boundary.
[
  'adminSetupAppearanceSystem',
  'adminGetAppearanceDashboard',
  'adminSaveAppearanceImagePack',
  'adminSaveAppearanceImagePackItem',
  'adminSaveAppearanceThemePack',
  'adminSaveGameAppearance',
  'adminSaveAppearanceOverride',
  'getGameAppearance'
].forEach(action => {
  assert(apiSource.includes(`action === "${action}"`), `Missing API action ${action}`);
});

// Schema registry includes every persistent appearance sheet.
[
  'AppearanceImagePacks',
  'AppearanceImagePackItems',
  'AppearanceThemePacks',
  'GameAppearance',
  'AppearanceOverrides'
].forEach(name => {
  assert(schemaSource.includes(`${name}: {`), `Missing schema ${name}`);
});

console.log('appearance foundation v1.2.17c tests passed');
