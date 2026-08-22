#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = process.cwd();
const marker = "v1218f6-pattc-predicts";
function read(rel) {
  const file = path.join(root, rel);
  assert(fs.existsSync(file), rel + " must exist");
  return fs.readFileSync(file, "utf8");
}

const manifest = read("frontend/manifest.webmanifest");
assert(/"name"\s*:\s*"PATTC Predicts"/.test(manifest), "manifest name must be PATTC Predicts");
assert(/"short_name"\s*:\s*"PATTC Predicts"/.test(manifest), "manifest short_name must be PATTC Predicts");

const appHtml = read("frontend/app.html");
assert(appHtml.includes("<title>PATTC Predicts</title>"), "app.html title must be PATTC Predicts");
assert(appHtml.includes('content="PATTC Predicts"'), "app.html PWA metadata must use PATTC Predicts");
assert(appHtml.includes("🏆 PATTC Predicts"), "app header must use PATTC Predicts");
assert(appHtml.includes(marker), "app.html cache marker missing");

const indexHtml = read("frontend/index.html");
assert(indexHtml.includes("<title>PATTC Predicts</title>"), "login page title must be PATTC Predicts");
assert(indexHtml.includes(marker), "index.html cache marker missing");

const pwa = read("frontend/js/pwa.js");
assert(pwa.includes("PATTC Predicts device"), "device label must use new brand");
assert(pwa.includes(marker), "PWA cache marker missing");

const sw = read("frontend/sw.js");
assert(sw.includes('title: "PATTC Predicts"'), "push fallback title must use new brand");
assert(sw.includes(marker), "service-worker cache marker missing");

for (const rel of ["frontend/js/app.js", "frontend/app.js"]) {
  const text = read(rel);
  assert(text.includes(marker), rel + " runtime cache marker missing");
}

const notifications = read("frontend/js/pages/notifications.js");
assert(notifications.includes('value="PATTC Predicts"'), "notification composer default must use new brand");

const gateway = read("functions/api/push-send.js");
assert(gateway.includes('title || "PATTC Predicts"'), "push gateway fallback title must use new brand");

const engine = read("backend/engines/NotificationsEngine.js");
assert(engine.includes('title || "PATTC Predicts"'), "backend notification fallback title must use new brand");

for (const rel of [
  "frontend/app.html",
  "frontend/index.html",
  "frontend/js/app.js",
  "frontend/app.js",
  "frontend/js/pwa.js",
  "frontend/js/pages/notifications.js",
  "frontend/sw.js",
  "functions/api/push-send.js",
  "backend/engines/NotificationsEngine.js"
]) {
  const text = read(rel);
  assert(!text.includes("Awards App"), rel + " still contains old visible brand Awards App");
  assert(!text.includes("PATTC Predictions"), rel + " still contains PATTC Predictions");
  assert(!text.includes("PATTC PREDICTIONS"), rel + " still contains PATTC PREDICTIONS");
}

console.log("v1.2.18f6 PATTC Predicts branding/cache recovery tests passed.");
