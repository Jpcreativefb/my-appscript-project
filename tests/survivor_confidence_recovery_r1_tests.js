const fs=require("fs"),assert=require("assert");
const read=p=>fs.readFileSync(p,"utf8");
const app=read("frontend/app.html");
const loader=read("frontend/js/app.js");
const survivor=read("frontend/js/pages/survivorR4.js");
const survivorCss=read("frontend/css/survivor-r4.css");
const confidence=read("frontend/js/pages/confidenceR2.js");
const confidenceCss=read("frontend/css/confidence-r2.css");
const lab=read("frontend/js/sportsTestLab.js");

assert(app.includes("v1219-nfl-sports-pack-r1"));
assert(app.includes("./css/confidence-r2.css?release=v1219-nfl-sports-pack-r1"));
assert(loader.includes('"picks": ["picks", "confidenceR2"]'));

assert(survivor.includes("SURVIVOR_FINISH_R1"));
assert(survivor.includes("is-result-win"));
assert(survivor.includes("is-result-loss"));
assert(survivor.includes("Longest Streak"));
assert(survivor.includes("USED TEAMS"));
assert(survivorCss.includes(".survivor-r4-selected-team.is-result-win"));
assert(survivorCss.includes(".survivor-r4-selected-team.is-result-loss"));
assert(survivorCss.includes(".survivor-r4-life-row"));

assert(confidence.includes("CONFIDENCE_RECOVERY_R1"));
assert(confidence.includes("ODDS &amp; MATCHUP DETAILS"));
assert(confidence.includes("confidenceR2Adjust_"));
assert(confidence.includes("STANDINGS &amp; PLAYER COMPARE"));
assert(confidence.includes("+ Add User"));
assert(confidence.includes("HOW TO PLAY"));
assert(confidence.includes("renderCompactConfidenceSlate_"));
assert(confidenceCss.includes(".confidence-r2-main"));
assert(confidenceCss.includes("grid-template-columns:minmax(0,1fr) minmax(0,1fr) 78px"));
assert(confidenceCss.includes(".confidence-r2-team.is-correct"));
assert(confidenceCss.includes(".confidence-r2-team.is-wrong"));
assert(confidenceCss.includes(".confidence-r2-cm-head.is-you"));

assert(lab.includes("pattcConfidenceR2TestLabApply"));
assert(lab.includes('if(S.type==="confidence"){confidence();'));

console.log("PATTC Survivor Finish + Confidence Recovery R1 tests: PASS");
