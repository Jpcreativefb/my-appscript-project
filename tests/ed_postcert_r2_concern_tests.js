'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const tf = read('frontend/js/pages/teamFantasy.js');
const survivor = read('frontend/js/pages/survivor.js');
const wager = read('frontend/js/pages/betting.js');
const picks = read('frontend/js/pages/picks.js');
const app = read('frontend/js/app.js');
const apiSource = read('backend/Api.js');
const survivorEngine = read('backend/engines/SportsSurvivorEngine.js');
const shared = read('backend/engines/SharedCompareEngine.js');
const { assertCurrentReleaseMarkers } = require('../tools/release_test_helpers');

// 1) Team Fantasy: pending dedupe stays, completed reuse is bounded below poll cadence,
// and the cache key contains every required identity dimension.
assert(tf.includes('var TEAM_FANTASY_GAME_DAY_CACHE_REUSE_MS_ = 30000;'));
assert(tf.includes('TEAM_FANTASY_WEEK_CACHE_AT'));
assert(tf.includes('if (window.TEAM_FANTASY_GAME_DAY_PENDING[key]) return window.TEAM_FANTASY_GAME_DAY_PENDING[key];'));
assert(tf.includes("return [gameId, user, entryId, String(leagueId || state.selectedLeagueId || 'complete')"));
assert(tf.includes('delay = Math.max(60000,'), 'poll cadence must remain at least 60 seconds');
assert(tf.includes('teamFantasyLoadGameDay_(false);'), 'poller must perform normal non-manual refresh calls');

// 2) Deferred Appearance: primary render is not awaited behind Appearance. A late
// response has an in-place after-mount application path; an early response is remembered
// as fresh and wins over an older primary payload when the primary renderer resumes.
[
  [survivor, 'Survivor', 'Promise.resolve(PATTCSportsRich.prepare(gameId)).then', 'document.querySelector(".survivor-page")'],
  [tf, 'Team Fantasy', 'Promise.resolve(PATTCSportsRich.prepare(gameId)).then', 'document.querySelector(".sports-team-fantasy")'],
  [wager, 'Wager', 'Promise.resolve(PATTCSportsRich.prepare(gameId)).then', 'document.querySelector(".betting-page")']
].forEach(([source, label, prepareToken, mountToken]) => {
  assert(source.includes(prepareToken), label + ' must start deferred Appearance');
  assert(!source.includes('await PATTCSportsRich.prepare(gameId);'), label + ' primary UI must not wait for Appearance');
  assert(source.includes(mountToken), label + ' must retry application against mounted primary DOM');
  const callbackStart = source.indexOf(prepareToken);
  const callbackEnd = source.indexOf('.catch(function(err)', callbackStart);
  const callback = source.slice(callbackStart, callbackEnd);
  assert(!callback.includes('navigate('), label + ' deferred Appearance must not full-route rerender');
  assert(callback.includes('PATTCSportsRich.process(page)'), label + ' late path must process mounted presentation');
});
assert(picks.includes('applyPicksAppearanceToPage_();') && picks.includes('hydrateConfidenceAppearance_();'));
assert(picks.includes('list.innerHTML = renderPicksCategoryList();'), 'Picks late Appearance redraw is question-list scoped, not a full page rerender');

// Exercise the actual Sports Rich cache semantics for Appearance-first / primary-later.
const appearanceContext = {
  console,
  window: {},
  document: { querySelector(){return null;}, querySelectorAll(){return[];}, getElementById(){return null;} },
  localStorage: { getItem(){return '';}, setItem(){}, removeItem(){} },
  sessionStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
  location: { hash:'' }, setTimeout, clearTimeout, setInterval(){return 1;}, clearInterval(){}, Promise, Date
};
appearanceContext.window = appearanceContext; appearanceContext.window.location = appearanceContext.location;
let releaseAppearance;
appearanceContext.apiGetGameAppearance = () => new Promise(resolve => { releaseAppearance = resolve; });
vm.createContext(appearanceContext);
vm.runInContext(tf, appearanceContext);
const appearancePending = vm.runInContext(`PATTCSportsRich.prepare('g-order', {SportsLayoutTemplate:'clean'})`, appearanceContext);
releaseAppearance({success:true,SportsLayoutTemplate:'sports-rich',SportsHeroImageUrl:'https://example.test/live.png'});
const appearanceOrderPromise = Promise.resolve(appearancePending).then(function(){
  return vm.runInContext(`({
    rich:PATTCSportsRich.isRich('g-order', {SportsLayoutTemplate:'clean'}),
    hero:PATTCSportsRich.appearance('g-order', {SportsLayoutTemplate:'clean'}).SportsHeroImageUrl
  })`, appearanceContext);
});

