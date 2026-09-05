'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const enginePath = path.join(__dirname, '..', 'backend', 'engines', 'PermanentGamePurgeEngine.js');
vm.runInThisContext(fs.readFileSync(enginePath, 'utf8'), { filename: enginePath });

const TARGET = 'fixture-purge-2026';
const NEIGHBOR = 'fixture-neighbor-2026';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function baseFixtureData() {
  const tables = {
    Games: [
      { GameId: TARGET, Name: 'Fixture Purge Game', Type: 'prediction', Year: 2026, Active: true, Archived: false, DefaultGame: false, GameRole: 'standalone', ParentGameId: '', IncludeInParent: true, HeroImageFileID: 'unique-hero-file' },
      { GameId: NEIGHBOR, Name: 'Fixture Neighbor Game', Type: 'prediction', Year: 2026, Active: true, Archived: false, DefaultGame: false, GameRole: 'standalone', ParentGameId: '', IncludeInParent: true, HeroImageFileID: 'neighbor-hero-file' }
    ],
    Questions: [
      { GameId: TARGET, QuestionId: 'fixture-q1', Question: 'Fixture target question?' },
      { GameId: NEIGHBOR, QuestionId: 'neighbor-q1', Question: 'Neighbor question?' }
    ],
    QuestionOptions: [
      { GameId: TARGET, QuestionId: 'fixture-q1', OptionId: 'a', FileID: 'unique-option-file' },
      { GameId: TARGET, QuestionId: 'fixture-q1', OptionId: 'b', FileID: '' },
      { GameId: NEIGHBOR, QuestionId: 'neighbor-q1', OptionId: 'x', FileID: '' }
    ],
    Categories: [
      { GameId: TARGET, CategoryId: 'fixture-q1', NomineeId: 'a', FileID: 'shared-image-file', CategoryImage: '' },
      { GameId: TARGET, CategoryId: 'fixture-q1', NomineeId: 'b', FileID: '', CategoryImage: '' },
      { GameId: NEIGHBOR, CategoryId: 'neighbor-q1', NomineeId: 'x', FileID: 'shared-image-file', CategoryImage: '' }
    ],
    CategorySettings: [
      { GameId: '', CategoryId: 'fixture-q1', Points: 10, SourceConfigJSON: '{}' },
      { GameId: '', CategoryId: 'neighbor-q1', Points: 5, SourceConfigJSON: '{}' }
    ],
    CategoryResults: [
      { GameId: TARGET, CategoryId: 'fixture-q1', NomineeId: 'a', IsWinner: true },
      { GameId: NEIGHBOR, CategoryId: 'neighbor-q1', NomineeId: 'x', IsWinner: true }
    ],
    Picks: [
      { GameId: TARGET, Username: 'alice', CategoryId: 'fixture-q1', NomineeId: 'a' },
      { GameId: TARGET, Username: 'bob', CategoryId: 'fixture-q1', NomineeId: 'b' },
      { GameId: NEIGHBOR, Username: 'alice', CategoryId: 'neighbor-q1', NomineeId: 'x' }
    ],
    Bets: [
      { GameId: TARGET, Username: 'alice', CategoryId: 'fixture-q1', Amount: 5 },
      { GameId: NEIGHBOR, Username: 'alice', CategoryId: 'neighbor-q1', Amount: 7 }
    ],
    RankingEntries: [
      { EntryId: 're-target', GameId: TARGET, Username: 'alice' },
      { EntryId: 're-neighbor', GameId: NEIGHBOR, Username: 'alice' }
    ],
    RankingEntryItems: [
      { EntryId: 're-target', GameId: TARGET, Username: 'alice', CategoryId: 'fixture-q1', NomineeId: 'a', Rank: 1 },
      { EntryId: 're-neighbor', GameId: NEIGHBOR, Username: 'alice', CategoryId: 'neighbor-q1', NomineeId: 'x', Rank: 1 }
    ],
    CompetitionEntries: [
      { EntryId: 'ce-target', GameId: TARGET, Username: 'alice', EntryName: 'Target Entry', EntryImageFileID: 'unique-entry-file' },
      { EntryId: 'ce-neighbor', GameId: NEIGHBOR, Username: 'alice', EntryName: 'Neighbor Entry', EntryImageFileID: '' }
    ],
    CompetitionVotes: [
      { VoteId: 'cv-target', GameId: TARGET, Username: 'bob', EntryId: 'ce-target' },
      { VoteId: 'cv-neighbor', GameId: NEIGHBOR, Username: 'bob', EntryId: 'ce-neighbor' }
    ],
    CompetitionResults: [
      { ResultId: 'cr-target', GameId: TARGET, EntryId: 'ce-target', Score: 1 },
      { ResultId: 'cr-neighbor', GameId: NEIGHBOR, EntryId: 'ce-neighbor', Score: 2 }
    ],
    ScoringRuns: [
      { RunId: 'sr-target', GameId: TARGET, Status: 'COMPLETE' },
      { RunId: 'sr-neighbor', GameId: NEIGHBOR, Status: 'COMPLETE' }
    ],
    LiveLeaderboardSnapshot: [
      { SnapshotId: 'ls-target', GameId: TARGET, Username: 'alice', Score: 10 },
      { SnapshotId: 'ls-neighbor', GameId: NEIGHBOR, Username: 'alice', Score: 20 }
    ],
    ResultEvents: [
      { EventId: 'ev-target', GameId: TARGET, CategoryId: 'fixture-q1' },
      { EventId: 'ev-neighbor', GameId: NEIGHBOR, CategoryId: 'neighbor-q1' }
    ],
    UserNotifications: [
      { NotificationId: 'un-target', GameId: TARGET, Username: 'alice' },
      { NotificationId: 'un-neighbor', GameId: NEIGHBOR, Username: 'alice' }
    ],
    NotificationLog: [
      { LogId: 'nl-target', GameId: TARGET, Username: 'alice' },
      { LogId: 'nl-neighbor', GameId: NEIGHBOR, Username: 'alice' }
    ],
    InternetResultSources: [
      { SourceId: 'irs-target', GameId: TARGET, CategoryId: 'fixture-q1', SourceConfigJSON: '{}' },
      { SourceId: 'irs-neighbor', GameId: NEIGHBOR, CategoryId: 'neighbor-q1', SourceConfigJSON: '{}' }
    ],
    InternetResultImports: [
      { ImportId: 'iri-target', GameId: TARGET, CategoryId: 'fixture-q1' },
      { ImportId: 'iri-neighbor', GameId: NEIGHBOR, CategoryId: 'neighbor-q1' }
    ],
    ManualResultSuggestions: [
      { SuggestionId: 'mrs-target', GameId: TARGET, CategoryId: 'fixture-q1' },
      { SuggestionId: 'mrs-neighbor', GameId: NEIGHBOR, CategoryId: 'neighbor-q1' }
    ],
    SurvivorGameSettings: [
      { GameId: TARGET, RoundMode: 'weekly' },
      { GameId: NEIGHBOR, RoundMode: 'weekly' }
    ],
    SurvivorSettings: [
      { GameId: TARGET, TeamSourceConfigJSON: '{}', EliminationSourceConfigJSON: '{}' },
      { GameId: NEIGHBOR, TeamSourceConfigJSON: '{}', EliminationSourceConfigJSON: '{}' }
    ],
    SurvivorPicks: [
      { PickId: 'sp-target', GameId: TARGET, Username: 'alice' },
      { PickId: 'sp-neighbor', GameId: NEIGHBOR, Username: 'alice' }
    ],
    SurvivorEliminations: [
      { EliminationId: 'se-target', GameId: TARGET, Username: 'bob' },
      { EliminationId: 'se-neighbor', GameId: NEIGHBOR, Username: 'bob' }
    ],
    GameAppearance: [
      { GameId: TARGET, ImagePackId: 'shared-pack', ThemePackId: 'shared-theme' },
      { GameId: NEIGHBOR, ImagePackId: 'shared-pack', ThemePackId: 'shared-theme' }
    ],
    AppearanceOverrides: [
      { GameId: TARGET, EntityType: 'game', EntityId: TARGET, ImageFileId: 'shared-override-file' },
      { GameId: NEIGHBOR, EntityType: 'game', EntityId: NEIGHBOR, ImageFileId: 'shared-override-file' }
    ],
    AppearanceImagePacks: [ { PackId: 'shared-pack', PackName: 'Shared Pack' } ],
    AppearanceImagePackItems: [ { PackId: 'shared-pack', EntityType: 'game', EntityId: 'generic', ImageFileId: 'shared-pack-file' } ],
    AppearanceThemePacks: [ { ThemePackId: 'shared-theme', ThemeName: 'Shared Theme' } ],
    AppearanceHubSettings: [ { SettingKey: 'home', ImageFileId: 'shared-hub-file', IconFileId: '' } ],
    UserGameProfiles: [
      { GameId: TARGET, Username: 'alice', AvatarFileId: 'shared-avatar-file' },
      { GameId: NEIGHBOR, Username: 'alice', AvatarFileId: 'shared-avatar-file' }
    ],
    UserProfileScopes: [ { ProfileScopeKey: 'season-2026', Username: 'alice', AvatarFileId: 'shared-scope-file' } ],
    Users: [ { Username: 'alice', AvatarFileId: 'shared-avatar-file' }, { Username: 'bob', AvatarFileId: '' } ],
    UserNotificationPreferences: [ { Username: 'alice', Enabled: true } ],
    Leagues: [ { LeagueId: 'league-1', LeagueName: 'Shared League', Active: true } ],
    LeagueMembers: [
      { LeagueId: 'league-1', Username: 'alice', Status: 'ACTIVE' },
      { LeagueId: 'league-1', Username: 'bob', Status: 'ACTIVE' }
    ],
    LeagueGames: [
      { LeagueId: 'league-1', GameId: TARGET, Active: true },
      { LeagueId: 'league-1', GameId: NEIGHBOR, Active: true }
    ],
    LeagueSeasonMembership: [
      { LeagueId: 'league-1', SeasonGameId: TARGET, Username: 'alice', Status: 'ACTIVE' },
      { LeagueId: 'league-1', SeasonGameId: NEIGHBOR, Username: 'bob', Status: 'ACTIVE' }
    ],
    GameFeatureAccess: [
      { GameId: TARGET, Username: 'alice', Feature: 'viewGame', Allowed: true },
      { GameId: NEIGHBOR, Username: 'alice', Feature: 'viewGame', Allowed: true }
    ],
    LeaguePlanAccess: [ { LeagueId: 'league-1', SubscriptionTier: 'standard', Active: true } ],
    DataIndex: [
      { EntityType: 'Questions', GameId: TARGET, SheetName: 'Questions', RowCount: 1 },
      { EntityType: 'Questions', GameId: NEIGHBOR, SheetName: 'Questions', RowCount: 1 }
    ],
    StorageMigrationLog: [
      { Timestamp: '2026-09-01', Action: 'MIGRATE', GameId: TARGET, Status: 'PASS' },
      { Timestamp: '2026-09-01', Action: 'MIGRATE', GameId: NEIGHBOR, Status: 'PASS' }
    ],
    ArchiveManifest: [
      { ArchiveId: 'ar-target', GameId: TARGET, ArchiveSpreadsheetId: 'shared-archive-sheet' },
      { ArchiveId: 'ar-neighbor', GameId: NEIGHBOR, ArchiveSpreadsheetId: 'shared-archive-sheet' }
    ],
    ExternalResultsHubOutbox: [
      { JobId: 'job-target', JobType: 'UPSERT_EXTERNAL_MARKET_MAPPING', EntityKey: 'provider|market|' + TARGET + '|fixture-q1', PayloadJSON: JSON.stringify({ mapping: { AppGameId: TARGET, CategoryId: 'fixture-q1' } }), Status: 'COMPLETE' },
      { JobId: 'job-neighbor', JobType: 'UPSERT_EXTERNAL_MARKET_MAPPING', EntityKey: 'provider|market|' + NEIGHBOR + '|neighbor-q1', PayloadJSON: JSON.stringify({ mapping: { AppGameId: NEIGHBOR, CategoryId: 'neighbor-q1' } }), Status: 'COMPLETE' }
    ],
    ExternalResultsInbox: [
      { DeliveryId: 'del-target', AppGameId: TARGET, CategoryId: 'fixture-q1', ImportedResultId: 'import-shared' },
      { DeliveryId: 'del-neighbor', AppGameId: NEIGHBOR, CategoryId: 'neighbor-q1', ImportedResultId: 'import-shared' }
    ],

    // Reality fixture rows.
    RealitySeasons: [
      { SeasonId: 'season-target', GameId: TARGET, ShowName: 'Fixture Show' },
      { SeasonId: 'season-neighbor', GameId: NEIGHBOR, ShowName: 'Neighbor Show' }
    ],
    RealityContestants: [
      { SeasonId: 'season-target', GameId: TARGET, ContestantId: 'c1', ImageUrl: 'https://example.test/shared.jpg' },
      { SeasonId: 'season-neighbor', GameId: NEIGHBOR, ContestantId: 'nc1', ImageUrl: 'https://example.test/shared.jpg' }
    ],
    RealityCastImport: [ { SeasonId: 'season-target', GameId: TARGET, Name: 'Fixture Cast' } ],
    RealityEpisodes: [
      { SeasonId: 'season-target', GameId: TARGET, EpisodeId: 'ep-target-1', EpisodeNumber: 1, CategoryId: 'fixture-q1' },
      { SeasonId: 'season-neighbor', GameId: NEIGHBOR, EpisodeId: 'ep-neighbor-1', EpisodeNumber: 1, CategoryId: 'neighbor-q1' }
    ],
    RealityGroups: [ { SeasonId: 'season-target', GameId: TARGET, GroupId: 'g1' } ],
    RealityContestantGroupHistory: [ { AssignmentId: 'gha-target', SeasonId: 'season-target', GameId: TARGET, ContestantId: 'c1', GroupId: 'g1' } ],
    RealityResultQueue: [ { QueueId: 'rq-target', SeasonId: 'season-target', GameId: TARGET, EpisodeId: 'ep-target-1', CategoryId: 'fixture-q1', ReviewStatus: 'APPROVED' } ],
    RealityEpisodeVotes: [ { VoteId: 'rev-target', SeasonId: 'season-target', GameId: TARGET, EpisodeId: 'ep-target-1' } ],
    RealityNextEpisodeJobs: [ { JobId: 'rnej-target', SeasonId: 'season-target', GameId: TARGET, Status: 'COMPLETE' } ],
    RealitySpoilerShield: [ { Username: 'alice', GameId: TARGET, SeasonId: 'season-target', EpisodeId: 'ep-target-1', RecordType: 'REVEAL' } ],
    RealityQuestionTemplates: [ { SeasonId: 'season-target', GameId: TARGET, TemplateId: 't1' } ],
    RealityEpisodeQuestions: [ { SeasonId: 'season-target', GameId: TARGET, EpisodeId: 'ep-target-1', EpisodeQuestionId: 'eq1', CategoryId: 'fixture-q1' } ],
    RealityQuestionResultQueue: [ { QueueId: 'rqq-target', SeasonId: 'season-target', GameId: TARGET, EpisodeQuestionId: 'eq1', CategoryId: 'fixture-q1' } ],
    RealityQuestionBuildJobs: [ { BuildId: 'rbj-target', SeasonId: 'season-target', GameId: TARGET, EpisodeId: 'ep-target-1', Status: 'COMPLETE' } ],
    SeasonAnchorSettings: [ { GameId: TARGET, SeasonId: 'season-target', Enabled: true } ],
    UserSeasonAnchors: [ { GameId: TARGET, SeasonId: 'season-target', Username: 'alice', CurrentEntityId: 'c1' } ],
    SeasonAnchorHistory: [ { HistoryId: 'sah-target', GameId: TARGET, SeasonId: 'season-target', Username: 'alice', EpisodeId: 'ep-target-1' } ],

    // Conditional/shared legacy tables intentionally not target-owned here.
    Votes: [ { VoteId: 'legacy-neighbor', CommunityGameId: 'community-other', Username: 'alice' } ],
    ResultsSnapshots: [],
    PermanentGamePurgeAudit: []
  };

  const hub = {
    AppMappings: [
      { MappingId: 'map-target', AppGameId: TARGET, CategoryId: 'fixture-q1', NomineeId: 'a', SourceConfigJSON: '{}' },
      { MappingId: 'map-neighbor', AppGameId: NEIGHBOR, CategoryId: 'neighbor-q1', NomineeId: 'x', SourceConfigJSON: '{}' }
    ],
    ResultSourcePolicies: [
      { PolicyId: 'pol-target', AppGameId: TARGET, CategoryId: 'fixture-q1', StableCheckCount: 2 },
      { PolicyId: 'pol-neighbor', AppGameId: NEIGHBOR, CategoryId: 'neighbor-q1', StableCheckCount: 2 }
    ],
    ProviderSettings: [ { ProviderId: 'official-academy', Enabled: true } ],
    ExternalEvents: [ { Provider: 'provider', ExternalEventId: 'event-shared' } ],
    ExternalMarkets: [ { Provider: 'provider', ExternalMarketId: 'market-shared', ExternalEventId: 'event-shared' } ],
    ExternalSubjects: [],
    ImportedResults: [ { ImportedResultId: 'import-shared', Provider: 'provider', ExternalEventId: 'event-shared', ExternalMarketId: 'market-shared', WinningOutcome: 'A' } ],
    ReviewQueue: [ { ReviewId: 'review-shared', ImportedResultId: 'import-shared', ReviewStatus: 'APPROVED' } ],
    SyncLog: [ { SyncId: 'sync-1', Provider: 'provider', Status: 'PASS' } ],
    ManualEntry: []
  };

  const caches = [
    { key: 'target-cache-1', gameId: TARGET },
    { key: 'neighbor-cache-1', gameId: NEIGHBOR },
    { key: 'games_v3_hybrid_standard_predictions', sharedList: [TARGET, NEIGHBOR] },
    { key: 'normalized_question_game_map_v1', questionMap: { 'fixture-q1': [TARGET], 'neighbor-q1': [NEIGHBOR] } }
  ];

  const assets = {
    'unique-hero-file': { ownerGameId: TARGET, shared: false, deleted: false },
    'unique-option-file': { ownerGameId: TARGET, shared: false, deleted: false },
    'unique-entry-file': { ownerGameId: TARGET, shared: false, deleted: false },
    'shared-image-file': { ownerGameId: '', shared: true, deleted: false },
    'shared-override-file': { ownerGameId: '', shared: true, deleted: false },
    'shared-avatar-file': { ownerGameId: '', shared: true, deleted: false },
    'neighbor-hero-file': { ownerGameId: NEIGHBOR, shared: false, deleted: false },
    'shared-pack-file': { ownerGameId: '', shared: true, deleted: false },
    'shared-hub-file': { ownerGameId: '', shared: true, deleted: false },
    'shared-scope-file': { ownerGameId: '', shared: true, deleted: false }
  };

  const sports = {
    SportsScores: [ { GameId: 'espn-401234', League: 'NFL' } ],
    SportsSnapshots: [ { GameId: 'espn-401234', SnapshotId: 'snap-1' } ],
    SportsGames: [ { GameId: 'espn-401234', ESPNEventId: '401234' } ]
  };

  return { tables, hub, caches, assets, sports, audits: [] };
}

