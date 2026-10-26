/* Shared Digit Clock configuration. Dedicated rows; no other game's data is edited. */
var DC_SHARED_SHEET_ = "DigitClockLeagueStore";
var DC_GAME_IMPORT_HEADERS_ = ["LeagueID", "SeasonID", "Week", "Sport", "ESPNEventID", "Group"];
var DC_MEMBER_IMPORT_HEADERS_ = ["LeagueID", "SeasonID", "Week", "Sport", "ESPNEventID", "Digit", "PlayerName", "Username"];
var DC_SPORTS_ = ["nfl", "cfb", "nba", "wnba", "ncaam", "ncaaw", "mlb", "nhl"];
function dcActor_(params, admin) {
  var auth = validateSessionToken(String(params.token || ""));
  if (!auth || auth.success !== true) throw new Error("Sign in to PATTC Predicts to view Digit Clock leagues.");
  if (admin && auth.isAdmin !== true) throw new Error("Administrator access required.");
  return auth;
}
function dcText_(v, max) { return String(v == null ? "" : v).trim().slice(0, max || 100); }
function dcValidId_(id) { return typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id) && ["__proto__","constructor","prototype"].indexOf(id)<0; }
function dcValidateRules_(r) {
  if (!r) return;
  if (["awards","seconds"].indexOf(r.mode)<0 || ["time","score"].indexOf(r.basis)<0 || ["split","full"].indexOf(r.ties)<0) throw new Error("Invalid scoring settings.");
  ["q1","q2","q3","q4","p5","p6","p7","p8","p9","extra","half","ot","total"].forEach(function(k) { if (!Number.isFinite(r[k]) || r[k]<0 || r[k]>10000) throw new Error("Invalid award points."); });
}
function dcValidateLeague_(league) {
  if (!league || !dcValidId_(league.id) || !dcText_(league.name,80)) throw new Error("A valid league ID and name are required.");
  if (league.allowUsernames && (!Array.isArray(league.allowUsernames) || league.allowUsernames.length>500 || league.allowUsernames.some(function(n) { return typeof n!=="string" || n.length>100; }))) throw new Error("Invalid member access list.");
  if (!Array.isArray(league.members) || league.members.length > 500 || !Array.isArray(league.seasons) || league.seasons.length > 50) throw new Error("Invalid league roster or seasons.");
  var memberIds = Object.create(null);
  league.members.forEach(function(m) { if (!dcValidId_(m.id) || memberIds[m.id] || !dcText_(m.name,60)) throw new Error("Invalid or duplicate player."); memberIds[m.id] = true; });
  var seasonIds = Object.create(null);
  league.seasons.forEach(function(s) {
    if (!dcValidId_(s.id) || seasonIds[s.id] || !dcText_(s.label,60) || !Array.isArray(s.entries) || s.entries.length > 1000) throw new Error("Invalid season."); seasonIds[s.id] = true;
    dcValidateRules_(s.rules);
    var entryIds=Object.create(null);
    var games = Object.create(null);
    s.entries.forEach(function(e) {
      if (!dcValidId_(e.id) || entryIds[e.id]) throw new Error("Invalid game ID."); entryIds[e.id]=true; dcValidateRules_(e.rules);
      var key = (e.sport || "nfl") + ":" + e.eventId;
      if (DC_SPORTS_.indexOf(e.sport || "nfl") < 0 || !/^\d{6,12}$/.test(String(e.eventId)) || games[key] || !dcText_(e.week,40)) throw new Error("Invalid or repeated event in a season."); games[key] = true;
      if (!Array.isArray(e.assignments) || e.assignments.length !== 10 || e.assignments.some(function(id) { return id !== null && !memberIds[id]; })) throw new Error("A game's number assignments contain an unknown player.");
      if (e.snapshot && (e.snapshot.id !== e.eventId || !Number.isFinite(e.snapshot.through) || e.snapshot.through < 0 || e.snapshot.through > 100000 || !Array.isArray(e.snapshot.events))) throw new Error("Invalid saved score history.");
    });
    if (s.groups && (!Array.isArray(s.groups) || s.groups.some(function(g) { return !g.id || !g.name || !Array.isArray(g.entryIds) || g.entryIds.some(function(id) { return !s.entries.some(function(e) { return e.id === id; }); }); }))) throw new Error("Invalid game combination.");
  });
  if (JSON.stringify(league).length > 3000000) throw new Error("League exceeds the 3 MB shared storage limit. Split archived seasons into separate leagues.");
  return league;
}
function dcReadAll_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(DC_SHARED_SHEET_);
  if (!sh || sh.getLastRow() < 2) return {};
  var data = sh.getDataRange().getValues().slice(1), manifests = Object.create(null), docs = Object.create(null);
  data.forEach(function(row) { if (row[2] === "commit" && Number(row[1]) > (manifests[row[0]] || 0)) manifests[row[0]] = Number(row[1]); });
  Object.keys(manifests).forEach(function(id) {
    var version = manifests[id];
    var chunks = data.filter(function(r) { return r[0] === id && Number(r[1]) === version && r[2] === "data"; }).sort(function(a,b) { return Number(a[3])-Number(b[3]); });
    var marker = data.find(function(r) { return r[0] === id && Number(r[1]) === version && r[2] === "commit"; });
    if (!marker || (chunks.length !== Number(marker[3]) || chunks.some(function(r,i) { return Number(r[3])!==i; }))) throw new Error("A saved league is incomplete. Please contact an administrator.");
    var league = JSON.parse(chunks.map(function(r) { return r[4]; }).join("")); league.revision = version; docs[id] = league;
  });
  return docs;
}
function dcCanView_(league, actor) {
  if (actor.isAdmin === true) return true;
  if (league.published !== true) return false;
  var allowed = league.allowUsernames || [];
  return !allowed.length || allowed.map(function(n) { return String(n).toLowerCase(); }).indexOf(String(actor.username).toLowerCase()) >= 0;
}
function dcSaveBatch_(leagues, expected) {
  var lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) throw new Error("Another save is running; try again shortly.");
  try {
    var all = dcReadAll_();
    leagues.forEach(function(l) { dcValidateLeague_(l); if (Number(expected[l.id] || 0) !== Number(all[l.id] && all[l.id].revision || 0)) throw new Error("This league changed in another session. Reload shared data before saving."); });
    var sh = SpreadsheetApp.getActive().getSheetByName(DC_SHARED_SHEET_);
    if (!sh) { sh = SpreadsheetApp.getActive().insertSheet(DC_SHARED_SHEET_); sh.appendRow(["LeagueID","Revision","Kind","Chunk","JSON"]); sh.setFrozenRows(1); }
    var rows = [];
    leagues.forEach(function(l) {
      var revision = Number(expected[l.id] || 0) + 1; l.revision = revision; l.updatedAt = new Date().toISOString();
      var text = JSON.stringify(l), count = Math.ceil(text.length/40000);
      for (var n=0;n<count;n++) rows.push([l.id,revision,"data",n,text.slice(n*40000,(n+1)*40000)]);
      rows.push([l.id,revision,"commit",count,""]);
    });
    if (rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,5).setValues(rows);
    SpreadsheetApp.flush();
    // Keep the previous revision for recovery. Cleanup follows the committed append.
    try {
      var values = sh.getDataRange().getValues();
      for (var index=values.length-1;index>0;index--) {
        var row = values[index], newLeague = leagues.find(function(l) { return l.id === row[0]; });
        if (newLeague && Number(row[1]) < newLeague.revision-1) sh.deleteRow(index+1);
      }
    } catch (ignore) { /* Old revisions are harmless; never fail a committed save on cleanup. */ }
    return leagues;
  } finally { lock.releaseLock(); }
}
function dcWorkbookInfo_() {
  var ss = SpreadsheetApp.getActive();
  return { url:ss.getUrl(), gamesSheet: "DigitClockGamesImport", membersSheet:"DigitClockNumbersImport" };
}
function dcPrepareImportSheets_() {
  var ss = SpreadsheetApp.getActive(), definitions = [["DigitClockGamesImport",DC_GAME_IMPORT_HEADERS_],["DigitClockNumbersImport",DC_MEMBER_IMPORT_HEADERS_]];
  definitions.forEach(function(d) {
    var sh=ss.getSheetByName(d[0]);
    if (!sh) { sh=ss.insertSheet(d[0]); sh.getRange(1,1,1,d[1].length).setValues([d[1]]); sh.setFrozenRows(1); }
    else { var headers=sh.getRange(1,1,1,d[1].length).getValues()[0]; if (headers.join("|")!==d[1].join("|")) throw new Error("Import sheet headers do not match the template. Existing cells were not overwritten."); }
  });
  return dcWorkbookInfo_();
}
function dcImportRows_(name, headers) {
  var sh=SpreadsheetApp.getActive().getSheetByName(name); if (!sh) return [];
  var data=sh.getDataRange().getValues(); if (!data.length || data[0].slice(0,headers.length).join("|")!==headers.join("|")) throw new Error("Unexpected headers in "+name);
  if (data.length>2001) throw new Error("Import up to 2,000 rows at a time per sheet.");
  return data.slice(1).map(function(row,index) { var value={_row:index+2}; headers.forEach(function(h,i) { value[h]=dcText_(row[i],150); }); return value; }).filter(function(r) { return headers.some(function(h) { return !!r[h]; }); });
}
function dcBuildImport_(all, gameRows, memberRows) {
  var changed=Object.create(null), errors=[], summary={games:0,assignments:0,players:0}, expected={}, assigned={};
  function context(r, label) {
    var league=all[r.LeagueID]; if (!league) throw new Error(label+" row "+r._row+": unknown LeagueID "+r.LeagueID);
    if (!changed[league.id]) { changed[league.id]=JSON.parse(JSON.stringify(league)); expected[league.id]=league.revision; }
    var l=changed[league.id], s=l.seasons.find(function(s) { return s.id===r.SeasonID; }); if (!s) throw new Error(label+" row "+r._row+": unknown SeasonID");
    return {league:l,season:s};
  }
  gameRows.forEach(function(r) { try {
    var c=context(r,"Games"); if (DC_SPORTS_.indexOf(r.Sport)<0 || !/^\d{6,12}$/.test(r.ESPNEventID) || !r.Week) throw new Error("Games row "+r._row+": Sport, ESPNEventID and Week are required.");
    var e=c.season.entries.find(function(e) { return e.eventId===r.ESPNEventID && (e.sport||"nfl")===r.Sport; });
    if (!e) { e={id:Utilities.getUuid(),eventId:r.ESPNEventID,sport:r.Sport,week:r.Week,assignments:Array(10).fill(null),snapshot:null,rules:null}; c.season.entries.push(e); summary.games++; } else e.week=r.Week;
    if (r.Group) { c.season.groups=c.season.groups||[]; var group=c.season.groups.find(function(g) { return g.name===r.Group; }); if (!group) { group={id:Utilities.getUuid(),name:r.Group,week:r.Week,entryIds:[],aggregation:"individual"}; c.season.groups.push(group); } if(group.entryIds.indexOf(e.id)<0) group.entryIds.push(e.id); }
  } catch(e) { errors.push(e.message); } });
  memberRows.forEach(function(r) { try {
    var c=context(r,"Numbers"); if (!/^[0-9]$/.test(r.Digit)||!r.PlayerName) throw new Error("Numbers row "+r._row+": Digit must be 0–9 and PlayerName is required.");
    var entries=c.season.entries.filter(function(e) { return (!r.Week||r.Week==="*"||e.week===r.Week)&&(!r.Sport||(e.sport||"nfl")===r.Sport)&&(!r.ESPNEventID||e.eventId===r.ESPNEventID); });
    if (!entries.length) throw new Error("Numbers row "+r._row+": no matching saved/imported games.");
    var m=c.league.members.find(function(m) { return m.name.toLowerCase()===r.PlayerName.toLowerCase(); });
    if (!m) { m={id:Utilities.getUuid(),name:r.PlayerName,username:r.Username}; c.league.members.push(m); summary.players++; }
    entries.forEach(function(e) { var key=c.league.id+":"+c.season.id+":"+e.id+":"+r.Digit; if (assigned[key]&&assigned[key]!==m.id) throw new Error("Numbers row "+r._row+": conflicting assignment for digit "+r.Digit); assigned[key]=m.id; e.assignments[Number(r.Digit)]=m.id; summary.assignments++; });
  } catch(e) { errors.push(e.message); } });
  Object.keys(changed).forEach(function(id) { try { dcValidateLeague_(changed[id]); } catch(e) { errors.push(e.message); } });
  return {leagues:Object.keys(changed).map(function(id) { return changed[id]; }),expected:expected,errors:errors,summary:summary};
}
function dcImportPlan_() {
  var all=dcReadAll_(), games=dcImportRows_("DigitClockGamesImport",DC_GAME_IMPORT_HEADERS_), members=dcImportRows_("DigitClockNumbersImport",DC_MEMBER_IMPORT_HEADERS_);
  var plan=dcBuildImport_(all,games,members);
  var signature=JSON.stringify({games:games,members:members,versions:Object.keys(all).sort().map(function(id) { return [id,all[id].revision]; })});
  plan.hash=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,signature)); return plan;
}
function dcPublishSeason_(params) {
  var all=dcReadAll_(), l=all[params.leagueId]; if (!l) throw new Error("League not found.");
  if (Number(params.revision)!==l.revision) throw new Error("Reload this league before publishing.");
  dcValidateLeague_(l);
  var season=l.seasons.find(function(s) { return s.id===params.seasonId; }); if(!season) throw new Error("Season not found.");
  if(!season.entries.length) throw new Error("Add at least one game before publishing this season.");
  var gameId="digit-clock-"+Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,l.id+":"+season.id)).replace(/[^a-zA-Z0-9]/g,"").slice(0,20).toLowerCase();
  var result=adminCreateGame({gameId:gameId,name:l.name+" · "+season.label,type:"digit-clock",active:true,archived:false,hubCategory:"sports",hubGroup:"Digit Clock",predictionEnabled:false,rankingEnabled:false});
  if (!result || result.success!==true) throw new Error(result && (result.error||result.message) || "Could not register the PATTC game.");
  season.gameId=gameId; l.published=true; var expected={}; expected[l.id]=l.revision;
  dcSaveBatch_([l],expected); return {league:l,gameId:gameId};
}
function digitClockSharedDispatch_(action,params) {
  var actor=dcActor_(params,/^admin/.test(action));
  if(action==="getDigitClockWorkspace") {
    var all=dcReadAll_(); return {success:true,isAdmin:actor.isAdmin===true,username:actor.username,leagues:Object.keys(all).map(function(id) { return all[id]; }).filter(function(l) { return dcCanView_(l,actor); }).map(function(l) { if(actor.isAdmin!==true) { delete l.allowUsernames; l.seasons=l.seasons.filter(function(s) { return !!s.gameId; }); l.members.forEach(function(m) { delete m.username; }); } return l; })};
  }
  if(action==="adminSaveDigitClockLeague") { var expected={};expected[params.league.id]=params.expectedRevision||0; return {success:true,league:dcSaveBatch_([params.league],expected)[0]}; }
  if(action==="adminPublishDigitClockSeason") return Object.assign({success:true},dcPublishSeason_(params));
  if(action==="adminPrepareDigitClockImport") return {success:true,workbook:dcPrepareImportSheets_()};
  if(action==="adminPreviewDigitClockImport"||action==="adminCommitDigitClockImport") {
    var plan=dcImportPlan_();
    if(action==="adminCommitDigitClockImport") { if(plan.errors.length) throw new Error("Fix all spreadsheet row errors before importing."); if(plan.hash!==params.previewHash) throw new Error("The spreadsheet or league changed. Preview the import again."); dcSaveBatch_(plan.leagues,plan.expected); }
    return {success:true,hash:plan.hash,errors:plan.errors,summary:plan.summary,leagues:action==="adminCommitDigitClockImport"?plan.leagues:undefined};
  }
  throw new Error("Unknown Digit Clock action.");
}
