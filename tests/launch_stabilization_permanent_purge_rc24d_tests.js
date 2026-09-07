'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const enginePath = path.join(__dirname, '..', 'backend', 'engines', 'PermanentGamePurgeEngine.js');
const source = fs.readFileSync(enginePath, 'utf8');
vm.runInThisContext(source, { filename: enginePath });

function clone(v){ return JSON.parse(JSON.stringify(v)); }
function base(active){
  return {
    main: {
      Games: [
        { GameId:'old-game', Name:'Old Test Game', Type:'prediction', Year:2026, Active:active === true, Archived:false, DefaultGame:false, GameRole:'standalone', ParentGameId:'', IncludeInParent:true },
        { GameId:'neighbor', Name:'Neighbor', Type:'prediction', Year:2026, Active:true, Archived:false, DefaultGame:false, GameRole:'standalone', ParentGameId:'', IncludeInParent:true }
      ],
      Questions:[{GameId:'old-game',QuestionId:'q1'},{GameId:'neighbor',QuestionId:'q2'}],
      QuestionOptions:[{GameId:'old-game',QuestionId:'q1',OptionId:'a'}],
      Categories:[{GameId:'old-game',CategoryId:'q1',NomineeId:'a'}],
      CategorySettings:[{GameId:'old-game',CategoryId:'q1'}],
      Picks:[{GameId:'old-game',Username:'alice',CategoryId:'q1',NomineeId:'a'}],
      GameAppearance:[{GameId:'old-game',ImagePackId:'shared-pack'}],
      AppearanceImagePacks:[{PackId:'shared-pack'}],
      AppearanceImagePackItems:[], AppearanceThemePacks:[], AppearanceHubSettings:[], AppearanceOverrides:[],
      UserGameProfiles:[], UserProfileScopes:[], Users:[], Profiles:[],
      Bets:[], RankingEntries:[], RankingEntryItems:[], CompetitionEntries:[], CompetitionVotes:[], CompetitionResults:[],
      ScoringRuns:[], ResultEvents:[], LiveLeaderboardSnapshot:[], NotificationLog:[], UserNotifications:[], StorageMigrationLog:[], ArchiveManifest:[],
      RealityNextEpisodeJobs:[], RealityQuestionBuildJobs:[], RealityResultQueue:[], RealityQuestionResultQueue:[], RealityEpisodeVotes:[], RealityContestantGroupHistory:[], RealitySpoilerShield:[], RealityGroups:[], RealityContestants:[], RealityCastImport:[], RealityEpisodes:[], RealitySeasons:[], RealityQuestionTemplates:[], RealityEpisodeQuestions:[],
      UserSeasonAnchors:[], SeasonAnchorHistory:[], SeasonAnchorSettings:[],
      LeagueSeasonMembership:[], LeagueGames:[], GameFeatureAccess:[], Leagues:[], LeagueMembers:[], LeaguePlanAccess:[],
      ExternalResultsHubOutbox:[], ExternalResultsInbox:[], InternetResultImports:[], InternetResultSources:[], ManualResultSuggestions:[],
      SurvivorPicks:[], SurvivorEliminations:[], SurvivorGameSettings:[], SurvivorSettings:[],
      DataIndex:[]
    },
    hub:{ AppMappings:[], ResultSourcePolicies:[] },
    audits:[], cacheDeletes:0, trace:[]
  };
}

class Adapter {
  constructor(data){ this.mode='production-write'; this.data=clone(data); }
  bucket(scope){ return scope === 'HUB' ? this.data.hub : this.data.main; }
  getRows(scope,sheet){ return this.bucket(scope)[sheet] || []; }
  hasStore(scope,sheet){ return Object.prototype.hasOwnProperty.call(this.bucket(scope), sheet); }
  getHubStatus(){ return {configured:true,readable:true,error:''}; }
  getAssetOwnership(){ return null; }
  beforeDelete(scope,sheet,phase){ this.data.trace.push({scope,sheet,phase}); }
  deleteRows(scope,sheet,predicate){
    const b=this.bucket(scope); const rows=b[sheet]||[]; const keep=[]; let n=0;
    rows.forEach(r=>{ if(predicate(r)) n++; else keep.push(r); }); b[sheet]=keep; return n;
  }
  deleteGameCaches(){ this.data.cacheDeletes++; return {deleted:4}; }
  appendAudit(row){ this.data.audits.push(clone(row)); return {success:true}; }
}

