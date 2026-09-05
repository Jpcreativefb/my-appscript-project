"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const engine = read("backend/engines/SportsTeamFantasyEngine.js");
const gameDay = read("backend/engines/SportsTeamFantasyGameDayEngine.js");
const page = read("frontend/js/pages/teamFantasy.js");
const survivor = read("backend/engines/SportsSurvivorEngine.js");
const purge = read("backend/engines/PermanentGamePurgeEngine.js");
const appearance = read("frontend/js/appearanceThemeRuntime.js");

// Final Team Fantasy compatibility: historical finalized nonzero WeekScores remain
// valid even when old pick metadata is absent; an unpicked zero row remains DNP.
const r45Start = engine.indexOf("/* RC24A_R45_MULTI_LEAGUE_WEEKLY_RECORD */");
const r47Start = engine.indexOf("/* RC24A_R47_TEAM_FANTASY_FINAL_PERSISTENCE */", r45Start);
assert(r45Start >= 0 && r47Start > r45Start, "R4.5/R4.7 markers missing");
const r45 = engine.slice(r45Start, r47Start);
const db = {
  TeamFantasyMemberships: [
    {GameId:"g",LeagueId:"side",EntryId:"a",Username:"alice",CreatedAt:"2026-08-01T00:00:00Z"},
    {GameId:"g",LeagueId:"side",EntryId:"b",Username:"bob",CreatedAt:"2026-08-01T00:00:00Z"},
    {GameId:"g",LeagueId:"side",EntryId:"c",Username:"carol",CreatedAt:"2026-08-01T00:00:00Z"},
    {GameId:"g",LeagueId:"side",EntryId:"d",Username:"dan",CreatedAt:"2026-10-01T00:00:00Z"}
  ],
  TeamFantasyPicks: [
    {GameId:"g",SeasonYear:2026,Week:1,EntryId:"c",Username:"carol",GameDateTime:"2026-09-10T17:00:00Z",CreatedAt:"2026-09-10T17:00:00Z"},
    {GameId:"g",SeasonYear:2026,Week:1,EntryId:"d",Username:"dan",GameDateTime:"2026-09-10T17:00:00Z",CreatedAt:"2026-09-10T17:00:00Z"}
  ],
  TeamFantasyWeekScores: [
    {GameId:"g",SeasonYear:2026,Week:1,EntryId:"a",Username:"alice",FantasyPoints:100,Final:true,UpdatedAt:"2026-09-11T04:00:00Z"},
    {GameId:"g",SeasonYear:2026,Week:1,EntryId:"b",Username:"bob",FantasyPoints:0,Final:true,UpdatedAt:"2026-09-11T04:00:00Z"},
    {GameId:"g",SeasonYear:2026,Week:1,EntryId:"c",Username:"carol",FantasyPoints:0,Final:true,UpdatedAt:"2026-09-11T04:00:00Z"},
    {GameId:"g",SeasonYear:2026,Week:1,EntryId:"d",Username:"dan",FantasyPoints:50,Final:true,UpdatedAt:"2026-09-11T04:00:00Z"}
  ],
  TeamFantasyEntries: []
};
const ctx = {
  console, Date, Math, Number, String, JSON, Object, Array, isNaN,
  TEAM_FANTASY_SHEETS:{MEMBERSHIPS:"TeamFantasyMemberships",PICKS:"TeamFantasyPicks",WEEK_SCORES:"TeamFantasyWeekScores",ENTRIES:"TeamFantasyEntries"},
  teamFantasyGetSettings_:()=>({seasonYear:2026,currentWeek:1,standingMode:"combined-user",regularSeasonEndWeek:18}),
  teamFantasyReadRows_:name=>(db[name]||[]).map(x=>({...x})),
  teamFantasyString_:v=>String(v==null?"":v).trim(),
  teamFantasyNormalizeUsername_:v=>String(v==null?"":v).trim().toLowerCase(),
  teamFantasyNumber_:(v,f)=>{const n=Number(v);return Number.isFinite(n)?n:f;},
  teamFantasyBool_:(v,f)=>v===true||String(v).toLowerCase()==="true"||(v==null&&f===true),
  teamFantasyRound_:v=>Math.round((Number(v)||0)*100)/100,
  teamFantasyKey_:v=>String(v==null?"":v).trim().toLowerCase(),
  teamFantasyLeagueRow_:()=>({GameId:"g",LeagueId:"side",LeagueName:"Side",StandingMode:"combined-user",PlayoffTeams:2})
};
vm.createContext(ctx);
vm.runInContext(r45, ctx);
const byWeek = ctx.teamFantasyLeagueWeeklyCompetitors_("g","side","combined-user");
assert(byWeek[1]["user:alice"], "legacy nonzero finalized score must remain historical participation");
assert(!byWeek[1]["user:bob"], "zero score without a pick must remain DNP");
assert(byWeek[1]["user:carol"], "explicit pick participation must count even with a zero score");
assert(!byWeek[1]["user:dan"], "late league membership must not backfill prior participation");

