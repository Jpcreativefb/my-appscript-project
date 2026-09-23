/* PATTC optional Top N Survival Ranking R1. Depends on existing RealityTvSeasonEngine
 * helpers and RealityTvSeasonGamesR1Core. All new behavior is OFF by default. */
var RTV_R1_SETTINGS_SHEET='RealityTopNSettings';
var RTV_R1_BALLOTS_SHEET='RealityTopNBallots';
var RTV_R1_SETTINGS_HEADERS=['SeasonId','GameId','Enabled','N','StartEpisodeNumber','BallotLockDateTime',
  'ContributionPercent','BonusMultiplier','FinalPlacementsApproved','FinalPlacementsJSON','CreatedAt','UpdatedAt'];
var RTV_R1_BALLOT_HEADERS=['SeasonId','GameId','Username','OrderedContestantIdsJSON',
  'StartEpisodeNumber','SavedAt','CreatedAt','UpdatedAt'];
function rtvR1Bool_(v){return v===true || ['true','1','yes'].indexOf(rtvR1Key_(v))!==-1;}
function rtvR1GetSettings_(seasonId){
  var sh=SpreadsheetApp.getActive().getSheetByName(RTV_R1_SETTINGS_SHEET);
  if(!sh) return null; return realityTvReadObjects_(SpreadsheetApp.getActive(),RTV_R1_SETTINGS_SHEET)
    .find(function(row){return rtvR1Key_(row.SeasonId)===rtvR1Key_(seasonId);})||null;
}
function rtvR1GetBallots_(seasonId){
  if(!SpreadsheetApp.getActive().getSheetByName(RTV_R1_BALLOTS_SHEET)) return [];
  return realityTvReadObjects_(SpreadsheetApp.getActive(),RTV_R1_BALLOTS_SHEET)
    .filter(function(row){return rtvR1Key_(row.SeasonId)===rtvR1Key_(seasonId);});
}
function rtvR1LockDate_(settings){
  var raw=settings && settings.BallotLockDateTime;
  if(!raw) throw new Error('Top N ballot lock must be configured before enabling.');
  var date=raw instanceof Date?raw:new Date(raw);
  if(!Number.isFinite(date.getTime())) throw new Error('Top N ballot lock is invalid.');
  return date;
}
function rtvR1Admin_(payload){requireAdmin_(payload||{});}
function rtvR1Auth_(payload){
  payload=payload||{};
  if(!payload.username||!payload.token) throw new Error('Session required.');
  validateUserSession_(payload.username,payload.token);
  var access=userCanAccessGameFeature_(payload.username,payload.gameId,'viewGame',payload.leagueId||'');
  if(!access.allowed) throw new Error('Access denied: '+access.reason);
}
function rtvR1SeasonForGame_(gameId){
  var season=realityTvGetSeasonByGameId_(gameId);
  if(!season) throw new Error('Reality season not found.');
  return season;
}
function apiAdminSaveRealityTopNSettings(payload){
  rtvR1Admin_(payload); var season=realityTvGetSeason_(payload.seasonId);
  if(!season) throw new Error('Create the Reality season before enabling Top N; cast staging is untouched.');
  var existing=rtvR1GetSettings_(season.SeasonId);
  var enabled=rtvR1Bool_(payload.enabled), ballots=rtvR1GetBallots_(season.SeasonId);
  var n=rtvR1Int_(payload.n,2,64,'Top N');
  var roster=realityTvContestantsForSeason_(season.SeasonId);
  if(n>roster.length) throw new Error('Top N exceeds the season roster.');
  var first=rtvR1Int_(payload.startEpisodeNumber,1,1000,'Top N first episode');
  var contribution=Number(payload.contributionPercent);
  if(!Number.isFinite(contribution)||contribution<0||contribution>100) throw new Error('Contribution must be 0–100%.');
  // Until the shared Stats projection is implemented, allow separate-only acceptance
  // but refuse to claim weighted points that have not been posted to the main total.
  if(enabled && contribution>0 && typeof rtvR1ProjectToOverallScore_!=='function')
    throw new Error('Weighted Top N is not yet connected to the overall leaderboard. Use separate-only testing until the scoring projection is integrated.');
  var bonus=rtvR1Int_(payload.bonusMultiplier,0,10,'Exact-finish bonus multiplier');
  var lock=rtvR1LockDate_({BallotLockDateTime:payload.ballotLockDateTime});
  var future=realityTvEpisodesForSeason_(season.SeasonId).find(function(ep){return Number(ep.EpisodeNumber)===first;});
  if(future && future.LockDateTime && lock.getTime()>new Date(future.LockDateTime).getTime())
    throw new Error('Top N lock cannot be later than the first eligible episode lock.');
  if(ballots.length){
    if(!existing || n!==Number(existing.N) || first!==Number(existing.StartEpisodeNumber) ||
       lock.getTime()!==rtvR1LockDate_(existing).getTime() || !enabled)
      throw new Error('Top N ballots already exist; rank size, start, deadline and enabled state cannot be changed.');
  }
  var now=new Date();
  var row={SeasonId:season.SeasonId,GameId:season.GameId,Enabled:enabled,N:n,
    StartEpisodeNumber:first,BallotLockDateTime:lock,ContributionPercent:contribution,
    BonusMultiplier:bonus,FinalPlacementsApproved:existing&&rtvR1Bool_(existing.FinalPlacementsApproved)||false,
    FinalPlacementsJSON:existing&&existing.FinalPlacementsJSON||'',CreatedAt:existing&&existing.CreatedAt||now,UpdatedAt:now};
  realityTvUpsertObject_(SpreadsheetApp.getActive(),RTV_R1_SETTINGS_SHEET,RTV_R1_SETTINGS_HEADERS,['SeasonId'],row);
  return {success:true,enabled:enabled,seasonId:season.SeasonId,settings:row};
}
function rtvR1Episodes_(seasonId){
  return realityTvEpisodesForSeason_(seasonId).map(function(ep){
    return {episodeId:ep.EpisodeId,episodeNumber:Number(ep.EpisodeNumber),status:ep.Status,
      outcomeType:ep.OutcomeType,eliminatedIds:rtvR1List_(ep.EliminatedContestantIds)};
  });
}
function rtvR1ReadPlayerView_(payload){
  rtvR1Auth_(payload); var season=rtvR1SeasonForGame_(payload.gameId);
  var config=rtvR1GetSettings_(season.SeasonId);
  if(!config||!rtvR1Bool_(config.Enabled)) return {success:true,enabled:false};
  var now=new Date(), lock=rtvR1LockDate_(config), closed=now.getTime()>=lock.getTime();
  var ballots=rtvR1GetBallots_(season.SeasonId);
  var existing=ballots.find(function(row){return rtvR1Key_(row.Username)===rtvR1Key_(payload.username);})||null;
  var roster=realityTvContestantsForSeason_(season.SeasonId).map(function(row){
    var eliminated=Number(row.EliminatedEpisode||0),start=Number(config.StartEpisodeNumber);
    return {id:rtvR1Key_(row.ContestantId),name:rtvR1Str_(row.Name),imageUrl:rtvR1Str_(row.ImageUrl),
      eligible:!eliminated||eliminated>=start};
  });
  var ordered=existing?rtvR1List_(existing.OrderedContestantIdsJSON):[];
  var view={success:true,enabled:true,gameId:season.GameId,seasonId:season.SeasonId,
    n:Number(config.N),startEpisodeNumber:Number(config.StartEpisodeNumber),
    lockDateTime:lock.toISOString(),locked:closed,canSave:!closed &&
      !!userCanAccessGameFeature_(payload.username,payload.gameId,'makePicks',payload.leagueId||'').allowed,
    orderedIds:ordered,roster:roster,contributionPercent:Number(config.ContributionPercent),
    bonusMultiplier:Number(config.BonusMultiplier),scoring:null};
  // Do not return eliminated contestants, standings, or hidden outcome data through a
  // season-long sideload when Reality spoiler shield currently blocks results.
  var spoiler=typeof realityTvSpoilerStateForGame_==='function'
    ? realityTvSpoilerStateForGame_(payload.username,payload.gameId):null;
  if(spoiler&&spoiler.hasHiddenResults===true){view.hiddenBySpoiler=true;return view;}
  if(existing){
    var placements={};
    if(rtvR1Bool_(config.FinalPlacementsApproved)){
      try{placements=JSON.parse(String(config.FinalPlacementsJSON||'{}'));}catch(e){throw new Error('Invalid approved final placement data.');}
    }
    view.scoring=rtvR1ScoreTopN_({orderedIds:ordered,startEpisodeNumber:Number(existing.StartEpisodeNumber)},
      rtvR1Episodes_(season.SeasonId),{n:Number(config.N),contributionPercent:Number(config.ContributionPercent),
        bonusMultiplier:Number(config.BonusMultiplier),finalPlacementsApproved:rtvR1Bool_(config.FinalPlacementsApproved)},placements);
  }
  return view;
}
function apiGetRealityTopN(payload){return rtvR1ReadPlayerView_(payload);}
function apiSaveRealityTopNBallot(payload){
  rtvR1Auth_(payload);
  var access=userCanAccessGameFeature_(payload.username,payload.gameId,'makePicks',payload.leagueId||'');
  if(!access.allowed) throw new Error('Access denied: '+access.reason);
  var mutex=LockService.getScriptLock();if(!mutex.tryLock(5000))throw new Error('Top N is busy; retry saving.');
  try{
    // All eligibility and lock checks occur AFTER acquiring the lock.
    var season=rtvR1SeasonForGame_(payload.gameId),config=rtvR1GetSettings_(season.SeasonId);
    if(!config||!rtvR1Bool_(config.Enabled)) throw new Error('Top N is not enabled.');
    if(Date.now()>=rtvR1LockDate_(config).getTime()) throw new Error('Top N ballot is locked.');
    var spoiler=typeof realityTvSpoilerStateForGame_==='function'
      ? realityTvSpoilerStateForGame_(payload.username,payload.gameId):null;
    if(spoiler&&spoiler.hasHiddenResults===true) throw new Error('Reveal pending Reality results before changing Top N picks.');
    var valid=realityTvContestantsForSeason_(season.SeasonId).filter(function(c){
      var number=Number(config.StartEpisodeNumber);
      return c.EliminatedEpisode===''||c.EliminatedEpisode==null||Number(c.EliminatedEpisode)>=number;
    }).map(function(c){return c.ContestantId;});
    var ordered=rtvR1ValidateBallot_(payload.orderedIds,valid,Number(config.N));
    var current=rtvR1GetBallots_(season.SeasonId).find(function(row){return rtvR1Key_(row.Username)===rtvR1Key_(payload.username);});
    var now=new Date(),row={SeasonId:season.SeasonId,GameId:season.GameId,Username:payload.username,
      OrderedContestantIdsJSON:JSON.stringify(ordered),StartEpisodeNumber:Number(config.StartEpisodeNumber),
      SavedAt:now,CreatedAt:current&&current.CreatedAt||now,UpdatedAt:now};
    realityTvUpsertObject_(SpreadsheetApp.getActive(),RTV_R1_BALLOTS_SHEET,RTV_R1_BALLOT_HEADERS,
      ['SeasonId','Username'],row);
    SpreadsheetApp.flush();
    var stored=rtvR1GetBallots_(season.SeasonId).find(function(b){return rtvR1Key_(b.Username)===rtvR1Key_(payload.username);});
    if(!stored || JSON.stringify(rtvR1List_(stored.OrderedContestantIdsJSON))!==JSON.stringify(ordered))
      throw new Error('Top N ballot could not be verified after saving.');
    return {success:true,message:'Top N ballot saved',orderedIds:ordered,lockDateTime:rtvR1LockDate_(config).toISOString()};
  } finally{mutex.releaseLock();}
}
function apiAdminApproveRealityTopNPlacements(payload){
  rtvR1Admin_(payload);var season=realityTvGetSeason_(payload.seasonId);
  if(!season) throw new Error('Season not found.');
  var config=rtvR1GetSettings_(season.SeasonId);
  if(!config||!rtvR1Bool_(config.Enabled))throw new Error('Top N is not enabled.');
  if(rtvR1Bool_(config.FinalPlacementsApproved))throw new Error('Final Top N placement approval is already locked.');
  var episodes=realityTvEpisodesForSeason_(season.SeasonId);
  if(episodes.some(function(ep){return ['OPEN','SCHEDULED','PENDING','APPROVING'].indexOf(rtvR1Str_(ep.Status).toUpperCase())!==-1;}))
    throw new Error('Finalize all scheduled competition episodes before approving placement bonuses.');
  var supplied=payload.placements||{};
  if(typeof supplied!=='object'||Array.isArray(supplied))throw new Error('Final placements must be an ID-to-position map.');
  var roster=realityTvContestantsForSeason_(season.SeasonId);
  var approved={};roster.forEach(function(row){var id=rtvR1Key_(row.ContestantId),n=Number(supplied[id]);
    if(!Number.isSafeInteger(n)||n<1||n>roster.length)throw new Error('Provide an official position for every contestant: '+id);
    approved[id]=n;
  });
  // This administrative approval has intentionally NO automatic side effects on Stats;
  // the integration must project it once with idempotent per-episode/bonus keys.
  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(RTV_R1_SETTINGS_SHEET),config.__rowNumber,
    {FinalPlacementsApproved:true,FinalPlacementsJSON:JSON.stringify(approved),UpdatedAt:new Date()});
  return {success:true,seasonId:season.SeasonId,finalPlacementsApproved:true};
}

/** Read-only admin settings for one established season. Never creates sheets. */
function apiAdminGetRealityTopNSettings(payload) {
  rtvR1Admin_(payload);
  var season = realityTvGetSeason_(payload && payload.seasonId);
  if (!season) throw new Error('Reality season not found. Finish the season setup before enabling Top N.');
  var row = rtvR1GetSettings_(season.SeasonId);
  return {success:true,seasonId:season.SeasonId,gameId:season.GameId,
    configured:!!row,settings:row ? {
      enabled:rtvR1Bool_(row.Enabled),n:Number(row.N),startEpisodeNumber:Number(row.StartEpisodeNumber),
      ballotLockDateTime:rtvR1LockDate_(row).toISOString(),
      contributionPercent:Number(row.ContributionPercent),bonusMultiplier:Number(row.BonusMultiplier),
      finalPlacementsApproved:rtvR1Bool_(row.FinalPlacementsApproved)
    }:null,ballotCount:rtvR1GetBallots_(season.SeasonId).length};
}
