// =====================================================
// VOTING VALIDATION ENGINE
// =====================================================

function validateVotePayload_(payload){

  if(!payload){
    throw new Error("Missing payload");
  }

  const username =
    normalizeString_(payload.username);

  const gameId =
    normalizeString_(
      payload.gameId ||
      getDefaultGameId()
    );

  const categoryId =
    normalizeString_(payload.categoryId);

  const rankings =
    Array.isArray(payload.rankings)
      ? payload.rankings
      : [];

  if(!username){
    throw new Error("Username required");
  }

  if(!gameId){
    throw new Error("GameId required");
  }

  if(!categoryId){
    throw new Error("CategoryId required");
  }

  if(!rankings.length){
    throw new Error("Rankings required");
  }

  // =====================================================
  // CATEGORY VALIDATION
  // =====================================================

  const categories = getCategoriesCached();

  const category =
    categories.find(c =>
      c.id === categoryId &&
      String(c.gameId || "").trim() === gameId
    );

  if(!category){
    throw new Error(
      "Category does not belong to game"
    );
  }

  // =====================================================
  // COMMUNITY RANK ENABLED
  // =====================================================

  const communityEnabled =
    category.communityRank === true ||
    String(category.communityRank)
      .toLowerCase() === "true";

  if(!communityEnabled){
    throw new Error(
      "Community voting disabled"
    );
  }

  // =====================================================
  // NOMINEE VALIDATION
  // =====================================================

  const nomineeSet =
    new Set(
      category.nominees.map(n => n.id)
    );

  rankings.forEach(r => {

    const nomineeId =
      normalizeString_(r.nomineeId);

    if(!nomineeSet.has(nomineeId)){
      throw new Error(
        "Invalid nominee for category: " +
        nomineeId
      );
    }

  });

  // =====================================================
  // DUPLICATE NOMINEES
  // =====================================================

  const nomineeIds =
    rankings.map(r =>
      normalizeString_(r.nomineeId)
    );

  const unique =
    new Set(nomineeIds);

  if(unique.size !== nomineeIds.length){
    throw new Error(
      "Duplicate nominees detected"
    );
  }

  // =====================================================
  // RANK VALIDATION
  // =====================================================

  validateRankingSequence_(rankings);

  return {
    valid:true,
    username,
    gameId,
    categoryId,
    rankings
  };

}

function validateRankingSequence_(rankings){

  const ranks =
    rankings
      .map(r => Number(r.rank))
      .sort((a,b)=>a-b);

  for(let i = 0; i < ranks.length; i++){

    const expected = i + 1;

    if(ranks[i] !== expected){

      throw new Error(
        "Ranks must be sequential starting at 1"
      );

    }

  }

}