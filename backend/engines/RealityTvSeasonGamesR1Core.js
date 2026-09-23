/* PATTC Reality TV season games R1 — pure logic. GAS compatible; no runtime writes. */
var RTV_R1_VERSION = 'reality-season-games-r1';
function rtvR1Key_(v) { return String(v == null ? '' : v).trim().toLowerCase(); }
function rtvR1Str_(v) { return String(v == null ? '' : v).trim(); }
function rtvR1Int_(v, min, max, label) {
  var n=Number(v);
  if (!Number.isSafeInteger(n) || n<min || n>max) throw new Error((label||'Value')+' must be an integer from '+min+' to '+max+'.');
  return n;
}
function rtvR1Round_(n) { return Math.round((n+Number.EPSILON)*100)/100; }
function rtvR1List_(v) { if (Array.isArray(v)) return v; if (typeof v==='string') { try { var p=JSON.parse(v); return Array.isArray(p)?p:[]; } catch(e){} } return []; }
function rtvR1Unique_(items) {
  var seen={}; return items.filter(function(item){ var k=rtvR1Key_(item); if (!k || seen[k]) return false; seen[k]=true; return true; });
}
function rtvR1ValidateBallot_(orderedIds, validIds, n) {
  n=rtvR1Int_(n,2,64,'Top N'); var choices=rtvR1List_(orderedIds);
  var allowed={}; (validIds||[]).forEach(function(v){allowed[rtvR1Key_(v)]=true;});
  if (choices.length!==n) throw new Error('Choose exactly '+n+' contestants.');
  var seen={};
  return choices.map(function(v){
    var k=rtvR1Key_(v);
    if (!k || !allowed[k]) throw new Error('Ballot contains an ineligible contestant.');
    if (seen[k]) throw new Error('A contestant can be ranked only once.');
    seen[k]=true; return k;
  });
}
/**
 * An approved episode is {episodeId,episodeNumber,status,outcomeType,eliminatedIds}.
 * A locked ballot {orderedIds,startEpisodeNumber}. An unapproved episode earns zero and
 * has no permanent loss. Each selected elimination loses its value immediately plus
 * a one-off equal-value penalty. Previously completed episodes remain earned.
 */
function rtvR1ScoreTopN_(ballot, episodes, settings, placementById) {
  var ids=rtvR1List_(ballot && ballot.orderedIds), n=rtvR1Int_(settings.n,2,64,'Top N');
  if (ids.length!==n || rtvR1Unique_(ids).length!==n) throw new Error('Invalid locked Top N ballot.');
  var start=rtvR1Int_(ballot.startEpisodeNumber,1,1000,'Scoring start');
  var lost={}, rows=[], total=0, seenEpisodes={}, seenNumbers={}, blocked=false;
  var ordered=(episodes||[]).slice().sort(function(a,b){return Number(a.episodeNumber)-Number(b.episodeNumber);});
  ordered.forEach(function(ep){
    var num=Number(ep.episodeNumber), eid=rtvR1Key_(ep.episodeId);
    if (!eid || !Number.isSafeInteger(num) || num<start) return;
    if (seenEpisodes[eid] || seenNumbers[num]) throw new Error('Duplicate official episode: '+num);
    seenEpisodes[eid]=true; seenNumbers[num]=true;
    // A normal OPEN next episode does not break the player view, but its result
    // and any later results cannot be paid until every preceding episode is final.
    if (rtvR1Key_(ep.status)!=='final') { blocked=true; return; }
    if (blocked) throw new Error('Official episodes must be finalized in order.');
    var outcome=rtvR1Key_(ep.outcomeType);
    var exits=rtvR1Unique_(rtvR1List_(ep.eliminatedIds)).map(rtvR1Key_);
    if (outcome==='no-elimination') { if (exits.length) throw new Error('No-elimination result contains eliminated contestants.'); exits=[]; }
    else if (!exits.length) throw new Error('A final elimination episode needs approved exit IDs.');
    var outMap={};exits.forEach(function(id){outMap[id]=true;});
    var alive=0, penalty=0, lostThisEpisode=[];
    ids.forEach(function(id,index){
      var k=rtvR1Key_(id), value=n-index;
      if (!lost[k] && outMap[k]) {lost[k]=num;penalty+=value;lostThisEpisode.push({contestantId:k,position:index+1,value:value});}
      if (!lost[k]) alive+=value;
    });
    var points=alive-penalty;total+=points;
    rows.push({episodeId:eid,episodeNumber:num,survivalPoints:alive,penaltyPoints:penalty,
      points:points,cumulative:total,eliminated:lostThisEpisode});
  });
  var bonusScale=rtvR1Int_(settings.bonusMultiplier===undefined?1:settings.bonusMultiplier,0,10,'Bonus multiplier');
  var bonus=0, exact=[];
  // Final placement only after explicit admin approval; array/object of exact ranks.
  if (settings.finalPlacementsApproved===true && placementById && typeof placementById==='object') {
    ids.forEach(function(id,index){
      var target=index+1, official=Number(placementById[rtvR1Key_(id)]);
      if (Number.isInteger(official) && official===target) {
        var value=(n-index)*bonusScale;bonus+=value;
        exact.push({contestantId:rtvR1Key_(id),position:target,points:value});
      }
    });
  }
  var weight=Number(settings.contributionPercent===undefined?0:settings.contributionPercent);
  if (!Number.isFinite(weight)||weight<0||weight>100) throw new Error('Contribution must be between 0 and 100%.');
  var rawTotal=total+bonus;
  return {weekly:rows, lostPositions:lost, weeklyTotal:total, exactFinishBonus:bonus,
    exactFinishes:exact, rawTotal:rawTotal, overallContribution:rtvR1Round_(rawTotal*weight/100),
    maxWeeklyPoints:n*(n+1)/2};
}
/** Pick N: number of distinct choices is fixed before lock. The official group may
 * be smaller when the broadcaster announces fewer participants; that requires an
 * explicit result policy ('push') rather than inferring extra bottom placements. */
