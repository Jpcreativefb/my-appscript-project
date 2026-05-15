function loginUser(username, pin) {

  if (!username || !pin) {

    return {
      success: false,
      message: "Missing username or PIN"
    };

  }

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName("Users");

  if (!sheet) {

    throw new Error(
      "Users sheet not found"
    );

  }

  const data =
    sheet.getDataRange().getValues();

  const headers =
    data.shift().map(h =>
      String(h).trim()
    );

  const users = data.map(row => {

    const obj = {};

    headers.forEach((h, i) => {
      obj[h] = row[i];
    });

    return obj;

  });

  const user = users.find(u =>

    String(u["Username"])
      .trim()
      .toLowerCase() ===
    String(username)
      .trim()
      .toLowerCase()

    &&

    String(u["PIN"])
      .trim() ===
    String(pin)
      .trim()

  );

  if (!user) {

    return {
      success: false,
      message: "Invalid login"
    };

  }

  const token =
    Utilities.getUuid();

  CacheService
    .getScriptCache()
    .put(
      token,
      user["Username"],
      60 * 60 * 6
    );

  return {

    success: true,

    token,

    username:
      user["Username"],

    isAdmin:
      String(user["IsAdmin"])
        .toLowerCase() === "true"
      ||
      user["IsAdmin"] === "Yes",

    avatar:
      user["Avatar"] || "default",

    themeColor:
      user["ThemeColor"] || "#000000"

  };

}