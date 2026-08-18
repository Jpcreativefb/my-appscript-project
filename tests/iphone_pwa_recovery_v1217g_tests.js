const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const pwa = read("frontend/js/pwa.js");
const sw = read("frontend/sw.js");
const appHtml = read("frontend/app.html");
const indexHtml = read("frontend/index.html");

assert(pwa.includes('v1217g-iphone-pwa-recovery'), "PWA registration version was not bumped for v1.2.17g.");
assert(pwa.includes('registration.update()'), "PWA does not force an immediate service-worker update check.");
assert(pwa.includes('controllerchange'), "PWA does not reload once when the replacement worker takes control.");
assert(sw.includes('v1217g-iphone-pwa-recovery'), "Service-worker cache was not bumped for v1.2.17g.");
assert(sw.includes('{ ignoreSearch: true }'), "Versioned asset requests cannot fall back to core cached assets.");
assert(sw.includes('return cache.match("./app.html")'), "Authenticated app navigation does not fall back to app.html.");
assert(appHtml.includes('js/pwa.js?v=v1217g-iphone-pwa-recovery'), "Authenticated shell does not request the v1.2.17g PWA bootstrap.");
assert(indexHtml.includes('js/pwa.js?v=v1217g-iphone-pwa-recovery'), "Login shell does not request the v1.2.17g PWA bootstrap.");
assert(appHtml.includes('js/api.js?v=v1217g-iphone-pwa-recovery'), "Authenticated shell does not bust the API client cache.");
assert(indexHtml.includes('js/api.js?v=v1217g-iphone-pwa-recovery'), "Login shell does not bust the API client cache.");

console.log("PASS: iPhone PWA recovery v1.2.17g");