function rtvR1ScorePickN_(picks, officialIds, selectionCount, pointsPerCorrect, resultMode) {
  var n=rtvR1Int_(selectionCount,1,64,'Selection count');
  var p=rtvR1List_(picks).map(rtvR1Key_), winners=rtvR1List_(officialIds).map(rtvR1Key_);
  if (p.length!==n || rtvR1Unique_(p).length!==n) throw new Error('Select exactly '+n+' distinct contestants.');
  if (rtvR1Key_(resultMode)==='push') return {status:'push',correct:0,points:0};
  if (rtvR1Key_(resultMode)!=='final') throw new Error('Question result is not final.');
  if (winners.length!==n || rtvR1Unique_(winners).length!==n) throw new Error('Official bottom group must contain exactly '+n+' distinct contestants.');
  var pool={};winners.forEach(function(id){pool[id]=true;});
  var correct=p.filter(function(id){return !!pool[id];}).length;
  var each=Number(pointsPerCorrect);
  if (!Number.isFinite(each)||each<0||each>1000) throw new Error('Invalid points per correct selection.');
  return {status:'final',correct:correct,points:rtvR1Round_(correct*each)};
}
/** One player choice; potentially many correct official outcomes. A no-outcome id
 * must be mutually exclusive with any winning couple. */
function rtvR1ScorePerfect_(pickId, officialIds, noneId, points, resultMode) {
  if (rtvR1Key_(resultMode)==='push') return {status:'push',correct:false,points:0};
  if (rtvR1Key_(resultMode)!=='final') throw new Error('Perfect-score question is not final.');
  var winners=rtvR1Unique_(rtvR1List_(officialIds)).map(rtvR1Key_);
  var none=rtvR1Key_(noneId);
  if (!none) throw new Error('None outcome is required.');
  if (!winners.length) winners=[none];
  if (winners.length>1 && winners.indexOf(none)!==-1) throw new Error('None cannot be combined with actual perfect-score winners.');
  var ok=winners.indexOf(rtvR1Key_(pickId))!==-1;
  return {status:'final',correct:ok,points:ok?Number(points):0};
}
/** Choose question templates at episode build, never at page load.
 * Existing enabled presets are ALWAYS included. Random candidates are disabled
 * with RandomEligible true, filtered by format and eligibility supplied by the
 * existing builder. Do not reroll a built or picked episode. */
function rtvR1SelectEpisodeTemplates_(templates, settings, previousTemplateIds, eligibleTemplateIds, rand) {
  var enabled=(templates||[]).filter(function(t){return t.Enabled===true||rtvR1Key_(t.Enabled)==='true';});
  if (!settings || settings.randomQuestionsEnabled!==true) return enabled;
  var count=rtvR1Int_(settings.randomExtraQuestionCount,0,30,'Random extras');
  var taken={},blocked={},eligible={};
  enabled.forEach(function(t){taken[rtvR1Key_(t.TemplateId)]=true;});
  (previousTemplateIds||[]).forEach(function(id){blocked[rtvR1Key_(id)]=true;});
  (eligibleTemplateIds||[]).forEach(function(id){eligible[rtvR1Key_(id)]=true;});
  var pool=(templates||[]).filter(function(t){var k=rtvR1Key_(t.TemplateId);
    return k&&!taken[k]&&eligible[k]&&(t.RandomEligible===true||rtvR1Key_(t.RandomEligible)==='true');
  });
  if (settings.avoidRepeat===true) pool=pool.filter(function(t){return !blocked[rtvR1Key_(t.TemplateId)];});
  if (pool.length<count) throw new Error('Not enough eligible random questions; review pool or reduce random extras.');
  var random=typeof rand==='function'?rand:Math.random;
  for(var i=pool.length-1;i>0;i--){var r=Number(random());if(!Number.isFinite(r)||r<0||r>=1) throw new Error('Invalid random value.');
    var j=Math.floor(r*(i+1));var v=pool[i];pool[i]=pool[j];pool[j]=v;
  }
  return enabled.concat(pool.slice(0,count));
}
/** Reusable weekly TOP_N prediction: all n distinct selections are unordered. */
function rtvR1ScoreTopNQuestion_(picks, officialTopIds, n, pointsPerCorrect, mode) {
  return rtvR1ScorePickN_(picks, officialTopIds, n, pointsPerCorrect, mode);
}
/** Ranking questions: explicit official order, one partial-credit scale per ranked position.
 * This does NOT change the fixed season-long Survival Ranking points. */
