/* =========================
   COMPARE ENGINE (FINAL CLEAN)
========================= */

function getCompareData(userA, userB){

  if(!userA || !userB){
    return { error: "Missing users" };
  }

  const picksA = apigetMyPicks(userA);
  const picksB = apigetMyPicks(userB);

  const categories = getCategories();
  const settings = getCategorySettings();

  // =========================
  // LOOKUPS
  // =========================
  const mapA = {};
  const mapB = {};

  picksA.forEach(p => mapA[p.categoryId] = p);
  picksB.forEach(p => mapB[p.categoryId] = p);

  const result = [];

  let sameCount = 0;
  let diffCount = 0;
  let swingCount = 0;

  let scoreA = 0;
  let scoreB = 0;
  let remainingPoints = 0;

  categories.forEach(cat => {

    const pickA = mapA[cat.id];
    const pickB = mapB[cat.id];

    const nomineeA = cat.nominees.find(n => n.id === pickA?.nomineeId);
    const nomineeB = cat.nominees.find(n => n.id === pickB?.nomineeId);

    const nameA = nomineeA ? nomineeA.name : "";
    const nameB = nomineeB ? nomineeB.name : "";

    const imageA = nomineeA ? nomineeA.image : "";
    const imageB = nomineeB ? nomineeB.image : "";

    const catSettings =
      settings[cat.id] ||
      settings[String(cat.id).toLowerCase()] ||
      {};

    const winnerId = (catSettings.winnerNomineeId || "").toString().toLowerCase();
    const basePoints = catSettings.points || 0;

    const pickAId = (pickA?.nomineeId || "").toLowerCase();
    const pickBId = (pickB?.nomineeId || "").toLowerCase();

    const samePick = pickAId && pickAId === pickBId;

    if(samePick) sameCount++;
    else diffCount++;

    // =========================
    // RESULT
    // =========================
    let winner = null;

    if(winnerId){

      const aCorrect = pickAId === winnerId;
      const bCorrect = pickBId === winnerId;

      if(aCorrect && !bCorrect){
        winner = "A";
        scoreA += basePoints;
      }
      else if(bCorrect && !aCorrect){
        winner = "B";
        scoreB += basePoints;
      }
      else{
        winner = "tie";
      }

    } else {
      remainingPoints += basePoints;
    }

    // =========================
    // SWING
    // =========================
    const isSwing = !samePick && !winnerId;
    if(isSwing) swingCount++;

    result.push({
      categoryId: cat.id,
      categoryName: cat.name,
      order: cat.displayOrder || 999,

      userA: {
        nomineeId: pickA?.nomineeId || "",
        nomineeName: nameA,
        image: imageA
      },

      userB: {
        nomineeId: pickB?.nomineeId || "",
        nomineeName: nameB,
        image: imageB
      },

      samePick,
      isSwing,
      winner,
      pointsAtStake: basePoints,
      locked: cat.locked || false
    });

  });

  // =========================
  // SORT
  // =========================
  result.sort((a,b)=>a.order - b.order);

  // =========================
  // WIN PROBABILITY
  // =========================
  let winChanceA = 0;
  let winChanceB = 0;

  if(remainingPoints === 0){

    if(scoreA > scoreB){
      winChanceA = 100;
      winChanceB = 0;
    } else if(scoreB > scoreA){
      winChanceA = 0;
      winChanceB = 100;
    } else {
      winChanceA = 50;
      winChanceB = 50;
    }

  } else {

    winChanceA = Math.round(
      (remainingPoints / (remainingPoints + Math.abs(scoreA - scoreB))) * 100
    );

    winChanceB = 100 - winChanceA;
  }

  return {
    summary: {
      totalCategories: result.length,
      samePicks: sameCount,
      differentPicks: diffCount,
      swingCategories: swingCount,
      scoreA,
      scoreB,
      remainingPoints,
      winChanceA,
      winChanceB
    },
    categories: result
  };
}

/* =========================
   MULTI USER COMPARE (FINAL)
========================= */

function getCompareMulti(userA, others){

  if(!userA || !others || !others.length){
    return { categories:[], summary:{} };
  }

  const categories = getCategoriesCached();
  const settings = getCategorySettings();

  const users = [userA, ...others];

  // =========================
  // LOAD PICKS
  // =========================
  const userPicks = {};

  users.forEach(u=>{
    const picks = apigetMyPicks(u) || [];
    userPicks[u] = {};

    picks.forEach(p=>{
      userPicks[u][p.categoryId] = p;
    });
  });

  // =========================
  // BUILD DATA
  // =========================
  const result = [];
  const scores = {};
  let remainingPoints = 0;

  users.forEach(u => scores[u] = 0);

  categories.forEach(cat => {

    const catSettings =
      settings[cat.id] ||
      settings[String(cat.id).toLowerCase()] ||
      {};

    const basePoints = catSettings.points || 0;
    const winnerId = (catSettings.winnerNomineeId || "").toLowerCase();

    const row = {
      categoryName: cat.name,
      categoryId: cat.id,
      layoutType: cat.layoutType || "",
      points: basePoints,
      winnerId: winnerId,
      base: null,
      others: {},
      isSwing: false
    };

    // =========================
    // BASE USER
    // =========================
    const basePick = userPicks[userA][cat.id];

    row.base = formatPick(cat, basePick);

    // =========================
    // OTHER USERS
    // =========================
    let different = false;

    others.forEach(u => {

      const pick = userPicks[u][cat.id];

      const formatted = formatPick(cat, pick);

      row.others[u] = formatted;

      if(formatted.nomineeId !== row.base.nomineeId){
        different = true;
      }
    });

    // =========================
    // SCORING
    // =========================
    if(winnerId){

      users.forEach(u => {

        const pick = userPicks[u][cat.id];
        const pickId = (pick?.nomineeId || "").toLowerCase();

        if(pickId === winnerId){
          scores[u] += basePoints;
        }
      });

    } else {
      remainingPoints += basePoints;
    }

    // =========================
    // SWING
    // =========================
    row.isSwing = !winnerId && different;

    result.push(row);
  });

  // =========================
  // SORT
  // =========================
  result.sort((a,b)=> (a.order||999)-(b.order||999));

  return {
    categories: result,
    summary: {
      scores,
      remainingPoints
    }
  };
}

/* =========================
   PICK FORMATTER
========================= */
function formatPick(cat, pick){

  if(!pick){
    return {
      nomineeId:"",
      nomineeName:"",
      image:""
    };
  }

  const nominee = cat.nominees.find(n => n.id === pick.nomineeId);

  return {
    nomineeId: pick.nomineeId || "",
    nomineeName: nominee?.name || "",
    image: nominee?.image || ""
  };
}

/* =========================
   PICK FORMATTER
========================= */
function formatPick(cat, pick){

  if(!pick){
    return {
      nomineeId:"",
      nomineeName:"",
      image:""
    };
  }

  const nominee = cat.nominees.find(n => n.id === pick.nomineeId);

  return {
    nomineeId: pick.nomineeId || "",
    nomineeName: nominee?.name || "",
    image: nominee?.image || ""
  };
}

/* =========================
   PICK FORMATTER
========================= */

function buildPickObject(pick, nominees){

  if(!pick) return null;

  const nominee = nominees.find(n => n.id === pick.nomineeId);

  return {
    nomineeId: pick.nomineeId || "",
    nomineeName: nominee ? nominee.name : "",
    image: nominee ? nominee.image : ""
  };
}function myFunction() {
  
}
