const fs=require("fs"),path=require("path"),assert=require("assert");
const root=path.resolve(__dirname,".."),r=p=>fs.readFileSync(path.join(root,p),"utf8");
const picks=r("backend/engines/PicksEngine.js"),scoring=r("backend/engines/ScoringEngine.js");
const survivor=r("backend/engines/SportsSurvivorEngine.js"),api=r("backend/Api.js"),fapi=r("frontend/js/api.js");
const fpicks=r("frontend/js/pages/picks.js"),fsurvivor=r("frontend/js/pages/survivor.js"),admin=r("frontend/js/pages/admin.js");
const html=r("frontend/app.html"),css=r("frontend/css/rc24k-nfl-player-experience.css"),survivorCss=r("frontend/css/rc24a-survivor-confidence-final.css");

// Existing RC24K confidence + backend contracts remain intact.
assert(picks.includes("RC24K — CONFIDENCE COMPARE"));
assert(picks.includes('return status === "archived"'));
assert(picks.includes("Every Confidence row must include categoryId and nomineeId"));
assert(scoring.includes("selectedConfidence > 0"));
assert(scoring.includes("Blank confidence is the safe basic pick"));
assert(api.includes('action === "getConfidenceCompare"'));
assert(fapi.includes("function apiGetConfidenceCompare"));
assert(fpicks.includes("RC24K — NFL CONFIDENCE PLAYER EXPERIENCE"));
assert(fpicks.includes("Pick a team first"));
assert(fpicks.includes("No confidence · +1 / 0"));
assert(fpicks.includes("COMPARE PICKS"));
assert(fpicks.includes("rc24kSaveConfidenceRow_"));

// Existing Survivor engine / safety-net behavior remains authoritative.
assert(survivor.includes('"AutoPickEnabled"'));
assert(survivor.includes("sportsSurvivorRc24kAutoPickMissing_"));
assert(survivor.includes("best-record"));
assert(survivor.includes("best-odds"));
assert(survivor.includes('settings.mode === "streak-survivor" && settings.lossesAllowed > 0'));
assert(admin.includes('name="survivorAutoPickEnabled"'));
assert(admin.includes('name="survivorAutoPickStrategy"'));

// R2 approved Sports Survivor presentation contract.
assert(fsurvivor.includes("SURVIVOR RECOVERY R2 — APPROVED SCOREBOARD / PICK FLOW"));
assert(fsurvivor.includes("SURVIVOR_RECOVERY_R2_NFL_COLORS_"));
assert(fsurvivor.includes('PHI:["#004C54","#A5ACAF"]'));
assert(fsurvivor.includes('NYG:["#0B2265","#A71930"]'));
assert(fsurvivor.includes("renderSurvivorRecoveryR2WeeklyBrowser_"));
assert(fsurvivor.includes("survivorRecoveryR2MatchupCard_"));
assert(fsurvivor.includes("ODDS &amp; MATCHUP DETAILS"));
assert(fsurvivor.includes("Records · favorite · lines · stats"));
assert(fsurvivor.includes('["Record", team.teamRecord || "—"]'));
assert(fsurvivor.includes('["Market", favorite ? "FAVORITE"'));
assert(fsurvivor.includes('["Moneyline", survivorRecoveryR2Moneyline_(team.moneyline)]'));
assert(fsurvivor.includes('return /^live\\b/i.test(detail) ? detail.toUpperCase() : "LIVE " + detail.toUpperCase();'));
assert(fsurvivor.includes("is-finalized"));
assert(fsurvivor.includes('" is-result-" + outcome'));
assert(fsurvivor.includes("YOUR WEEK ${survivorFinalEscape_(round.week || round.round || \"\")} PICK"));
assert(fsurvivor.includes('"LOCKED IN" : "OPEN UNTIL KICKOFF"'));
assert(fsurvivor.includes(">FINALIZE PICK<"));
assert(!fsurvivor.includes("UPDATE FINAL PICK"));
assert(!fsurvivor.includes("Finalize your Survivor team"));
assert(fsurvivor.includes("survivor-r2-pick-tools"));
assert(fsurvivor.indexOf("survivor-r2-finalize-button") < fsurvivor.indexOf("survivor-r2-pick-tools"));
assert(fsurvivor.includes("Random Pick"));
assert(fsurvivor.includes("Auto Pick"));
assert(fsurvivor.includes("renderSurvivorRecoveryR2History_"));
assert(fsurvivor.includes("survivorRecoveryR2ScrollHistory_"));
assert(fsurvivor.includes("Current Streak"));
assert(fsurvivor.includes("renderSurvivorFinalLeagueCompare_(payload)"));
assert(fsurvivor.includes('payload.mode === "king-of-the-hill"'));

