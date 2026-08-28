'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function load(file, extra = {}) {
  const c = {
    console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp,
    Set, Map, Error, isFinite, parseInt, parseFloat, URL, ...extra
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(file, 'utf8'), c);
  return c;
}

function loadMany(files, extra = {}) {
  const c = {
    console, Date, JSON, Math, Number, String, Array, Object, Boolean, RegExp,
    Set, Map, Error, isFinite, parseInt, parseFloat, URL, ...extra
  };
  vm.createContext(c);
  files.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), c));
  return c;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertIncludes(text, fragment, message) {
  assert(String(text || '').includes(fragment), message || `Expected [${fragment}] in [${text}]`);
}

// ---------------------------------------------------------------------------
// 1) Reality Cast Import — one runtime staging fixture covers Survivor individual
// CREATE + UPDATE, ExternalSubjectId matching, blank-value preservation, paired
// Amazing Race/DWTS records, invalid pair rejection, duplicate protection,
// image/bio transport, row status/error semantics, and profile isolation.
// ---------------------------------------------------------------------------
{
  const headers = [
    'Import','ImportStatus','SeasonId','GameId','ShowProfile','ShowFormat','ShowName','SeasonName',
    'Name','FullName','ImageUrl','TeamOrTribe','TeamColor','Member1','Member1ImageUrl','Member2',
    'Member2ImageUrl','Relationship','Age','Hometown','Occupation','KnownFor','OriginalShowOrSport',
    'RecruitNumber','Biography','ExternalSubjectId','SourceUrl','ImageSourceUrl','AdminNotes','ImportedAt','LastError'
  ];
  const seasons = {
    's-surv': { SeasonId:'s-surv', GameId:'g-surv', ShowFormat:'survivor-tribal', ShowName:'Survivor RC14 Cert', SeasonName:'Survivor Cert' },
    's-race': { SeasonId:'s-race', GameId:'g-race', ShowFormat:'amazing-race', ShowName:'The Amazing Race RC14 Cert', SeasonName:'Race Cert' },
    's-dwts': { SeasonId:'s-dwts', GameId:'g-dwts', ShowFormat:'performance', ShowName:'Dancing with the Stars RC14 Cert', SeasonName:'DWTS Cert' }
  };
  const contestants = {
    's-surv': [{
      SeasonId:'s-surv', GameId:'g-surv', ContestantId:'maya-stone', Name:'Maya Stone', FullName:'Maya Stone',
      ExternalSubjectId:'rc-cert-maya', ImageUrl:'https://img.example/maya-existing.jpg', Biography:'Existing biography',
      TeamOrTribe:'Vatu', StartingGroup:'Vatu', CurrentGroup:'Vatu', FinalGroup:'Vatu', TeamColor:'Blue',
      Hometown:'Chicago, IL', Occupation:'Teacher', Status:'ACTIVE', Active:true, DisplayOrder:1,
      CreatedAt:new Date('2026-01-01T00:00:00Z')
    }],
    's-race': [],
    's-dwts': []
  };

  function stagingRow(values) {
    const row = {};
    headers.forEach(h => { row[h] = Object.prototype.hasOwnProperty.call(values, h) ? values[h] : ''; });
    return row;
  }

  const staging = [
    stagingRow({ Import:true, SeasonId:'s-surv', GameId:'g-surv', ShowFormat:'survivor-tribal', ShowName:'Survivor RC14 Cert', SeasonName:'Survivor Cert',
      Name:'Aaliyah Test', FullName:'Aaliyah Test', ImageUrl:'https://img.example/aaliyah.jpg', TeamOrTribe:'Kele', TeamColor:'Orange',
      Age:'28', Hometown:'Chicago, IL', Occupation:'Engineer', Biography:'Aaliyah certification biography', ExternalSubjectId:'rc-cert-aaliyah',
      SourceUrl:'https://example.com/aaliyah', ImageSourceUrl:'https://example.com/aaliyah-image' }),
    stagingRow({ Import:true, SeasonId:'s-surv', GameId:'g-surv', ShowFormat:'survivor-tribal', ShowName:'Survivor RC14 Cert', SeasonName:'Survivor Cert',
      Name:'Maya Stone', FullName:'Maya Stone', ImageUrl:'', Biography:'', Hometown:'Oak Park, IL', Occupation:'Teacher',
      ExternalSubjectId:'rc-cert-maya', AdminNotes:'UPDATE by ExternalSubjectId; preserve blank image/bio' }),
    stagingRow({ Import:true, SeasonId:'s-surv', GameId:'g-surv', ShowFormat:'survivor-tribal', ShowName:'Survivor RC14 Cert', SeasonName:'Survivor Cert',
      Name:'Maya Duplicate Staging', ExternalSubjectId:'rc-cert-maya', Hometown:'Should not apply' }),
    stagingRow({ Import:true, SeasonId:'s-race', GameId:'g-race', ShowFormat:'amazing-race', ShowName:'The Amazing Race RC14 Cert', SeasonName:'Race Cert',
      Name:'', Member1:'Riley Chen', Member1ImageUrl:'https://img.example/riley.jpg', Member2:'Jordan Brooks', Member2ImageUrl:'https://img.example/jordan.jpg',
      Relationship:'Siblings', Hometown:'Seattle, WA', Biography:'Amazing Race pair certification biography', ExternalSubjectId:'rc-cert-riley-jordan' }),
    stagingRow({ Import:true, SeasonId:'s-race', GameId:'g-race', ShowFormat:'amazing-race', ShowName:'The Amazing Race RC14 Cert', SeasonName:'Race Cert',
      Name:'Broken Team', Member1:'Morgan Lee', Member2:'', Relationship:'Friends', ExternalSubjectId:'rc-cert-bad-pair' }),
    stagingRow({ Import:true, SeasonId:'s-dwts', GameId:'g-dwts', ShowFormat:'performance', ShowName:'Dancing with the Stars RC14 Cert', SeasonName:'DWTS Cert',
      Name:'Taylor Test & Pro Jamie', FullName:'Taylor Test', ImageUrl:'https://img.example/taylor.jpg', Member1:'', Member2:'Jamie Pro',
      Member2ImageUrl:'https://img.example/jamie.jpg', Relationship:'', KnownFor:'Actor', Biography:'DWTS pair certification biography', ExternalSubjectId:'rc-cert-taylor-jamie' })
  ];
  const matrix = [headers.slice(), ...staging.map(row => headers.map(h => row[h]))];
  let checkboxReinsertCount = 0;
  const sheet = {
    getDataRange() {
      return {
        getValues: () => matrix.map(row => row.slice()),
        setValues(values) {
          matrix.splice(0, matrix.length, ...values.map(row => row.slice()));
          return this;
        }
      };
    },
    getMaxRows: () => matrix.length,
    getRange() {
      return { insertCheckboxes() { checkboxReinsertCount += 1; return this; } };
    }
  };
  const ss = { getSheetByName: () => sheet };
  const c = load('backend/engines/RealityTvSeasonEngine.js', { SpreadsheetApp: { getActive: () => ss } });

  function readStagingObjects() {
    return matrix.slice(1).map((row, index) => {
      const obj = { __rowNumber:index + 2 };
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
  }
  function rowForExternal(id) {
    const col = headers.indexOf('ExternalSubjectId');
    return matrix.slice(1).find(row => row[col] === id);
  }
  function cell(row, header) { return row[headers.indexOf(header)]; }

  c.requireAdmin_ = () => true;
  c.realityTvEnsureSystem_ = () => {};
  c.realityTvGetSeason_ = id => seasons[id] || null;
  c.realityTvPrepareCastImportSheet_ = season => ({ sheet, sheetUrl:'https://sheet.example/#gid=1', profile:c.realityTvCastImportProfile_(season) });
  c.realityTvReadObjects_ = (_spreadsheet, sheetName) => sheetName === 'RealityCastImport' ? readStagingObjects() : [];
  c.realityTvContestantsForSeason_ = seasonId => contestants[seasonId] || [];
  c.realityTvBulkUpsertObjects_ = (_spreadsheet, sheetName, _sheetHeaders, keys, payloads) => {
    if (sheetName !== 'RealityContestants') return;
    payloads.forEach(payload => {
      const list = contestants[payload.SeasonId] || (contestants[payload.SeasonId] = []);
      const found = list.find(row => keys.every(k => String(row[k]) === String(payload[k])));
      if (found) Object.assign(found, payload);
      else list.push({ ...payload });
    });
  };
  c.realityTvSyncGroupsFromContestants_ = () => {};
  c.realityTvEnsureContestantGroupHistory_ = () => {};
  c.realityTvClearRuntimeCaches_ = () => {};

  // Profile switching must be deterministic and season-local.
  assert.strictEqual(c.realityTvCastImportProfile_(seasons['s-surv']).id, 'survivor');
  assert.strictEqual(c.realityTvCastImportProfile_(seasons['s-race']).id, 'amazing-race');
  assert.strictEqual(c.realityTvCastImportProfile_(seasons['s-dwts']).id, 'dwts');

  const survivorPreview = c.apiAdminPreviewRealityCastImport({ seasonId:'s-surv' });
  assert.strictEqual(survivorPreview.createCount, 1);
  assert.strictEqual(survivorPreview.updateCount, 1);
  assert.strictEqual(survivorPreview.errorCount, 1);
  assert(survivorPreview.items.some(item => item.existingContestantId === 'maya-stone' && item.action === 'UPDATE'));
  assert(survivorPreview.items.some(item => item.errors.some(err => /Duplicate staging row/i.test(err))), 'Duplicate staging target must have actionable preview error.');

  const survivorImport = c.apiAdminImportRealityCastImport({ seasonId:'s-surv' });
  assert.deepStrictEqual(plain({created:survivorImport.createdCount, updated:survivorImport.updatedCount, errors:survivorImport.errorCount}), {created:1, updated:1, errors:1});
  const maya = contestants['s-surv'].find(row => row.ExternalSubjectId === 'rc-cert-maya');
  assert.strictEqual(contestants['s-surv'].filter(row => row.ExternalSubjectId === 'rc-cert-maya').length, 1, 'UPDATE by ExternalSubjectId must not duplicate participant.');
  assert.strictEqual(maya.Hometown, 'Oak Park, IL');
  assert.strictEqual(maya.ImageUrl, 'https://img.example/maya-existing.jpg', 'Blank optional ImageUrl must preserve existing value.');
  assert.strictEqual(maya.Biography, 'Existing biography', 'Blank optional Biography must preserve existing value.');
  assert.strictEqual(maya.TeamOrTribe, 'Vatu');
  const aaliyah = contestants['s-surv'].find(row => row.ExternalSubjectId === 'rc-cert-aaliyah');
  assert(aaliyah && aaliyah.ImageUrl === 'https://img.example/aaliyah.jpg');
  assert.strictEqual(aaliyah.Biography, 'Aaliyah certification biography');
  assert.strictEqual(aaliyah.TeamOrTribe, 'Kele');
  assert.strictEqual(aaliyah.TeamColor, 'Orange');

  let r = rowForExternal('rc-cert-aaliyah');
  assert.strictEqual(cell(r,'Import'), false);
  assert.strictEqual(cell(r,'ImportStatus'), 'IMPORTED');
  assert(cell(r,'ImportedAt') instanceof Date);
  assert.strictEqual(cell(r,'LastError'), '');
  r = rowForExternal('rc-cert-maya');
  assert.strictEqual(cell(r,'Import'), false);
  assert.strictEqual(cell(r,'ImportStatus'), 'UPDATED');
  assert(cell(r,'ImportedAt') instanceof Date);
  r = matrix.slice(1).find(row => cell(row,'Name') === 'Maya Duplicate Staging');
  assert.strictEqual(cell(r,'Import'), true, 'Error row must remain checked for correction/retry.');
  assert.strictEqual(cell(r,'ImportStatus'), 'ERROR');
  assert.strictEqual(cell(r,'ImportedAt'), '');
  assert(/Duplicate selected staging row/i.test(String(cell(r,'LastError'))));

  // Survivor import must not consume/modify pair-format rows.
  assert.strictEqual(cell(rowForExternal('rc-cert-riley-jordan'),'ImportStatus'), '');
  assert.strictEqual(contestants['s-race'].length, 0);
  assert.strictEqual(contestants['s-dwts'].length, 0);

  const racePreview = c.apiAdminPreviewRealityCastImport({ seasonId:'s-race' });
  const validRacePreview = racePreview.items.find(item => item.member1 === 'Riley Chen');
  assert.strictEqual(validRacePreview.name, 'Riley Chen & Jordan Brooks');
  assert.strictEqual(validRacePreview.action, 'CREATE');
  const badRacePreview = racePreview.items.find(item => item.member1 === 'Morgan Lee');
  assert(badRacePreview.errors.some(err => /Member 2 is required for an Amazing Race team/i.test(err)));
  const raceImport = c.apiAdminImportRealityCastImport({ seasonId:'s-race' });
  assert.deepStrictEqual(plain({created:raceImport.createdCount, errors:raceImport.errorCount}), {created:1, errors:1});
  const raceTeam = contestants['s-race'][0];
  assert.strictEqual(raceTeam.Name, 'Riley Chen & Jordan Brooks');
  assert.strictEqual(raceTeam.Member1, 'Riley Chen');
  assert.strictEqual(raceTeam.Member2, 'Jordan Brooks');
  assert.strictEqual(raceTeam.Relationship, 'Siblings');
  assert.strictEqual(raceTeam.Member1ImageUrl, 'https://img.example/riley.jpg');
  assert.strictEqual(raceTeam.Member2ImageUrl, 'https://img.example/jordan.jpg');
  assert.strictEqual(raceTeam.Biography, 'Amazing Race pair certification biography');
  r = rowForExternal('rc-cert-bad-pair');
  assert.strictEqual(cell(r,'ImportStatus'), 'ERROR');
  assert.strictEqual(cell(r,'Import'), true);
  assert(/Member 2 is required/i.test(String(cell(r,'LastError'))));
  assert.strictEqual(contestants['s-race'].some(row => row.ExternalSubjectId === 'rc-cert-bad-pair'), false);
  assert.strictEqual(cell(rowForExternal('rc-cert-taylor-jamie'),'ImportStatus'), '', 'Amazing Race import must not contaminate DWTS staging row.');

  const dwtsPreview = c.apiAdminPreviewRealityCastImport({ seasonId:'s-dwts' });
  assert.strictEqual(dwtsPreview.createCount, 1);
  const dwtsImport = c.apiAdminImportRealityCastImport({ seasonId:'s-dwts' });
  assert.strictEqual(dwtsImport.createdCount, 1);
  const dwts = contestants['s-dwts'][0];
  assert.strictEqual(dwts.Name, 'Taylor Test & Pro Jamie');
  assert.strictEqual(dwts.Member1, 'Taylor Test', 'DWTS Member1 should normalize from FullName when omitted.');
  assert.strictEqual(dwts.Member2, 'Jamie Pro');
  assert.strictEqual(dwts.Relationship, 'Celebrity / Pro');
  assert.strictEqual(dwts.ImageUrl, 'https://img.example/taylor.jpg');
  assert.strictEqual(dwts.Biography, 'DWTS pair certification biography');
  assert.strictEqual(contestants['s-surv'].length, 2);
  assert.strictEqual(contestants['s-race'].length, 1);
  assert.strictEqual(contestants['s-dwts'].length, 1);
  assert(checkboxReinsertCount >= 3, 'Importer must restore checkbox validation after each season write.');
}

// ---------------------------------------------------------------------------
// 2) Interrupted Reality workflow — deterministic recovery/duplicate/conflict
// contracts. Real ScriptApp scheduling and LockService behavior remain live-only.
// ---------------------------------------------------------------------------
{
  const cancelled = [];
  const q = loadMany(['backend/engines/RealityTvSeasonEngine.js','backend/engines/RealityTvQuestionPackEngine.js'], {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => ({ name:'RealityQuestionBuildJobs' }) }) }
  });
  q.realityTvEnsureQuestionPackSystem_ = () => {};
  q.realityTvQuestionBuildJobsForSeason_ = () => [
    { __rowNumber:2, BuildId:'old-build', SeasonId:'s', EpisodeId:'e1', Status:'BUILDING' },
    { __rowNumber:3, BuildId:'new-build', SeasonId:'s', EpisodeId:'e1', Status:'BUILDING' },
    { __rowNumber:4, BuildId:'other-episode', SeasonId:'s', EpisodeId:'e2', Status:'BUILDING' }
  ];
  q.realityTvUpdateObjectRow_ = (_sheet, rowNumber, patch) => cancelled.push({rowNumber, patch});
  assert.strictEqual(q.realityTvCancelOtherQuestionBuildsForEpisode_('s','e1','new-build'), 1);
  assert.deepStrictEqual(cancelled.map(item => item.rowNumber), [2]);
  assert.strictEqual(cancelled[0].patch.Status, 'CANCELLED');

  // A per-episode disable is treated as intentional completed work during repair;
  // the next episode still inherits the season default.
  q.adminGetGameSetup = () => ({ categories:[{ categoryId:'e1-reward', nominees:[{nomineeId:'a'},{nomineeId:'b'}] }] });
  q.realityTvEpisodeQuestionsForSeason_ = () => [{ EpisodeId:'e1', EpisodeQuestionId:'e1-reward', TemplateId:'reward', CategoryId:'e1-reward', Enabled:false }];
  q.realityTvAnswerOptionsForTemplate_ = () => ({ skipped:false, options:[{id:'a'},{id:'b'}] });
  const defs = { reward:{ TemplateId:'reward', QuestionType:'reward', Enabled:true, DisplayOrder:20 } };
  assert.strictEqual(q.realityTvQuestionPackMissingTemplateIndex_({GameId:'g'},{EpisodeId:'e1',EpisodeNumber:1},['reward'],defs), -1);
  q.realityTvEpisodeQuestionsForSeason_ = () => [];
  assert.strictEqual(q.realityTvQuestionPackMissingTemplateIndex_({GameId:'g'},{EpisodeId:'e2',EpisodeNumber:2},['reward'],defs), 0,
    'New episode must inherit enabled season default, not previous episode override.');

  const createdTriggers = [];
  const ScriptApp = {
    getProjectTriggers: () => [],
    newTrigger(handler) {
      const trigger = {
        timeBased(){ return trigger; },
        after(){ return trigger; },
        everyMinutes(){ return trigger; },
        create(){ createdTriggers.push(handler); return trigger; }
      };
      return trigger;
    }
  };
  const tq = load('backend/engines/RealityTvQuestionPackEngine.js', { ScriptApp });
  assert.strictEqual(tq.realityTvScheduleQuestionBuildContinuation_(), true);
  assert(createdTriggers.includes('realityTvContinuePendingQuestionBuilds'));

  const tr = load('backend/engines/RealityTvSeasonEngine.js', { ScriptApp });
  assert.strictEqual(tr.realityTvScheduleNextEpisodeContinuation_(), true);
  assert(createdTriggers.includes('realityTvContinueNextEpisodeJobs'));
  assert.strictEqual(tr.realityTvScheduleApprovalContinuation_(), true);
  assert(createdTriggers.includes('realityTvContinuePendingApprovalKick'));
  assert(createdTriggers.includes('realityTvContinuePendingApprovals'));

  // A conflicting real approval claim must return BUSY before touching queue state.
  tr.realityTvApprovalLock_ = () => ({ tryLock:() => false, releaseLock:() => { throw new Error('must not release unclaimed lock'); } });
  const busy = tr.realityTvClaimApprovalStage_({ queueId:'q1', stage:'SETTLE', getQueue:() => { throw new Error('must not read queue without lock'); } });
  assert.strictEqual(busy.busy, true);
  assert(/another approval request/i.test(busy.message));

  // AutoCreateNextEpisode retry reuses the existing durable job rather than
  // queuing a duplicate for the same source episode.
  let scheduled = 0;
  const prior = { JobId:'job-1', SeasonId:'s', SourceEpisodeId:'e1', TargetEpisodeNumber:2, Status:'RUNNING', Stage:'BUILD_QUESTIONS' };
  tr.realityTvContestantsForSeason_ = () => [
    {ContestantId:'a',Active:true,Status:'ACTIVE'}, {ContestantId:'b',Active:true,Status:'ACTIVE'}
  ];
  tr.realityTvLatestNextEpisodeJobForSource_ = () => prior;
  tr.realityTvScheduleNextEpisodeContinuation_ = () => { scheduled += 1; return true; };
  const queued = tr.realityTvQueueNextEpisodePreparation_({SeasonId:'s',GameId:'g',AutoCreateNextEpisode:true},{EpisodeId:'e1',EpisodeNumber:1},'admin');
  assert.strictEqual(queued.job.JobId, 'job-1');
  assert.strictEqual(queued.queued, true);
  assert.strictEqual(scheduled, 1);
}