class FixtureAdapter {
  constructor(data) {
    this.mode = 'fixture';
    this.data = clone(data || baseFixtureData());
    this.failAt = '';
  }
  rowsBucket(scope) {
    return scope === 'HUB' ? this.data.hub : this.data.tables;
  }
  getRows(scope, sheet) {
    const bucket = this.rowsBucket(scope);
    const rows = bucket[sheet] || [];
    return rows;
  }
  hasStore(scope, sheet) {
    const bucket = this.rowsBucket(scope);
    return Object.prototype.hasOwnProperty.call(bucket, sheet);
  }
  getHubStatus() {
    return { configured: true, readable: true, error: '' };
  }
  getAssetOwnership(fileId) {
    const asset = this.data.assets[fileId];
    return asset ? { ownerGameId: asset.ownerGameId || '', shared: asset.shared === true } : null;
  }
  beforeDelete(scope, sheet) {
    if (this.failAt && this.failAt === scope + ':' + sheet) {
      throw new Error('Injected fixture failure at ' + this.failAt);
    }
  }
  deleteRows(scope, sheet, predicate) {
    const bucket = this.rowsBucket(scope);
    const rows = bucket[sheet] || [];
    const keep = [];
    let deleted = 0;
    rows.forEach(row => {
      if (predicate(row)) deleted += 1;
      else keep.push(row);
    });
    bucket[sheet] = keep;
    return deleted;
  }
  deleteGameCaches(gameId) {
    let deleted = 0;
    const next = [];
    this.data.caches.forEach(cache => {
      if (cache.gameId === gameId) {
        deleted += 1;
        return;
      }
      if (Array.isArray(cache.sharedList)) {
        cache.sharedList = cache.sharedList.filter(id => id !== gameId);
      }
      if (cache.questionMap && typeof cache.questionMap === 'object') {
        Object.keys(cache.questionMap).forEach(key => {
          cache.questionMap[key] = (cache.questionMap[key] || []).filter(id => id !== gameId);
          if (!cache.questionMap[key].length) delete cache.questionMap[key];
        });
      }
      next.push(cache);
    });
    this.data.caches = next;
    return { deleted };
  }
  deleteAsset(fileId) {
    if (!this.data.assets[fileId]) throw new Error('Asset not found: ' + fileId);
    this.data.assets[fileId].deleted = true;
    return true;
  }
  appendAudit(record) {
    this.data.audits.push(clone(record));
  }
  snapshot() {
    return JSON.stringify(this.data);
  }
}