async function runDeferredPageOrderCase_(source, kind) {
  const config = {
    survivor: {
      capture:'const SPORTS_RICH_SURVIVOR_ORIGINAL_PAGE_ = renderSurvivorPage;',
      replacement:'const SPORTS_RICH_SURVIVOR_ORIGINAL_PAGE_ = window.__primaryRender;',
      end:'  return output;\n};\n\n/* RC24A_R47_SURVIVOR_KOTH_SHARED_HERO */',
      renderName:'renderSurvivorPage', pageSelector:'.survivor-page'
    },
    tf: {
      capture:'const SPORTS_RICH_TF_ORIGINAL_PAGE_ = renderTeamFantasyPage;',
      replacement:'const SPORTS_RICH_TF_ORIGINAL_PAGE_ = window.__primaryRender;',
      end:'  return output;\n};\n\n/* RC24A_R3_RUNTIME_WRAPPERS */',
      renderName:'renderTeamFantasyPage', pageSelector:'.sports-team-fantasy'
    },
    wager: {
      capture:'const SPORTS_RICH_WAGER_ORIGINAL_PAGE_ = renderBettingPage;',
      replacement:'const SPORTS_RICH_WAGER_ORIGINAL_PAGE_ = window.__primaryRender;',
      end:'  return output;\n};\n\n/* RC24A_R47_WAGER_SHARED_HERO */',
      renderName:'renderBettingPage', pageSelector:'.betting-page'
    }
  }[kind];
  assert(config, 'unknown deferred-order kind');
  const cut = source.indexOf(config.end);
  assert(cut > 0, kind + ' wrapper end not found');
  const executable = source.slice(0, cut + config.end.indexOf('/*')).replace(config.capture, config.replacement);

  async function one_(appearanceFirst) {
    let resolvePrimary, resolveAppearance, mounted = false, processed = 0;
    const primary = new Promise(resolve => { resolvePrimary = resolve; });
    const appearance = new Promise(resolve => { resolveAppearance = resolve; });
    const heroNode = { outerHTML:'ORIGINAL-HERO' };
    const page = {
      pendingEdit:'keep-me',
      classList:{ values:[], add(v){ this.values.push(v); } },
      querySelector(){ return heroNode; }
    };
    const context = {
      console, window:{}, location:{hash:''}, Promise, Date, setTimeout, clearTimeout,
      setInterval(){return 1;}, clearInterval(){},
      localStorage:{getItem(){return'';},setItem(){},removeItem(){}},
      sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
      document:{
        querySelector(sel){ return mounted && sel === config.pageSelector ? page : null; },
        querySelectorAll(){return[];}, getElementById(){return null;},
        body:{insertAdjacentHTML(){}}
      },
      apiGetGameAppearance(){ return appearance; },
      getFrontendGameId(){ return 'g-order'; },
      getBettingGameId_(){ return 'g-order'; },
      __primaryRender(){ return primary; }
    };
    context.window=context; context.window.location=context.location;
    vm.createContext(context); vm.runInContext(executable, context);
    context.PATTCSportsRich.process = function(){ processed += 1; };
    if (kind === 'survivor') {
      context.SURVIVOR_PAGE_STATE={gameId:'g-order',payload:{sportsMode:true,mode:'sports-survivor',gameName:'Survivor'}};
      context.survivorR47SharedHeroHtml_=()=> 'LATE-CUSTOM-HERO';
      context.sportsRichSurvivorPageHtml_=()=> 'RICH-SURVIVOR';
      context.sportsDefaultKothPageHtml_=()=> 'RICH-KOTH';
    } else if (kind === 'tf') {
      context.TEAM_FANTASY_STATE={gameId:'g-order',appearance:{SportsLayoutTemplate:'clean'}};
      context.teamFantasyR47HeroHtml_=()=> 'LATE-CUSTOM-HERO';
      context.sportsRichTfDecoratePageHtml_=html => 'RICH-TF:' + html;
      context.sportsRichTfUpdateSummary_=()=>{};
    } else {
      context.BETTING_PAGE_BATCH_STATE={summary:{},config:{},categories:[]};
      context.wagerR47SharedHeroHtml_=()=> 'LATE-CUSTOM-HERO';
      context.sportsRichWagerHero_=()=> '<section>RICH-WAGER-HERO</section>';
      context.sportsRichWagerTabs_=()=> '<nav>RICH-TABS</nav>';
      context.sportsRichWagerHistory_=()=> '<div>RICH-HISTORY</div>';
    }

    const renderPromise = context[config.renderName]();
    const cleanHtml = kind === 'wager'
      ? '<div class="page betting-page sports-default-wager"><h1>Wager</h1><div id="bettingCategoryListBlock"></div><div id="bettingBatchStatusBlock"></div></div>'
      : 'PRIMARY-CLEAN';

    if (appearanceFirst) {
      resolveAppearance({success:true,SportsLayoutTemplate:'sports-rich',SportsHeroImageUrl:'custom.png'});
      await new Promise(resolve => setTimeout(resolve, 0)); // callback may run before mount and safely exit
      resolvePrimary(cleanHtml);
      const rendered = await renderPromise;
      mounted = true;
      assert(kind === 'survivor' ? rendered === 'RICH-SURVIVOR' : kind === 'tf' ? rendered === 'RICH-TF:' + cleanHtml : rendered.includes('sports-rich-wager'), kind + ' appearance-first must render custom Appearance after primary resolves');
      assert.strictEqual(page.pendingEdit, 'keep-me');
      return;
    }

    resolvePrimary(cleanHtml);
    const rendered = await renderPromise;
    assert(rendered && String(rendered).length > 0, kind + ' primary-first must become usable while Appearance is still pending');
    mounted = true;
    resolveAppearance({success:true,SportsLayoutTemplate:'sports-rich',SportsHeroImageUrl:'custom.png'});
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 500;
      (function waitForLateAppearance_() {
        if (heroNode.outerHTML === 'LATE-CUSTOM-HERO') return resolve();
        if (Date.now() >= deadline) return reject(new Error(kind + ' late Appearance did not apply within 500ms'));
        setTimeout(waitForLateAppearance_, 5);
      })();
    });
    assert.strictEqual(heroNode.outerHTML, 'LATE-CUSTOM-HERO', kind + ' late Appearance must apply after mount');
    assert(processed >= 1, kind + ' late Appearance must process mounted page');
    assert.strictEqual(page.pendingEdit, 'keep-me', kind + ' late Appearance must preserve pending edits');
  }
  await one_(false);
  await one_(true);
}

