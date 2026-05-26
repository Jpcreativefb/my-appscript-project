/* =========================
   PROFILE ENGINE
========================= */

/* =========================
   GET USER PROFILE
========================= */

function getUserProfile(
  username
){

  if (!username) {
    return null;
  }

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        "Profiles"
      );

  if (!sh) {
    return null;
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {

    return {
      username: username,
      displayName: username,
      avatar: "default",
      themeColor: "#354785"
    };

  }

  const headers =
    data.shift();

  const col = {
    user:
      headers.indexOf(
        "Username"
      ),
    display:
      headers.indexOf(
        "DisplayName"
      ),
    avatar:
      headers.indexOf(
        "Avatar"
      ),
    theme:
      headers.indexOf(
        "ThemeColor"
      )
  };

  for (const row of data) {

    if (
      String(row[col.user])
        .trim()
        .toLowerCase() ===
      String(username)
        .trim()
        .toLowerCase()
    ) {

      return {
        username:
          row[col.user],
        displayName:
          row[col.display] ||
          row[col.user],
        avatar:
          row[col.avatar] ||
          "default",
        themeColor:
          row[col.theme] ||
          "#354785"
      };

    }

  }

  return {
    username: username,
    displayName: username,
    avatar: "default",
    themeColor: "#354785"
  };

}

/* =========================
   SAVE USER PROFILE
========================= */

function saveUserProfile(
  profile
){

  if (
    !profile ||
    !profile.username
  ) {

    throw new Error(
      "Invalid profile payload"
    );

  }

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        "Profiles"
      );

  if (!sh) {

    throw new Error(
      "Profiles sheet missing"
    );

  }

  const data =
    sh.getDataRange()
      .getValues();

  if (!data.length) {

    throw new Error(
      "Profiles sheet has no headers"
    );

  }

  const headers =
    data[0];

  const col = {
    user:
      headers.indexOf(
        "Username"
      ),
    display:
      headers.indexOf(
        "DisplayName"
      ),
    avatar:
      headers.indexOf(
        "Avatar"
      ),
    theme:
      headers.indexOf(
        "ThemeColor"
      )
  };

  const missing =
    Object.entries(col)
      .filter(([key, value]) =>
        value === -1
      )
      .map(([key]) => key);

  if (missing.length) {

    throw new Error(
      "Missing Profiles headers: " +
      missing.join(", ")
    );

  }

  const rowIndex =
    data.findIndex((row, index) =>

      index > 0 &&

      String(row[col.user])
        .trim()
        .toLowerCase() ===
      String(profile.username)
        .trim()
        .toLowerCase()

    );

  if (rowIndex === -1) {

    sh.appendRow([
      profile.username,
      profile.displayName || profile.username,
      profile.avatar || "default",
      profile.themeColor || "#354785"
    ]);

  } else {

    const row =
      rowIndex + 1;

    sh.getRange(
      row,
      col.display + 1
    ).setValue(
      profile.displayName ||
      profile.username
    );

    sh.getRange(
      row,
      col.avatar + 1
    ).setValue(
      profile.avatar ||
      "default"
    );

    sh.getRange(
      row,
      col.theme + 1
    ).setValue(
      profile.themeColor ||
      "#354785"
    );

  }

  return {
    success: true
  };

}