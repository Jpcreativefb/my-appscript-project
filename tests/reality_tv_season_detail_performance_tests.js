const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

class FakeRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) { Object.assign(this, { sheet, row, col, numRows, numCols }); }
  getValues() {
    return Array.from({ length: this.numRows }, (_, r) => Array.from({ length: this.numCols }, (_, c) =>
      (this.sheet.rows[this.row - 1 + r] || [])[this.col - 1 + c] ?? ''));
  }
  setValues(values) { this.sheet.writeCount += 1; return this; }
  setFontWeight() { this.sheet.writeCount += 1; return this; }
}
class FakeSheet {
  constructor(name, rows) { this.name = name; this.rows = rows || []; this.readCount = 0; this.writeCount = 0; }
  getLastColumn() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); }
  getLastRow() { return this.rows.length; }
  getRange(row, col, numRows = 1, numCols = 1) { return new FakeRange(this, row, col, numRows, numCols); }
  getDataRange() { this.readCount += 1; return new FakeRange(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  appendRow() { this.writeCount += 1; return this; }
  clear() { this.writeCount += 1; this.rows = []; return this; }
  setFrozenRows() { this.writeCount += 1; return this; }
}
class FakeSpreadsheet {
  constructor() { this.sheets = new Map(); }
  add(name, headers, rows) { this.sheets.set(name, new FakeSheet(name, [headers, ...(rows || [])])); }
  getSheetByName(name) { return this.sheets.get(name) || null; }
  insertSheet(name) { const sheet = new FakeSheet(name, []); this.sheets.set(name, sheet); return sheet; }
}

const ss = new FakeSpreadsheet();
const seasonId = 'season-fast';
const gameId = 'game-fast';
ss.add('RealitySeasons', ['SeasonId','GameId','ShowName','SeasonName','ShowFormat','ParticipantType','ParticipantLabel','GroupLabel','PeriodLabel','CurrentEpisodeNumber','Status','UpdatedAt'], [
  [seasonId,gameId,'Fast Show','Season 1','survivor-tribal','individual','Contestant','Tribe','Episode',3,'ACTIVE',new Date()]
]);
const contestantRows = [];
const historyRows = [];
for (let i = 1; i <= 30; i++) {
  const tribe = i <= 15 ? 'Gold' : 'Blue';
  contestantRows.push([seasonId,gameId,'c'+i,'Contestant '+i,'Contestant '+i,'',tribe,'','','','','','','','','#D4AF37','','','','','','ACTIVE','',i,true]);
  historyRows.push([seasonId+'-c'+i,seasonId,gameId,'c'+i,'tribe-'+tribe.toLowerCase(),tribe,1,'','STARTING','',true]);
}
ss.add('RealityContestants', ['SeasonId','GameId','ContestantId','Name','FullName','ImageUrl','TeamOrTribe','StartingGroup','CurrentGroup','FinalGroup','Member1','Member2','Relationship','Member1ImageUrl','Member2ImageUrl','TeamColor','Age','Hometown','Occupation','Biography','ExternalSubjectId','Status','EliminatedEpisode','DisplayOrder','Active'], contestantRows);
ss.add('RealityGroups', ['SeasonId','GameId','GroupId','GroupName','GroupType','ImageUrl','Color','Active','DisplayOrder'], [
  [seasonId,gameId,'tribe-gold','Gold','Tribe','','#D4AF37',true,1],
  [seasonId,gameId,'tribe-blue','Blue','Tribe','','#3366CC',true,2]
]);
ss.add('RealityContestantGroupHistory', ['AssignmentId','SeasonId','GameId','ContestantId','GroupId','GroupName','StartEpisode','EndEpisode','AssignmentType','Notes','Active'], historyRows);
ss.add('RealityEpisodes', ['SeasonId','GameId','EpisodeId','EpisodeNumber','EpisodeName','CategoryId','Status'], [
  [seasonId,gameId,'e1',1,'Episode 1','episode-1-eliminated','FINAL'],
  [seasonId,gameId,'e2',2,'Episode 2','episode-2-eliminated','FINAL'],
  [seasonId,gameId,'e3',3,'Episode 3','episode-3-eliminated','OPEN']
]);
ss.add('RealityResultQueue', ['QueueId','SeasonId','GameId','EpisodeId','ReviewStatus','SubmittedAt'], []);
ss.add('RealityQuestionTemplates', ['TemplateId','SeasonId','GameId','Label','DisplayOrder','Enabled'], [
  ['immunity-winner',seasonId,gameId,'Immunity winner',10,true]
]);
ss.add('RealityEpisodeQuestions', ['EpisodeQuestionId','SeasonId','GameId','EpisodeId','EpisodeNumber','QuestionType'], [
  ['eq1',seasonId,gameId,'e3',3,'immunity-winner']
]);
ss.add('RealityQuestionResultQueue', ['QueueId','SeasonId','GameId','EpisodeId','ReviewStatus','SubmittedAt'], []);
ss.add('RealityQuestionBuildJobs', ['BuildId','SeasonId','GameId','EpisodeId','Status','Stage','UpdatedAt','BuildResultsJSON'], []);

const context = {
  console, Date, JSON, Math, Number, String, Array, Object, Error,
  SpreadsheetApp: { getActive: () => ss },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
  Utilities: { getUuid: () => 'uuid' },
  Logger: { log: () => {} },
  requireAdmin_: () => true
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvSeasonEngine.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvQuestionPackEngine.js'), 'utf8'), context);

const beforeWrites = [...ss.sheets.values()].reduce((sum, sheet) => sum + sheet.writeCount, 0);
const result = context.apiAdminGetRealityTvSeasonDetails({ seasonId });
const afterWrites = [...ss.sheets.values()].reduce((sum, sheet) => sum + sheet.writeCount, 0);
const totalReads = [...ss.sheets.values()].reduce((sum, sheet) => sum + sheet.readCount, 0);

assert.strictEqual(result.success, true);
assert.strictEqual(result.bundle.contestants.length, 30);
assert.strictEqual(result.bundle.contestants[0].GroupHistory.length, 1);
assert.strictEqual(result.bundle.readOnlyLoad, true);
assert.strictEqual(afterWrites, beforeWrites, 'Opening a season must not write, repair, or alter sheets');
assert(totalReads <= 10, `Season detail load should read each relevant sheet once; saw ${totalReads} reads`);
assert(result.performance && Number.isFinite(result.performance.durationMs), 'Performance diagnostics missing');

const backend = fs.readFileSync(path.join(__dirname, '../backend/engines/RealityTvSeasonEngine.js'), 'utf8');
const frontend = fs.readFileSync(path.join(__dirname, '../frontend/js/pages/adminRealityTv.js'), 'utf8');
const detailSource = backend.slice(backend.indexOf('function apiAdminGetRealityTvSeasonDetails'), backend.indexOf('function apiAdminGetRealityTvDashboard', backend.indexOf('function apiAdminGetRealityTvSeasonDetails')));
assert(!detailSource.includes('realityTvSyncGroupsFromContestants_'), 'Season detail load still syncs groups');
assert(!detailSource.includes('realityTvEnsureContestantGroupHistory_'), 'Season detail load still writes group history');
assert(!detailSource.includes('realityTvContestantGroupProfile_'), 'Season detail load still rereads history per contestant');
assert(frontend.includes('Reading roster, episodes, questions, results, and settings in one pass.'), 'Admin load detail message missing');
assert(frontend.includes('Retry Season Load'), 'Safe retry action missing');

console.log('Reality TV season-detail performance tests passed.');
