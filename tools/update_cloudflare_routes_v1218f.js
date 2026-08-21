#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repo = process.cwd();
const routePath = path.join(repo, 'frontend', '_routes.json');
const wanted = ['/api/push-public-key', '/api/push-send'];

let config = { version: 1, include: [], exclude: [] };
if (fs.existsSync(routePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(routePath, 'utf8'));
    if (parsed && typeof parsed === 'object') config = parsed;
  } catch (err) {
    console.error('STOP: frontend/_routes.json is not valid JSON.');
    console.error(err && err.message ? err.message : String(err));
    process.exit(1);
  }
}

config.version = Number(config.version || 1);
if (!Array.isArray(config.include)) config.include = [];
if (!Array.isArray(config.exclude)) config.exclude = [];

// Keep every existing route and add only the Awards App push endpoints.
for (const route of wanted) {
  if (!config.include.includes(route)) config.include.push(route);
}

fs.mkdirSync(path.dirname(routePath), { recursive: true });
fs.writeFileSync(routePath, JSON.stringify(config, null, 2) + '\n');

console.log('Cloudflare Pages Function routes ready:');
for (const route of wanted) console.log('  ' + route);
