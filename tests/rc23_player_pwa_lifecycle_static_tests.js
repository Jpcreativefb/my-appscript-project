'use strict';

/*
  PATTC Predicts RC23 — Player/PWA Appearance Lifecycle acceptance gate.

  Purpose:
  - Run in a checked-out candidate correction branch AFTER Kent/Ted/Sport runtime work.
  - This file does not modify production.
  - It verifies source-level lifecycle contracts that must exist before mobile/PWA live certification.

  Usage from repository root:
    node tests/rc23_player_pwa_lifecycle_static_tests.js

  Baseline:
    architecture-cleanup
    902003156e9af1538e6292e5a51e649a57fde51f
    Awards App v379

  Expected on the uncorrected v379 baseline:
    FAIL — the test intentionally identifies the lifecycle blockers Andy diagnosed.
*/

const fs = require('fs');
const assert = require('assert');

const BASELINE_COMMIT = '902003156e9af1538e6292e5a51e649a57fde51f';
const BASELINE_RELEASE = 'v1219rc20-postdeploy-first-entry-performance-r2';

const files = {
  appHtml: 'frontend/app.html',
  app: 'frontend/js/app.js',
  api: 'frontend/js/api.js',
  pwa: 'frontend/js/pwa.js',
  sw: 'frontend/sw.js',
  picks: 'frontend/js/pages/picks.js',
  tf: 'frontend/js/pages/teamFantasy.js',
  betting: 'frontend/js/pages/betting.js',
  survivor: 'frontend/js/pages/survivor.js'
};