function targetRows(data, sheet, field = 'GameId') {
  return (data.tables[sheet] || []).filter(row => String(row[field] || '') === TARGET);
}

function neighborRowsSnapshot(data) {
  const result = {};
  Object.keys(data.tables).forEach(sheet => {
    result[sheet] = (data.tables[sheet] || []).filter(row =>
      row.GameId === NEIGHBOR || row.AppGameId === NEIGHBOR || row.SeasonGameId === NEIGHBOR
    );
  });
  result.hub = {};
  Object.keys(data.hub).forEach(sheet => {
    result.hub[sheet] = (data.hub[sheet] || []).filter(row => row.AppGameId === NEIGHBOR);
  });
  return clone(result);
}

const results = [];
function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}
function equal(actual, expected, message) {
  if (actual !== expected) throw new Error((message || 'Values differ') + ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function deepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error((message || 'Objects differ') + `\nEXPECTED ${e}\nACTUAL   ${a}`);
}
function test(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err && err.stack ? err.stack : String(err) });
  }
}

let happyExecution = null;
let happyAdapter = null;
let dryExample = null;
let blockedExample = null;

// 1. Dry Run makes no writes.
test('01 Dry Run makes no writes', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const before = adapter.snapshot();
  const report = permanentGamePurgeDryRunWithAdapter_(adapter, TARGET, { requestedBy: 'fixture-admin' });
  equal(adapter.snapshot(), before, 'Dry Run mutated fixture state');
  assert(report.readOnly === true, 'Dry Run did not report readOnly');
  equal(adapter.data.audits.length, 0, 'Dry Run persisted an audit record');
  assert(report.auditRecordPreview && report.auditRecordPreview.Action === 'DRY_RUN', 'Dry Run did not return audit preview');
  dryExample = clone(report);
});

