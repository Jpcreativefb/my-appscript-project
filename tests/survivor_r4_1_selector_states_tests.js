const fs=require("fs"),assert=require("assert");
const css=fs.readFileSync("frontend/css/survivor-r4.css","utf8");
const lab=fs.readFileSync("frontend/js/sportsTestLab.js","utf8");
const app=fs.readFileSync("frontend/app.html","utf8");

assert(css.includes("SURVIVOR_R4_1_SELECTOR_STATES"));
assert(css.includes("border-color:#63c8ff!important"));
assert(css.includes("border-color:#39e76a!important"));
assert(css.includes("border-color:#ef3345!important"));
assert(css.includes(".survivor-testlab-r4-actions"));
assert(css.includes("pointer-events:none!important"));
assert(css.includes("opacity:.46!important"));
assert(lab.includes("SURVIVOR_R4_1_SELECTOR_STATES"));
assert(lab.includes("<strong>FINALIZE PICK</strong>"));
assert(lab.includes("<strong>Random Pick</strong>"));
assert(lab.includes("<strong>Auto Pick</strong>"));
assert(lab.includes('"WEEK " + m[1] + " USED"'));
assert(app.includes("v1219-survivor-r4-player-experience-r1a"));
console.log("PATTC Survivor R4.1 Selector State tests: PASS");
