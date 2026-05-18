function loginUser(
  username,
  pin
){

  /* =========================
     VALIDATION
  ========================= */

  username =
    String(username || "")
      .trim();

  pin =
    String(pin || "")
      .trim();

  if (!username || !pin) {

    return {

      success: false,

      message:
        "Missing username or PIN"

    };

  }

  /* =========================
     LOAD USER
  ========================= */

  const user =
    findUserByUsername_(
      username
    );

  if (!user) {

    return {

      success: false,

      message:
        "Invalid login"

    };

  }

  /* =========================
     PIN VALIDATION
  ========================= */

  const storedPin =
    String(
      user["PIN"] || ""
    )
    .replace(/^'/, "")
    .trim();

  if (
    storedPin !== pin
  ) {

    return {

      success: false,

      message:
        "Invalid login"

    };

  }

  /* =========================
     SESSION TOKEN
  ========================= */

  const token =
    Utilities.getUuid();

  CacheService
    .getScriptCache()
    .put(

      token,

      user["Username"],

      60 * 60 * 6

    );

  /* =========================
     RESPONSE
  ========================= */

  return {

    success: true,

    token:
      token,

    username:
      user["Username"],

    isAdmin:

      String(
        user["IsAdmin"]
      ).toLowerCase() ===
        "true"

      ||

      user["IsAdmin"] ===
        "Yes",

    avatar:
      user["Avatar"] ||
      "default",

    themeColor:
      user["ThemeColor"] ||
      "#000000"

  };

}