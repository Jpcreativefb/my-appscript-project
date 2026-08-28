'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const engineSource = fs.readFileSync('backend/engines/RealityTvSeasonEngine.js', 'utf8');
const pageSource = fs.readFileSync('frontend/js/pages/adminRealityTv.js', 'utf8');
const apiSource = fs.readFileSync('backend/Api.js', 'utf8');
const browserApiSource = fs.readFileSync('frontend/js/api.js', 'utf8');

function functionSource(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert(start >= 0, `Missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed function ${name}`);
}

function loadEngine(extra = {}) {
  const c = {
    console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp,
    Set, Map, Error, isFinite, parseInt, parseFloat, URL, Utilities: { getUuid: () => 'test-uuid-0000000000000000' }, ...extra
  };
  vm.createContext(c);
  vm.runInContext(engineSource, c);
  return c;
}

// 1) Existing season UI remains a first-class management surface after Episode 1.
{
  const required = [
    'Manage Cast / Participants',
    'Prepare / Open Cast Import Sheet',
    'Preview Cast Import',
    'Load Selected / Import Selected',
    'Edit / update participant details',
    'Season Settings',
    'Save Season Settings',
    'ExternalSubjectId',
    'apiAdminUpdateRealityTvContestant',
    'apiAdminSaveRealityTvSeasonSettings'
  ];
  required.forEach(text => assert(pageSource.includes(text) || browserApiSource.includes(text), `Missing persistent season-management UI/API marker: ${text}`));
  assert(functionSource(pageSource, 'adminRealityTvSeasonBody_').includes('adminRealityTvManageCastPanel_(bundle)'), 'Existing season body must always render persistent cast management');
  assert(functionSource(pageSource, 'adminRealityTvSeasonBody_').includes('adminRealityTvSeasonSettingsPanel_(bundle)'), 'Existing season body must always render Season Settings');
  assert(functionSource(pageSource, 'adminRealityTvManageCastPanel_').includes('adminRealityTvGroupsPanel_(bundle)'), 'Manage Cast must retain group/tribe assignment controls');
  assert(functionSource(pageSource, 'adminRealityTvManageCastPanel_').includes('adminRealityTvGroupHistoryPanel_(bundle)'), 'Manage Cast must retain group history visibility');
}

