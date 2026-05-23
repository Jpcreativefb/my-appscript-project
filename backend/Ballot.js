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

/* =========================
   SHARED CATEGORY RENDERER
========================= */

/* function renderCategoriesShared(container, categories, picks){

  container.innerHTML = "";

  categories.forEach(cat => {

    const card = document.createElement("div");
    card.className = "categoryCard";

    let html = `<div class="catTitle">${cat.name}</div>`;

    cat.nominees.forEach(n => {

      const selected = picks?.[cat.id] === n.id;

      html += `
        <div class="nominee ${selected ? 'selected' : ''}">
          ${n.name}
          ${selected ? '✓' : ''}
        </div>
      `;

    });

    card.innerHTML = html;

    container.appendChild(card);

  });

} */
