/* =========================================================
   HELPERS
========================================================= */
function getUsersColumnMap_(headers){

  return {

    username:
      headers.indexOf("Username"),

    pin:
      headers.indexOf("PIN"),

    isAdmin:
      headers.indexOf("IsAdmin")

  };

}

function validateUsersColumns_(col){

  const required = [
    "username"
  ];

  const missing =
    required.filter(
      key => col[key] === -1
    );

  if (missing.length) {

    throw new Error(
      "Missing Users headers: " +
      missing.join(", ")
    );

  }

}

function normalizeUsername_(value){

  return String(value || "")
    .trim()
    .toLowerCase();

}

/* =========================
   USERS
========================= */

function getUsers(){

  const values =
     getAllUsersData_();

  if(!sh) throw new Error("Users sheet not found");

  const headers = 
    values.shift().map(h => 
        String(h).trim()
    );

  const usernameCol = headers.indexOf("Username");

  if(usernameCol === -1){
    throw new Error("Username column not found in Users sheet");
  }

  const users = values
    .map(r => String(r[usernameCol] || "").trim())
    .filter(u => u !== "");

  return users;
}

// =========================
// ADMIN CHECK
// =========================
function isAdmin(username) {

  const data =
     getAllUsersData_();

  if (data.length <= 1) {
    return false;
  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col = {
    username:
      headers.indexOf("Username"),

    isAdmin:
      headers.indexOf("IsAdmin")
  };

  if (
    col.username === -1 ||
    col.isAdmin === -1
  ) {
    return false;
  }

  const rows = data.slice(1);

  const row = rows.find(r =>

    
    normalizeUsername_(
       r[col.username]
    ) ===
    normalizeUsername_(
       username
    )

  );

  if (!row) {
    return false;
  }

  return (
    row[col.isAdmin] === true ||
    String(row[col.isAdmin])
      .toLowerCase() === "true"
  );

}


/* =========================
   LOGIN WRAPPERS (FOR UI)
========================= */
function createUser(username, pin){

  username =
    String(username || "")
      .trim();

  pin =
    String(pin || "")
      .trim();

  /* =========================
     VALIDATION
  ========================= */

  if (!username) {

    return {
      success: false,
      message:
        "Username cannot be empty"
    };

  }

  if (!/^\d{4}$/.test(pin)) {

    return {
      success: false,
      message:
        "PIN must be 4 digits"
    };

  }

  /* =========================
     LOAD USERS
  ========================= */

  const data =
    getAllUsersData_();

  if (data.length === 0) {

    return {
      success: false,
      message:
        "Users sheet empty"
    };

  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const rows =
    data.slice(1);

  const col =
    getUsersColumnMap_(
      headers
    );

  validateUsersColumns_(
    col
  );

  /* =========================
     DUPLICATE CHECK
  ========================= */

  const exists =
    rows.some(r =>

      normalizeUsername_(
        r[col.username]
      ) ===

      normalizeUsername_(
        username
      )

    );

  if (exists) {

    return {
      success: false,
      message:
        "Username already exists"
    };

  }

  /* =========================
     CREATE ROW
  ========================= */

  const row =
    new Array(headers.length)
      .fill("");

  row[col.username] =
    username;

  if (col.pin > -1) {

    row[col.pin] =
      "'" + pin;

  }

  if (col.isAdmin > -1) {

    row[col.isAdmin] =
      false;

  }

  appendUserRow_(row);

  if (
    typeof clearAppCaches ===
    "function"
  ) {

    clearAppCaches();

  }

  return {

    success: true,

    user: {

      username:
        username,

      isAdmin:
        false

    }

  };

}