// ---------------------------------------------------------------------------
// 3) Exact four-episode Sole Survivor / Season Anchor / Spoiler fixture requested
// for live certification: start 1.10, growth .10, cap 1.20, 10 ordinary points,
// 0 elimination points, loss penalty 2. Net anchor adjustment is 0, so four
// correct 10-point questions finish at exactly 40 points.
// ---------------------------------------------------------------------------
{
  const users = [];
  const history = [];
  const settings = {
    Enabled:true, SourceType:'reality-tv', StartMultiplier:1.10, GrowthPerSuccess:0.10,
    MaxMultiplier:1.20, EligiblePointsCap:10, LossPenalty:2, WithdrawalBehavior:'penalty'
  };
  const fakeSheets = {
    UserSeasonAnchors:{name:'UserSeasonAnchors'}, SeasonAnchorHistory:{name:'SeasonAnchorHistory'}
  };
  let currentEpisode = { episodeId:'e1', episodeNumber:1 };
  let spoilerHidden = false;
  const c = load('backend/engines/SeasonAnchorEngine.js', {
    SpreadsheetApp:{ getActive:() => ({ getSheetByName:name => fakeSheets[name] || {name} }) }
  });
  c.seasonAnchorGetSettings_ = () => settings;
  c.seasonAnchorEnsureSystem_ = () => {};
  c.seasonAnchorReadObjects_ = sheetName => sheetName === 'UserSeasonAnchors' ? users : history;
  c.seasonAnchorGetUserRow_ = (_gameId, username) => users.find(row => row.Username === username) || null;
  c.seasonAnchorUpdateObjectRow_ = (sheet,rowNumber,patch) => {
    const list = sheet && sheet.name === 'UserSeasonAnchors' ? users : history;
    const row = list.find(item => item.__rowNumber === rowNumber);
    if (row) Object.assign(row,patch);
  };
  c.seasonAnchorUpsert_ = (sheetName,_headers,keys,row) => {
    const list = sheetName === 'UserSeasonAnchors' ? users : history;
    let found = list.find(item => keys.every(k => String(item[k] || '') === String(row[k] || '')));
    if (found) Object.assign(found,row);
    else list.push({...row,__rowNumber:list.length+2});
  };
  // RC16 player-finalization optimization bypasses the generic upsert for the
  // already-located user row. Keep this fixture focused on the scoring contract
  // while modeling the direct write/append helper.
  c.seasonAnchorPersistUserPick_ = (existing,row) => {
    if (existing) Object.assign(existing,row);
    else users.push({...row,__rowNumber:users.length+2});
  };
  c.seasonAnchorEpisodeCategoryIds_ = () => ['ordinary'];
  c.seasonAnchorUserFixedPointsForCategories_ = () => 10;
  c.clearGameCaches = () => {};
  c.validateUserSession_ = () => true;
  c.realityTvSpoilerStateForGame_ = () => ({ enabled:true, hasHiddenResults:spoilerHidden, hiddenEpisodeIds:spoilerHidden ? [currentEpisode.episodeId] : [] });
  c.seasonAnchorUserPayload_ = (username,gameId) => ({
    enabled:true, locked:false, settings,
    season:{seasonId:'season-1'}, episode:currentEpisode,
    user:c.seasonAnchorGetUserRow_(gameId,username),
    entities:[
      {id:'chef-a',name:'Chef A'}, {id:'chef-b',name:'Chef B'}, {id:'chef-c',name:'Chef C'}, {id:'chef-d',name:'Chef D'}
    ]
  });

  // Initial pick is finalized through the real save API.
  let saved = c.apiSaveSeasonAnchorPick({username:'alice',token:'t',gameId:'game-1',entityId:'chef-a'});
  assert.strictEqual(saved.success,true);
  assert.strictEqual(users[0].CurrentEntityId,'chef-a');
  assert.strictEqual(users[0].CurrentMultiplier,1.10);
  assert.strictEqual(c.seasonAnchorDashboardProgress_('alice','game-1').outstanding,0);

  // E1: Chef D goes; A survives at 1.10x => +1, next multiplier caps at 1.20.
  c.seasonAnchorSettleRealityEpisode_({GameId:'game-1',SeasonId:'season-1'},{EpisodeId:'e1',EpisodeNumber:1},['chef-d'],'elimination','admin');
  assert.strictEqual(history[0].Outcome,'SURVIVED');
  assert.strictEqual(history[0].MultiplierApplied,1.10);
  assert.strictEqual(history[0].BonusPoints,1);
  assert.strictEqual(history[0].NetAdjustment,1);
  assert.strictEqual(users[0].CurrentMultiplier,1.20);

  // E2: no elimination; preserve 1.20 and no bonus/growth event.
  currentEpisode = {episodeId:'e2',episodeNumber:2};
  c.seasonAnchorSettleRealityEpisode_({GameId:'game-1',SeasonId:'season-1'},{EpisodeId:'e2',EpisodeNumber:2},[],'no-elimination','admin');
  assert.strictEqual(history[1].Outcome,'PRESERVED');
  assert.strictEqual(history[1].NetAdjustment,0);
  assert.strictEqual(users[0].CurrentMultiplier,1.20);

  // E3: A is eliminated => -2 and replacement state. Spoiler Shield conceals
  // the reopened obligation until reveal.
  currentEpisode = {episodeId:'e3',episodeNumber:3};
  c.seasonAnchorSettleRealityEpisode_({GameId:'game-1',SeasonId:'season-1'},{EpisodeId:'e3',EpisodeNumber:3},['chef-a'],'elimination','admin');
  assert.strictEqual(history[2].Outcome,'LOSS');
  assert.strictEqual(history[2].PenaltyPoints,2);
  assert.strictEqual(history[2].NetAdjustment,-2);
  assert.strictEqual(users[0].Status,'NEEDS_PICK');
  assert.strictEqual(users[0].CurrentEntityId,'');
  assert.strictEqual(users[0].CurrentMultiplier,1.10);

  spoilerHidden = true;
  let progress = c.seasonAnchorDashboardProgress_('alice','game-1');
  assert.strictEqual(progress.outstanding,0,'Hidden elimination must not leak via Home Hub obligation.');
  assert.strictEqual(progress.hiddenBySpoiler,true);
  const hiddenAnchor = c.apiGetSeasonAnchor({username:'alice',token:'t',gameId:'game-1'});
  assert.strictEqual(hiddenAnchor.seasonAnchor.hiddenBySpoiler,true);
  assert.throws(() => c.apiSaveSeasonAnchorPick({username:'alice',token:'t',gameId:'game-1',entityId:'chef-b'}),/Reveal the settled Reality episode/i);

  // Reveal: obligation becomes visible; replacement finalizes at start multiplier.
  spoilerHidden = false;
  progress = c.seasonAnchorDashboardProgress_('alice','game-1');
  assert.strictEqual(progress.outstanding,1);
  currentEpisode = {episodeId:'e4',episodeNumber:4};
  saved = c.apiSaveSeasonAnchorPick({username:'alice',token:'t',gameId:'game-1',entityId:'chef-b'});
  assert.strictEqual(saved.success,true);
  assert.strictEqual(users[0].CurrentEntityId,'chef-b');
  assert.strictEqual(users[0].CurrentMultiplier,1.10);
  assert.strictEqual(users[0].Status,'ACTIVE');
  assert.strictEqual(c.seasonAnchorDashboardProgress_('alice','game-1').outstanding,0);

  // E4 finale: Chef C goes, B survives => +1. No phantom replacement obligation.
  c.seasonAnchorSettleRealityEpisode_({GameId:'game-1',SeasonId:'season-1'},{EpisodeId:'e4',EpisodeNumber:4},['chef-c'],'elimination','admin');
  assert.strictEqual(history[3].Outcome,'SURVIVED');
  assert.strictEqual(history[3].MultiplierApplied,1.10);
  assert.strictEqual(history[3].BonusPoints,1);
  assert.strictEqual(history[3].NetAdjustment,1);
  assert.strictEqual(users[0].CurrentEntityId,'chef-b');
  assert.strictEqual(users[0].Status,'ACTIVE');
  assert.strictEqual(c.seasonAnchorDashboardProgress_('alice','game-1').outstanding,0);
  assert.strictEqual(history.reduce((sum,row) => sum + Number(row.NetAdjustment || 0),0),0,
    'Requested 4-episode fixture has +1 +0 -2 +1 = net zero Season Anchor adjustment.');

  // Four ordinary 10-point correct picks plus zero net Season Anchor = exactly 40.
  const adjustments = c.seasonAnchorAdjustmentsForGame_('game-1');
  assert.strictEqual(adjustments.alice.net,0);
  const sc = load('backend/engines/ScoringEngine.js');
  sc.validateGameId = () => true;
  sc.getGameRuntimeConfig = () => ({type:'prediction',fixedPointsEnabled:true,confidenceEnabled:false,stakedPointsEnabled:false});
  sc.getGame = sc.getGameRuntimeConfig;
  sc.isConfidenceScoringGame_ = () => false;
  sc.getConfidenceScoringMode_ = () => 'win_only';
  sc.isFixedPointScoringEnabledForGame_ = () => true;
  sc.normalizeCategoryScoreMode_ = value => String(value || 'correct-pick').toLowerCase();
  const categoryIds = ['q1','q2','q3','q4'];
  sc.getCategorySettings = () => Object.fromEntries(categoryIds.map(id => [id,{points:10,scoreMode:'correct-pick',changePenalty:0}]));
  sc.getCategoryResultsResolutionMap = () => Object.fromEntries(categoryIds.map((id,i) => [id,{resolved:true,result:'winner',winnerNomineeId:'answer-'+(i+1),winnerNomineeIds:['answer-'+(i+1)]}]));
  sc.getHybridCategoryResolution_ = (id,_config,map) => map[id];
  sc.buildUserPicksMap_ = () => ({alice:Object.fromEntries(categoryIds.map((id,i) => [id,{nomineeId:'answer-'+(i+1),changeCount:0}]))});
  sc.seasonAnchorAdjustmentsForGame_ = () => adjustments;
  sc.getLeaderboardUserProfile_ = () => ({});
  const board = sc.getLeaderboardData('game-1');
  assert.strictEqual(board[0].fixedPoints,40);
  assert.strictEqual(board[0].seasonAnchorNet,0);
  assert.strictEqual(board[0].total,40,'RC14 certification example must finish at exactly 40 points under current contract.');
}

