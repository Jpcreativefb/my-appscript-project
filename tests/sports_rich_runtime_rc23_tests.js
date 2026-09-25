#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

function pass(name) {
  console.log("PASS:", name);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function extractRuntime(source) {
  const startNeedle = "/* =========================================================\n   PATTC SPORTS RICH FAMILY — SHARED FRONTEND RUNTIME";
  const start = source.indexOf(startNeedle);
  assert(start >= 0, "Sports Rich runtime start marker missing");
  const endNeedle = '})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));';
  const end = source.indexOf(endNeedle, start);
  assert(end >= 0, "Sports Rich runtime end marker missing");
  return source.slice(start, end + endNeedle.length);
}

function storage() {
  const values = new Map();
  return {
    getItem(k) { return values.has(k) ? values.get(k) : null; },
    setItem(k, v) { values.set(k, String(v)); },
    removeItem(k) { values.delete(k); },
    clear() { values.clear(); }
  };
}

function loadRuntime(runtimeSource, apiResponder) {
  const context = {
    console,
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
    sessionStorage: storage(),
    document: {
      querySelector() { return null; }
    },
    platformImgHtml() { return "<img>"; },
    platformBackgroundAttrs() { return 'data-bg="1"'; },
    PlatformImageEngine: { process() {} }
  };
  context.apiGetGameAppearance = async function(gameId) {
    return apiResponder ? apiResponder(gameId) : null;
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(runtimeSource, context, { filename: "sports-rich-runtime-rc23.js" });
  assert(context.PATTCSportsRich, "PATTCSportsRich was not installed");
  return context;
}

async function runtimeBehavior(runtimeSource) {
  const richBackendBundle = {
    success: true,
    gameId: "g1",
    assignment: {
      ThemeOverrideJSON: JSON.stringify({
        SportsLayoutTemplate: "sports-rich",
        SportsPrimaryColor: "#123456"
      })
    },
    theme: {
      SportsLayoutTemplate: "sports-rich",
      SportsPrimaryColor: "#123456"
    }
  };

  const cleanBackendBundle = {
    success: true,
    gameId: "g1",
    assignment: {
      ThemeOverrideJSON: JSON.stringify({ SportsLayoutTemplate: "clean" })
    },
    theme: { SportsLayoutTemplate: "clean" }
  };

  const deeplyNestedRich = {
    appearance: {
      appearance: {
        success: true,
        gameId: "g1",
        assignment: {
          ThemeOverrideJSON: JSON.stringify({
            SportsLayoutTemplate: "sports-rich",
            SportsAccentColor: "#abcdef"
          })
        },
        theme: {}
      }
    }
  };

  let response = richBackendBundle;
  const ctx = loadRuntime(runtimeSource, async () => response);
  const rich = ctx.PATTCSportsRich;

  assert.strictEqual(rich.version, "rc23-sports-rich-runtime-9020031");
  pass("RC23 Sports Rich runtime version installed");

  assert.strictEqual(rich.layoutValue(deeplyNestedRich), "sports-rich");
  assert.strictEqual(rich.isRich("g1", deeplyNestedRich), true);
  pass("Deeply nested Appearance bundle resolves SportsLayoutTemplate");

  const nestedColors = rich.colors("g1", deeplyNestedRich, "football", "NFL");
  assert.strictEqual(String(nestedColors.accent).toLowerCase(), "#abcdef");
  pass("Nested assignment ThemeOverrideJSON is read directly");

  const staleProvidedClean = {
    appearance: {
      assignment: { ThemeOverrideJSON: '{"SportsLayoutTemplate":"clean"}' },
      theme: { SportsLayoutTemplate: "clean" }
    }
  };

  await rich.prepare("g1");
  assert.strictEqual(rich.isRich("g1", staleProvidedClean), true);
  pass("Fresh Rich bundle wins over stale provided Clean page Appearance");

  response = cleanBackendBundle;
  const staleProvidedRich = {
    appearance: {
      assignment: { ThemeOverrideJSON: '{"SportsLayoutTemplate":"sports-rich"}' },
      theme: { SportsLayoutTemplate: "sports-rich" }
    }
  };
  await rich.prepare("g1");
  assert.strictEqual(rich.isRich("g1", staleProvidedRich), false);
  pass("Fresh Clean bundle wins over stale provided Rich page Appearance");

  response = richBackendBundle;
  await rich.prepare("g1");
  assert.strictEqual(rich.isRich("g1", staleProvidedClean), true);
  response = cleanBackendBundle;
  await rich.prepare("g1");
  assert.strictEqual(rich.isRich("g1", staleProvidedRich), false);
  pass("Clean -> Rich -> Clean works for same GameId without storage clear");

  const offlineCtx = loadRuntime(runtimeSource, null);
  delete offlineCtx.apiGetGameAppearance;
  offlineCtx.PATTCSportsRich.remember("offline", deeplyNestedRich);
  assert.strictEqual(offlineCtx.PATTCSportsRich.isRich("offline", deeplyNestedRich), true);
  pass("Provided/cached Appearance remains offline fallback");

  const actualShape = {
    success: true,
    gameId: "actual",
    assignment: {
      ThemeOverrideJSON: '{"SportsLayoutTemplate":"sports-rich"}'
    },
    theme: {
      SportsLayoutTemplate: "sports-rich"
    },
    imagePackItems: [],
    overrides: []
  };
  const shapeCtx = loadRuntime(runtimeSource, async () => actualShape);
  await shapeCtx.PATTCSportsRich.prepare("actual");
  assert.strictEqual(shapeCtx.PATTCSportsRich.isRich("actual"), true);
  pass("Actual AppearanceEngine runtime bundle shape activates Rich");
}

function functionBody(source, name) {
  const marker = "function " + name + "(";
  const start = source.indexOf(marker);
  assert(start >= 0, name + " missing");
  const next = source.indexOf("\nfunction ", start + marker.length);
  return source.slice(start, next >= 0 ? next : source.length);
}

function sourceContracts(repoRoot) {
  const files = {
    wager: path.join(repoRoot, "frontend/js/pages/betting.js"),
    team: path.join(repoRoot, "frontend/js/pages/teamFantasy.js"),
    confidence: path.join(repoRoot, "frontend/js/pages/picks.js"),
    survivor: path.join(repoRoot, "frontend/js/pages/survivor.js")
  };

  for (const file of Object.values(files)) {
    assert(fs.existsSync(file), "Missing source file: " + file);
  }

  const wager = read(files.wager);
  const team = read(files.team);
  const confidence = read(files.confidence);
  const survivor = read(files.survivor);

  const runtimes = [wager, team, confidence, survivor].map(extractRuntime);
  runtimes.forEach((block, index) => {
    assert(block.includes('version: "rc23-sports-rich-runtime-9020031"'),
      "Page runtime copy " + index + " is not RC23");
    assert.strictEqual(block, runtimes[0], "Sports Rich runtime copies drifted");
  });
  pass("All four Sports page modules carry the identical RC23 shared runtime");

  assert(wager.includes("Promise.resolve(PATTCSportsRich.prepare(gameId))"));
  assert(!wager.includes("await PATTCSportsRich.prepare(gameId)"));
  assert(wager.includes("sports-rich-wager"));
  assert(wager.includes("sports-rich-wager-hero"));
  assert(wager.includes("PATTC Credits"));
  assert(/if\s*\(!PATTCSportsRich\.isRich\(gameId\)\)\s*return html/.test(wager));
  pass("Sports Wager Clean/Rich render contract is structurally distinct");
  pass("Sports Wager remains PATTC virtual-credit presentation");

  assert(team.includes("Promise.resolve(PATTCSportsRich.prepare(gameId))"));
  assert(!team.includes("await PATTCSportsRich.prepare(gameId)"));
  assert(team.includes("sports-rich-team-fantasy"));
  assert(team.includes('return ["QB", "RB", "WRTE", "K", "OL", "DL", "LB", "DB"]'));
  assert(team.includes("Choose NFL team"));
  assert(team.includes("teamFantasyChooseTeam_"));
  assert(team.includes("Random Pick"));
  assert(team.includes("Auto Pick"));
  pass("Team Fantasy Rich render retains all eight NFL TEAM slots");
  pass("Team Fantasy existing choose/Random Pick/Auto Pick mechanics remain delegated");

  assert(!confidence.includes("await PATTCSportsRich.prepare(gameId)"));
  assert(confidence.includes("refreshPicksAppearanceUi_"));
  assert(confidence.includes("sports-rich-confidence"));
  assert(confidence.includes("PICKS_PAGE_DATA.isConfidenceGame === true"));
  assert(confidence.includes("updateConfidenceForCategory"));
  assert(confidence.includes("saveConfidenceDraft_"));
  pass("Confidence Rich render remains matchup-pick + confidence-assignment flow");

  assert(survivor.includes("Promise.resolve(PATTCSportsRich.prepare(gameId))"));
  assert(!survivor.includes("await PATTCSportsRich.prepare(gameId)"));
  assert(survivor.includes("sports-rich-survivor"));
  assert(survivor.includes("sports-rich-koth"));
  assert(survivor.includes("payload.sportsMode === true"));
  assert(survivor.includes('payload.mode === "king-of-the-hill"'));
  assert(survivor.includes("survivorSelect_"));
  assert(survivor.includes("survivorSaveCurrent_"));
  pass("Survivor Football Rich render keeps existing selection/save mechanics");

  const kothBody = functionBody(survivor, "sportsRichKothPageHtml_");
  assert(!kothBody.includes("survivorSelect_("));
  assert(!kothBody.includes("survivorSaveCurrent_("));
  assert(/score|strike/i.test(kothBody));
  pass("KOTH Rich renderer contains no weekly pick/save action");

  const cssChecks = [
    ["frontend/css/betting.css", ".sports-rich-wager"],
    ["frontend/css/team-fantasy.css", ".sports-rich-team-fantasy"],
    ["frontend/css/picks.css", ".sports-rich-confidence"],
    ["frontend/css/pages.css", ".sports-rich-survivor"],
    ["frontend/css/pages.css", ".sports-rich-koth"]
  ];
  cssChecks.forEach(([rel, selector]) => {
    const css = read(path.join(repoRoot, rel));
    assert(css.includes(selector), rel + " missing " + selector);
  });
  pass("Rich CSS exists for all five supported Sports families");

  // Launch-performance contract: Appearance remains available and deduplicated,
  // but primary game state/render must not wait on its network response.
  const nonBlockingContracts = [
    [wager, "SPORTS_RICH_WAGER_ORIGINAL_PAGE_", "Wager"],
    [team, "SPORTS_RICH_TF_ORIGINAL_PAGE_", "Team Fantasy"],
    [survivor, "SPORTS_RICH_SURVIVOR_ORIGINAL_PAGE_", "Survivor"]
  ];
  nonBlockingContracts.forEach(([source, baseMarker, label]) => {
    const wrapperAt = source.indexOf("render" + (label === "Wager" ? "Betting" : label === "Team Fantasy" ? "TeamFantasy" : "Survivor") + "Page = async function()");
    const tail = wrapperAt >= 0 ? source.slice(wrapperAt) : source;
    assert(tail.includes("Promise.resolve(PATTCSportsRich.prepare(gameId))"), label + " must retain one deferred Appearance prepare");
    assert(!tail.includes("await PATTCSportsRich.prepare(gameId)"), label + " must not block first render on Appearance");
    assert(tail.includes(baseMarker + ".apply(this, arguments)"), label + " base renderer missing");
  });

  // Confidence uses the existing Picks Appearance hydrator rather than starting
  // a second Sports-Rich request in its wrapper.
  assert(confidence.includes("refreshPicksAppearanceUi_"), "Confidence must hydrate Appearance through the shared Picks redraw path");
  assert(!confidence.includes("await PATTCSportsRich.prepare(gameId)"), "Confidence must not block base render on Sports-Rich Appearance");

  const survivorEnabledBody = functionBody(survivor, "sportsRichSurvivorEnabled_");
  assert(
    survivorEnabledBody.includes("PATTCSportsRich.appearance(gameId, appearance)") &&
    survivorEnabledBody.includes("PATTCSportsRich.layoutValue(bundle)") &&
    survivorEnabledBody.includes('return layout !== "legacy";'),
    "Survivor R3 must use the current player layout unless Legacy is explicitly selected"
  );

  pass("Each Sports family preserves Rich activation while keeping Appearance off the primary render wait path");
}

(async function main() {
  const repoRoot = process.cwd();
  const explicitRuntime = process.argv[2] ? path.resolve(process.argv[2]) : "";
  let runtimeSource = "";

  if (explicitRuntime) {
    runtimeSource = read(explicitRuntime);
  } else {
    const teamPath = path.join(repoRoot, "frontend/js/pages/teamFantasy.js");
    assert(fs.existsSync(teamPath), "Run from repo root or pass the runtime replacement file path.");
    runtimeSource = extractRuntime(read(teamPath));
  }

  await runtimeBehavior(runtimeSource);

  const hasRepo =
    fs.existsSync(path.join(repoRoot, "frontend/js/pages/betting.js")) &&
    fs.existsSync(path.join(repoRoot, "frontend/css/team-fantasy.css"));

  if (hasRepo) {
    sourceContracts(repoRoot);
  } else {
    console.log("INFO: repo source-contract checks skipped in package-only environment.");
  }

  console.log("sports-rich-runtime-rc23-tests: PASS");
})().catch(err => {
  console.error("sports-rich-runtime-rc23-tests: FAIL");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