// 2. Exact GameId lookup.
test('02 Exact GameId lookup only', () => {
  const report = permanentGamePurgeDryRunWithAdapter_(new FixtureAdapter(baseFixtureData()), TARGET, {});
  assert(report.game.exists === true, 'Exact GameId not found');
  equal(report.gameId, TARGET);
});

// 3. Nonexistent GameId safely rejected.
test('03 Nonexistent GameId safely rejected', () => {
  const report = permanentGamePurgeDryRunWithAdapter_(new FixtureAdapter(baseFixtureData()), 'does-not-exist', {});
  assert(report.game.exists === false, 'Nonexistent game unexpectedly exists');
  assert(report.blockers.some(x => x.type === 'GAME_NOT_FOUND'), 'Missing GAME_NOT_FOUND blocker');
});

// 4. Partial GameId cannot delete / resolve.
test('04 Partial GameId cannot resolve or delete', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const report = permanentGamePurgeDryRunWithAdapter_(adapter, 'fixture-purge', {});
  assert(report.game.exists === false, 'Partial GameId resolved unexpectedly');
  const exec = permanentGamePurgeExecuteFixture_(adapter, 'fixture-purge', 'fixture-purge', {});
  assert(exec.success === true && exec.alreadyAbsent === true, 'Partial nonexistent fixture request should be safely already absent');
  assert(targetRows(adapter.data, 'Games').length === 1, 'Partial request deleted target');
});