// 1 production flag is intentional and guarded.
assert(source.includes('const PERMANENT_GAME_PURGE_PRODUCTION_ENABLED = true;'));
assert(source.includes('TARGET_GAME_ACTIVE'));
assert(source.includes('production-write'));
assert(source.includes('waitLock(10000)'));

// 2 exact confirmation mismatch blocks before mutation.
{
  const a=new Adapter(base(false));
  const before=JSON.stringify(a.data);
  const r=permanentGamePurgeExecuteProduction_(a,'old-game','OLD-GAME',{});
  assert.strictEqual(r.success,false); assert.strictEqual(r.code,'CONFIRMATION_MISMATCH');
  assert.strictEqual(JSON.stringify(a.data),before);
}

// 3 active target must be deactivated/archived first.
{
  const a=new Adapter(base(true));
  const r=permanentGamePurgeExecuteProduction_(a,'old-game','old-game',{});
  assert.strictEqual(r.success,false); assert.strictEqual(r.code,'TARGET_GAME_ACTIVE');
  assert.strictEqual(a.getRows('MAIN','Games').length,2);
}

// 4 default game is blocked by dry run.
{
  const d=base(false); d.main.Games[0].DefaultGame=true;
  const a=new Adapter(d);
  const r=permanentGamePurgeExecuteProduction_(a,'old-game','old-game',{});
  assert.strictEqual(r.success,false); assert.strictEqual(r.code,'DEPENDENCY_BLOCK');
  assert(r.dryRun.blockers.some(x=>x.type==='DEFAULT_GAME'));
}

// 5 active parent/child dependency blocks.
{
  const d=base(false); d.main.Games.push({GameId:'child',Name:'Child',Active:true,Archived:false,ParentGameId:'old-game',GameRole:'mini'});
  const a=new Adapter(d);
  const r=permanentGamePurgeExecuteProduction_(a,'old-game','old-game',{});
  assert.strictEqual(r.success,false); assert.strictEqual(r.code,'DEPENDENCY_BLOCK');
  assert(r.dryRun.blockers.some(x=>x.type==='PARENT_CHILD'));
}

// 6 inactive, dependency-free target purges owned rows, preserves neighbor, writes audit, clears cache, Games last.
let successful;
{
  const a=new Adapter(base(false));
  const r=permanentGamePurgeExecuteProduction_(a,'old-game','old-game',{requestedBy:'owner'});
  successful={a,r};
  assert.strictEqual(r.success,true, r.message || 'purge failed');
  assert.strictEqual(a.getRows('MAIN','Games').some(x=>x.GameId==='old-game'),false);
  assert.strictEqual(a.getRows('MAIN','Games').some(x=>x.GameId==='neighbor'),true);
  assert.strictEqual(a.getRows('MAIN','Questions').some(x=>x.GameId==='old-game'),false);
  assert.strictEqual(a.data.cacheDeletes,1);
  assert.strictEqual(a.data.audits.length,1);
  assert.strictEqual(a.data.audits[0].FinalResult,'SUCCESS');
  assert.strictEqual(r.zeroReferenceVerification.remainingReferenceCount,0);
  const last=a.data.trace[a.data.trace.length-1];
  assert.strictEqual(last.sheet,'Games'); assert.strictEqual(last.phase,1000);
}

// 7 repeat is idempotent.
{
  const a=successful.a;
  const r=permanentGamePurgeExecuteProduction_(a,'old-game','old-game',{});
  assert.strictEqual(r.success,true); assert.strictEqual(r.alreadyAbsent,true);
}

// 8 production Drive deletion remains intentionally absent.
assert(!source.includes('adapter.deleteAsset = function'));
assert(source.includes('Deliberately no deleteAsset method'));

console.log('RC24D launch-cleanup permanent purge tests: 8/8 PASS');