// Final player UX/runtime contracts restored after all RC24A overlays.
assert(page.includes("if (lineup.postseasonEligible === false)"));
assert(page.includes("Postseason Complete"));
assert(page.includes("no outstanding picks for this week"));
assert(page.includes("window.TEAM_FANTASY_GAME_DAY_WEEK = Number(res.week || 1);"));
assert(page.includes("Random Pick</strong> chooses a random valid NFL team"));
assert(page.includes("Auto Pick</strong> chooses the highest-ranked valid available team"));
assert(page.includes("Top Ranked Team Selected"));
assert(page.includes("Random Fill Remaining"));
assert(page.includes("Auto Pick Remaining"));
assert(page.includes("const pickerSummary = selectableCount + ' selectable' + (byeCount ? ' · ' + byeCount + ' bye' : '');"));
assert(page.includes("${left} left</span>"));
assert(page.includes('data-tf-bulk-position="1"'));
assert(page.includes("Edit · Make Changes Before Kickoff"));

// RC24A accepted Compare runtime remains other-player-only even though the earlier
// baseline declaration is retained for historical source compatibility checks.
const finalCompareStart = page.lastIndexOf("function teamFantasyRenderCompareBoard_(data, selectedIds)");
const finalCompareAlt = page.lastIndexOf("function teamFantasyRenderCompareBoard_(data,selectedIds)");
const compareStart = Math.max(finalCompareStart, finalCompareAlt);
assert(compareStart >= 0, "final Compare renderer missing");
const compareEnd = page.indexOf("\nfunction ", compareStart + 20);
const finalCompare = page.slice(compareStart, compareEnd > compareStart ? compareEnd : page.length);
assert(finalCompare.includes("c.isViewer !== true") || finalCompare.includes("!c.isViewer"), "final Compare must remain other-player-only");

// Weekly API keeps the historical attachment contract and then applies RC24A DNP normalization.
assert(gameDay.includes("out.weeklyLeaderboard = teamFantasyGameDayBuildWeeklyLeaderboard_(out);"));
assert(gameDay.includes("out.weeklyLeaderboard = teamFantasyGameDayNormalizeWeeklyLeaderboard_(out.weeklyLeaderboard);"));

// Survivor/KOTH mode split and destructive purge boundary stay intact.
assert(survivor.includes('"streak-survivor", "king-of-the-hill", "streak-points-strikes"'));
assert(survivor.includes('mode === "streak-points-strikes"'));
assert(purge.includes("const PERMANENT_GAME_PURGE_PRODUCTION_ENABLED = false;"));
assert(appearance.includes("RC24A_V12_OFFICIAL_SPORTS_MEDIA_DEFAULTS"));

const expected = {
  "confidence-hero.png":"2548ccbc4c8505e4b348a806d1788efc5985bfa9ee9ee45357403bcd2c3ecfb1",
  "confidence-logo.png":"0166103ed2497594e0d7a15d5970c84818c78c4bc6f8d177b1556f78a3fdde62",
  "koth-hero.png":"f883fbdfb5d583e8f8f1b816c3d4227a72e2d3e6d435ea8a7fffd4af41deb09b",
  "koth-logo.png":"a059072f375c22ae03405f0ffb8c509c3b8e48d17def8078b2468e8a8c2f29c1",
  "sports-wager-hero.png":"bab2b9aa05e4073e51b28784ceda04a7be2b4fc93ae6734e02f3211ca4bec2ff",
  "sports-wager-logo.png":"3323ac8d4e2bb01924a475b058f97b6c39db54716ae3405a01da7a92cf04cbed",
  "survivor-hero.png":"c0a5e55ad44447a3728bcfdd811e54ad78ee9647d5334d95a56266709d170b76",
  "survivor-logo.png":"b970626443520eabc9cbbe1bd4abdc0981cdc9893306bec926200de11d3ae794",
  "team-fantasy-hero.png":"8d124b676fbc35a6b154af974ff6a8de1cfb4604f00da8384aec21dc81a20ea0",
  "team-fantasy-logo.png":"d86038ceaaf49abac359ec924b148aa8bce9a7ed828c61c2dbcfc7ab9dddea03"
};
for (const [name, hash] of Object.entries(expected)) {
  const file = path.join(root, "frontend/assets/sports/official", name);
  assert(fs.existsSync(file), `missing official Sports media: ${name}`);
  const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  assert.strictEqual(actual, hash, `official Sports media changed: ${name}`);
}
console.log("RC24A flattened final regression: PASS");