// 5. Counts all owned records.
test('05 Dry Run counts owned records across stores', () => {
  const report = permanentGamePurgeDryRunWithAdapter_(new FixtureAdapter(baseFixtureData()), TARGET, {});
  equal(report.counts['MAIN:Picks'], 2, 'Pick count');
  equal(report.counts['MAIN:Categories'], 2, 'Categories count');
  equal(report.counts['MAIN:CategorySettings'], 1, 'CategorySettings derived ownership count');
  equal(report.counts['MAIN:LeagueGames'], 1, 'LeagueGames count');
  equal(report.counts['MAIN:LeagueSeasonMembership'], 1, 'LeagueSeasonMembership count');
  equal(report.counts['MAIN:GameAppearance'], 1, 'GameAppearance count');
  equal(report.counts['HUB:AppMappings'], 1, 'Hub mapping count');
  equal(report.counts['MAIN:RealityEpisodes'], 1, 'Reality episode count');
  assert(report.totalOwnedRows > 25, 'Expected broad owned-row inventory');
});

// 6. Detects dependent game.
test('06 Active dependent game blocks purge', () => {
  const data = baseFixtureData();
  data.tables.Games.push({ GameId: 'dependent-child-2026', Name: 'Dependent Child', Active: true, Archived: false, GameRole: 'mini', ParentGameId: TARGET, IncludeInParent: true });
  const report = permanentGamePurgeDryRunWithAdapter_(new FixtureAdapter(data), TARGET, {});
  assert(report.blockers.some(x => x.type === 'PARENT_CHILD' && x.referencedByGameId === 'dependent-child-2026'), 'Dependent child not detected');
});