// Spoiler reveal persistence/reset and payload/notification sanitization can be
// certified locally; only actual browser service-worker/Web Push delivery is live.
{
  const r = load('backend/engines/RealityTvSeasonEngine.js');
  const episodes = [
    {EpisodeId:'e1',EpisodeNumber:1,Status:'FINAL'},
    {EpisodeId:'e2',EpisodeNumber:2,Status:'FINAL'},
    {EpisodeId:'e3',EpisodeNumber:3,Status:'FINAL'}
  ];
  const pref = {Username:'alice',GameId:'g',RecordType:'PREFERENCE',ShieldEnabled:true,EpisodeNumber:2};
  let state = r.realityTvSpoilerStateFromRows_('alice','g','s',episodes,[pref]);
  assert.deepStrictEqual(plain(state.hiddenEpisodeIds),['e3']);
  const reveal = {Username:'alice',GameId:'g',RecordType:'REVEAL',EpisodeId:'e3',Revealed:true};
  state = r.realityTvSpoilerStateFromRows_('alice','g','s',episodes,[pref,reveal]);
  assert.deepStrictEqual(plain(state.hiddenEpisodeIds),[],'Reveal record persists for that episode.');
  state = r.realityTvSpoilerStateFromRows_('alice','g','s',episodes.concat([{EpisodeId:'e4',EpisodeNumber:4,Status:'FINAL'}]),[pref,reveal]);
  assert.deepStrictEqual(plain(state.hiddenEpisodeIds),['e4'],'Next finalized episode resets to hidden.');
  const payload = { episodes:[{episodeId:'e4',eliminated:[{id:'chef-c'}],voteDetails:{winner:'chef-b'}}], episodeQuestions:[{episodeId:'e4',categoryId:'q4',status:'FINAL'}] };
  r.realityTvApplySpoilerShield_(payload,{enabled:true,hiddenEpisodeIds:['e4'],hasHiddenResults:true});
  assert.strictEqual(payload.episodes[0].resultsHidden,true);
  assert.deepStrictEqual(plain(payload.episodes[0].eliminated),[]);
  assert.strictEqual(payload.episodes[0].voteDetails,null);
  assert.strictEqual(payload.episodeQuestions[0].status,'HIDDEN');

  const n = load('backend/engines/NotificationsEngine.js');
  const safe = n.notificationPushRealitySpoilerPresentation_('alice','g','results',{alice:true});
  assert(safe && /results are ready/i.test(safe.title));
  assert(!/chef|eliminat|winner|correct|wrong/i.test((safe.title+' '+safe.message).toLowerCase()),'Shielded notification text must not leak result semantics.');
  assert.strictEqual(n.notificationPushRealitySpoilerPresentation_('alice','g','results',{alice:false}),null);
}

