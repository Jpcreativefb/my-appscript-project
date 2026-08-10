const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const corePath = path.join(root, 'external-engines/external-results-hub/HubCore.js');
const managerPath = path.join(root, 'external-engines/external-results-hub/MappingManagerServer.js');
const htmlPath = path.join(root, 'external-engines/external-results-hub/MappingManager.html');

const core = fs.readFileSync(corePath, 'utf8');
const manager = fs.readFileSync(managerPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

assert(core.includes('.addItem("Open Mapping Manager", "showExternalResultsMappingManager")'),
  'Hub menu must expose Open Mapping Manager');

[
  'showExternalResultsMappingManager',
  'getExternalResultsMappingManagerBootstrap',
  'searchExternalResultsMappingMarkets',
  'saveExternalResultsMapping',
  'setExternalResultsMappingActive',
  'erhMappingManagerReadMainTargets_'
].forEach(name => {
  assert(manager.includes(`function ${name}`), `${name} is missing`);
});

assert(manager.includes('AutoSettle: false'), 'Mapping save must force AutoSettle false');
assert(manager.includes('RequireAdminReview: true'), 'Mapping save must force administrator review');
assert(manager.includes('ResultKey: "winning-outcome"'), 'Mapping save must use winning-outcome result key');
assert(manager.includes('ERH_MAPPING_MANAGER_PROVIDERS = ["kalshi", "polymarket"]'),
  'Mapping Manager must stay scoped to read-only prediction providers');
assert(manager.includes('ExternalSubjectId: externalMarketId + ":" + erhSlug_(expectedOutcome)'),
  'Mapping Manager must link the selected provider outcome subject');
assert(manager.includes('erhUpsertObject_('), 'Mapping Manager must persist through the canonical Hub upsert helper');
assert(manager.includes('["MappingId"]'), 'Mapping updates must be keyed by MappingId');

[
  'Choose provider result',
  'Choose Awards App target',
  'Save mapping',
  'Existing mappings',
  'Auto settlement OFF',
  'Administrator review REQUIRED'
].forEach(text => {
  assert(html.includes(text), `Mapping UI missing: ${text}`);
});

assert(html.includes('google.script.run'), 'Mapping UI must call Apps Script server functions');
assert(!html.includes('AutoSettle" type="checkbox"'), 'UI must not expose an AutoSettle checkbox');

console.log('External Results Hub Mapping Manager v1.2.11 tests passed.');
