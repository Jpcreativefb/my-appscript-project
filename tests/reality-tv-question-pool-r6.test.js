const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const repo = process.env.PATTC_REPO_ROOT || process.cwd();
const extensionPath = path.join(repo, 'backend/engines/ZZRealityTvQuestionPoolR6.js');
const source = fs.readFileSync(extensionPath, 'utf8');
const context = { console, Math, Date, JSON, Object, Array, String, Number, Boolean, Error, isFinite };
vm.createContext(context);
vm.runInContext(source, context, { filename: extensionPath });

function call(expr) { return vm.runInContext(expr, context); }
function set(name, value) { context[name] = value; }
function ids(rows) { return Array.from(rows, row => String(row.TemplateId)); }

const templates = [
  { TemplateId: 'core-a', Enabled: true, RequiredCore: true, RandomEligible: false },
  { TemplateId: 'random-b', Enabled: true, RequiredCore: false, RandomEligible: true },
  { TemplateId: 'random-c', Enabled: true, RequiredCore: false, RandomEligible: true },
  { TemplateId: 'random-d', Enabled: true, RequiredCore: false, RandomEligible: true },
  { TemplateId: 'manual-e', Enabled: true, RequiredCore: false, RandomEligible: false },
  { TemplateId: 'disabled-f', Enabled: false, RequiredCore: false, RandomEligible: true }
];
set('__templates', templates);
set('__zeroRng', () => 0);

assert.deepStrictEqual(ids(call('realityTvR6SelectTemplates_(__templates,{enabled:false,randomCount:2},{},__zeroRng)')),
  ['core-a','random-b','random-c','random-d','manual-e']);
assert(ids(call('realityTvR6SelectTemplates_(__templates,{enabled:true,randomCount:1},{},__zeroRng)')).includes('core-a'));
assert(!ids(call('realityTvR6SelectTemplates_(__templates,{enabled:true,randomCount:4},{},__zeroRng)')).includes('manual-e'));
assert(!ids(call('realityTvR6SelectTemplates_(__templates,{enabled:true,randomCount:9},{},__zeroRng)')).includes('disabled-f'));
assert.strictEqual(call('realityTvR6SelectTemplates_(__templates,{enabled:true,randomCount:2},{},__zeroRng)').length, 3);
assert.strictEqual(ids(call('realityTvR6SelectTemplates_(__templates,{enabled:true,randomCount:2},{},__zeroRng)')).filter(id => id !== 'core-a').length, 2);

set('__dupes', templates.concat([{ TemplateId:'random-b', Enabled:true, RequiredCore:false, RandomEligible:true }]));
const uniqueIds = ids(call('realityTvR6SelectTemplates_(__dupes,{enabled:true,randomCount:9},{},__zeroRng)'));
assert.strictEqual(new Set(uniqueIds).size, uniqueIds.length);

set('__history', [
  { EpisodeNumber:4, TemplateId:'random-b' },
  { EpisodeNumber:3, TemplateId:'random-c' },
  { EpisodeNumber:1, TemplateId:'random-d' }
]);
const recent = call('realityTvR6RecentUsage_(__history,5,2)');
set('__recent', recent);
const avoided = ids(call('realityTvR6SelectTemplates_(__templates,{enabled:true,randomCount:1},__recent,__zeroRng)'));
assert(avoided.includes('random-d'));
assert(!avoided.includes('random-b'));
assert(!avoided.includes('random-c'));
const relaxed = ids(call('realityTvR6SelectTemplates_(__templates,{enabled:true,randomCount:3},__recent,__zeroRng)'));
assert.strictEqual(relaxed.length, 4);
assert(relaxed.includes('random-b') && relaxed.includes('random-c') && relaxed.includes('random-d'));

set('realityTvQuestionTemplatesForSeason_', () => templates);
set('realityTvEpisodeQuestionsForSeason_', () => [{ EpisodeId:'ep-5', EpisodeNumber:5, TemplateId:'random-c', Enabled:true }]);
set('realityTvEpisodeQuestionEnabled_', row => row.Enabled !== false);
set('__season', { SeasonId:'s1', QuestionPoolEnabled:true, RandomQuestionCount:2, AvoidRepeatEpisodes:3 });
set('__episode', { EpisodeId:'ep-5', EpisodeNumber:5, Status:'OPEN' });
assert.deepStrictEqual(ids(call('realityTvR6SelectForEpisode_(__season,__episode,{rng:__zeroRng})')), ['random-c']);
assert(source.includes('realityTvEpisodeQuestionsForSeason_'));
assert(source.includes('TemplateId'));

set('realityTvEpisodeQuestionHasProtectedState_', () => ({ blocked:false, reason:'' }));
let deletedQuestionCount = 0;
set('realityTvDeleteEpisodeQuestionForPlan_', () => { deletedQuestionCount += 1; return true; });
const openUnprotectedRows = call('realityTvR6AssertRegenerateSafe_(__season,__episode)');
assert.strictEqual(openUnprotectedRows.length, 1);
assert.strictEqual(call('realityTvR6DeleteExistingSelection_(__season,__episode)'), 1);
assert.strictEqual(deletedQuestionCount, 1);

for (const status of ['LOCKED','FINAL','CLOSED']) {
  set('__blockedEpisode', { EpisodeId:'ep-5', EpisodeNumber:5, Status:status });
  assert.throws(() => call('realityTvR6AssertRegenerateSafe_(__season,__blockedEpisode)'), /not allowed/);
}

set('realityTvEpisodeQuestionHasProtectedState_', () => ({ blocked:true, reason:'saved picks' }));
assert.throws(() => call('realityTvR6AssertRegenerateSafe_(__season,__episode)'), /saved picks/);
assert(source.includes('realityTvEpisodeQuestionHasProtectedState_'));
assert(source.includes('.blocked === true'));
assert(source.includes('realityTvDeleteEpisodeQuestionForPlan_'));

assert(source.includes('Math.random'));
assert(!source.includes('getPlayerReality') && !source.includes('renderRealityTvPlayer'));
for (const forbidden of ['apiAdminApproveRealityTvResult','apiAdminSubmitRealityTvResult','recalculateScores','CategoryResults']) {
  assert(!new RegExp('function\\s+' + forbidden).test(source));
}
for (const canonicalCollision of ['survivor','amazing-race','traitors','dwts']) {
  assert(!source.includes('type: "' + canonicalCollision + '"'));
  assert(!source.includes("type: '" + canonicalCollision + "'"));
}

const authoritative = fs.readFileSync(path.join(repo, 'backend/engines/RealityTvQuestionPackEngine.js'), 'utf8');
for (const token of ['survivor-tribal','amazing-race','social-deduction','performance']) assert(authoritative.includes(token), token);
for (const token of ['immunity-winner','fire-making-winner','leg-winner','u-turn-recipient','shield-winner','traitor-banished','highest-score','perfect-score']) assert(authoritative.includes(token), token);
for (const field of ['RequiredCore','RandomEligible','QuestionPoolEnabled','RandomQuestionCount','AvoidRepeatEpisodes']) assert(source.includes(field), field);

console.log('PASS reality-tv-question-pool-r6: focused pool/idempotency/protection/show-contract coverage');