// 2) Direct participant maintenance updates profile fields only and preserves lifecycle/history fields.
{
  let update = null;
  const sheet = {};
  const contestants = [
    { __rowNumber: 2, SeasonId:'s1', GameId:'g1', ContestantId:'maya', Name:'Maya', FullName:'Maya Stone', ExternalSubjectId:'ext-maya', ImageUrl:'old.jpg', Biography:'old bio', CurrentGroup:'Vatu', StartingGroup:'Vatu', FinalGroup:'Vatu', Status:'ACTIVE', Active:true, EliminatedEpisode:'', DisplayOrder:1 },
    { __rowNumber: 3, SeasonId:'s1', GameId:'g1', ContestantId:'alex', Name:'Alex', ExternalSubjectId:'ext-alex', Status:'ACTIVE', Active:true, DisplayOrder:2 }
  ];
  const c = loadEngine({ SpreadsheetApp: { getActive: () => ({ getSheetByName: () => sheet }) } });
  c.requireAdmin_ = () => true;
  c.realityTvEnsureSystem_ = () => {};
  c.realityTvGetSeason_ = () => ({ __rowNumber:2, SeasonId:'s1', GameId:'g1' });
  c.realityTvContestantsForSeason_ = () => contestants;
  c.realityTvUpdateObjectRow_ = (_sheet, _row, values) => { update = { ...values }; };
  c.realityTvClearRuntimeCaches_ = () => {};

  const res = c.apiAdminUpdateRealityTvContestant({
    seasonId:'s1', contestantId:'maya', name:'Maya Stone', fullName:'Maya Stone', imageUrl:'new.jpg',
    biography:'new bio', member1:'Maya', member2:'Jamie', relationship:'Partners', hometown:'Oak Park, IL',
    externalSubjectId:''
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(update.Name, 'Maya Stone');
  assert.strictEqual(update.ImageUrl, 'new.jpg');
  assert.strictEqual(update.Biography, 'new bio');
  assert.strictEqual(update.Member2, 'Jamie');
  assert.strictEqual(update.ExternalSubjectId, 'ext-maya', 'Blank direct ExternalSubjectId must preserve stable matching ID');
  ['Status','Active','EliminatedEpisode','CurrentGroup','StartingGroup','FinalGroup','DisplayOrder'].forEach(field => {
    assert(!Object.prototype.hasOwnProperty.call(update, field), `Participant editor must not rewrite lifecycle/history field ${field}`);
  });
  assert.throws(() => c.apiAdminUpdateRealityTvContestant({ seasonId:'s1', contestantId:'maya', name:'Maya', externalSubjectId:'ext-alex' }), /already used/i);
}

// 3) Season Settings expose only intentionally mutable post-create configuration.
{
  let update = null;
  const sheet = {};
  const season = {
    __rowNumber:2, SeasonId:'s1', GameId:'g1', ShowFormat:'survivor-tribal', ParticipantType:'individual',
    ParticipantLabel:'Contestant', GroupLabel:'Tribe', PeriodLabel:'Episode', FirstEpisodeDateTime:new Date('2026-09-01T01:00:00Z'),
    WeeklyIntervalDays:7, LockOffsetMinutes:5, Points:1, QuestionTemplate:'Who leaves {episode}?',
    EliminationLayoutType:'auto', EliminationImageSource:'roster', IndividualPlayStartsEpisode:0,
    CurrentEpisodeNumber:3, AutoCreateNextEpisode:true
  };
  const c = loadEngine({ SpreadsheetApp: { getActive: () => ({ getSheetByName: () => sheet }) } });
  c.requireAdmin_ = () => true;
  c.realityTvEnsureSystem_ = () => {};
  c.realityTvGetSeason_ = () => season;
  c.realityTvUpdateObjectRow_ = (_sheet, _row, values) => { update = { ...values }; };
  c.realityTvClearRuntimeCaches_ = () => {};
  const res = c.apiAdminSaveRealityTvSeasonSettings({
    seasonId:'s1', participantLabel:'Player', groupLabel:'House', periodLabel:'Round', weeklyIntervalDays:3,
    lockOffsetMinutes:10, points:2, questionTemplate:'Who exits Round {episode}?', eliminationLayoutType:'text',
    eliminationImageSource:'none', individualPlayStartsEpisode:4, autoCreateNextEpisode:false,
    showFormat:'amazing-race', participantType:'team', gameId:'should-not-change'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(update.ParticipantLabel, 'Player');
  assert.strictEqual(update.WeeklyIntervalDays, 3);
  assert.strictEqual(update.AutoCreateNextEpisode, false);
  ['ShowFormat','ParticipantType','GameId','FirstEpisodeDateTime','SeasonId'].forEach(field => {
    assert(!Object.prototype.hasOwnProperty.call(update, field), `Frozen season identity field must not be mutable: ${field}`);
  });
  assert.throws(() => c.apiAdminSaveRealityTvSeasonSettings({ seasonId:'s1', individualPlayStartsEpisode:2 }), /cannot be moved before the current episode/i);
}

// 4) Production create is accepted/queued; long Episode 1 work is owned by durable setup job.
{
  const create = functionSource(engineSource, 'apiAdminCreateRealityTvSeason');
  assert(create.includes('realityTvQueueInitialEpisodePreparation_(createdSeason)'), 'Create Season must queue the durable initial Episode 1 setup job');
  assert(create.includes('typeof ScriptApp === "undefined"'), 'Inline completion must be limited to non-Apps-Script test harnesses');
  assert(create.includes('accepted: true') && create.includes('queued: true'), 'Production create must return an accepted/queued response');
  assert(!create.includes('realityTvAdvanceQuestionPackBuild_'), 'Create request must not synchronously advance the long extra-question build');

  const worker = functionSource(engineSource, 'realityTvContinueNextEpisodeJob_');
  assert(worker.includes('initialSetup'), 'Durable preparation worker must recognize initial season setup jobs');
  assert(worker.includes('realityTvCreateEpisode_(season, 1, { skipHubSync: true, skipQuestionPack: true })'), 'Episode 1 local creation must happen in the background worker without blocking on Hub/question pack');
  assert(worker.includes('realityTvMaterializeEpisodeQuestionPackBulk_'), 'Background worker must materialize the extra-question pack');
  assert(worker.includes('realityTvSyncEpisodeToHub_'), 'Background worker must queue Hub mirroring after local build');

  const clientCreate = functionSource(pageSource, 'adminRealityTvCreateSeason');
  assert(!clientCreate.includes('adminRealityTvRunQuestionPackBuild_'), 'Browser create action must not sit in a long staged-build loop');
  assert(clientCreate.includes('apiAdminGetRealityTvDashboardSummary'), 'Browser must verify whether the season was saved if the create response is lost');
  assert(clientCreate.includes('Opening its queued setup progress'), 'Lost-response recovery must avoid false duplicate/rejected messaging');
  assert(pageSource.includes('adminRealityTvStartSeasonSetupPoll_'), 'Existing season UI must poll durable setup progress');
  assert(pageSource.includes('Resume Season Setup'), 'Existing season UI must offer explicit resume/requeue control');
}

// 4b) Runtime production-mode fixture proves the create request does not materialize Episode 1 inline.
{
  let savedSeason = null;
  let episodeCreateCalls = 0;
  let queuedSeason = null;
  const c = loadEngine({
    ScriptApp: {},
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => ({}) }) }
  });
  c.requireAdmin_ = () => true;
  c.realityTvEnsureSystem_ = () => {};
  c.realityTvReadObjects_ = () => [];
  c.adminCreateGame = payload => ({ success:true, gameId:payload.gameId });
  c.realityTvUpsertObject_ = (_ss, sheetName, _headers, _keys, object) => {
    if (sheetName === 'RealitySeasons') savedSeason = { __rowNumber:2, ...object };
  };
  c.realityTvBulkUpsertObjects_ = () => {};
  c.realityTvGetSeason_ = () => savedSeason;
  c.realityTvSyncGroupsFromContestants_ = () => [];
  c.realityTvEnsureContestantGroupHistory_ = () => {};
  c.realityTvCreateEpisode_ = () => { episodeCreateCalls += 1; throw new Error('Episode must not build inline in production-mode create'); };
  c.realityTvQueueInitialEpisodePreparation_ = season => {
    queuedSeason = season;
    return { queued:true, state:{ jobId:'rt-setup-1', initialSetup:true, status:'QUEUED', percent:5, complete:false } };
  };
  const result = c.apiAdminCreateRealityTvSeason({
    showName:'Async Create Cert', seasonName:'Season 1', seasonNumber:'1', year:2026,
    firstEpisodeDateTime:'2026-09-01T20:00:00-05:00', weeklyIntervalDays:7, lockOffsetMinutes:5,
    enabledQuestionTypesJSON:'[]', contestantsJSON:JSON.stringify([{name:'A'},{name:'B'}])
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.accepted, true);
  assert.strictEqual(result.queued, true);
  assert.strictEqual(result.episode, null);
  assert.strictEqual(episodeCreateCalls, 0, 'Production-mode create must not create Episode 1 inline');
  assert(queuedSeason && queuedSeason.SeasonId === result.seasonId, 'Saved season must be handed to durable setup queue');
}

// 5) Initial setup job state/queue/resume are durable and duplicate-safe.
{
  const appended = [];
  const updates = [];
  let scheduleCount = 0;
  let job = null;
  const sheet = {};
  const c = loadEngine({ SpreadsheetApp: { getActive: () => ({ getSheetByName: () => sheet }) } });
  c.requireAdmin_ = () => true;
  c.realityTvEnsureSystem_ = () => {};
  c.realityTvGetSeason_ = () => ({ SeasonId:'s1', GameId:'g1' });
  c.realityTvLatestInitialSetupJob_ = () => job;
  c.realityTvEpisodesForSeason_ = () => [];
  c.realityTvAppendObject_ = (_sheet, record) => { appended.push({ ...record }); job = { __rowNumber:2, ...record }; };
  c.realityTvGetNextEpisodeJob_ = () => job;
  c.realityTvScheduleNextEpisodeContinuation_ = () => { scheduleCount += 1; return true; };
  c.realityTvUpdateObjectRow_ = (_sheet, _row, values) => { updates.push({ ...values }); Object.assign(job, values); };

  const queued = c.realityTvQueueInitialEpisodePreparation_({ SeasonId:'s1', GameId:'g1' });
  assert.strictEqual(queued.queued, true);
  assert.strictEqual(appended.length, 1);
  assert.strictEqual(appended[0].SourceEpisodeId, '__season_setup__');
  assert.strictEqual(appended[0].TargetEpisodeNumber, 1);
  assert.strictEqual(queued.state.initialSetup, true);
  assert.strictEqual(scheduleCount, 1);

  const duplicate = c.realityTvQueueInitialEpisodePreparation_({ SeasonId:'s1', GameId:'g1' });
  assert.strictEqual(appended.length, 1, 'Repeated initial queue request must reuse the same durable setup job');
  assert.strictEqual(duplicate.state.jobId, queued.state.jobId);

  job.Status = 'NEEDS_ATTENTION';
  const resumed = c.apiAdminResumeRealityTvSeasonSetup({ seasonId:'s1' });
  assert.strictEqual(resumed.success, true);
  assert.strictEqual(resumed.queued, true);
  assert.strictEqual(job.Status, 'QUEUED');
  assert(updates.some(u => u.ProgressLabel === 'Season setup re-queued'));
}

// 6) Routes/mirrors are explicitly wired for the three new persistent-management writes.
{
  ['adminUpdateRealityTvContestant','adminSaveRealityTvSeasonSettings','adminResumeRealityTvSeasonSetup'].forEach(action => {
    assert(apiSource.includes(`action === "${action}"`), `Backend API route missing: ${action}`);
    assert(browserApiSource.includes(action), `Browser API helper missing: ${action}`);
  });
}

console.log('reality-awards-rc14-persistent-season-async-create-tests: PASS');