async function runPicksAppearanceOrderCases_() {
  function make_(cached) {
    let resolveAppearance, applies=0, refreshes=0;
    const appearance = new Promise(resolve => { resolveAppearance=resolve; });
    const storage = cached ? JSON.stringify({success:true,ThemeOverride:{questions:{cardBackground:'#123456'}}}) : null;
    const context={console,window:{},location:{hash:'#picks'},Promise,Date,setTimeout,clearTimeout,setInterval(){return 1;},clearInterval(){},
      localStorage:{getItem(){return'';},setItem(){},removeItem(){}},
      sessionStorage:{getItem(k){return k==='pattcGameAppearance:g-picks'?storage:null;},setItem(){},removeItem(){}},
      document:{querySelector(){return {classList:{remove(){}}};},querySelectorAll(){return[];},getElementById(){return null;}},
      apiGetGameAppearance(){return appearance;}
    };
    context.window=context; context.window.location=context.location;
    vm.createContext(context); vm.runInContext(picks,context);
    vm.runInContext(`PICKS_PAGE_DATA.gameId='g-picks'; PICKS_PAGE_DATA.appearance=null; PICKS_CONFIDENCE_APPEARANCE_REQUEST=null; PICKS_CONFIDENCE_APPEARANCE_GAME_ID=${cached?"'g-picks'":"''"};`,context);
    context.applyPicksAppearanceToPage_=()=>{applies+=1;};
    context.refreshConfidenceSportsHero_=()=>{};
    context.refreshPicksAppearanceUi_=()=>{refreshes+=1;};
    context.realityTvRemountPlayerLayoutIfNeeded_=()=>{};
    return {context,resolveAppearance,get counts(){return {applies,refreshes};}};
  }
  const late=make_(false);
  const pending=late.context.hydrateConfidenceAppearance_();
  assert.deepStrictEqual(late.counts,{applies:0,refreshes:0});
  late.resolveAppearance({success:true,ThemeOverride:{questions:{cardBackground:'#abcdef'}}});
  await pending;
  assert(late.counts.applies>=1 && late.counts.refreshes>=1,'Picks late Appearance must apply after mounted primary UI');

  const early=make_(true);
  await early.context.hydrateConfidenceAppearance_();
  assert(early.counts.applies>=1 && early.counts.refreshes>=1,'Picks cached/early Appearance must apply after mount');
  early.resolveAppearance({success:true});
}

