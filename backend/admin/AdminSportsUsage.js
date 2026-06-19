/* =====================================================
   ADMIN SPORTS USAGE

   Shows which Awards App games/categories are using
   each Sports Scores GameId.

   Required CategorySettings headers:
   GameId
   CategoryId
   SportsGameId
===================================================== */

function adminGetSportsUsage() {

    const settingsData =
      getAllCategorySettingsData_();
  
    const categoriesData =
      getAllCategoriesData_();
  
    const games =
      typeof getGames === "function"
        ? getGames()
        : [];
  
    const gameMap = {};
  
    games.forEach(game => {
  
      const gameId =
        adminSportsUsageClean_(
          game.gameId ||
          game.GameId ||
          ""
        );
  
      if (!gameId) return;
  
      gameMap[gameId] = game;
  
    });
  
    const categoryNameMap =
      adminSportsUsageBuildCategoryMap_(
        categoriesData
      );
  
    if (settingsData.length <= 1) {
  
      return {
        success: true,
        usage: {}
      };
  
    }
  
    const headers =
      settingsData[0].map(header =>
        String(header || "").trim()
      );
  
    const col = {
  
      appGameId:
        adminSportsUsageFindHeader_(
          headers,
          [
            "GameId"
          ]
        ),
  
      categoryId:
        adminSportsUsageFindHeader_(
          headers,
          [
            "CategoryId"
          ]
        ),
  
      sportsGameId:
        adminSportsUsageFindHeader_(
          headers,
          [
            "SportsGameId",
            "SportsEventId",
            "SourceGameId",
            "ESPNGameId",
            "ESPNEventId"
          ]
        )
  
    };
  
    const missing = [];
  
    if (col.appGameId === -1) {
      missing.push("GameId");
    }
  
    if (col.categoryId === -1) {
      missing.push("CategoryId");
    }
  
    if (col.sportsGameId === -1) {
      missing.push("SportsGameId");
    }
  
    if (missing.length) {
  
      throw new Error(
        "Missing CategorySettings headers: " +
        missing.join(", ")
      );
  
    }
  
    const usage = {};
  
    for (let i = 1; i < settingsData.length; i++) {
  
      const row =
        settingsData[i];
  
      const sportsGameId =
        adminSportsUsageClean_(
          row[col.sportsGameId]
        );
  
      if (!sportsGameId) {
        continue;
      }
  
      const appGameId =
        adminSportsUsageClean_(
          row[col.appGameId]
        );
  
      const categoryId =
        adminSportsUsageClean_(
          row[col.categoryId]
        );
  
      if (
        !appGameId ||
        !categoryId
      ) {
        continue;
      }
  
      const game =
        gameMap[appGameId] || {};
  
      const categoryKey =
        appGameId +
        "||" +
        categoryId.toLowerCase();
  
      if (!usage[sportsGameId]) {
        usage[sportsGameId] = [];
      }
  
      usage[sportsGameId].push({
  
        sportsGameId:
          sportsGameId,
  
        appGameId:
          appGameId,
  
        appGameName:
          game.name ||
          game.Name ||
          appGameId,
  
        appGameType:
          game.type ||
          game.Type ||
          "",
  
        appGameStatus:
          game.status ||
          game.Status ||
          "",
  
        appGameActive:
          game.active === true ||
          game.Active === true,
  
        categoryId:
          categoryId,
  
        categoryName:
          categoryNameMap[categoryKey] ||
          categoryId
  
      });
  
    }
  
    return {
      success: true,
      count: Object.keys(usage).length,
      usage: usage
    };
  
  }
  
  /* =====================================================
     CATEGORY NAME MAP
  ===================================================== */
  
  function adminSportsUsageBuildCategoryMap_(
    categoriesData
  ) {
  
    const map = {};
  
    if (
      !categoriesData ||
      categoriesData.length <= 1
    ) {
      return map;
    }
  
    const headers =
      categoriesData[0].map(header =>
        String(header || "").trim()
      );
  
    const col = {
  
      gameId:
        adminSportsUsageFindHeader_(
          headers,
          [
            "GameId"
          ]
        ),
  
      categoryId:
        adminSportsUsageFindHeader_(
          headers,
          [
            "CategoryId"
          ]
        ),
  
      category:
        adminSportsUsageFindHeader_(
          headers,
          [
            "Category",
            "CategoryName",
            "Question"
          ]
        ),
  
      active:
        adminSportsUsageFindHeader_(
          headers,
          [
            "Active"
          ]
        )
  
    };
  
    if (
      col.gameId === -1 ||
      col.categoryId === -1 ||
      col.category === -1
    ) {
      return map;
    }
  
    for (let i = 1; i < categoriesData.length; i++) {
  
      const row =
        categoriesData[i];
  
      if (col.active > -1) {
  
        const activeValue =
          row[col.active];
  
        const isActive =
          activeValue === true ||
          String(activeValue || "")
            .trim()
            .toLowerCase() === "true";
  
        if (!isActive) {
          continue;
        }
  
      }
  
      const gameId =
        adminSportsUsageClean_(
          row[col.gameId]
        );
  
      const categoryId =
        adminSportsUsageClean_(
          row[col.categoryId]
        );
  
      const categoryName =
        adminSportsUsageClean_(
          row[col.category]
        );
  
      if (
        !gameId ||
        !categoryId ||
        !categoryName
      ) {
        continue;
      }
  
      const key =
        gameId +
        "||" +
        categoryId.toLowerCase();
  
      if (!map[key]) {
        map[key] = categoryName;
      }
  
    }
  
    return map;
  
  }
  
  /* =====================================================
     HELPERS
  ===================================================== */
  
  function adminSportsUsageFindHeader_(
    headers,
    possibleNames
  ) {
  
    for (let i = 0; i < possibleNames.length; i++) {
  
      const index =
        headers.indexOf(
          possibleNames[i]
        );
  
      if (index > -1) {
        return index;
      }
  
    }
  
    return -1;
  
  }
  
  function adminSportsUsageClean_(
    value
  ) {
  
    return String(value || "")
      .trim();
  
  }