/* =========================
   USER CLEANUP (ADMIN ONLY)
========================= */
function adminCleanUsersSheet() {
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();

  const headers = data[0];
  const rows = data.slice(1);

  const cleaned = rows.map(row => {
    let [username, pin, isAdmin, avatar, themeColor, createdAt] = row;

    username = String(username || "").trim();
    pin = String(pin || "").trim();

    isAdmin = (
      isAdmin === true ||
      isAdmin === "TRUE" ||
      isAdmin === "true" ||
      isAdmin === 1 ||
      isAdmin === "Yes" ||
      isAdmin === "yes"
    );

    avatar = avatar ? String(avatar).trim() : "";
    themeColor = themeColor ? String(themeColor).trim() : "";

    try {
      createdAt = new Date(createdAt).toISOString();
    } catch (e) {
      createdAt = new Date().toISOString();
    }

    return [username, pin, isAdmin, avatar, themeColor, createdAt];
  });

  sheet.getRange(2, 1, cleaned.length, headers.length).setValues(cleaned);

  Logger.log("Users sheet cleaned");
}