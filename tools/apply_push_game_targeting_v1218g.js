#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const files = [
  "frontend/js/app.js",
  "frontend/app.js"
];
const marker = 'if (name === "notifications") url.searchParams.set("module", "v1218g-game-player-targeting");';

for (const rel of files) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(rel + " is missing");
  let text = fs.readFileSync(file, "utf8");
  if (text.includes(marker)) continue;

  const needle = '  url.searchParams.set("hotfix", APP_ROUTE_HOTFIX_VERSION);';
  if (!text.includes(needle)) {
    throw new Error("Could not locate appPageScriptUrl_ hotfix marker in " + rel);
  }

  text = text.replace(needle, needle + "\n  " + marker);
  fs.writeFileSync(file, text);
  console.log("Updated " + rel);
}

const a = fs.readFileSync(path.join(root, files[0]), "utf8");
const b = fs.readFileSync(path.join(root, files[1]), "utf8");
if (a !== b) throw new Error("frontend app mirrors are not synchronized after v1.2.18g patch");

console.log("v1.2.18g notification route cache-buster applied.");