// 7. KOTH dependency blocks.
test('07 KOTH source-game dependency blocks', () => {
  const data = baseFixtureData();
  data.tables.Games.push({ GameId: 'koth-dependent-2026', Name: 'KOTH Dependent', Active: true, Archived: false, GameRole: 'standalone' });
  data.tables.SurvivorSettings.push({
    GameId: 'koth-dependent-2026',
    TeamSourceConfigJSON: JSON.stringify({ sourceGameIds: [TARGET, NEIGHBOR] }),
    EliminationSourceConfigJSON: '{}'
  });
  const report = permanentGamePurgeDryRunWithAdapter_(new FixtureAdapter(data), TARGET, {});
  assert(report.blockers.some(x => x.type === 'KOTH_SOURCE'), 'KOTH dependency not detected');
  blockedExample = clone(report);
});

// 8. Parent/child dependency blocks when target is included mini.
test('08 Target mini-game linked to active parent blocks', () => {
  const data = baseFixtureData();
  const target = data.tables.Games.find(x => x.GameId === TARGET);
  target.GameRole = 'mini';
  target.ParentGameId = NEIGHBOR;
  target.IncludeInParent = true;
  const report = permanentGamePurgeDryRunWithAdapter_(new FixtureAdapter(data), TARGET, {});
  assert(report.blockers.some(x => x.type === 'PARENT_CHILD' && x.referencedByGameId === NEIGHBOR), 'Active parent dependency not detected');
});

// 9. Child-first deletion order.
test('09 Fixture purge follows child-first phase order', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, { requestedBy: 'fixture-admin' });
  assert(exec.success, 'Fixture purge failed: ' + (exec.message || 'unknown'));
  const phases = exec.deletionTrace.map(x => x.phase);
  for (let i = 1; i < phases.length; i++) assert(phases[i] >= phases[i-1], 'Deletion phases are not monotonic');
});

// 10. Games row deleted last.
test('10 Games row is deleted last', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  const last = exec.deletionTrace[exec.deletionTrace.length - 1];
  equal(last.scope, 'MAIN');
  equal(last.sheet, 'Games');
  equal(last.phase, 1000);
});

// 11. GameAppearance removed.
test('11 GameAppearance target row removed', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  assert(exec.success, 'Fixture purge failed');
  equal(targetRows(adapter.data, 'GameAppearance').length, 0);
});

// 12. Shared appearance/template preserved.
test('12 Shared appearance packs and themes preserved', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const beforePacks = clone(adapter.data.tables.AppearanceImagePacks);
  const beforeThemes = clone(adapter.data.tables.AppearanceThemePacks);
  permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  deepEqual(adapter.data.tables.AppearanceImagePacks, beforePacks, 'Shared image pack changed');
  deepEqual(adapter.data.tables.AppearanceThemePacks, beforeThemes, 'Shared theme pack changed');
});

// 13. Shared Drive asset preserved.
test('13 Shared Drive asset preserved', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  assert(exec.success, 'Fixture purge failed');
  assert(adapter.data.assets['shared-image-file'].deleted === false, 'Shared image file was deleted');
  assert(adapter.data.assets['shared-override-file'].deleted === false, 'Shared override file was deleted');
});

// 14. Uniquely owned asset handled correctly.
test('14 Proven unique fixture asset deleted', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  assert(exec.success, 'Fixture purge failed');
  assert(adapter.data.assets['unique-hero-file'].deleted === true, 'Unique hero file not deleted');
  assert(adapter.data.assets['unique-option-file'].deleted === true, 'Unique option file not deleted');
  assert(adapter.data.assets['unique-entry-file'].deleted === true, 'Unique entry file not deleted');
});

