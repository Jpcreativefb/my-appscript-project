/* =========================
   USERS
========================= */

function getUsers(){

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(USERS_SHEET);

  if(!sh) throw new Error("Users sheet not found");

  const values = sh.getDataRange().getValues();

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

/* ========================= LEGACY PASSWORD AUTH Replaced by loginUser() in Auth.gs =========================
// =========================
// VALIDATE LOGIN
// =========================
function validateUserPassword(username, password) {

  const sh = SpreadsheetApp.getActive().getSheetByName(USERS_SHEET);
  if (!sh) return false;

  const rows = sh.getDataRange().getValues().slice(1);

  const row = rows.find(r =>
    String(r[0]).trim().toLowerCase() === String(username).trim().toLowerCase()
  );

  if (!row) return false;

  const storedPassword = String(row[1] || "").replace(/^'/, "").trim();

  return storedPassword === String(password).trim();
}

*/

// =========================
// ADMIN CHECK
// =========================
function isAdmin(username) {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(USERS_SHEET);

  if (!sh) return false;

  const data =
    sh.getDataRange().getValues();

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

  username = (username || '').toString().trim();
  pin = (pin || '').toString().trim();

  if (!username) {
    return { success: false, message: 'Username cannot be empty' };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { success: false, message: 'PIN must be 4 digits' };
  }

  const sh = SpreadsheetApp.getActive().getSheetByName("Users");
  if (!sh) {
    return { success: false, message: 'Users sheet not found' };
  }

  const data = sh.getDataRange().getValues();
  const headers = 
    data.shift().map(h => 
      String(h).trim() 
    );

  const col = {
    username: headers.indexOf("Username"),
    pin: headers.indexOf("PIN"),
    isAdmin: headers.indexOf("IsAdmin")
  };

  const exists = data.some(r =>
    normalizeUsername_(
      r[col.username]
    ) === 
    normalizeUsername_( 
      username
    )
  );

  if (exists) {
    return { success: false, message: 'Username already exists' };
  }

  
  const row =
    new Array(headers.length)
      .fill("");

  row[col.username] = username;
  row[col.pin] = "'" + pin;
  row[col.isAdmin] = false;

  sh.appendRow(row);

  return {
    success: true,
    user: {
      username: username,
      isAdmin: false
    }
  };
}


function normalizeUsername_(value){

  return String(value || "")
    .trim()
    .toLowerCase();

}


