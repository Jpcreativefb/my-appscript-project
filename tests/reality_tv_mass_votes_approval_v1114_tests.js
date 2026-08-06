const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const manager = fs.readFileSync(path.join(root, "frontend/js/pages/adminRealityTv.js"), "utf8");
const seasonEngine = fs.readFileSync(path.join(root, "backend/engines/RealityTvSeasonEngine.js"), "utf8");
const questionEngine = fs.readFileSync(path.join(root, "backend/engines/RealityTvQuestionPackEngine.js"), "utf8");
const backendApi = fs.readFileSync(path.join(root, "backend/Api.js"), "utf8");
const frontendApi = fs.readFileSync(path.join(root, "frontend/js/api.js"), "utf8");
const frontendApiCompat = fs.readFileSync(path.join(root, "frontend/api.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "frontend/css/styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "frontend/js/app.js"), "utf8");
const appCompat = fs.readFileSync(path.join(root, "frontend/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "frontend/app.html"), "utf8");

assert(manager.includes("Enter the full vote round"), "Voting manager should expose one mass-entry card per episode");
assert(manager.includes("adminRealityTvVotingGroupContext_"), "Voting manager should detect the voting tribe from episode results");
assert(manager.includes("Tribe going to Tribal Council result"), "Tribal-attendee result should be the primary voting-pool source");
assert(manager.includes("Immunity result — remaining tribe"), "Immunity winners should identify the remaining losing tribe when unambiguous");
assert(manager.includes("Add Outside Voter"), "Unusual episodes should allow an explicit outside voter");
assert(manager.includes("Save Entire Vote Round"), "All entered ballots should save in one action");
assert(manager.includes("apiAdminSaveRealityTvEpisodeVotesBulk"), "Mass vote UI should call the bulk backend action");
assert(styles.includes(".reality-tv-mass-vote-row"), "Mass ballot rows should have responsive production styling");

const packStart = manager.indexOf('<details class="reality-tv-subsection reality-tv-question-pack">');
assert(packStart >= 0, "Show Format & Episode Question Pack should be present");
const packEnd = manager.indexOf('</details>\n  `;', packStart);
const packBlock = manager.slice(packStart, packEnd > packStart ? packEnd : packStart + 25000);
assert(!/<details class="reality-tv-subsection reality-tv-question-pack" open>/.test(packBlock), "The main question-pack section should start closed");
assert(!/<details class="reality-tv-config-section" open>/.test(packBlock), "Question-pack subsections 1-4 should start closed");
assert(!/<details class="reality-tv-custom-question-builder reality-tv-config-section" open>/.test(packBlock), "Custom Questions should start closed");
assert(packBlock.includes("4. Extra ${adminRealityTvEscape_(season.PeriodLabel || \"Episode\")} Questions"), "Extra Episode Questions should remain directly labeled as section 4");

assert(seasonEngine.includes("function realityTvSpreadsheetRetry_"), "Approval backend should retry temporary Google Sheets failures");
assert(seasonEngine.includes("function realityTvClaimApprovalStage_"), "Approval backend should claim only one resumable stage at a time");
assert(seasonEngine.includes("realityTvApprovalProcessingFresh_"), "Duplicate clicks should return busy while a stage is actively processing");
assert(!/function apiAdminContinueRealityTvApproval[\s\S]*?const lock = LockService\.getScriptLock\(\)[\s\S]*?finally \{[\s\S]*?lock\.releaseLock\(\)/.test(seasonEngine), "Episode approval must not hold the global script lock across settlement work");
assert(!/function apiAdminContinueRealityTvQuestionApproval[\s\S]*?const lock = LockService\.getScriptLock\(\)[\s\S]*?finally \{[\s\S]*?lock\.releaseLock\(\)/.test(questionEngine), "Question approval must not hold the global script lock across category settlement");
assert(seasonEngine.includes('realityTvSpreadsheetRetry_("Settle Reality TV episode"'), "Main elimination settlement should retry transient spreadsheet errors");
assert(questionEngine.includes('retry("Settle Reality TV episode question"'), "Extra-question settlement should retry transient spreadsheet errors");

assert(backendApi.includes('action === "adminSaveRealityTvEpisodeVotesBulk"'), "Backend API should route mass vote saves");
assert(frontendApi.includes("async function apiAdminSaveRealityTvEpisodeVotesBulk"), "Frontend API should expose mass vote saves");
assert.strictEqual(frontendApi, frontendApiCompat, "Both frontend API copies must remain synchronized");
assert.strictEqual(app, appCompat, "Both app loader copies must remain synchronized");
assert(app.includes('APP_ROUTE_HOTFIX_VERSION = "v1114-reality-tv-votes-approval"'), "New frontend modules should bypass cached v1.1.13 scripts");
assert(html.includes("hotfix=v1114-reality-tv-votes-approval"), "App shell should request the v1.1.14 route hotfix");

console.log("Reality TV mass votes, approval retries, and collapsed sections v1.1.14 tests passed.");
