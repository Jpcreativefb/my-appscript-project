function apiGetBallot(username){

  const picks = apiGetMyPicks(username)

  const stats = getUserStats(username)

  return {
    username: username,
    picks: picks,
    stats: stats
  }

}

function getAppData(){

  const categories = getCategoriesCached();
  const categorySettings = getCategorySettings();

  return {
     categories: categories,
     categorySettings: categorySettings,
     stats: getStats()
  };

}

function getStats(){

  const sh = SpreadsheetApp.getActive().getSheetByName("Stats");

  if(!sh) return [];

  const rows = sh.getDataRange().getValues();

  if(rows.length <= 1) return [];

  const headers = rows.shift();

  return rows.map(r=>{

    const obj = {};

    headers.forEach((h,i)=>{
      obj[h] = r[i];
    });

    return obj;

  });

}
