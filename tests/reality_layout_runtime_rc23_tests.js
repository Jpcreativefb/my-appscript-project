"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const picksPath = process.env.RC23_PICKS_FILE || path.join(process.cwd(), "frontend/js/pages/picks.js");
const source = fs.readFileSync(picksPath, "utf8");

function topLevelFunction(name) {
  const start = source.indexOf("function " + name + "(");
  assert(start >= 0, "missing function " + name);
  const next = source.indexOf("\nfunction ", start + 9);
  return source.slice(start, next >= 0 ? next : source.length);
}

function nestedFunction(name, afterMarker) {
  const marker = afterMarker ? source.indexOf(afterMarker) : 0;
  assert(marker >= 0, "missing marker " + afterMarker);
  const needle = "  function " + name + "(";
  const start = source.indexOf(needle, marker);
  assert(start >= 0, "missing nested function " + name);
  const brace = source.indexOf("{", start + needle.length);
  assert(brace >= 0, "missing function body " + name);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start + 2, i + 1);
    }
  }
  throw new Error("unterminated function " + name);
}

const fakeStorage = Object.create(null);
const context = {
  console,
  URLSearchParams,
  localStorage: {
    getItem(key) { return Object.prototype.hasOwnProperty.call(fakeStorage, key) ? fakeStorage[key] : null; },
    setItem(key, value) { fakeStorage[key] = String(value); },
    removeItem(key) { delete fakeStorage[key]; }
  },
  window: { location: { search: "" } },
  PICKS_PAGE_DATA: {
    gameId: "survivor-50-test-season-50t-2026",
    game: { name: "Survivor — Season 50T" },
    realityTvView: {
      enabled: true,
      season: { showName: "Survivor", seasonName: "Season 50T" }
    },
    appearance: null
  }
};
context.window.localStorage = context.localStorage;
vm.createContext(context);

[
  "realityTvAppearanceValue_",
  "realityTvParseObject_",
  "realityTvThemeOverrideObject_",
  "realityTvNormalizeLayoutTemplate_",
  "realityTvLayoutTemplate_",
  "realityTvMountedLayoutTemplate_",
  "realityTvApplyMountedLayoutTemplate_"
].forEach(name => vm.runInContext(topLevelFunction(name), context));

context.escapeHtml = value => String(value == null ? "" : value)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
context.escapeAttr = context.escapeHtml;
context.realityTvHeaderPresentation_ = () => ({
  showName: "Survivor",
  seasonName: "Season 50T",
  episodeName: "Episode 3",
  episodeStateLabel: "OPEN",
  stateClass: "state-open",
  picked: 1,
  total: 3,
  percent: 33,
  schedule: "Locks Wed 8:00 PM"
});
context.realityTvCinematicHeroAttrs_ = () => "";
context.realityTvCinematicStyleAttr_ = () => "";
context.realityTvCinematicShowLogoHtml_ = reality => `<div class="reality-cinematic-show-title">${context.escapeHtml(reality.showName)}</div>`;
context.realityTvCinematicStateHelp_ = () => "Make predictions.";
context.hasConfidencePointsCategories = () => false;
context.hasStakedPointsCategories = () => false;
context.getConfidenceGameInstructions = () => "";
context.renderConfidenceSummaryBar = () => "";
context.renderStakedPointsSummaryBar = () => "";
vm.runInContext(topLevelFunction("renderRealityTvCinematicHeader_"), context);
vm.runInContext(topLevelFunction("renderPicksPageHeader_"), context);

function appearance(layout, assignmentOnly) {
  const override = JSON.stringify({ RealityLayoutTemplate: layout });
  if (assignmentOnly) return { assignment: { ThemeOverrideJSON: override } };
  return {
    theme: { RealityLayoutTemplate: layout },
    assignment: { ThemeOverrideJSON: override }
  };
}

function headerSignature() {
  const html = vm.runInContext("renderPicksPageHeader_()", context);
  return {
    html,
    clean: /reality-game-hero/.test(html),
    cinematic: /reality-cinematic-hero/.test(html)
  };
}

// SAME GameId: Clean -> Cinematic -> Clean must be materially different.
context.PICKS_PAGE_DATA.appearance = appearance("clean");
assert.strictEqual(vm.runInContext("realityTvLayoutTemplate_()", context), "clean");
const clean1 = headerSignature();
assert.strictEqual(clean1.clean, true, "Clean must render Clean hero DOM");
assert.strictEqual(clean1.cinematic, false, "Clean must not render Cinematic hero DOM");