function rtvR1ScoreOrderedQuestion_(predictedIds, officialIds, pointsByDistance, mode) {
  if (rtvR1Key_(mode)==='push') return {status:'push',points:0,positions:[]};
  if (rtvR1Key_(mode)!=='final') throw new Error('Ranking result is not final.');
  var picks=rtvR1List_(predictedIds).map(rtvR1Key_), actual=rtvR1List_(officialIds).map(rtvR1Key_);
  if (!picks.length || picks.length>64 || picks.some(x=>!x) || rtvR1Unique_(picks).length!==picks.length) throw new Error('Invalid ranking prediction.');
  if (actual.length<picks.length || actual.some(x=>!x) || rtvR1Unique_(actual).length!==actual.length) throw new Error('Official ranking must contain unique contestants and all ranked positions.');
  var scores=rtvR1List_(pointsByDistance).map(Number);
  if (!scores.length||scores.length>64||scores.some(x=>!Number.isFinite(x)||x<0||x>1000))throw new Error('Invalid ranking partial-credit scale.');
  var map={};actual.forEach((id,i)=>map[id]=i+1);
  var points=0,positions=picks.map(function(id,i){
    var distance=map[id]===undefined?null:Math.abs((i+1)-map[id]);
    var credit=distance===null?0:(scores[distance]||0);
    points+=credit;return {id:id,predicted:i+1,actual:map[id]||null,distance:distance,points:credit};
  });
  return {status:'final',points:rtvR1Round_(points),positions:positions};
}
/** Numeric outcomes may be unknown: push if the official measurement is absent. */
function rtvR1ScoreOverUnder_(pick, actual, line, points, mode) {
  if (rtvR1Key_(mode)==='push') return {status:'push',points:0};
  if (rtvR1Key_(mode)!=='final') throw new Error('Over/under result is not final.');
  var x=Number(actual),cutoff=Number(line),award=Number(points),side=rtvR1Key_(pick);
  if(actual===''||actual===null||!Number.isFinite(x)||!Number.isFinite(cutoff)||!Number.isFinite(award)||award<0||award>1000)throw new Error('Invalid numeric outcome.');
  if(side!=='over'&&side!=='under')throw new Error('Pick must be over or under.');
  if(x===cutoff)return {status:'push',points:0};
  var correct=(x>cutoff?side==='over':side==='under');return {status:'final',points:correct?award:0,correct:correct};
}
function rtvR1ScoreHeadToHead_(pickId, firstId, secondId, officialPositions, points, mode) {
  if (rtvR1Key_(mode)==='push')return {status:'push',points:0};
  if (rtvR1Key_(mode)!=='final')throw new Error('Head-to-head result is not final.');
  var a=rtvR1Key_(firstId),b=rtvR1Key_(secondId),pick=rtvR1Key_(pickId),pos=officialPositions||{},award=Number(points);
  if(!a||!b||a===b||(pick!==a&&pick!==b))throw new Error('Invalid head-to-head contestants.');
  var x=Number(pos[a]),y=Number(pos[b]);
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||x<1||y<1||!Number.isFinite(award)||award<0||award>1000)throw new Error('Official head-to-head placements are incomplete.');
  if(x===y)return {status:'push',points:0};
  var winner=x<y?a:b;return {status:'final',winnerId:winner,points:winner===pick?award:0};
}
function rtvR1ScoreRange_(pickRangeId, officialValue, ranges, points, mode){
  if(rtvR1Key_(mode)==='push')return {status:'push',points:0};
  if(rtvR1Key_(mode)!=='final')throw new Error('Range result is not final.');
  var value=Number(officialValue),award=Number(points),items=rtvR1List_(ranges);
  if(officialValue===''||officialValue===null||!Number.isFinite(value)||!Number.isFinite(award)||award<0||award>1000)throw new Error('Invalid range result.');
  if(!items.length||items.length>100)throw new Error('Range choices are missing.');
  var matched=items.filter(function(item){return item&&Number(item.min)<=value&&value<=Number(item.max);});
  if(matched.length!==1)throw new Error('Ranges must have exactly one matching official result.');
  var correct=rtvR1Key_(pickRangeId)===rtvR1Key_(matched[0].id);
  return {status:'final',winningId:rtvR1Key_(matched[0].id),correct:correct,points:correct?award:0};
}
if (typeof module!=='undefined' && module.exports) module.exports={rtvR1ValidateBallot_,rtvR1ScoreTopN_,rtvR1ScorePickN_,rtvR1ScorePerfect_,rtvR1SelectEpisodeTemplates_,rtvR1ScoreTopNQuestion_,rtvR1ScoreOrderedQuestion_,rtvR1ScoreOverUnder_,rtvR1ScoreHeadToHead_,rtvR1ScoreRange_};
