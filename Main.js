// ==========================
// CONFIG
// ==========================
const CATEGORIES_SHEET = 'Categories';
const USERS_SHEET = 'Users';
const PICKS_SHEET = 'Picks';
const CATEGORY_SETTINGS_SHEET = 'CategorySettings';

// Fallback image for nominees/movies // Used when poster/image is unavailable 
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/120x180?text=No+Image';

const CONFIG = {
  // 🌐 Base Web App URL (IMPORTANT)
  BASE_URL: "https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec",

  // 🎬 Assets
  ASSETS: {
    OSCAR_ICON: "https://drive.google.com/thumbnail?id=1MlgVMk17CKLTydtagMtJjZwhkQUL01gf&sz=w40"
  },

  DEFAULT_GAME_ID: "oscars-2026",

  // 📄 Pages (central routing)
  PAGES: {
    LANDING: "",
    PICKS: "?app=picks",
    MOVIETRACKER: "?app=movietracker",
    VOTING: "?app=voting",
    RESULTS: "?app=results",
    LEADERBOARD: "?app=leaderboard",
    ADMIN: "?app=admin"
  }

};

function getSheetOrThrow_(sheetName){

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(sheetName);

  if (!sh) {

    throw new Error(
      "Missing sheet: " +
      sheetName
    );

  }

  return sh;

}

function getPartial(page){
  try{
    return HtmlService
      .createHtmlOutputFromFile(page)
      .getContent();
  } catch(e){
    return `<div style="padding:20px">Page not found: ${page}</div>`;
  }
}

function getPartialWithData(file){

  try {

    // 🚫 NO TEMPLATE ENGINE AT ALL
    return HtmlService
      .createHtmlOutputFromFile(file)
      .getContent();

  } catch(e){

    Logger.log("🔥 LOAD ERROR: " + file);
    Logger.log(e);

    return `<div style="padding:20px;color:red">
      Failed to load ${file}
    </div>`;
  }
}

function getAppShell(){

  return HtmlService
    .createTemplateFromFile("App")
    .evaluate()
    .getContent();

}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* =========================
   PROFILE: GET
========================= */
function getUserProfile(username){

  if(!username) return null;

  const sh = SpreadsheetApp.getActive().getSheetByName("Profiles");
  if(!sh) return null;

  const data = sh.getDataRange().getValues();
  const headers = data.shift();

  const col = {
    user: headers.indexOf("Username"),
    display: headers.indexOf("DisplayName"),
    avatar: headers.indexOf("Avatar"),
    theme: headers.indexOf("ThemeColor")
  };

  for(const row of data){
    if(String(row[col.user]).trim().toLowerCase() === username.toLowerCase()){
      return {
        username: row[col.user],
        displayName: row[col.display] || row[col.user],
        avatar: row[col.avatar] || "default",
        themeColor: row[col.theme] || "#354785"
      };
    }
  }

  // fallback (no profile yet)
  return {
    username: username,
    displayName: username,
    avatar: "default",
    themeColor: "#354785"
  };
}

/* =========================
   PROFILE: SAVE
========================= */
function saveUserProfile(profile){

  if(!profile || !profile.username){
    throw new Error("Invalid profile payload");
  }

  const sh = SpreadsheetApp.getActive().getSheetByName("Profiles");
  if(!sh) throw new Error("Profiles sheet missing");

  const data = sh.getDataRange().getValues();
  const headers = data[0];

  const col = {
    user: headers.indexOf("Username"),
    display: headers.indexOf("DisplayName"),
    avatar: headers.indexOf("Avatar"),
    theme: headers.indexOf("ThemeColor")
  };

  let rowIndex = data.findIndex((r,i)=>
    i>0 && String(r[col.user]).trim().toLowerCase() === profile.username.toLowerCase()
  );

  // NEW PROFILE
  if(rowIndex === -1){
    sh.appendRow([
      profile.username,
      profile.displayName,
      profile.avatar,
      profile.themeColor
    ]);
  } else {
    const row = rowIndex + 1;

    sh.getRange(row, col.display+1).setValue(profile.displayName);
    sh.getRange(row, col.avatar+1).setValue(profile.avatar);
    sh.getRange(row, col.theme+1).setValue(profile.themeColor);
  }

  return { success:true };
}