context.PICKS_PAGE_DATA.appearance = appearance("cinematic");
assert.strictEqual(vm.runInContext("realityTvLayoutTemplate_()", context), "cinematic");
const cinematic = headerSignature();
assert.strictEqual(cinematic.cinematic, true, "Cinematic must render Cinematic hero DOM");
assert.strictEqual(cinematic.clean, false, "Cinematic must not render Clean hero DOM");
assert.notStrictEqual(clean1.html, cinematic.html, "Clean and Cinematic rendered DOM must differ");

context.PICKS_PAGE_DATA.appearance = appearance("clean");
assert.strictEqual(vm.runInContext("realityTvLayoutTemplate_()", context), "clean");
const clean2 = headerSignature();
assert.strictEqual(clean2.clean, true, "switching back must restore Clean DOM");
assert.strictEqual(clean2.cinematic, false, "switching back must remove Cinematic DOM");

// Real Appearance bundle fallback: assignment ThemeOverrideJSON alone is sufficient.
context.PICKS_PAGE_DATA.appearance = appearance("cinematic", true);
assert.strictEqual(vm.runInContext("realityTvLayoutTemplate_()", context), "cinematic");

// Existing normalized theme wins over stale mounted DOM/local preference.
fakeStorage["pattcRealityTemplate:" + context.PICKS_PAGE_DATA.gameId] = "cinematic";
context.PICKS_PAGE_DATA.appearance = appearance("clean");
assert.strictEqual(vm.runInContext("realityTvLayoutTemplate_()", context), "clean");

// Root DOM class transition: Clean -> Cinematic -> Clean.
function classListFixture(initial) {
  const values = new Set(initial || []);
  return {
    contains(v) { return values.has(v); },
    toggle(v, force) { if (force) values.add(v); else values.delete(v); },
    values
  };
}
const attrs = Object.create(null);
const page = {
  classList: classListFixture([]),
  getAttribute(name) { return attrs[name] || ""; },
  setAttribute(name, value) { attrs[name] = String(value); }
};
assert.strictEqual(vm.runInContext("realityTvMountedLayoutTemplate_", context)(page), "clean");
vm.runInContext("realityTvApplyMountedLayoutTemplate_", context)(page, "cinematic");
assert.strictEqual(page.classList.contains("reality-layout-cinematic"), true);
assert.strictEqual(attrs["data-reality-layout"], "cinematic");
vm.runInContext("realityTvApplyMountedLayoutTemplate_", context)(page, "clean");
assert.strictEqual(page.classList.contains("reality-layout-cinematic"), false);
assert.strictEqual(attrs["data-reality-layout"], "clean");

// Survivor Reality family detection cannot regress.
const cinematicMarker = "PATTC REALITY CINEMATIC — VISUAL FIDELITY CORRECTION R2";
context.object_ = value => value && typeof value === "object" ? value : {};
vm.runInContext(nestedFunction("showKey_", cinematicMarker), context);
context.PICKS_PAGE_DATA.realityTvView = {
  enabled: true,
  season: { showType: "Reality", showName: "Survivor", seasonName: "Season 50T" }
};
context.PICKS_PAGE_DATA.game = { name: "Survivor — Season 50T" };
assert.strictEqual(vm.runInContext("showKey_()", context), "survivor");

// Active Clean and Cinematic layers must both consume the canonical resolver.
const cleanMarker = "PATTC REALITY — ENHANCED CLEAN R3";
const cleanLayout = nestedFunction("layout_", cleanMarker);
assert(/explicitLayout_\(\)/.test(cleanLayout), "Clean R3 layout must delegate to canonical explicit resolver");
const explicit = nestedFunction("explicitLayout_", cleanMarker);
assert(/realityTvLayoutTemplate_\(\)/.test(explicit), "Clean R3 explicit resolver must call canonical resolver");
const selected = nestedFunction("selectedCinematic_", cinematicMarker);
assert(/realityTvLayoutTemplate_\(\)/.test(selected), "Cinematic R2 must call canonical resolver");
assert(!/classList|querySelector|localStorage/.test(selected), "Cinematic selection must not infer layout from mounted DOM/storage");

// Async Appearance hydration must evaluate remount after cache and live API application.
const hydrate = topLevelFunction("hydrateConfidenceAppearance_");
const remountCalls = (hydrate.match(/realityTvRemountPlayerLayoutIfNeeded_\(\)/g) || []).length;
assert(remountCalls >= 2, "Appearance hydration must remount-check after cached and live appearance");

// Structural remount must be guarded and must not touch backend/game mechanics.
const remount = topLevelFunction("realityTvRemountPlayerLayoutIfNeeded_");
assert(/PICKS_REALITY_LAYOUT_REMOUNTING/.test(remount), "structural remount must be guarded");
assert(!/apiSave|apiGet|google\.script|fetch\(/.test(remount), "structural remount must remain presentation-only");

console.log("RC23 Reality layout runtime focused tests: PASS (Clean -> Cinematic -> Clean + Survivor)");
