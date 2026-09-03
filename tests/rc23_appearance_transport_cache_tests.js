const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const repo = path.resolve(process.argv[2] || ".");
function read(rel) {
  return fs.readFileSync(path.join(repo, rel), "utf8");
}
function extractFunction(source, name) {
  const patterns = [
    "async function " + name + "(",
    "function " + name + "("
  ];
  let start = -1;
  for (const pattern of patterns) {
    start = source.indexOf(pattern);
    if (start >= 0) break;
  }
  assert(start >= 0, "Missing function " + name);
  const brace = source.indexOf("{", start);
  assert(brace >= 0, "Missing body for " + name);
  let depth = 0;
  let quote = "";
  let template = false;
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i], next = source[i + 1] || "";
    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === quote) quote = "";
      continue;
    }
    if (template) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === "`") { template = false; continue; }
      // Template-expression braces are rare in target functions; count them.
    } else {
      if (ch === "/" && next === "/") { lineComment = true; i++; continue; }
      if (ch === "/" && next === "*") { blockComment = true; i++; continue; }
      if (ch === "'" || ch === '"') { quote = ch; continue; }
      if (ch === "`") { template = true; continue; }
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("Unclosed function " + name);
}
function storage() {
  const data = new Map();
  return {
    get length() { return data.size; },
    key(i) { return Array.from(data.keys())[i] || null; },
    getItem(k) { k = String(k); return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { data.set(String(k), String(v)); },
    removeItem(k) { data.delete(String(k)); },
    _data: data
  };
}
function classList() {
  const set = new Set();
  return {
    add(...names) { names.forEach(x => set.add(x)); },
    remove(...names) { names.forEach(x => set.delete(x)); },
    contains(name) { return set.has(name); }
  };
}

async function main() {
  const api = read("frontend/js/api.js");
  const apiMirror = read("frontend/api.js");
  const app = read("frontend/js/app.js");
  const appMirror = read("frontend/app.js");
  const pwa = read("frontend/js/pwa.js");
  const appHtml = read("frontend/app.html");
  const indexHtml = read("frontend/index.html");
  const sw = read("frontend/sw.js");

  // A. Credential-free native Appearance transport.
  assert.strictEqual(api, apiMirror, "api.js mirror drift");
  const appearanceApi = extractFunction(api, "apiGetGameAppearance");
  assert(appearanceApi.includes('apiRaw_("getGameAppearance"'), "getGameAppearance must use raw GET/JSONP transport");
  assert(!/\bapi\s*\(\s*["']getGameAppearance/.test(appearanceApi), "getGameAppearance must not use generic authenticated api()");
  assert(!/\b(token|username|session|bearer)\b/i.test(
    appearanceApi.replace(/\/\/.*$/gm, "")
  ), "getGameAppearance must not add token/username/session/bearer data");
  const apiRawBody = extractFunction(api, "apiRaw_");
  assert(!apiRawBody.includes("apiAttachSession_"), "apiRaw_ must remain credential-free");

  // H + release/cache boundary.
  const NEW_RELEASE = "v1219rc23-appearance-transport-cache-r2";
  const OLD_RELEASE = "v1219rc20-postdeploy-first-entry-performance-r2";
  assert(appHtml.includes('meta name="pattc-release" content="' + NEW_RELEASE + '"'), "new app.html PATTC release token missing");
  assert(!appHtml.includes(OLD_RELEASE), "stale RC20 release token remains in app.html");
  assert(indexHtml.includes('meta name="pattc-release" content="' + NEW_RELEASE + '"'), "login shell release token not synchronized");
  assert(pwa.includes('window.PATTC_FRONTEND_RELEASE || "' + NEW_RELEASE + '"'), "pwa.js fallback release not synchronized");
  assert(app.includes('window.PATTC_FRONTEND_RELEASE || "' + NEW_RELEASE + '"'), "app.js fallback release not synchronized");
  assert(sw.includes('PATTC_SW_RELEASE_MARKER = "' + NEW_RELEASE + '"'), "service-worker audit marker not synchronized");
  assert(sw.includes('new URL(self.location.href).searchParams.get("v")'), "service worker must derive release from ?v=");
  assert(sw.includes('const AWARDS_CACHE = "awards-app-" + AWARDS_RELEASE;'), "cache namespace must derive from canonical worker release");
  assert(pwa.includes('const SW_URL = "./sw.js?v=" + encodeURIComponent(PWA_VERSION);'), "worker URL must derive from PATTC_FRONTEND_RELEASE");

  // I. No storage-wide clearing workaround.
  for (const [name, source] of [["app.js", app], ["pwa.js", pwa], ["api.js", api]]) {
    assert(!source.includes("localStorage.clear("), name + " must not clear localStorage globally");
    assert(!source.includes("sessionStorage.clear("), name + " must not clear sessionStorage globally");
  }

  // J. No RC23 service-worker unregister workaround. Baseline retains a local-dev-only unregister path.
  const resumeMarker = "RC23 APPEARANCE FOREGROUND REVALIDATION";
  const resumeStart = pwa.indexOf(resumeMarker);
  assert(resumeStart >= 0, "RC23 PWA resume lifecycle block missing");
  const resumeTail = pwa.slice(resumeStart);
  assert(!resumeTail.includes(".unregister("), "RC23 Appearance lifecycle must not require service-worker unregister");

  // Evaluate the native snapshot block + real navigate() function.
  const snapshotStart = app.indexOf("const APP_PAGE_SNAPSHOT_CACHE = {};");
  const navMarker = "/* ======================\n   NAVIGATION CORE";
  const navStart = app.indexOf(navMarker, snapshotStart);
  assert(snapshotStart >= 0 && navStart > snapshotStart, "snapshot block boundaries missing");
  const snapshotBlock = app.slice(snapshotStart, navStart);
  const navigateFn = extractFunction(app, "navigate");

  let now = 1_000_000;
  let activeGameId = "game-a";
  let renderCount = 0;
  let appearanceCalls = 0;
  let server = {
    "game-a": "clean",
    "game-b": "clean"
  };
  const ss = storage();
  const ls = storage();
  const appNode = { innerHTML: "", classList: classList() };
  const ctx = {
    console,
    Promise,
    JSON,
    Set,
    Object,
    Array,
    String,
    Number,
    Math,
    encodeURIComponent,
    decodeURIComponent,
    Date: { now: () => now },
    navigator: { onLine: true },
    sessionStorage: ss,
    localStorage: ls,
    APP_STATE: { currentPage: "dashboard", gameId: "game-a" },
    getSession() { return { username: "User" }; },
    getFrontendGameId() { return activeGameId; },
    getFrontendLeagueId() { return "league"; },
    async apiGetGameAppearance(gameId) {
      appearanceCalls++;
      const layout = server[gameId] || "clean";
      return {
        success: true,
        gameId,
        assignment: {
          ThemeOverrideJSON: JSON.stringify({
            RealityLayoutTemplate: layout === "cinematic" ? "cinematic" : "clean",
            SportsLayoutTemplate: layout === "sports-rich" ? "sports-rich" : "clean"
          }),
          UpdatedAt: layout
        },
        theme: {
          RealityLayoutTemplate: layout === "cinematic" ? "cinematic" : "clean",
          SportsLayoutTemplate: layout === "sports-rich" ? "sports-rich" : "clean"
        },
        themePackId: "default",
        imagePackId: ""
      };
    },
    document: {
      getElementById(id) { return id === "app" ? appNode : null; },
      querySelectorAll() { return []; }
    },
    window: {
      setTimeout(fn) { fn(); return 1; },
      location: { hash: "", pathname: "/app.html", search: "" },
      history: {
        pushState() {},
        replaceState() {}
      }
    },
    requestAnimationFrame(fn) { fn(); },
    adminConfirmLeaveDirtyGameForms_() { return true; },
    appWriteRouteHistory_() {},
    setActiveNav() {},
    hideLoader() {},
    showLoader() {},
    APP_LOADER_STATE: { visible: false },
    appProgressiveRouteShell_() { return ""; },
    appPaintProgressiveRouteShell_: async () => false,
    isAdminPage_() { return false; },
    ensurePageModules_: async () => {},
    setPageLoadStep() {},
    startPageLoadPulse_() {},
    stopPageLoadPulse_() {},
    adminUiEnhancePage() {},
    async renderPage(page) {
      renderCount++;
      const layout = server[activeGameId] || "clean";
      appNode.innerHTML = '<main data-render="' + layout + '">' + layout + "</main>";
    }
  };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(snapshotBlock + "\n" + navigateFn, ctx);

  function snapshotStorageKey(gameId, page = "picks") {
    const key = ["user", gameId, "league", "", page].join("|");
    return "pattcPageSnapshot:" + encodeURIComponent(key);
  }
  async function seedSnapshot(gameId, layout, html) {
    activeGameId = gameId;
    ctx.APP_STATE.gameId = gameId;
    server[gameId] = layout;
    await ctx.appRevalidateGameAppearance_(gameId);
    ctx.APP_STATE.currentPage = "picks";
    appNode.innerHTML = html || '<main data-render="' + layout + '">' + layout + "</main>";
    ctx.appCapturePageSnapshot_("picks", appNode);
    assert(ss.getItem(snapshotStorageKey(gameId)), "snapshot was not persisted for " + gameId);
    ctx.APP_STATE.currentPage = "dashboard";
    appNode.innerHTML = "<main>home</main>";
  }

  // B. unchanged Appearance permits snapshot reuse.
  await seedSnapshot("game-a", "clean", '<main id="cached-clean">clean</main>');
  now += 30_000;
  renderCount = 0;
  const callsBeforeReuse = appearanceCalls;
  await ctx.navigate("picks");
  assert(appearanceCalls > callsBeforeReuse, "cached snapshot must be server-revalidated before reuse");
  assert.strictEqual(renderCount, 0, "unchanged <45s snapshot should be reused without real renderer");
  assert(appNode.innerHTML.includes("cached-clean"), "unchanged cached HTML was not reused");

  // C + D. Admin changes while PWA stays foregrounded; next SPA nav rejects <45s old snapshot on FIRST navigation.
  ctx.APP_STATE.currentPage = "dashboard";
  appNode.innerHTML = "<main>home</main>";
  server["game-a"] = "cinematic";
  now += 10_000; // snapshot remains <45s old
  renderCount = 0;
  await ctx.navigate("picks");
  assert.strictEqual(renderCount, 1, "changed fresh snapshot must execute real renderer on first navigation");
  assert(appNode.innerHTML.includes("cinematic"), "first navigation did not render changed Appearance");
  assert(!appNode.innerHTML.includes("cached-clean"), "old <45s cached DOM was accepted");

  // E. ~5-minute snapshot also rejects on FIRST navigation.
  ctx.APP_STATE.currentPage = "dashboard";
  appNode.innerHTML = "<main>home</main>";
  // Current Cinematic render was captured by navigate; age it to ~5 minutes, then switch back.
  server["game-a"] = "clean";
  now += 5 * 60 * 1000;
  renderCount = 0;
  await ctx.navigate("picks");
  assert.strictEqual(renderCount, 1, "changed ~5-minute snapshot must execute real renderer on first navigation");
  assert(appNode.innerHTML.includes('data-render="clean"'), "5-minute first navigation did not render current Appearance");

  // F. Game A invalidation preserves Game B.
  await seedSnapshot("game-b", "clean", '<main id="game-b-cache">game-b</main>');
  const gameBStorageKey = snapshotStorageKey("game-b");
  assert(ss.getItem(gameBStorageKey), "Game B snapshot missing before isolation test");

  activeGameId = "game-a";
  ctx.APP_STATE.gameId = "game-a";
  server["game-a"] = "sports-rich";
  ctx.APP_STATE.currentPage = "dashboard";
  appNode.innerHTML = "<main>home</main>";
  // Game A currently has a stored snapshot from the prior render.
  await ctx.navigate("picks");
  assert(ss.getItem(gameBStorageKey), "Game A invalidation unnecessarily removed Game B snapshot");

  // G. Foreground + BFCache pageshow invoke canonical current-game Appearance revalidation.
  const pwaBlockStart = pwa.lastIndexOf("/* ==============================\n   RC23 APPEARANCE FOREGROUND REVALIDATION");
  assert(pwaBlockStart >= 0, "RC23 PWA lifecycle marker missing");
  const pwaBlock = pwa.slice(pwaBlockStart);
  const listeners = {};
  const pwaCtx = {
    console,
    Promise,
    document: {
      visibilityState: "hidden",
      addEventListener(name, fn) { listeners["document:" + name] = fn; }
    },
    window: {
      addEventListener(name, fn) { listeners["window:" + name] = fn; }
    },
    resumeCalls: 0,
    async appRevalidateCurrentGameAppearance_(options) {
      pwaCtx.resumeCalls++;
      assert.strictEqual(options.rerender, true);
      return { verified: true, changed: false };
    }
  };
  vm.createContext(pwaCtx);
  vm.runInContext(pwaBlock, pwaCtx);
  pwaCtx.document.visibilityState = "visible";
  listeners["document:visibilitychange"]();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.strictEqual(pwaCtx.resumeCalls, 1, "visibility resume must revalidate Appearance");
  listeners["window:pageshow"]({ persisted: true });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.strictEqual(pwaCtx.resumeCalls, 2, "persisted pageshow must revalidate Appearance");

  // Static proof that navigate does not accept snapshot before canonical revalidation.
  const navigateSource = navigateFn;
  const revalidatePos = navigateSource.indexOf("await appPrepareAppearanceSnapshotReuse_(page)");
  const readPos = navigateSource.indexOf("appReadPageSnapshot_(page, appearanceCheck.fingerprint)");
  assert(revalidatePos >= 0 && readPos > revalidatePos, "snapshot read/acceptance occurs before Appearance revalidation");

  console.log("PASS: RC23 correction-round focused tests A-J.");
}

main().catch(err => {
  console.error(err && err.stack || err);
  process.exit(1);
});
