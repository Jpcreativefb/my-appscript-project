const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const engineSource = read('frontend/js/imageEngine.js');
const configSource = read('frontend/js/config.js');
const appHtml = read('frontend/app.html');
const sportsHtml = read('frontend/sports.html');
const sw = read('frontend/sw.js');

function createEngine(overrides = {}, manifest = {}) {
  const document = {
    readyState: 'loading',
    documentElement: {},
    addEventListener() {},
    querySelectorAll() { return []; }
  };
  const context = {
    URL,
    console,
    document,
    location: { href: 'https://my-appscript-project.pages.dev/app.html', hostname: 'my-appscript-project.pages.dev' },
    PLATFORM_IMAGE_CONFIG: Object.assign({ mode: 'browser' }, overrides),
    PLATFORM_IMAGE_MANIFEST: manifest
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(engineSource, context, { filename: 'imageEngine.js' });
  return context.PlatformImageEngine;
}

const engine = createEngine({}, {
  'reality/survivor/player-one': {
    thumb: './assets/images/reality/survivor/player-one.thumb.webp',
    card: './assets/images/reality/survivor/player-one.card.webp',
    profile: './assets/images/reality/survivor/player-one.profile.webp',
    original: './assets/images/reality/survivor/player-one.profile.webp'
  }
});

const tmdb = engine.resolve('https://image.tmdb.org/t/p/w500/poster.jpg', 'thumb');
assert(tmdb.url.includes('/t/p/w154/'), 'TMDB posters should use a smaller provider-native path.');
assert.strictEqual(tmdb.method, 'provider');

const espn = engine.resolve('https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/chi.png', 'logo');
assert(espn.url.includes('/teamlogos/nfl/100/'), 'ESPN logos should use a smaller provider-native path.');
assert.strictEqual(espn.method, 'provider');

const local = engine.resolve('asset:reality/survivor/player-one', 'card');
assert.strictEqual(local.url, './assets/images/reality/survivor/player-one.card.webp');
assert.strictEqual(local.method, 'manifest');

const lazyHtml = engine.html('https://example.com/person.jpg', {
  className: 'test-card',
  variant: 'card',
  alt: 'Test person'
});
assert(lazyHtml.includes('data-platform-src="https://example.com/person.jpg"'));
assert(lazyHtml.includes('loading="lazy"'));
assert(lazyHtml.includes('decoding="async"'));
assert(lazyHtml.includes('fetchpriority="low"'));
assert(lazyHtml.includes('width="240" height="300"'));

const eagerHtml = engine.html('https://example.com/hero.jpg', {
  className: 'test-hero',
  variant: 'hero',
  alt: 'Game hero',
  critical: true
});
assert(!eagerHtml.includes('data-platform-src='));
assert(eagerHtml.includes('loading="eager"'));
assert(eagerHtml.includes('fetchpriority="high"'));

const pagesDevCloudflare = createEngine({
  mode: 'cloudflare',
  cloudflareBaseUrl: 'https://my-appscript-project.pages.dev',
  transformExternal: true
});
const pagesDevResult = pagesDevCloudflare.resolve('https://example.com/photo.jpg', 'card');
assert(!pagesDevResult.url.includes('/cdn-cgi/image/'), 'pages.dev must not be used for Cloudflare transformation URLs.');

assert(configSource.includes('mode: "browser"'), 'Zero-charge browser mode must remain the default.');
assert(configSource.includes('transformExternal: false'), 'External transformations must be opt-in.');
assert(appHtml.indexOf('image-manifest.js') < appHtml.indexOf('imageEngine.js'));
assert(appHtml.indexOf('imageEngine.js') < appHtml.indexOf('js/app.js'));
assert(sportsHtml.indexOf('imageEngine.js') < sportsHtml.indexOf('js/sports.js'));
assert(sw.includes('awards-app-v305-platform-image-engine'));
assert(sw.includes('./assets/images/image-manifest.js'));
assert(sw.includes('./js/imageEngine.js'));

const renderFiles = [
  'frontend/frontend-leaderboard-profile.js',
  'frontend/js/pages/adminGameSetup.js',
  'frontend/js/pages/adminRealityTv.js',
  'frontend/js/pages/archiveHistory.js',
  'frontend/js/pages/betting.js',
  'frontend/js/pages/leaderboard.js',
  'frontend/js/pages/picks.js',
  'frontend/js/pages/profile.js',
  'frontend/js/sports.js'
];
renderFiles.forEach(rel => {
  const source = read(rel);
  assert(!source.includes('<img'), `${rel} still bypasses the shared image engine.`);
  assert(source.includes('platformImgHtml'), `${rel} does not use the shared image helper.`);
});

assert(read('frontend/js/pages/dashboard.js').includes('platformBackgroundAttrs'));
assert(read('frontend/js/pages/adminGames.js').includes('platformImageUrl(url, "hero")'));
assert(fs.existsSync(path.join(root, 'tools/optimize_local_images.py')));

console.log('Platform image engine tests passed.');
