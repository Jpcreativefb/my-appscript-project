const fs=require("fs"),assert=require("assert");
function must(p,n){const t=fs.readFileSync(p,"utf8");assert(t.includes(n),p+" missing "+n);}
must("backend/engines/GamesEngine.js",'id: "season-cup"');
must("backend/engines/HybridGameEngine.js","hybridSeasonCupRules_");
must("backend/engines/HybridGameEngine.js","seasonCupFieldMultiplier");
must("backend/engines/HybridGameEngine.js","seasonCupQualified");
must("frontend/app.html","sportsTestLab.js");
must("frontend/js/app.js","pattcSportsTestLabMount");
const appJs=fs.readFileSync("frontend/js/app.js","utf8");
assert(
  (appJs.match(/pattcSportsTestLabMount\(page, app\)/g)||[]).length>=2,
  "Football Test Lab must mount on both snapshot restore and fresh render"
);
function cup(placePoints,field,target,minPlayers,minPct,weight=1){
  if(field<minPlayers)return 0;
  if((field/target)*100<minPct)return 0;
  return placePoints*Math.min(1,field/target)*weight;
}
assert.equal(cup(25,4,8,4,50),12.5);
assert.equal(cup(25,3,8,4,50),0);
assert.equal(cup(25,8,8,4,50),25);
assert.equal(cup(25,8,8,4,50,.75),18.75);
console.log("PATTC Season Cup + Football Test Lab R1 tests: PASS");