/* =========================
   ADMIN CATEGORIES / QUESTIONS ENGINE
========================= */

/* =========================================================
   HELPERS
========================================================= */

function adminCatNormalizeValue_(value) {

    return String(value || "")
      .trim();
  
  }
  
  function adminCatNormalizeGameId_(value) {
  
    return String(value || "")
      .trim();
  
  }
  
  function adminCatNormalizeId_(value) {
  
    return String(value || "")
      .trim()
      .toLowerCase();
  
  }
  
  function adminCatSlugify_(value) {
  
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  
  }
  
  function adminCatToBoolean_(value) {
  
    return (
      value === true ||
      String(value)
        .trim()
        .toLowerCase() === "true"
    );
  
  }
  
  function adminCatSetIfColumnExists_(
    row,
    col,
    key,
    value
  ) {
  
    if (col[key] !== -1) {
      row[col[key]] = value;
    }
  
  }
  
  function adminCatClearCaches_() {
  
    if (
      typeof clearAppCaches ===
      "function"
    ) {
      clearAppCaches();
    }
  
  }
  
  /* =========================================================
     CATEGORY SETTINGS HELPERS
  ========================================================= */
  
  function adminCatFindSettingsRow_(
    data,
    col,
    gameId,
    categoryId
  ) {
  
    for (let i = 1; i < data.length; i++) {
  
      const rowGameId =
        adminCatNormalizeGameId_(
          data[i][col.gameId]
        );
  
      const rowCategoryId =
        adminCatNormalizeId_(
          data[i][col.categoryId]
        );
  
      if (
        rowGameId === gameId &&
        rowCategoryId === categoryId
      ) {
        return i + 1;
      }
  
    }
  
    return -1;
  
  }
  
  function adminCatBuildSettingsRow_(
    headers,
    col,
    payload
  ) {
  
    const row =
      new Array(headers.length)
        .fill("");
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "gameId",
      payload.gameId
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "categoryId",
      payload.categoryId
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "points",
      Number(payload.points) || 0
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "locked",
      adminCatToBoolean_(
        payload.locked
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "winnerNomineeId",
      adminCatNormalizeId_(
        payload.winnerNomineeId
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "changePenalty",
      Number(payload.changePenalty) || 0
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "maxChanges",
      Number(payload.maxChanges) || 0
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "lockDateTime",
      payload.lockDateTime || ""
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "displayOrder",
      Number(payload.displayOrder) || 999
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "groupId",
      adminCatNormalizeValue_(
        payload.groupId || "default"
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "parentCategoryId",
      adminCatNormalizeId_(
        payload.parentCategoryId
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "followUpCategoryId",
      adminCatNormalizeId_(
        payload.followUpCategoryId
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "followUpMapJSON",
      adminCatNormalizeValue_(
        payload.followUpMapJSON
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "layoutType",
      adminCatNormalizeValue_(
        payload.layoutType || "image"
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "shortName",
      adminCatNormalizeValue_(
        payload.shortName
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "countsAsStatue",
      adminCatToBoolean_(
        payload.countsAsStatue
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "scoreVersion",
      adminCatNormalizeValue_(
        payload.scoreVersion
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "favoriteNomineeId",
      adminCatNormalizeId_(
        payload.favoriteNomineeId
      )
    );
  
    return row;
  
  }
  
  function adminCatUpsertCategorySettings_(
    payload
  ) {
  
    const sh =
      getCategorySettingsSheet_();
  
    const data =
      sh.getDataRange().getValues();
  
    if (!data.length) {
  
      throw new Error(
        "CategorySettings sheet is empty"
      );
  
    }
  
    const headers =
      data[0].map(h =>
        String(h).trim()
      );
  
    const col =
      getCategorySettingsColumnMap_(
        headers
      );
  
    validateCategorySettingsColumns_(
      col
    );
  
    const rowIndex =
      adminCatFindSettingsRow_(
        data,
        col,
        payload.gameId,
        payload.categoryId
      );
  
    if (rowIndex === -1) {
  
      const row =
        adminCatBuildSettingsRow_(
          headers,
          col,
          payload
        );
  
      sh.appendRow(row);
  
      return;
  
    }
  
    const row =
      data[rowIndex - 1].slice();
  
    const keys = [
      "points",
      "locked",
      "winnerNomineeId",
      "changePenalty",
      "maxChanges",
      "lockDateTime",
      "displayOrder",
      "groupId",
      "parentCategoryId",
      "followUpCategoryId",
      "followUpMapJSON",
      "layoutType",
      "shortName",
      "countsAsStatue",
      "scoreVersion",
      "favoriteNomineeId"
    ];
  
    keys.forEach(key => {
  
      if (
        key in payload &&
        col[key] !== -1
      ) {
  
        if (
          key === "points" ||
          key === "changePenalty" ||
          key === "maxChanges" ||
          key === "displayOrder"
        ) {
  
          row[col[key]] =
            Number(payload[key]) || 0;
  
        } else if (
          key === "locked" ||
          key === "countsAsStatue"
        ) {
  
          row[col[key]] =
            adminCatToBoolean_(
              payload[key]
            );
  
        } else if (
          key === "winnerNomineeId" ||
          key === "favoriteNomineeId" ||
          key === "parentCategoryId" ||
          key === "followUpCategoryId"
        ) {
  
          row[col[key]] =
            adminCatNormalizeId_(
              payload[key]
            );
  
        } else {
  
          row[col[key]] =
            adminCatNormalizeValue_(
              payload[key]
            );
  
        }
  
      }
  
    });
  
    sh.getRange(
      rowIndex,
      1,
      1,
      headers.length
    ).setValues([
      row
    ]);
  
  }
  
  /* =========================================================
     CATEGORY ROW HELPERS
  ========================================================= */
  
  function adminCatFindCategoryRows_(
    data,
    col,
    gameId,
    categoryId
  ) {
  
    const rows = [];
  
    for (let i = 1; i < data.length; i++) {
  
      const rowGameId =
        adminCatNormalizeGameId_(
          data[i][col.gameId]
        );
  
      const rowCategoryId =
        adminCatNormalizeId_(
          data[i][col.categoryId]
        );
  
      if (
        rowGameId === gameId &&
        rowCategoryId === categoryId
      ) {
        rows.push(i + 1);
      }
  
    }
  
    return rows;
  
  }
  
  function adminCatFindNomineeRow_(
    data,
    col,
    gameId,
    categoryId,
    nomineeId
  ) {
  
    for (let i = 1; i < data.length; i++) {
  
      const rowGameId =
        adminCatNormalizeGameId_(
          data[i][col.gameId]
        );
  
      const rowCategoryId =
        adminCatNormalizeId_(
          data[i][col.categoryId]
        );
  
      const rowNomineeId =
        adminCatNormalizeId_(
          data[i][col.nomineeId]
        );
  
      if (
        rowGameId === gameId &&
        rowCategoryId === categoryId &&
        rowNomineeId === nomineeId
      ) {
        return i + 1;
      }
  
    }
  
    return -1;
  
  }
  
  function adminCatBuildNomineeRow_(
    headers,
    col,
    payload
  ) {
  
    const row =
      new Array(headers.length)
        .fill("");
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "gameId",
      payload.gameId
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "category",
      payload.category
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "categoryId",
      payload.categoryId
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "nominee",
      payload.nominee
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "nomineeId",
      payload.nomineeId
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "section",
      payload.section || "Other"
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "fileId",
      payload.fileId || ""
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "shortAnswer",
      payload.shortAnswer || payload.nominee
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "categoryImage",
      payload.categoryImage || ""
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "movieId",
      payload.movieId || ""
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "movie",
      payload.movie || ""
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "person",
      payload.person || ""
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "active",
      adminCatToBoolean_(
        "active" in payload
          ? payload.active
          : true
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "predictionGame",
      adminCatToBoolean_(
        "predictionGame" in payload
          ? payload.predictionGame
          : true
      )
    );
  
    adminCatSetIfColumnExists_(
      row,
      col,
      "communityRank",
      adminCatToBoolean_(
        payload.communityRank
      )
    );
  
    return row;
  
  }
  
  /* =========================================================
     GET FULL GAME SETUP
  ========================================================= */
  
  function adminGetGameSetup(payload) {
  
    const gameId =
      adminCatNormalizeGameId_(
        payload && payload.gameId
      );
  
    if (!gameId) {
  
      throw new Error(
        "GameId is required"
      );
  
    }
  
    validateGameId(gameId);
  
    const categoryData =
      getAllCategoriesData_();
  
    const categoryHeaders =
      categoryData[0].map(h =>
        String(h).trim()
      );
  
    const categoryCol =
      getCategoriesColumnMap_(
        categoryHeaders
      );
  
    validateCategoriesColumns_(
      categoryCol
    );
  
    const settingsData =
      getAllCategorySettingsData_();
  
    const settingsHeaders =
      settingsData[0].map(h =>
        String(h).trim()
      );
  
    const settingsCol =
      getCategorySettingsColumnMap_(
        settingsHeaders
      );
  
    validateCategorySettingsColumns_(
      settingsCol
    );
  
    const map = {};
  
    for (let i = 1; i < categoryData.length; i++) {
  
      const row =
        categoryData[i];
  
      const rowGameId =
        adminCatNormalizeGameId_(
          row[categoryCol.gameId]
        );
  
      if (rowGameId !== gameId) {
        continue;
      }
  
      const categoryId =
        adminCatNormalizeId_(
          row[categoryCol.categoryId]
        );
  
      if (!categoryId) {
        continue;
      }
  
      const categoryName =
        adminCatNormalizeValue_(
          row[categoryCol.category]
        );
  
      if (!map[categoryId]) {
  
        map[categoryId] = {
          gameId: gameId,
          categoryId: categoryId,
          category: categoryName,
          section:
            categoryCol.section !== -1
              ? adminCatNormalizeValue_(
                  row[categoryCol.section]
                )
              : "Other",
          categoryImage:
            categoryCol.categoryImage !== -1
              ? adminCatNormalizeValue_(
                  row[categoryCol.categoryImage]
                )
              : "",
          active:
            categoryCol.active !== -1
              ? adminCatToBoolean_(
                  row[categoryCol.active]
                )
              : true,
          predictionGame:
            categoryCol.predictionGame !== -1
              ? adminCatToBoolean_(
                  row[categoryCol.predictionGame]
                )
              : true,
          communityRank:
            categoryCol.communityRank !== -1
              ? adminCatToBoolean_(
                  row[categoryCol.communityRank]
                )
              : false,
          settings: {},
          nominees: []
        };
  
      }
  
      const nomineeName =
        adminCatNormalizeValue_(
          row[categoryCol.nominee]
        );
  
      if (!nomineeName) {
        continue;
      }
  
      const nomineeId =
        categoryCol.nomineeId !== -1
          ? adminCatNormalizeId_(
              row[categoryCol.nomineeId]
            )
          : adminCatSlugify_(
              nomineeName
            );
  
      map[categoryId].nominees.push({
        nomineeId: nomineeId,
        nominee: nomineeName,
        fileId:
          categoryCol.fileId !== -1
            ? adminCatNormalizeValue_(
                row[categoryCol.fileId]
              )
            : "",
        shortAnswer:
          categoryCol.shortAnswer !== -1
            ? adminCatNormalizeValue_(
                row[categoryCol.shortAnswer]
              )
            : nomineeName,
        movieId:
          categoryCol.movieId !== -1
            ? adminCatNormalizeValue_(
                row[categoryCol.movieId]
              )
            : "",
        movie:
          categoryCol.movie !== -1
            ? adminCatNormalizeValue_(
                row[categoryCol.movie]
              )
            : "",
        person:
          categoryCol.person !== -1
            ? adminCatNormalizeValue_(
                row[categoryCol.person]
              )
            : "",
        active:
          categoryCol.active !== -1
            ? adminCatToBoolean_(
                row[categoryCol.active]
              )
            : true
      });
  
    }
  
    for (let i = 1; i < settingsData.length; i++) {
  
      const row =
        settingsData[i];
  
      const rowGameId =
        adminCatNormalizeGameId_(
          row[settingsCol.gameId]
        );
  
      if (rowGameId !== gameId) {
        continue;
      }
  
      const categoryId =
        adminCatNormalizeId_(
          row[settingsCol.categoryId]
        );
  
      if (!categoryId) {
        continue;
      }
  
      if (!map[categoryId]) {
  
        map[categoryId] = {
          gameId: gameId,
          categoryId: categoryId,
          category: "",
          section: "Other",
          categoryImage: "",
          active: true,
          predictionGame: true,
          communityRank: false,
          settings: {},
          nominees: []
        };
  
      }
  
      map[categoryId].settings = {
        points:
          Number(row[settingsCol.points]) || 0,
        locked:
          adminCatToBoolean_(
            row[settingsCol.locked]
          ),
        winnerNomineeId:
          settingsCol.winnerNomineeId !== -1
            ? adminCatNormalizeId_(
                row[settingsCol.winnerNomineeId]
              )
            : "",
        changePenalty:
          settingsCol.changePenalty !== -1
            ? Number(row[settingsCol.changePenalty]) || 0
            : 0,
        maxChanges:
          settingsCol.maxChanges !== -1
            ? Number(row[settingsCol.maxChanges]) || 0
            : 0,
        lockDateTime:
          settingsCol.lockDateTime !== -1
            ? row[settingsCol.lockDateTime] || ""
            : "",
        displayOrder:
          settingsCol.displayOrder !== -1
            ? Number(row[settingsCol.displayOrder]) || 999
            : 999,
        groupId:
          settingsCol.groupId !== -1
            ? adminCatNormalizeValue_(
                row[settingsCol.groupId]
              )
            : "default",
        layoutType:
          settingsCol.layoutType !== -1
            ? adminCatNormalizeValue_(
                row[settingsCol.layoutType]
              )
            : "image",
        shortName:
          settingsCol.shortName !== -1
            ? adminCatNormalizeValue_(
                row[settingsCol.shortName]
              )
            : "",
        countsAsStatue:
          settingsCol.countsAsStatue !== -1
            ? adminCatToBoolean_(
                row[settingsCol.countsAsStatue]
              )
            : false,
        scoreVersion:
          settingsCol.scoreVersion !== -1
            ? adminCatNormalizeValue_(
                row[settingsCol.scoreVersion]
              )
            : "",
        favoriteNomineeId:
          settingsCol.favoriteNomineeId !== -1
            ? adminCatNormalizeId_(
                row[settingsCol.favoriteNomineeId]
              )
            : ""
      };
  
    }
  
    const categories =
      Object
        .values(map)
        .sort((a, b) => {
  
          const aOrder =
            Number(
              a.settings.displayOrder
            ) || 999;
  
          const bOrder =
            Number(
              b.settings.displayOrder
            ) || 999;
  
          return aOrder - bOrder;
  
        });
  
    return {
      success: true,
      gameId: gameId,
      categories: categories
    };
  
  }
  
  /* =========================================================
     CREATE CATEGORY / QUESTION
  ========================================================= */
  
  function adminCreateCategory(payload) {
  
    if (!payload) {
  
      throw new Error(
        "Category payload missing"
      );
  
    }
  
    const gameId =
      adminCatNormalizeGameId_(
        payload.gameId
      );
  
    if (!gameId) {
  
      throw new Error(
        "GameId is required"
      );
  
    }
  
    validateGameId(gameId);
  
    const categoryName =
      adminCatNormalizeValue_(
        payload.category ||
        payload.question ||
        payload.name
      );
  
    if (!categoryName) {
  
      throw new Error(
        "Category/question name is required"
      );
  
    }
  
    const categoryId =
      adminCatNormalizeId_(
        payload.categoryId ||
        adminCatSlugify_(
          categoryName
        )
      );
  
    if (!categoryId) {
  
      throw new Error(
        "CategoryId is required"
      );
  
    }
  
    const lock =
      LockService.getScriptLock();
  
    lock.waitLock(10000);
  
    try {
  
      const setup =
        adminGetGameSetup({
          gameId: gameId
        });
  
      const exists =
        setup.categories.some(c =>
          c.categoryId === categoryId
        );
  
      if (exists) {
  
        throw new Error(
          "Category already exists: " +
          categoryId
        );
  
      }
  
      adminCatUpsertCategorySettings_({
        gameId: gameId,
        categoryId: categoryId,
        points:
          payload.points || 1,
        locked:
          adminCatToBoolean_(
            payload.locked
          ),
        winnerNomineeId: "",
        changePenalty:
          payload.changePenalty || 0,
        maxChanges:
          payload.maxChanges || 0,
        lockDateTime:
          payload.lockDateTime || "",
        displayOrder:
          payload.displayOrder || 999,
        groupId:
          payload.groupId || "default",
        parentCategoryId:
          payload.parentCategoryId || "",
        followUpCategoryId:
          payload.followUpCategoryId || "",
        followUpMapJSON:
          payload.followUpMapJSON || "",
        layoutType:
          payload.layoutType || "image",
        shortName:
          payload.shortName || "",
        countsAsStatue:
          adminCatToBoolean_(
            payload.countsAsStatue
          ),
        scoreVersion:
          payload.scoreVersion || "",
        favoriteNomineeId: ""
      });
  
      SpreadsheetApp.flush();
  
      adminCatClearCaches_();
  
      return {
        success: true,
        message: "Category created",
        gameId: gameId,
        categoryId: categoryId
      };
  
    } finally {
  
      lock.releaseLock();
  
    }
  
  }
  
  /* =========================================================
     UPDATE CATEGORY / QUESTION
  ========================================================= */
  
  function adminUpdateCategory(payload) {
  
    if (!payload) {
  
      throw new Error(
        "Category payload missing"
      );
  
    }
  
    const gameId =
      adminCatNormalizeGameId_(
        payload.gameId
      );
  
    const categoryId =
      adminCatNormalizeId_(
        payload.categoryId
      );
  
    if (!gameId) {
  
      throw new Error(
        "GameId is required"
      );
  
    }
  
    if (!categoryId) {
  
      throw new Error(
        "CategoryId is required"
      );
  
    }
  
    validateGameId(gameId);
  
    const lock =
      LockService.getScriptLock();
  
    lock.waitLock(10000);
  
    try {
  
      const sh =
        getCategoriesSheet_();
  
      const data =
        sh.getDataRange().getValues();
  
      const headers =
        data[0].map(h =>
          String(h).trim()
        );
  
      const col =
        getCategoriesColumnMap_(
          headers
        );
  
      validateCategoriesColumns_(
        col
      );
  
      const rows =
        adminCatFindCategoryRows_(
          data,
          col,
          gameId,
          categoryId
        );
  
      rows.forEach(rowIndex => {
  
        const row =
          data[rowIndex - 1].slice();
  
        if (
          "category" in payload ||
          "question" in payload ||
          "name" in payload
        ) {
  
          adminCatSetIfColumnExists_(
            row,
            col,
            "category",
            adminCatNormalizeValue_(
              payload.category ||
              payload.question ||
              payload.name
            )
          );
  
        }
  
        if ("section" in payload) {
  
          adminCatSetIfColumnExists_(
            row,
            col,
            "section",
            adminCatNormalizeValue_(
              payload.section
            )
          );
  
        }
  
        if ("categoryImage" in payload) {
  
          adminCatSetIfColumnExists_(
            row,
            col,
            "categoryImage",
            adminCatNormalizeValue_(
              payload.categoryImage
            )
          );
  
        }
  
        if ("active" in payload) {
  
          adminCatSetIfColumnExists_(
            row,
            col,
            "active",
            adminCatToBoolean_(
              payload.active
            )
          );
  
        }
  
        if ("predictionGame" in payload) {
  
          adminCatSetIfColumnExists_(
            row,
            col,
            "predictionGame",
            adminCatToBoolean_(
              payload.predictionGame
            )
          );
  
        }
  
        if ("communityRank" in payload) {
  
          adminCatSetIfColumnExists_(
            row,
            col,
            "communityRank",
            adminCatToBoolean_(
              payload.communityRank
            )
          );
  
        }
  
        sh.getRange(
          rowIndex,
          1,
          1,
          headers.length
        ).setValues([
          row
        ]);
  
      });
  
      adminCatUpsertCategorySettings_({
        gameId: gameId,
        categoryId: categoryId,
        points:
          "points" in payload
            ? payload.points
            : undefined,
        locked:
          "locked" in payload
            ? payload.locked
            : undefined,
        winnerNomineeId:
          "winnerNomineeId" in payload
            ? payload.winnerNomineeId
            : undefined,
        changePenalty:
          "changePenalty" in payload
            ? payload.changePenalty
            : undefined,
        maxChanges:
          "maxChanges" in payload
            ? payload.maxChanges
            : undefined,
        lockDateTime:
          "lockDateTime" in payload
            ? payload.lockDateTime
            : undefined,
        displayOrder:
          "displayOrder" in payload
            ? payload.displayOrder
            : undefined,
        groupId:
          "groupId" in payload
            ? payload.groupId
            : undefined,
        parentCategoryId:
          "parentCategoryId" in payload
            ? payload.parentCategoryId
            : undefined,
        followUpCategoryId:
          "followUpCategoryId" in payload
            ? payload.followUpCategoryId
            : undefined,
        followUpMapJSON:
          "followUpMapJSON" in payload
            ? payload.followUpMapJSON
            : undefined,
        layoutType:
          "layoutType" in payload
            ? payload.layoutType
            : undefined,
        shortName:
          "shortName" in payload
            ? payload.shortName
            : undefined,
        countsAsStatue:
          "countsAsStatue" in payload
            ? payload.countsAsStatue
            : undefined,
        scoreVersion:
          "scoreVersion" in payload
            ? payload.scoreVersion
            : undefined,
        favoriteNomineeId:
          "favoriteNomineeId" in payload
            ? payload.favoriteNomineeId
            : undefined
      });
  
      SpreadsheetApp.flush();
  
      adminCatClearCaches_();
  
      return {
        success: true,
        message: "Category updated",
        gameId: gameId,
        categoryId: categoryId
      };
  
    } finally {
  
      lock.releaseLock();
  
    }
  
  }
  
  /* =========================================================
     ARCHIVE CATEGORY / QUESTION
  ========================================================= */
  
  function adminArchiveCategory(payload) {
  
    if (!payload) {
  
      throw new Error(
        "Category payload missing"
      );
  
    }
  
    payload.active = false;
    payload.locked = true;
  
    const result =
      adminUpdateCategory(
        payload
      );
  
    result.message =
      "Category archived";
  
    return result;
  
  }
  
  /* =========================================================
     ADD NOMINEE / ANSWER CHOICE
  ========================================================= */
  
  function adminCreateNominee(payload) {
  
    if (!payload) {
  
      throw new Error(
        "Nominee payload missing"
      );
  
    }
  
    const gameId =
      adminCatNormalizeGameId_(
        payload.gameId
      );
  
    const categoryId =
      adminCatNormalizeId_(
        payload.categoryId
      );
  
    if (!gameId) {
  
      throw new Error(
        "GameId is required"
      );
  
    }
  
    if (!categoryId) {
  
      throw new Error(
        "CategoryId is required"
      );
  
    }
  
    validateGameId(gameId);
  
    const nomineeName =
      adminCatNormalizeValue_(
        payload.nominee ||
        payload.answer ||
        payload.name
      );
  
    if (!nomineeName) {
  
      throw new Error(
        "Nominee/answer name is required"
      );
  
    }
  
    const nomineeId =
      adminCatNormalizeId_(
        payload.nomineeId ||
        adminCatSlugify_(
          nomineeName
        )
      );
  
    const lock =
      LockService.getScriptLock();
  
    lock.waitLock(10000);
  
    try {
  
      const setup =
        adminGetGameSetup({
          gameId: gameId
        });
  
      const category =
        setup.categories.find(c =>
          c.categoryId === categoryId
        );
  
      if (!category) {
  
        throw new Error(
          "Category not found: " +
          categoryId
        );
  
      }
  
      const duplicate =
        category.nominees.some(n =>
          n.nomineeId === nomineeId
        );
  
      if (duplicate) {
  
        throw new Error(
          "Nominee already exists: " +
          nomineeId
        );
  
      }
  
      const sh =
        getCategoriesSheet_();
  
      const data =
        sh.getDataRange().getValues();
  
      const headers =
        data[0].map(h =>
          String(h).trim()
        );
  
      const col =
        getCategoriesColumnMap_(
          headers
        );
  
      validateCategoriesColumns_(
        col
      );
  
      const categoryName =
        adminCatNormalizeValue_(
          payload.category ||
          payload.question ||
          category.category
        );
  
      if (!categoryName) {
  
        throw new Error(
          "Category name is required before adding nominees"
        );
  
      }
  
      const row =
        adminCatBuildNomineeRow_(
          headers,
          col,
          {
            gameId: gameId,
            categoryId: categoryId,
            category: categoryName,
            nominee: nomineeName,
            nomineeId: nomineeId,
            section:
              payload.section ||
              category.section ||
              "Other",
            fileId:
              payload.fileId || "",
            shortAnswer:
              payload.shortAnswer ||
              nomineeName,
            categoryImage:
              payload.categoryImage ||
              category.categoryImage ||
              "",
            movieId:
              payload.movieId || "",
            movie:
              payload.movie || "",
            person:
              payload.person || "",
            active:
              "active" in payload
                ? payload.active
                : true,
            predictionGame:
              "predictionGame" in payload
                ? payload.predictionGame
                : category.predictionGame,
            communityRank:
              "communityRank" in payload
                ? payload.communityRank
                : category.communityRank
          }
        );
  
      sh.appendRow(row);
  
      SpreadsheetApp.flush();
  
      adminCatClearCaches_();
  
      return {
        success: true,
        message: "Nominee created",
        gameId: gameId,
        categoryId: categoryId,
        nomineeId: nomineeId
      };
  
    } finally {
  
      lock.releaseLock();
  
    }
  
  }
  
  /* =========================================================
     UPDATE NOMINEE / ANSWER CHOICE
  ========================================================= */
  
  function adminUpdateNominee(payload) {
  
    if (!payload) {
  
      throw new Error(
        "Nominee payload missing"
      );
  
    }
  
    const gameId =
      adminCatNormalizeGameId_(
        payload.gameId
      );
  
    const categoryId =
      adminCatNormalizeId_(
        payload.categoryId
      );
  
    const nomineeId =
      adminCatNormalizeId_(
        payload.nomineeId
      );
  
    if (!gameId) {
  
      throw new Error(
        "GameId is required"
      );
  
    }
  
    if (!categoryId) {
  
      throw new Error(
        "CategoryId is required"
      );
  
    }
  
    if (!nomineeId) {
  
      throw new Error(
        "NomineeId is required"
      );
  
    }
  
    validateGameId(gameId);
  
    const lock =
      LockService.getScriptLock();
  
    lock.waitLock(10000);
  
    try {
  
      const sh =
        getCategoriesSheet_();
  
      const data =
        sh.getDataRange().getValues();
  
      const headers =
        data[0].map(h =>
          String(h).trim()
        );
  
      const col =
        getCategoriesColumnMap_(
          headers
        );
  
      validateCategoriesColumns_(
        col
      );
  
      const rowIndex =
        adminCatFindNomineeRow_(
          data,
          col,
          gameId,
          categoryId,
          nomineeId
        );
  
      if (rowIndex === -1) {
  
        throw new Error(
          "Nominee not found: " +
          nomineeId
        );
  
      }
  
      const row =
        data[rowIndex - 1].slice();
  
      if (
        "nominee" in payload ||
        "answer" in payload ||
        "name" in payload
      ) {
  
        adminCatSetIfColumnExists_(
          row,
          col,
          "nominee",
          adminCatNormalizeValue_(
            payload.nominee ||
            payload.answer ||
            payload.name
          )
        );
  
      }
  
      if ("fileId" in payload) {
  
        adminCatSetIfColumnExists_(
          row,
          col,
          "fileId",
          adminCatNormalizeValue_(
            payload.fileId
          )
        );
  
      }
  
      if ("shortAnswer" in payload) {
  
        adminCatSetIfColumnExists_(
          row,
          col,
          "shortAnswer",
          adminCatNormalizeValue_(
            payload.shortAnswer
          )
        );
  
      }
  
      if ("movieId" in payload) {
  
        adminCatSetIfColumnExists_(
          row,
          col,
          "movieId",
          adminCatNormalizeValue_(
            payload.movieId
          )
        );
  
      }
  
      if ("movie" in payload) {
  
        adminCatSetIfColumnExists_(
          row,
          col,
          "movie",
          adminCatNormalizeValue_(
            payload.movie
          )
        );
  
      }
  
      if ("person" in payload) {
  
        adminCatSetIfColumnExists_(
          row,
          col,
          "person",
          adminCatNormalizeValue_(
            payload.person
          )
        );
  
      }
  
      if ("active" in payload) {
  
        adminCatSetIfColumnExists_(
          row,
          col,
          "active",
          adminCatToBoolean_(
            payload.active
          )
        );
  
      }
  
      sh.getRange(
        rowIndex,
        1,
        1,
        headers.length
      ).setValues([
        row
      ]);
  
      SpreadsheetApp.flush();
  
      adminCatClearCaches_();
  
      return {
        success: true,
        message: "Nominee updated",
        gameId: gameId,
        categoryId: categoryId,
        nomineeId: nomineeId
      };
  
    } finally {
  
      lock.releaseLock();
  
    }
  
  }
  
  /* =========================================================
     ARCHIVE NOMINEE / ANSWER CHOICE
  ========================================================= */
  
  function adminArchiveNominee(payload) {
  
    if (!payload) {
  
      throw new Error(
        "Nominee payload missing"
      );
  
    }
  
    payload.active = false;
  
    const result =
      adminUpdateNominee(
        payload
      );
  
    result.message =
      "Nominee archived";
  
    return result;
  
  }