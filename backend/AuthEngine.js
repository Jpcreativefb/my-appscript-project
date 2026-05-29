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
     ACTIVE VALIDATION
  ========================= */

  const activeValue =
    user["Active"];

  const isActive =
    activeValue === undefined ||
    activeValue === "" ||
    activeValue === true ||
    activeValue === 1 ||
    String(activeValue || "")
      .trim()
      .toLowerCase() === "true" ||
    String(activeValue || "")
      .trim()
      .toLowerCase() === "yes" ||
    String(activeValue || "")
      .trim()
      .toLowerCase() === "active";

  if (!isActive) {

    return {

      success: false,

      message:
        "This account is inactive. Please contact the admin."

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
      authBoolean_(
        user["IsAdmin"]
      ),

    active:
      true,

    avatar:
      user["Avatar"] ||
      "default",

    themeColor:
      user["ThemeColor"] ||
      "#000000"

  };

}

function authBoolean_(value) {

  return (
    value === true ||
    value === 1 ||
    String(value || "")
      .trim()
      .toLowerCase() === "true" ||
    String(value || "")
      .trim()
      .toLowerCase() === "yes" ||
    String(value || "")
      .trim()
      .toLowerCase() === "admin"
  );

}