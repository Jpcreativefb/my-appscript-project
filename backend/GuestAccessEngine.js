/* Guest voting eligibility is per-game and defaults to disabled.
 * Use existing Apps Script project properties; no new spreadsheet or migration.
 */
function guestVotingAccessKey_(gameId) {
  const id=String(gameId || "").trim();
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) throw new Error("Invalid game ID");
  return "PATTC_GUEST_VOTE_ENABLED:" + id;
}
function guestVotingEnabledForGame_(gameId) {
  const key=guestVotingAccessKey_(gameId);
  return PropertiesService.getScriptProperties().getProperty(key) === "true";
}
function adminGetGuestVotingAccess_(gameId) {
  return {success:true, gameId:String(gameId || "").trim(), guestVotingEnabled:guestVotingEnabledForGame_(gameId)};
}
function adminSetGuestVotingAccess_(gameId,enabled) {
  const key=guestVotingAccessKey_(gameId);
  const game=typeof getGameRuntimeConfig === "function" ? getGameRuntimeConfig(gameId) : getGame(gameId);
  if (!game || String(game.type || "").toLowerCase() !== "voting") {
    throw new Error("Guest voting can only be enabled for a Voting Competition");
  }
  const allow=enabled === true || String(enabled || "").toLowerCase() === "true";
  PropertiesService.getScriptProperties().setProperty(key,allow ? "true" : "false");
  return {success:true,gameId:String(gameId),guestVotingEnabled:allow};
}