// 15. Unrelated game's rows untouched.
test('15 Neighbor game remains intact', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const before = neighborRowsSnapshot(adapter.data);
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  assert(exec.success, 'Fixture purge failed');
  deepEqual(neighborRowsSnapshot(adapter.data), before, 'Neighbor rows changed');
});

// 16. Memberships removed only for target.
test('16 Target season membership/link removed; shared LeagueMembers preserved', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const leagueMembersBefore = clone(adapter.data.tables.LeagueMembers);
  permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  equal((adapter.data.tables.LeagueSeasonMembership || []).filter(x => x.SeasonGameId === TARGET).length, 0);
  equal((adapter.data.tables.LeagueSeasonMembership || []).filter(x => x.SeasonGameId === NEIGHBOR).length, 1);
  equal((adapter.data.tables.LeagueGames || []).filter(x => x.GameId === TARGET).length, 0);
  equal((adapter.data.tables.LeagueGames || []).filter(x => x.GameId === NEIGHBOR).length, 1);
  deepEqual(adapter.data.tables.LeagueMembers, leagueMembersBefore, 'Shared LeagueMembers changed');
});

// 17. Entries removed only for target.
test('17 Entries removed only for target', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  equal(targetRows(adapter.data, 'RankingEntries').length, 0);
  equal(targetRows(adapter.data, 'CompetitionEntries').length, 0);
  equal(targetRows(adapter.data, 'RankingEntryItems').length, 0);
  equal((adapter.data.tables.CompetitionEntries || []).filter(x => x.GameId === NEIGHBOR).length, 1);
});

// 18. Picks removed only for target.
test('18 Picks/selections removed only for target', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  equal(targetRows(adapter.data, 'Picks').length, 0);
  equal(targetRows(adapter.data, 'Bets').length, 0);
  equal(targetRows(adapter.data, 'SurvivorPicks').length, 0);
  equal((adapter.data.tables.Picks || []).filter(x => x.GameId === NEIGHBOR).length, 1);
});

// 19. Score/result rows removed only for target.
test('19 Score/result/history rows removed only for target', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  ['CategoryResults','LiveLeaderboardSnapshot','CompetitionResults','SurvivorEliminations','SeasonAnchorHistory','ScoringRuns','ResultEvents'].forEach(sheet => {
    equal(targetRows(adapter.data, sheet).length, 0, sheet + ' target residue');
  });
  equal((adapter.data.tables.CategoryResults || []).filter(x => x.GameId === NEIGHBOR).length, 1);
});

// 20. Cache/index cleanup scoped to target.
test('20 Cache/index cleanup is target-scoped', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  equal((adapter.data.tables.DataIndex || []).filter(x => x.GameId === TARGET).length, 0);
  equal((adapter.data.tables.DataIndex || []).filter(x => x.GameId === NEIGHBOR).length, 1);
  assert(!adapter.data.caches.some(x => x.gameId === TARGET), 'Target scoped cache remains');
  assert(adapter.data.caches.some(x => x.gameId === NEIGHBOR), 'Neighbor scoped cache was removed');
  const gamesCache = adapter.data.caches.find(x => x.key === 'games_v3_hybrid_standard_predictions');
  deepEqual(gamesCache.sharedList, [NEIGHBOR], 'Shared Games cache was not surgically rewritten');
  const qmap = adapter.data.caches.find(x => x.key === 'normalized_question_game_map_v1');
  assert(!JSON.stringify(qmap).includes(TARGET), 'Target remains in normalized shared map');
  assert(JSON.stringify(qmap).includes(NEIGHBOR), 'Neighbor missing from normalized shared map');
});

// 21. Exact confirmation required.
test('21 Exact typed confirmation required', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const before = adapter.snapshot();
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET.toUpperCase(), {});
  assert(exec.success === false && exec.code === 'CONFIRMATION_MISMATCH', 'Wrong confirmation was not blocked');
  equal(adapter.snapshot(), before, 'Wrong confirmation mutated state');
});

// 22. Audit record written on fixture purge.
test('22 Fixture permanent purge writes audit record', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, { requestedBy: 'fixture-admin' });
  assert(exec.success, 'Fixture purge failed');
  equal(adapter.data.audits.length, 1, 'Expected one fixture audit record');
  equal(adapter.data.audits[0].Action, 'PURGE');
  equal(adapter.data.audits[0].GameId, TARGET);
  equal(adapter.data.audits[0].FinalResult, 'SUCCESS');
});

// 23. Zero-reference verification.
test('23 Zero removable references remain after fixture purge', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  assert(exec.success, 'Fixture purge failed');
  equal(exec.zeroReferenceVerification.remainingReferenceCount, 0);
  assert(exec.zeroReferenceVerification.success === true, 'Zero verification failed');
});

// 24. Repeat purge safe/idempotent.
test('24 Repeat fixture purge is safe/idempotent', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const first = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  assert(first.success, 'First fixture purge failed');
  const afterFirst = adapter.snapshot();
  const second = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  assert(second.success === true && second.alreadyAbsent === true, 'Second purge did not return alreadyAbsent');
  equal(adapter.snapshot(), afterFirst, 'Repeat purge mutated post-purge state');
});