// ---------------------------------------------------------------------------
// 4) Awards External Results Hub — mocked/idempotent end-to-end application:
// market mapping/build (with retry), approved FINAL delivery -> CategoryResults ->
// fixed scoring/leaderboard; replay is exactly-once; conflicting correction is
// blocked until explicit reset. No real provider call is made.
// ---------------------------------------------------------------------------
{
  const state = { categories:[], createCategoryCalls:0, bulkNomineeCalls:0, bridgeCalls:0, failBridgeOnce:true, bridgePayloads:[] };
  const awards = load('backend/engines/AwardsManagerEngine.js', {
    requireAdmin_:() => true,
    adminCatResolveScoreModeForGame_:(_gameId,mode) => mode || 'fixed-points',
    adminGetGameSetup:({gameId}) => ({success:true,gameId,categories:state.categories}),
    adminCreateCategory:payload => {
      state.createCategoryCalls += 1;
      state.categories.push({categoryId:payload.categoryId,category:payload.category,resultProvider:payload.resultProvider,
        externalEventId:payload.externalEventId,externalMarketId:payload.externalMarketId,sourceConfigJSON:payload.sourceConfigJSON,nominees:[]});
      return {success:true,categoryId:payload.categoryId};
    },
    adminUpdateCategory:payload => { Object.assign(state.categories.find(row => row.categoryId === payload.categoryId),payload); return {success:true}; },
    adminBulkCreateNominees:payload => {
      state.bulkNomineeCalls += 1;
      const row = state.categories.find(item => item.categoryId === payload.categoryId);
      const created = JSON.parse(payload.itemsJSON).map(item => ({nomineeId:item.nomineeId,nominee:item.nominee}));
      row.nominees.push(...created);
      return {success:true,createdCount:created.length,created};
    },
    externalResultsBridgeEnqueue_:(_type,_key,_provider,payload) => {
      state.bridgeCalls += 1; state.bridgePayloads.push(plain(payload));
      if (state.failBridgeOnce) { state.failBridgeOnce = false; throw new Error('simulated Hub timeout'); }
      return {success:true,queued:true};
    }
  });
  const market = {
    provider:'kalshi', externalEventId:'KXWEATHERCHI-CERT', externalMarketId:'KXWEATHERCHI-CERT-80',
    eventName:'Chicago high temperature certification', marketQuestion:'Will Chicago reach the certification threshold?',
    outcomes:['Yes','No'], prices:{Yes:.55,No:.45}, sourceUrl:'https://example.invalid/provider-event'
  };
  const buildPayload = {
    gameId:'awards-cert', categoryId:'weather-cert', question:'Chicago certification threshold', points:5,
    selectedOutcomesJSON:JSON.stringify(['Yes','No']), marketJSON:JSON.stringify(market)
  };
  assert.throws(() => awards.apiAdminAwardsCreateQuestionFromMarket(buildPayload),/simulated Hub timeout/);
  const built = awards.apiAdminAwardsCreateQuestionFromMarket(buildPayload);
  assert.strictEqual(built.success,true);
  assert.strictEqual(built.resumed,true);
  assert.strictEqual(state.createCategoryCalls,1,'Retry must not duplicate local category.');
  assert.strictEqual(state.bulkNomineeCalls,1,'Retry must not duplicate local answers.');
  assert.strictEqual(state.categories[0].nominees.length,2);
  assert.strictEqual(state.bridgeCalls,2);
  const bridge = state.bridgePayloads[state.bridgePayloads.length-1];
  const savedConfig = JSON.parse(state.categories[0].sourceConfigJSON);
  assert.strictEqual(savedConfig.provider,'kalshi');
  assert.strictEqual(state.categories[0].externalEventId,market.externalEventId);
  assert.strictEqual(state.categories[0].externalMarketId,market.externalMarketId);
  assert.strictEqual(bridge.event.ExternalEventId,market.externalEventId);
  assert.strictEqual(bridge.market.ExternalMarketId,market.externalMarketId);
  assert.strictEqual(bridge.mappings.length,2);
  assert.deepStrictEqual(bridge.mappings.map(row => row.ExpectedOutcome).sort(),['No','Yes']);
  const outcomeMap = Object.fromEntries(bridge.mappings.map(row => [row.ExpectedOutcome,row.NomineeId]));

  // Hub-side contract requires explicit review/approval before delivery.
  const hubCore = fs.readFileSync('external-engines/external-results-hub/HubCore.js','utf8');
  const reviewBridge = fs.readFileSync('external-engines/external-results-hub/ReviewAndBridge.js','utf8');
  assertIncludes(hubCore,'RequireAdminReview: true','Hub provider defaults must require explicit admin review.');
  assertIncludes(hubCore,'ReviewStatus: "PENDING"','Imported result must stage as PENDING.');
  assertIncludes(reviewBridge,'approveSelectedExternalResults','Explicit approval action missing.');
  assertIncludes(reviewBridge,'pushApprovedExternalResultsNow','Approved-delivery action missing.');
  assert(/ReviewStatus\)\s*!==\s*"approved"|ReviewStatus\) !== "approved"/i.test(reviewBridge) || reviewBridge.includes('erhKey_(review.ReviewStatus) !== "approved"'),
    'Delivery must reject reviews that are not APPROVED.');

  const yesId = outcomeMap.Yes;
  const noId = outcomeMap.No;
  let existingResolution = null;
  const resultRows = [];
  const inbox = load('backend/engines/ExternalResultsHubBridgeEngine.js', {
    adminGetGameSetup:() => ({game:{type:'prediction'},categories:[{categoryId:'weather-cert',nominees:[{nomineeId:yesId},{nomineeId:noId}]}]}),
    getCategoryResultsResolutionMap:() => existingResolution ? {'weather-cert':existingResolution} : {},
    upsertCategoryResultsBulk_:rows => { resultRows.splice(0,resultRows.length,...rows); },
    adminUpdateCategory:() => ({success:true}), clearAppCaches:() => {},
    dedupeCategoryResultsForCategory_:() => ({success:true,removed:0})
  });
  inbox.externalResultsInboxQueueHubAck_ = () => ({success:true});
  inbox.externalResultsInboxExistingRealityDelivery_ = () => null;
  inbox.externalResultsInboxRealityMain_ = () => null;
  inbox.externalResultsInboxRealityQuestion_ = () => null;
  const approvedBatch = winnerId => [yesId,noId].map(id => ({
    Provider:'kalshi', Finality:'FINAL', AppGameId:'awards-cert', CategoryId:'weather-cert', NomineeId:id,
    IsWinner:id === winnerId, WinnersJSON:JSON.stringify([winnerId]), ResultValue:'FINAL', WinningOutcome:id === winnerId ? 'winner' : 'loser',
    ResultKey:'winning-outcome', ExternalEventId:market.externalEventId, ExternalMarketId:market.externalMarketId,
    ImportedResultId:'ir-cert', ReviewId:'review-approved', DeliveryBatchId:'batch-approved'
  }));

  let rows = approvedBatch(yesId);
  let validation = inbox.externalResultsInboxValidateGroup_(rows);
  assert.strictEqual(validation.ok,true);
  inbox.externalResultsInboxApplyGeneric_(validation,rows,'admin');
  assert.strictEqual(resultRows.find(row => row.nomineeId === yesId).isWinner,true);
  assert.strictEqual(resultRows.length,2);

  // Replaying the same approved delivery is state-idempotent: CategoryResults
  // remains one row per nominee and the score remains exactly 5, not 10.
  existingResolution = {resolved:true,result:'winner',winnerNomineeId:yesId,winnerNomineeIds:[yesId]};
  validation = inbox.externalResultsInboxValidateGroup_(rows);
  assert.strictEqual(validation.ok,true);
  inbox.externalResultsInboxApplyGeneric_(validation,rows,'admin');
  assert.strictEqual(resultRows.length,2);

  const cr = load('backend/engines/CategoryResultsEngine.js');
  cr.getCategoryResultsRows_ = () => resultRows.map(row => ({categoryId:row.categoryId,nomineeId:row.nomineeId,resultStatus:row.resultStatus,isWinner:row.isWinner,settledAt:row.settledAt}));
  const resolutions = cr.getCategoryResultsResolutionMap('awards-cert');
  const sc = load('backend/engines/ScoringEngine.js');
  sc.validateGameId = () => true;
  sc.getGameRuntimeConfig = () => ({type:'prediction',fixedPointsEnabled:true,confidenceEnabled:false,stakedPointsEnabled:false});
  sc.getGame = sc.getGameRuntimeConfig;
  sc.isConfidenceScoringGame_ = () => false;
  sc.getConfidenceScoringMode_ = () => 'win_only';
  sc.isFixedPointScoringEnabledForGame_ = () => true;
  sc.normalizeCategoryScoreMode_ = value => String(value || 'correct-pick').toLowerCase();
  sc.getCategorySettings = () => ({'weather-cert':{points:5,scoreMode:'correct-pick',changePenalty:0}});
  sc.getCategoryResultsResolutionMap = () => resolutions;
  sc.getHybridCategoryResolution_ = (id,_config,map) => map[id];
  sc.buildUserPicksMap_ = () => ({
    CertYes:{'weather-cert':{nomineeId:yesId,changeCount:0}},
    CertNo:{'weather-cert':{nomineeId:noId,changeCount:0}}
  });
  sc.seasonAnchorAdjustmentsForGame_ = () => ({});
  sc.getLeaderboardUserProfile_ = () => ({});
  let board = sc.getLeaderboardData('awards-cert');
  assert.strictEqual(board.find(row => row.username === 'CertYes').total,5);
  assert.strictEqual(board.find(row => row.username === 'CertNo').total,0);

  // Corrected provider result cannot silently replace an approved conflict.
  const conflict = inbox.externalResultsInboxValidateGroup_(approvedBatch(noId));
  assert.strictEqual(conflict.ok,false);
  assert.strictEqual(conflict.conflict,true);
  existingResolution = null; // models explicit admin reset/clear
  validation = inbox.externalResultsInboxValidateGroup_(approvedBatch(noId));
  assert.strictEqual(validation.ok,true);
  inbox.externalResultsInboxApplyGeneric_(validation,approvedBatch(noId),'admin');
  cr.getCategoryResultsRows_ = () => resultRows.map(row => ({categoryId:row.categoryId,nomineeId:row.nomineeId,resultStatus:row.resultStatus,isWinner:row.isWinner,settledAt:row.settledAt}));
  const corrected = cr.getCategoryResultsResolutionMap('awards-cert');
  sc.getCategoryResultsResolutionMap = () => corrected;
  board = sc.getLeaderboardData('awards-cert');
  assert.strictEqual(board.find(row => row.username === 'CertYes').total,0);
  assert.strictEqual(board.find(row => row.username === 'CertNo').total,5);
}

console.log('reality-awards-rc14-production-certification-tests: PASS');