// R2 visual-state contract: team colors + selected/finalized/result + used-team rail + mobile.
assert(survivorCss.includes("--survivor-team-primary"));
assert(survivorCss.includes("var(--survivor-team-primary-a)"));
assert(survivorCss.includes(".survivor-r2-team-side.is-selected"));
assert(survivorCss.includes(".survivor-r2-team-side.is-finalized"));
assert(survivorCss.includes("rgba(8,124,255,.30)"));
assert(survivorCss.includes(".survivor-r2-team-side.is-result-win"));
assert(survivorCss.includes("border-color:#30dd69"));
assert(survivorCss.includes(".survivor-r2-team-side.is-result-loss"));
assert(survivorCss.includes("border-color:#ef3345"));
assert(survivorCss.includes("filter:grayscale(.72)"));
assert(survivorCss.includes(".survivor-r2-finalize-button"));
assert(survivorCss.includes("background:linear-gradient(180deg,#0b81ff,#0739c8)"));
assert(survivorCss.includes(".survivor-r2-pick-tools{display:grid;grid-template-columns:1fr 1fr"));
assert(survivorCss.includes(".survivor-r2-history-rail"));
assert(survivorCss.includes(".survivor-r2-history-item.is-loss"));
assert(survivorCss.includes("scroll-snap-type:x mandatory"));
assert(survivorCss.includes("@media(max-width:460px)"));

assert(css.includes(".sports-default-koth-final .koth-rich-hero"));
assert(css.includes(".rc24k-confidence-compare-table"));
assert(html.includes("v1219rc24k-nfl-player-experience-r1"));
assert(html.includes("rc24k-nfl-player-experience.css"));
assert(r("frontend/js/app.js")===r("frontend/app.js"));
console.log("RC24K NFL player experience + Survivor Recovery R2 tests: PASS");


// R3 owner polish + RC24N Survivor compare contract.
assert(fsurvivor.includes("SURVIVOR RECOVERY R3 — OWNER POLISH + RC24N SURVIVOR COMPARE"));
assert(fsurvivor.includes("SURVIVE THE WEEK"));
assert(fsurvivor.includes("Slide to View Games and Available Picks"));
assert(fsurvivor.includes("GAME <span class=\"survivor-r3-game-index\">1</span> OF"));
assert(fsurvivor.includes("survivorRecoveryR3LiveScore_"));
assert(fsurvivor.indexOf("survivorRecoveryR3Details_(matchup, favoriteId)") < fsurvivor.indexOf("survivorRecoveryR3LiveScore_(matchup, result, state, payload)"));
assert(fsurvivor.includes("W${survivorFinalEscape_(history.week || team.usedWeek || \"?\")} USED"));
assert(fsurvivor.includes("survivor-r3-detail-matrix"));
assert(fsurvivor.includes("survivorRecoveryR3OpenAutoPick_"));
assert(fsurvivor.includes("Best Odds / Favorite"));
assert(fsurvivor.includes("Future Weeks This Season"));
assert(fsurvivor.includes("saveSportsSurvivorAutoPickPreference"));
assert(fsurvivor.includes("survivor-r3-status-top"));
assert(fsurvivor.includes("survivor-r3-lives"));
assert(fsurvivor.includes("Weeks Survived"));
assert(fsurvivor.includes("Current Streak"));
assert(fsurvivor.includes("Score"));
assert(fsurvivor.includes("STANDINGS &amp; PLAYER COMPARE"));
assert(fsurvivor.includes("survivor-r3-cm-matrix"));
assert(fsurvivor.includes("renderSurvivorRecoveryR3HelpNav_"));
assert(fsurvivor.includes("survivor-r3-used-count"));
assert(survivorCss.includes("SURVIVOR RECOVERY R3 — owner polish / RC24N compare"));
assert(survivorCss.includes(".survivor-r3-slider-nav button{border:0;background:transparent;color:#43ee6b"));
assert(survivorCss.includes(".survivor-r3-matchup-details:not([open])>:not(summary){display:none!important}"));
assert(survivorCss.includes("grid-template-columns:minmax(0,1fr) 74px minmax(0,1fr)"));
assert(survivorCss.includes(".survivor-r3-history-item.is-loss"));
assert(survivorCss.includes("background:rgba(239,51,69,.09)!important"));
assert(survivorCss.includes(".survivor-r3-secondary-nav"));
assert(survivor.includes("SURVIVOR RECOVERY R3 — PLAYER AUTO PICK PREFERENCE"));
assert(survivor.includes("__autopick-preference__"));
assert(survivor.includes("sportsSurvivorSaveAutoPickPreference_"));
assert(survivor.includes("player-protection-off"));
assert(api.includes('action === "saveSportsSurvivorAutoPickPreference"'));
assert(r("backend/core/ApiSecurity.js").includes("saveSportsSurvivorAutoPickPreference: true"));
console.log("Survivor Recovery R3 owner polish + Auto Pick preference tests: PASS");
