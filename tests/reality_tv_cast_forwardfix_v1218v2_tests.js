#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');

const api = fs.readFileSync('frontend/js/api.js', 'utf8');
const apiMirror = fs.readFileSync('frontend/api.js', 'utf8');
const backend = fs.readFileSync('backend/Api.js', 'utf8');
const season = fs.readFileSync('backend/engines/RealityTvSeasonEngine.js', 'utf8');
const appHtml = fs.readFileSync('frontend/app.html', 'utf8');

assert.strictEqual(api, apiMirror, 'frontend API mirrors must stay synchronized');

const doGetStart = backend.indexOf('function doGet(e)');
assert(doGetStart >= 0, 'backend doGet route missing');
const doGet = backend.slice(doGetStart);
for (const action of [
  'adminPrepareRealityCastDraft',
  'adminPreviewRealityCastDraft',
  'adminLoadRealityCastDraft',
  'adminPrepareRealityCastImport',
  'adminPreviewRealityCastImport',
  'adminImportRealityCastImport'
]) {
  assert(
    api.includes(`return apiAdminRealityTvRequest_("${action}", payload || {});`),
    `${action} must use direct authenticated Reality transport`
  );
  assert(
    !api.includes(`return apiAdminRealityTvPostRequest_("${action}", payload || {});`),
    `${action} must not use generic POST bridge`
  );
  assert(
    doGet.includes(`if (action === "${action}")`),
    `${action} must have a doGet/JSONP route`
  );
}

for (const [name, ok] of [
  ['v2 staging marker', season.includes('REALITY CAST STAGING FORWARD FIX v1.2.18v2') || season.includes('REALITY CAST STAGING ROWS v1.2.18m2')],
  ['unscoped checked-row recovery', season.includes('function realityTvAdoptUnscopedCastRows_')],
  ['server-owned system fields', season.includes('function realityTvCastImportSystemFields_')],
  ['identity-aware recovery', season.includes('function realityTvCastImportIdentityPresent_')],
  ['checkbox-only rows ignored for placement', season.includes('function realityTvCastImportLastMeaningfulRow_') && season.includes('header === "__rowNumber" || header === "Import"')],
  ['maintains 24 prepared blank rows', season.includes('Math.max(0, 24 - blankSeasonRows.length)')],
  ['system columns hidden', season.includes('sheet.hideColumns(3, 6)')],
  ['only two visible frozen columns', season.includes('sheet.setFrozenColumns(Math.min(2, schema.headers.length))')],
  ['checkbox validation preserves selected rows', season.includes('setDataValidation(checkboxRule)')],
  ['old all-sheet insertCheckboxes removed', !season.includes('sheet.getRange(2, importCol + 1, sheet.getMaxRows() - 1, 1).insertCheckboxes();')],
  ['frontend cache marker', appHtml.includes('v1218v2-reality-cast-forward')]
]) {
  assert(ok, name);
}

const appJs = fs.readFileSync('frontend/js/app.js', 'utf8');
assert(appJs.includes('v1218n-reality-production-automation'), 'v1.2.18n Reality automation marker must remain present');

console.log('Reality TV cast forward fixes v1.2.18v2 tests passed.');