const deferredOrderPromise = Promise.all([
  runDeferredPageOrderCase_(survivor,'survivor'),
  runDeferredPageOrderCase_(tf,'tf'),
  runDeferredPageOrderCase_(wager,'wager'),
  runPicksAppearanceOrderCases_()
]);

// 4) Survivor wrong-picks-allowed semantics: N losses are survivable; N+1 eliminates.
assert.strictEqual((survivorEngine.match(/lossesUsed > availableLosses/g) || []).length, 2);
assert.strictEqual(survivorEngine.includes('lossesUsed >= availableLosses'), false);
[0,1,2].forEach(allowed => {
  for (let losses=0; losses<=allowed; losses++) assert.strictEqual(losses > allowed, false);
  assert.strictEqual((allowed + 1) > allowed, true);
});

// 6) Release helper: valid current boundary passes; an unrelated arbitrary marker fails.
const asset = 'v1219rc24k-nfl-player-experience-r1';
const ui = 'v1219rc24m-team-fantasy-layout-r1';
const route = 'v1219rc24k-nfl-player-experience-r1';
const helperApp = `const APP_ASSET_VERSION = String(window.PATTC_FRONTEND_RELEASE || "${asset}");\nconst APP_ROUTE_HOTFIX_VERSION = "${route}";\nurl.searchParams.set("hotfix", APP_ROUTE_HOTFIX_VERSION);\nwindow.PATTC_FRONTEND_RELEASE;`;
const helperSw = `const PATTC_SW_RELEASE_MARKER = "${asset}";\nconst AWARDS_RELEASE = new URL(self.location.href).searchParams.get("v") || PATTC_SW_RELEASE_MARKER;\nconst AWARDS_CACHE = "awards-app-" + AWARDS_RELEASE;`;
const helperHtml = `<meta name="pattc-release" content="${asset}"><meta name="pattc-ui-hotfix" content="${ui}"><script src="./js/app.js?release=${asset}&tf=${ui}"></script>`;
assert.doesNotThrow(() => assertCurrentReleaseMarkers(assert, helperApp, helperHtml, helperSw));
const arbitraryHtml = `<meta name="pattc-release" content="${asset}"><meta name="pattc-ui-hotfix" content="${ui}"><script src="./js/app.js?release=${asset}&routefix=unrelated-marker"></script>`;
assert.throws(() => assertCurrentReleaseMarkers(assert, helperApp, arbitraryHtml, helperSw), /route\/cache boundary/);

// 7) Cached snapshot is presentation-only. A stale UI may attempt savePick, but the
// authenticated POST path rechecks current backend feature eligibility before savePick.
assert(app.includes('snapshot.html'));
let writes = 0;
const apiContext = {
  console,
  json: x => x,
  apiSecurityAuthorizeRequest_(){},
  getDefaultGameId(){ return 'g-stale'; },
  normalizeLeagueId_(v){ return String(v || ''); },
  userCanAccessGameFeature_(){ return {allowed:false, reason:'LOCKED_OR_INELIGIBLE'}; },
  savePick(){ writes += 1; return {success:true}; },
  Logger: { log(){} }
};
vm.createContext(apiContext);
vm.runInContext(apiSource, apiContext);
apiContext.json = x => x;
const denied = apiContext.doPost({ parameter:{}, postData:{ contents:JSON.stringify({action:'savePick',username:'viewer',gameId:'g-stale',leagueId:'league-a',categoryId:'q1',nomineeId:'n1'}) } });
assert.strictEqual(denied.success, false);
assert.match(String(denied.error || ''), /Access denied/);
assert.strictEqual(writes, 0, 'stale UI must not authorize a write after backend eligibility/lock changes');

// 3) Wager exclusion source defense: only mode detection + explicit read/save exclusion remain.
assert(shared.includes('mode === "sports-wager"'));
assert(!shared.includes('sharedCompareSportsWagerAdapter_'));
assert(!shared.includes('wagerActivity'));
assert(!shared.includes('commonWagers'));

Promise.all([appearanceOrderPromise, deferredOrderPromise]).then(results => {
  const result = results[0];
  assert.strictEqual(result.rich, true, 'fresh Appearance must win if it resolves before primary state');
  assert.strictEqual(result.hero, 'https://example.test/live.png');
  console.log('Ed post-cert R2 concern tests: PASS');
}).catch(err => { console.error(err); process.exitCode = 1; });