// 25. Midway failure reported without false success.
test('25 Midway failure is reported without false success', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  adapter.failAt = 'MAIN:CategoryResults';
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, { requestedBy: 'fixture-admin' });
  assert(exec.success === false && exec.code === 'PARTIAL_FAILURE', 'Injected failure falsely reported success');
  equal(targetRows(adapter.data, 'Games').length, 1, 'Games row should remain after pre-final failure');
  assert(exec.zeroReferenceVerification.remainingReferenceCount > 0, 'Failure verifier did not report residue');
  equal(adapter.data.audits.length, 1, 'Failure audit missing');
  equal(adapter.data.audits[0].FinalResult, 'ERROR — PARTIAL FIXTURE PURGE');
});

// Additional fail-closed coverage beyond the mandatory 25.
test('26 Ambiguous blank-GameId CategorySettings blocks', () => {
  const data = baseFixtureData();
  data.tables.Questions.push({ GameId: NEIGHBOR, QuestionId: 'fixture-q1', Question: 'Ambiguous reused ID' });
  const report = permanentGamePurgeDryRunWithAdapter_(new FixtureAdapter(data), TARGET, {});
  assert(report.blockers.some(x => x.type === 'AMBIGUOUS_CATEGORY_SETTINGS'), 'Ambiguous CategorySettings did not block');
});

test('27 Shared Hub provider observations/review rows are preserved', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const importedBefore = clone(adapter.data.hub.ImportedResults);
  const reviewBefore = clone(adapter.data.hub.ReviewQueue);
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  assert(exec.success, 'Fixture purge failed');
  equal((adapter.data.hub.AppMappings || []).filter(x => x.AppGameId === TARGET).length, 0, 'Target mapping remains');
  equal((adapter.data.hub.ResultSourcePolicies || []).filter(x => x.AppGameId === TARGET).length, 0, 'Target policy remains');
  deepEqual(adapter.data.hub.ImportedResults, importedBefore, 'Shared ImportedResults changed');
  deepEqual(adapter.data.hub.ReviewQueue, reviewBefore, 'Shared ReviewQueue changed');
});

test('28 Sports Engine fixture data remains untouched/protected', () => {
  const adapter = new FixtureAdapter(baseFixtureData());
  const sportsBefore = clone(adapter.data.sports);
  const exec = permanentGamePurgeExecuteFixture_(adapter, TARGET, TARGET, {});
  assert(exec.success, 'Fixture purge failed');
  deepEqual(adapter.data.sports, sportsBefore, 'Protected Sports fixture data changed');
});

// Capture canonical successful fixture example after tests use isolated adapters.
happyAdapter = new FixtureAdapter(baseFixtureData());
happyExecution = permanentGamePurgeExecuteFixture_(happyAdapter, TARGET, TARGET, { requestedBy: 'fixture-admin' });

const outDir = process.env.RC24B_TEST_OUTPUT_DIR || path.join(__dirname, 'test-output');
fs.mkdirSync(outDir, { recursive: true });

const passed = results.filter(x => x.status === 'PASS').length;
const failed = results.length - passed;
const summary = {
  suite: 'RC24B Permanent Game Purge DryRun/Fixture',
  baseline: 'e3627c57da015ac08eb65cd928378fdcb63d2cdc',
  total: results.length,
  passed,
  failed,
  productionGameDeleted: false,
  sportsEngineModified: false,
  results
};

fs.writeFileSync(path.join(outDir, 'TEST_RESULTS.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outDir, 'TEST_RESULTS.txt'), [
  `RC24B Permanent Game Purge DryRun/Fixture`,
  `Baseline: e3627c57da015ac08eb65cd928378fdcb63d2cdc`,
  `Tests: ${passed}/${results.length} PASS`,
  `Failed: ${failed}`,
  `NO PRODUCTION GAME DELETED`,
  `Sports Engine v55 untouched`,
  '',
  ...results.map(r => `${r.status}  ${r.name}${r.error ? '\n' + r.error : ''}`)
].join('\n'));

fs.writeFileSync(path.join(outDir, 'EXAMPLE_DRY_RUN.json'), JSON.stringify(dryExample, null, 2));
fs.writeFileSync(path.join(outDir, 'EXAMPLE_BLOCKED_DEPENDENCY.json'), JSON.stringify(blockedExample, null, 2));
fs.writeFileSync(path.join(outDir, 'EXAMPLE_SUCCESSFUL_FIXTURE_PURGE.json'), JSON.stringify(happyExecution, null, 2));
fs.writeFileSync(path.join(outDir, 'ZERO_REFERENCE_VERIFICATION.json'), JSON.stringify(happyExecution.zeroReferenceVerification, null, 2));

console.log(`RC24B tests: ${passed}/${results.length} PASS`);
if (failed) {
  results.filter(x => x.status === 'FAIL').forEach(r => console.error(`FAIL ${r.name}\n${r.error}`));
  process.exitCode = 1;
}