function src(path) {
  assert.ok(fs.existsSync(path), `required file missing: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

function extractFunction(source, name) {
  const patterns = [
    `async function ${name}`,
    `function ${name}`
  ];
  let start = -1;
  for (const p of patterns) {
    start = source.indexOf(p);
    if (start >= 0) break;
  }
  if (start < 0) return '';

  const brace = source.indexOf('{', start);
  if (brace < 0) return '';

  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1] || '';

    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return '';
}

function firstMetaRelease(html) {
  const m = html.match(/<meta\s+name=["']pattc-release["']\s+content=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function appearanceCallsIn(text) {
  const calls = [];
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*(?:Appearance|appearance)[A-Za-z0-9_$]*)\s*\(/g;
  let m;
  while ((m = re.exec(text))) calls.push(m[1]);
  return calls;
}

function candidateAppearanceHelperIsLive(appSource, names, seen) {
  const visited = seen || new Set();

  return names.some(name => {
    if (!name || visited.has(name)) return false;
    visited.add(name);

    const fn = extractFunction(appSource, name);
    if (!fn) return false;

    const hasLiveRead = /apiGetGameAppearance\s*\(/.test(fn);
    const hasScopedInvalidation =
      /(invalidateAppPageSnapshots|appDiscardPageSnapshot_|sessionStorage\.removeItem|APP_PAGE_SNAPSHOT_CACHE)/.test(fn);

    if (hasLiveRead && hasScopedInvalidation) return true;

    const nested = appearanceCallsIn(fn).filter(child => child !== name);
    return nested.length
      ? candidateAppearanceHelperIsLive(appSource, nested, visited)
      : false;
  });
}

let count = 0;
function ok(value, message) {
  count++;
  assert.ok(value, message);
}
function eq(a, b, message) {
  count++;
  assert.strictEqual(a, b, message);
}

Object.values(files).forEach(path => assert.ok(fs.existsSync(path), `required file missing: ${path}`));

const appHtml = src(files.appHtml);
const app = src(files.app);
const api = src(files.api);
const pwa = src(files.pwa);
const sw = src(files.sw);
const picks = src(files.picks);
const tf = src(files.tf);
const betting = src(files.betting);
const survivor = src(files.survivor);

// ---------------------------------------------------------------------------
// GATE 1 — Build/PWA release boundary must advance from the stale v379 RC20
// token. The correction should cause a new worker URL/cache namespace.
// ---------------------------------------------------------------------------
const release = firstMetaRelease(appHtml);
ok(!!release, 'app.html declares pattc-release');
ok(release !== BASELINE_RELEASE,
  `RC23 correction uses a new PATTC frontend release token (still ${BASELINE_RELEASE})`);
ok(pwa.includes('window.PATTC_FRONTEND_RELEASE'),
  'PWA registration still derives worker URL from canonical frontend release');
ok(sw.includes('searchParams.get("v")') || sw.includes("searchParams.get('v')"),
  'service worker cache namespace still derives from worker release query');

// ---------------------------------------------------------------------------
// GATE 2 — Appearance read remains an authoritative live/no-store request.
// ---------------------------------------------------------------------------
const getAppearance = extractFunction(api, 'apiGetGameAppearance');
ok(!!getAppearance, 'apiGetGameAppearance exists');
ok(getAppearance.includes('appearanceNonce') && getAppearance.includes('Date.now'),
  'Appearance read carries a request nonce');
ok(api.includes('cache: "no-store"') || api.includes("cache: 'no-store'"),
  'authenticated POST bridge uses no-store');

// ---------------------------------------------------------------------------
// GATE 3 — A game snapshot already tagged with the last verified Appearance
// fingerprint may paint immediately. Current Appearance must still be checked
// in one deferred chain and invalidate/rerender only when it changed.
// ---------------------------------------------------------------------------
const navigateFn = extractFunction(app, 'navigate');
ok(!!navigateFn, 'navigate() exists');
const snapshotPos = navigateFn.indexOf('appReadPageSnapshot_(page, knownFingerprint)');
ok(snapshotPos >= 0, 'navigate() must try a known-fingerprint snapshot fast path');
const blockingFallbackPos = navigateFn.indexOf('await appPrepareAppearanceSnapshotReuse_(page)');
ok(blockingFallbackPos > snapshotPos, 'network Appearance verification may only block when no verified snapshot can be reused');
const deferredAppearancePos = navigateFn.indexOf('appRevalidateCurrentGameAppearance_({ rerender: true');
ok(deferredAppearancePos > snapshotPos, 'snapshot fast path must still schedule current-game Appearance revalidation after paint');
const helperNamesBeforeSnapshot = appearanceCallsIn(navigateFn.slice(0, blockingFallbackPos));
const helperLiveBeforeSnapshot = candidateAppearanceHelperIsLive(app, helperNamesBeforeSnapshot);

const snapshotKeyFn = extractFunction(app, 'appPageSnapshotKey_');
const appearanceAwareKey =
  /(appearance|Appearance|layout|Layout|theme|Theme).*(revision|version|fingerprint|hash|updated|identity)/.test(snapshotKeyFn) ||
  /(revision|version|fingerprint|hash|updated|identity).*(appearance|Appearance|layout|Layout|theme|Theme)/.test(snapshotKeyFn);

const appearanceRevalidationFn = extractFunction(app, 'appRevalidateGameAppearance_');
const appHasAppearanceSnapshotInvalidation =
  (appearanceRevalidationFn.includes('apiGetGameAppearance(') &&
   appearanceRevalidationFn.includes('invalidateAppPageSnapshots(')) ||
  /(apiGetGameAppearance[\s\S]{0,2500}appDiscardPageSnapshot_|appDiscardPageSnapshot_[\s\S]{0,2500}apiGetGameAppearance)/.test(app) ||
  helperLiveBeforeSnapshot;

ok(appearanceAwareKey || appHasAppearanceSnapshotInvalidation,
  'snapshot identity or invalidation path is Appearance-aware');

// ---------------------------------------------------------------------------
// GATE 4 — Foreground/resume revalidation exists for an already-open PWA.
// ---------------------------------------------------------------------------
const lifecycleText = app + '\n' + pwa;
const lifecycleEvents = ['visibilitychange', 'pageshow', 'focus'];
const lifecycleWindows = [];
for (const evt of lifecycleEvents) {
  let from = 0;
  while (true) {
    const idx = lifecycleText.indexOf(evt, from);
    if (idx < 0) break;
    lifecycleWindows.push(lifecycleText.slice(Math.max(0, idx - 1200), idx + 2200));
    from = idx + evt.length;
  }
}
const foregroundAppearanceCheck = lifecycleWindows.some(block =>
  /apiGetGameAppearance\s*\(/.test(block) ||
  /\b[A-Za-z_$][A-Za-z0-9_$]*(?:Appearance|appearance)[A-Za-z0-9_$]*\s*\(/.test(block)
);
ok(foregroundAppearanceCheck,
  'foreground/resume lifecycle revalidates Appearance for the current game');

// ---------------------------------------------------------------------------
// GATE 5 — Reality Clean <-> Cinematic must structurally remount after a live
// Appearance change. Theme-variable refresh alone is insufficient.
// ---------------------------------------------------------------------------
ok(picks.includes('realityTvLayoutTemplate_'),
  'Reality layout selector exists');
ok(picks.includes('reality-layout-cinematic'),
  'Reality Cinematic structural root marker exists');

const hydrateAppearance = extractFunction(picks, 'hydrateConfidenceAppearance_');
const realityRemountInHydrator =
  hydrateAppearance &&
  /(realityTvLayoutTemplate_|RealityLayoutTemplate|realityLayoutTemplate)/.test(hydrateAppearance) &&
  /(refreshPicksPage|renderPicksPage|remount|mountPicksPage)/i.test(hydrateAppearance);

const realityAppearanceListener =
  /(appearance|Appearance)[\s\S]{0,1400}(refreshPicksPage|renderPicksPage|remount|mountPicksPage)/i.test(picks);

ok(realityRemountInHydrator || realityAppearanceListener,
  'Reality performs a structural Picks remount when live layout assignment changes');

// ---------------------------------------------------------------------------
// GATE 6 — Sports Rich Appearance remains live/deduplicated, but it is
// presentation-only and must not block the authoritative game-state render.
// ---------------------------------------------------------------------------
[
  [tf, 'Team Fantasy'],
  [betting, 'Sports Wager'],
  [survivor, 'Survivor/KOTH']
].forEach(([source, label]) => {
  ok(source.includes('Promise.resolve(PATTCSportsRich.prepare(gameId))'), `${label} retains one deferred Appearance prepare`);
  ok(!source.includes('await PATTCSportsRich.prepare(gameId)'), `${label} does not block primary render on Appearance`);
});

ok(picks.includes('refreshPicksAppearanceUi_'),
  'Confidence/Picks uses the shared deferred Appearance redraw path');
ok(!picks.includes('await PATTCSportsRich.prepare(gameId)'),
  'Confidence/Picks does not block primary render on Sports Rich Appearance');

const survivorEnabled = extractFunction(survivor, 'sportsRichSurvivorEnabled_');
ok(!!survivorEnabled &&
  survivorEnabled.includes('PATTCSportsRich.appearance(gameId, appearance)') &&
  survivorEnabled.includes('PATTCSportsRich.layoutValue(bundle)') &&
  survivorEnabled.includes('return layout !== "legacy";'),
  'Survivor/KOTH R3 defaults to the current player layout with explicit Legacy opt-out');

ok(tf.includes('sports-rich-team-fantasy'),
  'Team Fantasy Rich DOM marker remains available');

// ---------------------------------------------------------------------------
// GATE 7 — Correction must be targeted. Clearing all browser storage or
// unregistering the service worker is not an acceptable Appearance fix.
// ---------------------------------------------------------------------------
const correctionTargets = app + '\n' + picks + '\n' + tf + '\n' + betting + '\n' + survivor;
ok(!/\blocalStorage\.clear\s*\(/.test(correctionTargets),
  'Appearance lifecycle correction does not clear all localStorage');
ok(!/\bsessionStorage\.clear\s*\(/.test(correctionTargets),
  'Appearance lifecycle correction does not clear all sessionStorage');
ok(!/navigator\.serviceWorker[\s\S]{0,200}\.unregister\s*\(/.test(correctionTargets),
  'Appearance lifecycle correction does not require unregistering the production worker');

// ---------------------------------------------------------------------------
// GATE 8 — Snapshot windows remain explicitly testable. RC23 requires both
// <45s and 45s–10m paths to be exercised in browser/mobile acceptance.
// ---------------------------------------------------------------------------
ok(/APP_PAGE_SNAPSHOT_FRESH_MS\s*=\s*45\s*\*\s*1000/.test(app) ||
   /APP_PAGE_SNAPSHOT_FRESH_MS\s*=\s*45000/.test(app),
   '45-second fresh snapshot boundary remains explicit');
ok(/APP_PAGE_SNAPSHOT_MAX_MS\s*=\s*10\s*\*\s*60\s*\*\s*1000/.test(app) ||
   /APP_PAGE_SNAPSHOT_MAX_MS\s*=\s*600000/.test(app),
   '10-minute snapshot maximum remains explicit');

// ---------------------------------------------------------------------------
// GATE 9 — Game isolation: snapshot key remains GameId-scoped for play pages.
// ---------------------------------------------------------------------------
ok(/gameId/.test(snapshotKeyFn) && /pageName/.test(snapshotKeyFn),
  'play-page snapshot key remains scoped by GameId and page');

// ---------------------------------------------------------------------------
// GATE 10 — The accepted UX primary-action DOM must remain renderable.
// This is deliberately structural rather than exact wording because RC23 is
// lifecycle certification, not a copy redesign.
// ---------------------------------------------------------------------------
ok(/button/i.test(picks) && /(save|submit|pick)/i.test(picks),
  'Picks page still renders a player primary action');
ok(/button/i.test(tf) && /(choose|save|pick|lineup)/i.test(tf),
  'Team Fantasy still renders player primary actions');
ok(/button/i.test(betting) && /(wager|bet|stake|place)/i.test(betting),
  'Wager page still renders player primary actions');
ok(/survivorSaveButton|Save Survivor|save current/i.test(survivor),
  'Survivor still renders a save action');

console.log(`PASS: ${count} RC23 Player/PWA lifecycle source acceptance checks`);
console.log(`Baseline reference: ${BASELINE_COMMIT}`);
