/************************************************************
 CLEAN SPLIT v14 - SPORTS RACING DRIVER DATABASE

 Use this file BEFORE running setup on a newly rebuilt Racing
 Score Engine.

 What it creates:
 - SportsRacingDrivers
   Reusable driver defaults: car number, team, manufacturer,
   sponsor, images, NASCAR/ESPN ids, aliases, source tracking.

 - SportsRacingRaceEntries
   Race-specific overrides: starting position, race car number,
   race team/manufacturer/sponsor, race images.

 Main setup/sync/test functions:
 - setupSportsRacingDriverDatabaseSystem
 - syncSportsRacingDriverDatabaseAllSources
 - syncSportsRacingDriverDatabaseFromNascarFeed
 - updateSportsRacingDriverDatabaseFromResults
 - buildSportsRacingDriverDatabaseFromResults
 - debugSportsRacingDriverDatabaseStatusV14
 - testSportsRacingDriverDatabaseMergeV14

 Compatibility kept from v12/v13:
 - debugSportsRacingDriverDatabaseStatusV12
 - testSportsRacingDriverDatabaseMergeV12
 - apiGetSportsRacingResultsWithDriverDatabaseV12_
************************************************************/

var SPORTS_RACING_DRIVERS_SHEET =
  "SportsRacingDrivers";

var SPORTS_RACING_RACE_ENTRIES_SHEET =
  "SportsRacingRaceEntries";

var SPORTS_RACING_DRIVER_HEADERS = [
  "DriverKey",
  "League",
  "SeriesId",
  "Season",
  "NascarDriverId",
  "EspnAthleteId",
  "DriverName",
  "FirstName",
  "LastName",
  "DisplayName",
  "AliasNames",
  "DefaultCarNumber",
  "DefaultManufacturer",
  "DefaultTeam",
  "DefaultSponsor",
  "DriverImageUrl",
  "HeadshotUrl",
  "CarNumberImageUrl",
  "Country",
  "BirthDate",
  "Active",
  "LastSeenRaceId",
  "LastSeenAt",
  "Source",
  "SourceUpdatedAt",
  "ManualOverride",
  "Notes",
  "CreatedAt",
  "UpdatedAt"
];

var SPORTS_RACING_RACE_ENTRY_HEADERS = [
  "EntryId",
  "League",
  "SeriesId",
  "Season",
  "GameId",
  "ESPNEventId",
  "NascarRaceId",
  "RaceName",
  "DriverKey",
  "DriverName",
  "CarNumber",
  "Manufacturer",
  "Team",
  "Sponsor",
  "DriverImageUrl",
  "HeadshotUrl",
  "CarNumberImageUrl",
  "StartingPosition",
  "QualifyingSpeed",
  "Source",
  "SourceUpdatedAt",
  "ManualOverride",
  "Notes",
  "CreatedAt",
  "UpdatedAt"
];

var SPORTS_RACING_SERIES = [
  {
    league: "nascar-premier",
    seriesId: "1",
    seriesName: "NASCAR Cup Series"
  },
  {
    league: "nascar-secondary",
    seriesId: "2",
    seriesName: "NASCAR Xfinity Series"
  },
  {
    league: "nascar-truck",
    seriesId: "3",
    seriesName: "NASCAR Craftsman Truck Series"
  }
];

/************************************************************
 SETUP
************************************************************/

function setupSportsRacingDriverDatabaseSystem() {

  sportsRacingDriverDbEnsureSheet_(
    SPORTS_RACING_DRIVERS_SHEET,
    SPORTS_RACING_DRIVER_HEADERS
  );

  sportsRacingDriverDbEnsureSheet_(
    SPORTS_RACING_RACE_ENTRIES_SHEET,
    SPORTS_RACING_RACE_ENTRY_HEADERS
  );

  return {
    success: true,
    version: "v14",
    sheets: {
      drivers: SPORTS_RACING_DRIVERS_SHEET,
      raceEntries: SPORTS_RACING_RACE_ENTRIES_SHEET
    },
    message:
      "Driver database setup complete. Next run syncSportsRacingDriverDatabaseAllSources."
  };

}

function sportsRacingDriverDbEnsureSheet_(sheetName, headers) {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(sheetName);

  if (!sh) {
    sh =
      ss.insertSheet(sheetName);
  }

  const lastRow =
    sh.getLastRow();

  const lastColumn =
    sh.getLastColumn();

  let currentHeaders = [];

  if (lastRow >= 1 && lastColumn >= 1) {
    currentHeaders =
      sh
        .getRange(1, 1, 1, lastColumn)
        .getValues()[0]
        .map(function(value) {
          return sportsRacingDriverDbString_(value);
        });
  }

  if (!currentHeaders.length || !currentHeaders[0]) {
    sh.clear();

    sh
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);

    try {
      sh.setFrozenRows(1);
    } catch (err) {}

    return sh;
  }

  const missing =
    headers.filter(function(header) {
      return currentHeaders.indexOf(header) === -1;
    });

  if (missing.length) {
    sh
      .getRange(
        1,
        currentHeaders.length + 1,
        1,
        missing.length
      )
      .setValues([missing]);
  }

  try {
    sh.setFrozenRows(1);
  } catch (err) {}

  return sh;

}

/************************************************************
 BASIC HELPERS
************************************************************/

function sportsRacingDriverDbString_(value) {

  return String(value || "")
    .trim();

}

function sportsRacingDriverDbKey_(value) {

  return sportsRacingDriverDbString_(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}

function sportsRacingDriverDbSlug_(value) {

  return sportsRacingDriverDbKey_(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

}

function sportsRacingDriverDbBoolean_(value, fallback) {

  if (value === true || value === false) {
    return value;
  }

  const text =
    sportsRacingDriverDbString_(value)
      .toLowerCase();

  if (
    text === "true" ||
    text === "yes" ||
    text === "y" ||
    text === "1"
  ) {
    return true;
  }

  if (
    text === "false" ||
    text === "no" ||
    text === "n" ||
    text === "0"
  ) {
    return false;
  }

  return fallback === undefined ? true : fallback;

}

function sportsRacingDriverDbHeaderMap_(headers) {

  const map = {};

  headers.forEach(function(header, index) {
    if (header) {
      map[header] = index;
    }
  });

  return map;

}

function sportsRacingDriverDbFirstNonEmpty_(values) {

  values =
    Array.isArray(values)
      ? values
      : [];

  for (let i = 0; i < values.length; i++) {

    const value =
      values[i];

    if (
      value !== null &&
      value !== undefined &&
      sportsRacingDriverDbString_(value) !== ""
    ) {
      return sportsRacingDriverDbString_(value);
    }

  }

  return "";

}

function sportsRacingDriverDbGetValue_(obj, fieldNames) {

  obj =
    obj || {};

  fieldNames =
    Array.isArray(fieldNames)
      ? fieldNames
      : [];

  for (let i = 0; i < fieldNames.length; i++) {

    const field =
      fieldNames[i];

    if (
      obj[field] !== null &&
      obj[field] !== undefined &&
      sportsRacingDriverDbString_(obj[field]) !== ""
    ) {
      return sportsRacingDriverDbString_(obj[field]);
    }

  }

  return "";

}

function sportsRacingSeriesIdFromLeague_(league) {

  const value =
    sportsRacingDriverDbString_(league)
      .toLowerCase();

  if (
    value === "nascar-premier" ||
    value === "nascar-cup" ||
    value.indexOf("cup") !== -1
  ) {
    return "1";
  }

  if (
    value === "nascar-secondary" ||
    value === "nascar-xfinity" ||
    value.indexOf("xfinity") !== -1
  ) {
    return "2";
  }

  if (
    value === "nascar-truck" ||
    value.indexOf("truck") !== -1
  ) {
    return "3";
  }

  return "";

}

function sportsRacingLeagueFromSeriesId_(seriesId) {

  const id =
    sportsRacingDriverDbString_(seriesId);

  const found =
    SPORTS_RACING_SERIES.find(function(series) {
      return sportsRacingDriverDbString_(series.seriesId) === id;
    });

  return found
    ? found.league
    : "";

}

function sportsRacingSeriesNameFromSeriesId_(seriesId) {

  const id =
    sportsRacingDriverDbString_(seriesId);

  const found =
    SPORTS_RACING_SERIES.find(function(series) {
      return sportsRacingDriverDbString_(series.seriesId) === id;
    });

  return found
    ? found.seriesName
    : "";

}

function sportsRacingFirstName_(driverName) {

  const parts =
    sportsRacingDriverDbString_(driverName)
      .split(/\s+/)
      .filter(Boolean);

  return parts.length
    ? parts[0]
    : "";

}

function sportsRacingLastName_(driverName) {

  const parts =
    sportsRacingDriverDbString_(driverName)
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length <= 1) {
    return "";
  }

  return parts.slice(1).join(" ");

}

function sportsRacingDriverKeyFor_(league, driverName) {

  const leagueKey =
    sportsRacingDriverDbSlug_(league || "racing");

  const driverKey =
    sportsRacingDriverDbSlug_(driverName);

  return leagueKey + "|" + driverKey;

}

function sportsRacingRaceEntryIdFor_(league, gameId, espnEventId, raceName, driverName) {

  const raceKey =
    sportsRacingDriverDbString_(gameId) ||
    sportsRacingDriverDbString_(espnEventId) ||
    sportsRacingDriverDbSlug_(raceName);

  return (
    sportsRacingDriverDbSlug_(league || "racing") +
    "|" +
    sportsRacingDriverDbSlug_(raceKey) +
    "|" +
    sportsRacingDriverDbSlug_(driverName)
  );

}

/************************************************************
 READERS
************************************************************/

function sportsRacingDriverDbReadObjects_(sheetName, headers) {

  setupSportsRacingDriverDatabaseSystem();

  const ss =
    SpreadsheetApp.getActive();

  const sh =
    ss.getSheetByName(sheetName);

  if (!sh) {
    return [];
  }

  const values =
    sh.getDataRange()
      .getValues();

  if (values.length <= 1) {
    return [];
  }

  const actualHeaders =
    values[0].map(function(value) {
      return sportsRacingDriverDbString_(value);
    });

  return values.slice(1)
    .map(function(row, rowIndex) {
      const obj = {
        _rowNumber: rowIndex + 2
      };

      actualHeaders.forEach(function(header, index) {
        if (header) {
          obj[header] = row[index];
        }
      });

      return obj;
    });

}

function readSportsRacingDriverRows_() {

  return sportsRacingDriverDbReadObjects_(
    SPORTS_RACING_DRIVERS_SHEET,
    SPORTS_RACING_DRIVER_HEADERS
  ).filter(function(row) {
    return !!(
      sportsRacingDriverDbString_(row.DriverKey) ||
      sportsRacingDriverDbString_(row.DriverName)
    );
  });

}

function readSportsRacingRaceEntryRows_() {

  return sportsRacingDriverDbReadObjects_(
    SPORTS_RACING_RACE_ENTRIES_SHEET,
    SPORTS_RACING_RACE_ENTRY_HEADERS
  ).filter(function(row) {
    return !!(
      sportsRacingDriverDbString_(row.EntryId) ||
      sportsRacingDriverDbString_(row.DriverName)
    );
  });

}

/************************************************************
 UPSERT CORE
************************************************************/

function sportsRacingDriverDbUpsertDrivers_(drivers, options) {

  setupSportsRacingDriverDatabaseSystem();

  drivers =
    Array.isArray(drivers)
      ? drivers
      : [];

  options =
    options || {};

  const respectManualOverride =
    options.respectManualOverride !== false;

  const overwriteExisting =
    options.overwriteExisting === true;

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(SPORTS_RACING_DRIVERS_SHEET);

  let values =
    sh.getDataRange().getValues();

  if (!values.length) {
    sportsRacingDriverDbEnsureSheet_(
      SPORTS_RACING_DRIVERS_SHEET,
      SPORTS_RACING_DRIVER_HEADERS
    );

    values =
      sh.getDataRange().getValues();
  }

  const headers =
    values[0].map(function(header) {
      return sportsRacingDriverDbString_(header);
    });

  const col =
    sportsRacingDriverDbHeaderMap_(headers);

  const rowIndexByDriverKey = {};
  const rowIndexByNameKey = {};

  for (let i = 1; i < values.length; i++) {

    const driverKey =
      col.DriverKey !== undefined
        ? sportsRacingDriverDbString_(values[i][col.DriverKey])
        : "";

    const league =
      col.League !== undefined
        ? sportsRacingDriverDbString_(values[i][col.League])
        : "";

    const driverName =
      col.DriverName !== undefined
        ? sportsRacingDriverDbString_(values[i][col.DriverName])
        : "";

    if (driverKey) {
      rowIndexByDriverKey[driverKey] = i;
    }

    if (league && driverName) {
      rowIndexByNameKey[
        sportsRacingDriverKeyFor_(league, driverName)
      ] = i;
    }

  }

  const alwaysUpdate = {
    Active: true,
    LastSeenRaceId: true,
    LastSeenAt: true,
    Source: true,
    SourceUpdatedAt: true,
    UpdatedAt: true
  };

  const now =
    new Date();

  const rowsToAppend = [];
  const seenIncoming = {};

  let inserted = 0;
  let updated = 0;
  let skippedManualOverrides = 0;
  let skippedBlankName = 0;

  drivers.forEach(function(input) {

    input =
      input || {};

    const league =
      sportsRacingDriverDbString_(
        input.League ||
        sportsRacingLeagueFromSeriesId_(input.SeriesId) ||
        "racing"
      );

    const driverName =
      sportsRacingDriverDbString_(
        input.DriverName ||
        input.DisplayName ||
        [input.FirstName, input.LastName]
          .filter(Boolean)
          .join(" ")
      );

    if (!driverName) {
      skippedBlankName++;
      return;
    }

    const driverKey =
      sportsRacingDriverDbString_(input.DriverKey) ||
      sportsRacingDriverKeyFor_(league, driverName);

    if (seenIncoming[driverKey]) {
      return;
    }

    seenIncoming[driverKey] = true;

    const normalized =
      Object.assign({}, input, {
        DriverKey: driverKey,
        League: league,
        SeriesId:
          sportsRacingDriverDbString_(input.SeriesId) ||
          sportsRacingSeriesIdFromLeague_(league),
        Season:
          sportsRacingDriverDbString_(input.Season) ||
          new Date().getFullYear(),
        DriverName: driverName,
        FirstName:
          sportsRacingDriverDbString_(input.FirstName) ||
          sportsRacingFirstName_(driverName),
        LastName:
          sportsRacingDriverDbString_(input.LastName) ||
          sportsRacingLastName_(driverName),
        DisplayName:
          sportsRacingDriverDbString_(input.DisplayName) ||
          driverName,
        Active:
          input.Active === undefined
            ? true
            : input.Active,
        Source:
          sportsRacingDriverDbString_(input.Source) ||
          "driver_database_sync",
        SourceUpdatedAt:
          input.SourceUpdatedAt || now,
        CreatedAt:
          input.CreatedAt || now,
        UpdatedAt:
          input.UpdatedAt || now
      });

    let existingIndex =
      rowIndexByDriverKey[driverKey];

    if (existingIndex === undefined) {
      existingIndex =
        rowIndexByNameKey[
          sportsRacingDriverKeyFor_(league, driverName)
        ];
    }

    if (existingIndex !== undefined) {

      const manualOverride =
        col.ManualOverride !== undefined &&
        sportsRacingDriverDbBoolean_(
          values[existingIndex][col.ManualOverride],
          false
        ) === true;

      if (manualOverride && respectManualOverride) {
        skippedManualOverrides++;
        return;
      }

      headers.forEach(function(header) {

        if (col[header] === undefined) {
          return;
        }

        if (header === "ManualOverride") {
          return;
        }

        const incoming =
          normalized[header];

        if (
          incoming === "" ||
          incoming === null ||
          incoming === undefined
        ) {
          return;
        }

        const current =
          values[existingIndex][col[header]];

        const isBlank =
          current === "" ||
          current === null ||
          current === undefined;

        if (
          overwriteExisting ||
          isBlank ||
          alwaysUpdate[header]
        ) {
          values[existingIndex][col[header]] = incoming;
        }

      });

      updated++;
      return;
    }

    const newRow =
      headers.map(function(header) {

        if (normalized[header] !== undefined) {
          return normalized[header];
        }

        if (header === "ManualOverride") {
          return false;
        }

        if (header === "Active") {
          return true;
        }

        if (
          header === "CreatedAt" ||
          header === "UpdatedAt" ||
          header === "SourceUpdatedAt"
        ) {
          return now;
        }

        return "";

      });

    rowsToAppend.push(newRow);
    inserted++;

  });

  if (values.length > 1) {
    sh
      .getRange(2, 1, values.length - 1, headers.length)
      .setValues(values.slice(1));
  }

  if (rowsToAppend.length) {
    sh
      .getRange(
        sh.getLastRow() + 1,
        1,
        rowsToAppend.length,
        headers.length
      )
      .setValues(rowsToAppend);
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    sourceDrivers: drivers.length,
    inserted: inserted,
    updated: updated,
    skippedManualOverrides: skippedManualOverrides,
    skippedBlankName: skippedBlankName,
    sheet: SPORTS_RACING_DRIVERS_SHEET
  };

}

/************************************************************
 SYNC ALL SOURCES
************************************************************/

function syncSportsRacingDriverDatabaseAllSources(season) {

  setupSportsRacingDriverDatabaseSystem();

  season =
    season ||
    new Date().getFullYear();

  const summary = {
    success: true,
    version: "v14",
    season: season,
    nascarFeed: null,
    sportsRacingResults: null,
    message:
      "Driver sync complete. NASCAR feed is attempted first, then SportsRacingResults fills any remaining blanks."
  };

  try {
    summary.nascarFeed =
      syncSportsRacingDriverDatabaseFromNascarFeed(season);
  } catch (err) {
    summary.success = false;
    summary.nascarFeed = {
      success: false,
      message: err.message
    };
  }

  try {
    summary.sportsRacingResults =
      updateSportsRacingDriverDatabaseFromResults();
  } catch (err2) {
    summary.success = false;
    summary.sportsRacingResults = {
      success: false,
      message: err2.message
    };
  }

  return summary;

}

/************************************************************
 NASCAR FEED SYNC
************************************************************/

function syncSportsRacingDriverDatabaseFromNascarFeed(season) {

  setupSportsRacingDriverDatabaseSystem();

  season =
    season ||
    new Date().getFullYear();

  const summary = {
    success: true,
    season: season,
    seriesChecked: 0,
    driversFetched: 0,
    inserted: 0,
    updated: 0,
    skippedManualOverrides: 0,
    errors: []
  };

  SPORTS_RACING_SERIES.forEach(function(series) {

    try {

      const drivers =
        fetchSportsRacingDriversForSeries_(
          series,
          season
        );

      summary.seriesChecked++;
      summary.driversFetched += drivers.length;

      const result =
        sportsRacingDriverDbUpsertDrivers_(
          drivers,
          {
            respectManualOverride: true,
            overwriteExisting: false
          }
        );

      summary.inserted += result.inserted;
      summary.updated += result.updated;
      summary.skippedManualOverrides += result.skippedManualOverrides;

    } catch (err) {

      summary.success = false;

      summary.errors.push({
        seriesId: series.seriesId,
        league: series.league,
        message: err.message
      });

    }

  });

  return summary;

}

function fetchSportsRacingDriversForSeries_(series, season) {

  const urls = [
    "https://feed.nascar.com/api/Driver?series_id=" +
      encodeURIComponent(series.seriesId) +
      "&season=" +
      encodeURIComponent(season),

    "https://feed.nascar.com/api/Driver?seriesId=" +
      encodeURIComponent(series.seriesId) +
      "&season=" +
      encodeURIComponent(season),

    "https://feed.nascar.com/api/Driver?series=" +
      encodeURIComponent(series.seriesId) +
      "&season=" +
      encodeURIComponent(season)
  ];

  const errors = [];

  for (let i = 0; i < urls.length; i++) {

    const url =
      urls[i];

    try {

      const response =
        UrlFetchApp.fetch(url, {
          method: "get",
          muteHttpExceptions: true,
          followRedirects: true,
          headers: {
            Accept: "application/json"
          }
        });

      const code =
        response.getResponseCode();

      const text =
        response.getContentText();

      if (code < 200 || code >= 300) {
        errors.push(
          "HTTP " + code + " for " + url + ": " + text.slice(0, 120)
        );
        continue;
      }

      const json =
        JSON.parse(text);

      const drivers =
        normalizeSportsRacingNascarDriverFeed_(
          json,
          series,
          season
        );

      if (drivers.length) {
        return drivers;
      }

      errors.push(
        "No drivers found in response for " + url
      );

    } catch (err) {
      errors.push(
        err.message + " for " + url
      );
    }

  }

  throw new Error(
    "NASCAR driver fetch failed for " +
    series.league +
    ". Tried " +
    urls.length +
    " URL shapes. " +
    errors.join(" | ")
  );

}

function normalizeSportsRacingNascarDriverFeed_(json, series, season) {

  const list =
    sportsRacingDriverDbFindLikelyArray_(json);

  return list
    .map(function(item) {
      return normalizeSportsRacingNascarDriverItem_(
        item,
        series,
        season
      );
    })
    .filter(function(driver) {
      return !!sportsRacingDriverDbString_(driver.DriverName);
    });

}

function sportsRacingDriverDbFindLikelyArray_(json) {

  if (Array.isArray(json)) {
    return json;
  }

  if (!json || typeof json !== "object") {
    return [];
  }

  const directKeys = [
    "drivers",
    "Drivers",
    "data",
    "Data",
    "items",
    "Items",
    "response",
    "Response",
    "results",
    "Results"
  ];

  for (let i = 0; i < directKeys.length; i++) {
    const value =
      json[directKeys[i]];

    if (Array.isArray(value)) {
      return value;
    }
  }

  const objectKeys =
    Object.keys(json);

  for (let j = 0; j < objectKeys.length; j++) {
    const child =
      json[objectKeys[j]];

    if (Array.isArray(child)) {
      return child;
    }
  }

  return [];

}

function normalizeSportsRacingNascarDriverItem_(item, series, season) {

  item =
    item || {};

  const nascarDriverId =
    sportsRacingDriverDbGetValue_(item, [
      "driver_id",
      "driverId",
      "DriverId",
      "DriverID",
      "id",
      "ID"
    ]);

  const firstName =
    sportsRacingDriverDbGetValue_(item, [
      "first_name",
      "firstName",
      "FirstName",
      "first",
      "First"
    ]);

  const lastName =
    sportsRacingDriverDbGetValue_(item, [
      "last_name",
      "lastName",
      "LastName",
      "last",
      "Last"
    ]);

  const driverName =
    sportsRacingDriverDbFirstNonEmpty_([
      sportsRacingDriverDbGetValue_(item, [
        "driver_name",
        "driverName",
        "DriverName",
        "full_name",
        "fullName",
        "FullName",
        "display_name",
        "displayName",
        "DisplayName",
        "name",
        "Name",
        "driver",
        "Driver"
      ]),
      [firstName, lastName].filter(Boolean).join(" ")
    ]);

  const carNumber =
    sportsRacingDriverDbGetValue_(item, [
      "car_number",
      "carNumber",
      "CarNumber",
      "number",
      "Number",
      "vehicle_number",
      "VehicleNumber"
    ]);

  const manufacturer =
    sportsRacingDriverDbGetValue_(item, [
      "manufacturer",
      "Manufacturer",
      "manufacturer_name",
      "manufacturerName",
      "make",
      "Make"
    ]);

  const team =
    sportsRacingDriverDbGetValue_(item, [
      "team",
      "Team",
      "team_name",
      "teamName",
      "TeamName",
      "organization",
      "Organization"
    ]);

  const sponsor =
    sportsRacingDriverDbGetValue_(item, [
      "sponsor",
      "Sponsor",
      "sponsor_name",
      "sponsorName",
      "primary_sponsor",
      "primarySponsor"
    ]);

  const imageUrl =
    sportsRacingDriverDbGetValue_(item, [
      "driver_image",
      "driverImage",
      "DriverImage",
      "headshot",
      "Headshot",
      "headshot_url",
      "headshotUrl",
      "image",
      "Image",
      "image_url",
      "imageUrl",
      "photo",
      "Photo"
    ]);

  const carNumberImageUrl =
    sportsRacingDriverDbGetValue_(item, [
      "car_number_image",
      "carNumberImage",
      "CarNumberImage",
      "car_number_image_url",
      "carNumberImageUrl",
      "CarNumberImageUrl"
    ]);

  const country =
    sportsRacingDriverDbGetValue_(item, [
      "country",
      "Country",
      "birth_country",
      "birthCountry",
      "hometown_country",
      "hometownCountry"
    ]);

  const birthDate =
    sportsRacingDriverDbGetValue_(item, [
      "birth_date",
      "birthDate",
      "BirthDate",
      "dob",
      "DOB"
    ]);

  return {
    DriverKey:
      sportsRacingDriverKeyFor_(series.league, driverName),
    League:
      series.league,
    SeriesId:
      series.seriesId,
    Season:
      season,
    NascarDriverId:
      nascarDriverId,
    EspnAthleteId:
      "",
    DriverName:
      driverName,
    FirstName:
      firstName || sportsRacingFirstName_(driverName),
    LastName:
      lastName || sportsRacingLastName_(driverName),
    DisplayName:
      driverName,
    AliasNames:
      "",
    DefaultCarNumber:
      carNumber,
    DefaultManufacturer:
      manufacturer,
    DefaultTeam:
      team,
    DefaultSponsor:
      sponsor,
    DriverImageUrl:
      imageUrl,
    HeadshotUrl:
      imageUrl,
    CarNumberImageUrl:
      carNumberImageUrl,
    Country:
      country,
    BirthDate:
      birthDate,
    Active:
      true,
    Source:
      "NASCAR_FEED_DRIVER",
    SourceUpdatedAt:
      new Date(),
    ManualOverride:
      false,
    Notes:
      "Created/updated from NASCAR feed.",
    CreatedAt:
      new Date(),
    UpdatedAt:
      new Date()
  };

}

/************************************************************
 RESULT-BASED DRIVER DATABASE SYNC
************************************************************/

function buildSportsRacingDriverDatabaseFromResults() {

  return updateSportsRacingDriverDatabaseFromResults();

}

function updateSportsRacingDriverDatabaseFromResults() {

  setupSportsRacingDriverDatabaseSystem();

  const sourceRows =
    typeof readSportsRacingResultRows_ === "function"
      ? readSportsRacingResultRows_()
      : [];

  const now =
    new Date();

  const drivers =
    sourceRows
      .map(function(row) {

        const league =
          sportsRacingDriverDbString_(row.League);

        const driverName =
          sportsRacingDriverDbString_(row.DriverName);

        if (!driverName) {
          return null;
        }

        return {
          DriverKey:
            sportsRacingDriverKeyFor_(league, driverName),
          League:
            league,
          SeriesId:
            sportsRacingSeriesIdFromLeague_(league),
          Season:
            new Date().getFullYear(),
          NascarDriverId:
            sportsRacingDriverDbString_(row.NascarDriverId),
          EspnAthleteId:
            sportsRacingDriverDbString_(
             row.EspnAthleteId ||
             row.AthleteId ||
             row.DriverId
            ),
          DriverName:
            driverName,
          FirstName:
            sportsRacingFirstName_(driverName),
          LastName:
            sportsRacingLastName_(driverName),
          DisplayName:
            driverName,
          AliasNames:
            "",
          DefaultCarNumber:
            sportsRacingDriverDbString_(row.CarNumber),
          DefaultManufacturer:
            sportsRacingDriverDbString_(row.Manufacturer),
          DefaultTeam:
            sportsRacingDriverDbString_(row.Team),
          DefaultSponsor:
            sportsRacingDriverDbString_(row.Sponsor),
          DriverImageUrl:
            sportsRacingDriverDbString_(row.DriverImageUrl),
          HeadshotUrl:
            sportsRacingDriverDbString_(row.HeadshotUrl || row.DriverImageUrl),
          CarNumberImageUrl:
            sportsRacingDriverDbString_(row.CarNumberImageUrl),
          Active:
            true,
          LastSeenRaceId:
            sportsRacingDriverDbString_(row.ESPNEventId || row.NascarRaceId),
          LastSeenAt:
            now,
          Source:
            "SportsRacingResults",
          SourceUpdatedAt:
            now,
          ManualOverride:
            false,
          Notes:
            "Created/updated from SportsRacingResults.",
          CreatedAt:
            now,
          UpdatedAt:
            now
        };

      })
      .filter(Boolean);

  const result =
    sportsRacingDriverDbUpsertDrivers_(
      drivers,
      {
        respectManualOverride: true,
        overwriteExisting: false
      }
    );

  result.sourceResultRows =
    sourceRows.length;

  result.message =
    "Driver database updated from SportsRacingResults. This fills blanks and preserves ManualOverride rows.";

  return result;

}

/************************************************************
 LOOKUPS
************************************************************/

function sportsRacingDriverDbBuildLookup_() {

  setupSportsRacingDriverDatabaseSystem();

  const lookup = {};

  readSportsRacingDriverRows_()
    .forEach(function(row) {

      if (
        sportsRacingDriverDbBoolean_(row.Active, true) === false
      ) {
        return;
      }

      const league =
        sportsRacingDriverDbString_(row.League);

      const driverName =
        sportsRacingDriverDbString_(row.DriverName);

      const key =
        sportsRacingDriverDbString_(row.DriverKey) ||
        sportsRacingDriverKeyFor_(league, driverName);

      if (driverName) {
        lookup[key] = row;
        lookup[
          sportsRacingDriverKeyFor_(league, driverName)
        ] = row;
      }

      const aliases =
        sportsRacingDriverDbString_(row.AliasNames)
          .split(/[|,;]/)
          .map(function(alias) {
            return sportsRacingDriverDbString_(alias);
          })
          .filter(Boolean);

      aliases.forEach(function(alias) {
        lookup[
          sportsRacingDriverKeyFor_(league, alias)
        ] = row;
      });

    });

  return lookup;

}

function sportsRacingRaceEntryDbBuildLookup_() {

  setupSportsRacingDriverDatabaseSystem();

  const lookup = {};

  readSportsRacingRaceEntryRows_()
    .forEach(function(row) {

      const league =
        sportsRacingDriverDbString_(row.League);

      const gameId =
        sportsRacingDriverDbString_(row.GameId);

      const espnEventId =
        sportsRacingDriverDbString_(row.ESPNEventId);

      const nascarRaceId =
        sportsRacingDriverDbString_(row.NascarRaceId);

      const raceName =
        sportsRacingDriverDbString_(row.RaceName);

      const driverName =
        sportsRacingDriverDbString_(row.DriverName);

      if (!driverName) {
        return;
      }

      const keys = [];

      if (gameId) {
        keys.push(
          sportsRacingDriverDbSlug_(league) +
          "|" +
          sportsRacingDriverDbSlug_(gameId) +
          "|" +
          sportsRacingDriverDbSlug_(driverName)
        );
      }

      if (espnEventId) {
        keys.push(
          sportsRacingDriverDbSlug_(league) +
          "|" +
          sportsRacingDriverDbSlug_(espnEventId) +
          "|" +
          sportsRacingDriverDbSlug_(driverName)
        );
      }

      if (nascarRaceId) {
        keys.push(
          sportsRacingDriverDbSlug_(league) +
          "|" +
          sportsRacingDriverDbSlug_(nascarRaceId) +
          "|" +
          sportsRacingDriverDbSlug_(driverName)
        );
      }

      if (raceName) {
        keys.push(
          sportsRacingDriverDbSlug_(league) +
          "|" +
          sportsRacingDriverDbSlug_(raceName) +
          "|" +
          sportsRacingDriverDbSlug_(driverName)
        );
      }

      keys.forEach(function(key) {
        lookup[key] = row;
      });

    });

  return lookup;

}

function sportsRacingRaceEntryDbFind_(lookup, base) {

  base =
    base || {};

  const league =
    sportsRacingDriverDbString_(base.League);

  const driverName =
    sportsRacingDriverDbString_(base.DriverName);

  const driverSlug =
    sportsRacingDriverDbSlug_(driverName);

  const leagueSlug =
    sportsRacingDriverDbSlug_(league);

  const raceKeys = [
    base.GameId,
    base.ESPNEventId,
    base.NascarRaceId,
    base.RaceName
  ].map(function(value) {
    return sportsRacingDriverDbSlug_(value);
  }).filter(Boolean);

  for (let i = 0; i < raceKeys.length; i++) {
    const key =
      leagueSlug + "|" + raceKeys[i] + "|" + driverSlug;

    if (lookup[key]) {
      return lookup[key];
    }
  }

  return null;

}

/************************************************************
 MERGE HELPERS
************************************************************/

function sportsRacingDriverDbFillIfBlank_(target, field, value, sourceField, sourceName) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return;
  }

  if (
    target[field] === "" ||
    target[field] === null ||
    target[field] === undefined
  ) {
    target[field] = value;

    if (sourceField) {
      target[sourceField] = sourceName;
    }
  }

}

function sportsRacingDriverDbOverrideIfPresent_(target, field, value, sourceField, sourceName) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return;
  }

  target[field] = value;

  if (sourceField) {
    target[sourceField] = sourceName;
  }

}

function sportsRacingMergeDriverDatabaseRows_(rows) {

  rows =
    Array.isArray(rows)
      ? rows
      : [];

  const driverLookup =
    sportsRacingDriverDbBuildLookup_();

  const raceEntryLookup =
    sportsRacingRaceEntryDbBuildLookup_();

  return rows.map(function(row) {

    const merged =
      Object.assign({}, row);

    const league =
      sportsRacingDriverDbString_(merged.League);

    const driverName =
      sportsRacingDriverDbString_(merged.DriverName);

    if (!driverName) {
      merged.DriverDatabaseMatched = false;
      return merged;
    }

    const driver =
      driverLookup[
        sportsRacingDriverKeyFor_(league, driverName)
      ];

    const entry =
      sportsRacingRaceEntryDbFind_(
        raceEntryLookup,
        merged
      );

    let matched = false;
    const sources = [];

    if (driver) {
      matched = true;
      sources.push("SportsRacingDrivers");

      sportsRacingDriverDbFillIfBlank_(
        merged,
        "CarNumber",
        driver.DefaultCarNumber,
        "CarNumberSource",
        "driver_database"
      );

      sportsRacingDriverDbFillIfBlank_(
        merged,
        "Manufacturer",
        driver.DefaultManufacturer,
        "ManufacturerSource",
        "driver_database"
      );

      sportsRacingDriverDbFillIfBlank_(
        merged,
        "Team",
        driver.DefaultTeam,
        "TeamSource",
        "driver_database"
      );

      sportsRacingDriverDbFillIfBlank_(
        merged,
        "Sponsor",
        driver.DefaultSponsor,
        "SponsorSource",
        "driver_database"
      );

      sportsRacingDriverDbFillIfBlank_(
        merged,
        "DriverImageUrl",
        driver.DriverImageUrl || driver.HeadshotUrl,
        "DriverImageSource",
        "driver_database"
      );

      sportsRacingDriverDbFillIfBlank_(
        merged,
        "HeadshotUrl",
        driver.HeadshotUrl || driver.DriverImageUrl,
        "DriverImageSource",
        "driver_database"
      );

      sportsRacingDriverDbFillIfBlank_(
        merged,
        "CarNumberImageUrl",
        driver.CarNumberImageUrl,
        "CarNumberImageSource",
        "driver_database"
      );

      sportsRacingDriverDbFillIfBlank_(
        merged,
        "NascarDriverId",
        driver.NascarDriverId,
        "DriverIdSource",
        "driver_database"
      );

      sportsRacingDriverDbFillIfBlank_(
        merged,
        "EspnAthleteId",
        driver.EspnAthleteId,
        "DriverIdSource",
        "driver_database"
      );
    }

    if (entry) {
      matched = true;
      sources.push("SportsRacingRaceEntries");

      sportsRacingDriverDbOverrideIfPresent_(
        merged,
        "CarNumber",
        entry.CarNumber,
        "CarNumberSource",
        "race_entry_database"
      );

      sportsRacingDriverDbOverrideIfPresent_(
        merged,
        "Manufacturer",
        entry.Manufacturer,
        "ManufacturerSource",
        "race_entry_database"
      );

      sportsRacingDriverDbOverrideIfPresent_(
        merged,
        "Team",
        entry.Team,
        "TeamSource",
        "race_entry_database"
      );

      sportsRacingDriverDbOverrideIfPresent_(
        merged,
        "Sponsor",
        entry.Sponsor,
        "SponsorSource",
        "race_entry_database"
      );

      sportsRacingDriverDbOverrideIfPresent_(
        merged,
        "DriverImageUrl",
        entry.DriverImageUrl || entry.HeadshotUrl,
        "DriverImageSource",
        "race_entry_database"
      );

      sportsRacingDriverDbOverrideIfPresent_(
        merged,
        "HeadshotUrl",
        entry.HeadshotUrl || entry.DriverImageUrl,
        "DriverImageSource",
        "race_entry_database"
      );

      sportsRacingDriverDbOverrideIfPresent_(
        merged,
        "CarNumberImageUrl",
        entry.CarNumberImageUrl,
        "CarNumberImageSource",
        "race_entry_database"
      );

      sportsRacingDriverDbOverrideIfPresent_(
        merged,
        "StartingPosition",
        entry.StartingPosition,
        "StartingPositionSource",
        "race_entry_database"
      );

      sportsRacingDriverDbOverrideIfPresent_(
        merged,
        "QualifyingSpeed",
        entry.QualifyingSpeed,
        "QualifyingSpeedSource",
        "race_entry_database"
      );
    }

    merged.DriverDatabaseMatched = matched;
    merged.DriverDatabaseSource =
      sources.join(",");

    return merged;

  });

}

/************************************************************
 API MERGE FUNCTION
************************************************************/

function apiGetSportsRacingResultsWithDriverDatabaseV12_(params) {

  params =
    params || {};

  const league =
    String(params.league || "")
      .trim()
      .toLowerCase();

  const espnEventId =
    String(
      params.espnEventId ||
      params.ESPNEventId ||
      ""
    ).trim();

  const gameId =
    String(params.gameId || "")
      .trim();

  const includeSupplemental =
    String(params.includeSupplemental || "true")
      .trim()
      .toLowerCase() !== "false";

  const includeDriverDatabase =
    String(params.includeDriverDatabase || "true")
      .trim()
      .toLowerCase() !== "false";

  let rows =
    typeof readSportsRacingResultRows_ === "function"
      ? readSportsRacingResultRows_()
      : [];

  rows =
    rows.filter(function(row) {

      if (
        league &&
        String(row.League || "")
          .trim()
          .toLowerCase() !== league
      ) {
        return false;
      }

      if (
        espnEventId &&
        String(row.ESPNEventId || "")
          .trim() !== espnEventId
      ) {
        return false;
      }

      if (
        gameId &&
        String(row.GameId || "")
          .trim() !== gameId
      ) {
        return false;
      }

      return true;

    });

  if (
    includeSupplemental &&
    typeof mergeSportsRacingSupplementalRows_ === "function"
  ) {
    rows =
      mergeSportsRacingSupplementalRows_(
        rows
      );
  }

  if (includeDriverDatabase) {
    rows =
      sportsRacingMergeDriverDatabaseRows_(
        rows
      );
  }

  rows =
    rows.sort(function(a, b) {
      const ap =
        Number(
          a.CurrentPosition ||
          a.FinalPosition ||
          9999
        );

      const bp =
        Number(
          b.CurrentPosition ||
          b.FinalPosition ||
          9999
        );

      return ap - bp;
    });

  return {
    success: true,
    count: rows.length,
    supplementalMerged: includeSupplemental,
    driverDatabaseMerged: includeDriverDatabase,
    results: rows,
    timestamp: new Date()
  };

}

/************************************************************
 DEBUG / TEST
************************************************************/

function debugSportsRacingDriverDatabaseStatusV14() {

  setupSportsRacingDriverDatabaseSystem();

  const drivers =
    readSportsRacingDriverRows_();

  const entries =
    readSportsRacingRaceEntryRows_();

  const resultRows =
    typeof readSportsRacingResultRows_ === "function"
      ? readSportsRacingResultRows_()
      : [];

  return {
    success: true,
    version: "v14",
    sheets: {
      drivers: drivers.length,
      raceEntries: entries.length,
      racingResults: resultRows.length
    },
    headers: {
      drivers: SPORTS_RACING_DRIVER_HEADERS,
      raceEntries: SPORTS_RACING_RACE_ENTRY_HEADERS
    },
    firstDrivers: drivers.slice(0, 5),
    firstRaceEntries: entries.slice(0, 5),
    message:
      "Use syncSportsRacingDriverDatabaseAllSources to populate from NASCAR feed and SportsRacingResults."
  };

}

function debugSportsRacingDriverDatabaseStatusV12() {

  return debugSportsRacingDriverDatabaseStatusV14();

}

function testSportsRacingDriverDatabaseMergeV14() {

  setupSportsRacingDriverDatabaseSystem();

  const ss =
    SpreadsheetApp.getActive();

  const sh =
    ss.getSheetByName(SPORTS_RACING_DRIVERS_SHEET);

  const headers =
    sh.getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0]
      .map(function(header) {
        return sportsRacingDriverDbString_(header);
      });

  const existing =
    readSportsRacingDriverRows_();

  const key =
    sportsRacingDriverKeyFor_(
      "nascar-premier",
      "Corey Heim"
    );

  const exists =
    existing.some(function(row) {
      return (
        sportsRacingDriverDbString_(row.DriverKey) === key ||
        sportsRacingDriverDbString_(row.DriverName).toLowerCase() === "corey heim"
      );
    });

  if (!exists) {
    const obj = {
      DriverKey: key,
      League: "nascar-premier",
      SeriesId: "1",
      Season: new Date().getFullYear(),
      NascarDriverId: "",
      EspnAthleteId: "",
      DriverName: "Corey Heim",
      FirstName: "Corey",
      LastName: "Heim",
      DisplayName: "Corey Heim",
      AliasNames: "",
      DefaultCarNumber: "67",
      DefaultManufacturer: "Toyota",
      DefaultTeam: "",
      DefaultSponsor: "",
      DriverImageUrl: "",
      HeadshotUrl: "",
      CarNumberImageUrl: "",
      Country: "",
      BirthDate: "",
      Active: true,
      LastSeenRaceId: "",
      LastSeenAt: new Date(),
      Source: "test_row",
      SourceUpdatedAt: new Date(),
      ManualOverride: false,
      Notes: "Test row created by v14",
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    };

    sh
      .getRange(
        sh.getLastRow() + 1,
        1,
        1,
        headers.length
      )
      .setValues([
        headers.map(function(header) {
          return obj[header] !== undefined
            ? obj[header]
            : "";
        })
      ]);
  }

  return apiGetSportsRacingResultsWithDriverDatabaseV12_({
    league: "nascar-premier",
    espnEventId: "202606214266"
  });

}

function testSportsRacingDriverDatabaseMergeV12() {

  return testSportsRacingDriverDatabaseMergeV14();

}

/* v14 keeps v13 behavior: race-entry overrides driver defaults when a race-specific value exists. */


/************************************************************
 NASCAR DRIVER FEED DEBUG
 Use this to see if NASCAR feed is returning usable driver data.
************************************************************/

const SPORTS_RACING_NASCAR_FEED_DEBUG_SHEET =
  "SportsRacingNascarFeedDebug";

function debugSportsRacingNascarDriverFeed2026() {

  return debugSportsRacingNascarDriverFeeds_(
    2026
  );

}

function debugSportsRacingNascarDriverFeedCurrentYear() {

  return debugSportsRacingNascarDriverFeeds_(
    new Date().getFullYear()
  );

}

function debugSportsRacingNascarDriverFeeds_(season) {

  season =
    Number(season || new Date().getFullYear());

  const seriesList = [
    {
      label: "Cup",
      league: "nascar-premier",
      seriesId: 1
    },
    {
      label: "Xfinity",
      league: "nascar-secondary",
      seriesId: 2
    },
    {
      label: "Truck",
      league: "nascar-truck",
      seriesId: 3
    }
  ];

  const debugRows = [];
  const summary = [];

  seriesList.forEach(function(series) {

    const result =
      debugSportsRacingNascarDriverFeedForSeries_(
        series,
        season
      );

    summary.push(result);

    result.urlResults.forEach(function(urlResult) {

      debugRows.push([
        new Date(),
        season,
        series.label,
        series.league,
        series.seriesId,
        urlResult.url,
        urlResult.statusCode,
        urlResult.contentType,
        urlResult.parseOk,
        urlResult.bestArrayPath,
        urlResult.bestArrayCount,
        urlResult.sampleKeys,
        urlResult.sampleDriverId,
        urlResult.sampleName,
        urlResult.sampleCarNumber,
        urlResult.sampleTeam,
        urlResult.sampleManufacturer,
        urlResult.textPreview,
        urlResult.error
      ]);

    });

  });

  debugSportsRacingNascarFeedWriteDebugSheet_(
    debugRows
  );

  Logger.log(
    JSON.stringify(
      summary,
      null,
      2
    )
  );

  SpreadsheetApp
    .getActive()
    .toast(
      "NASCAR feed debug complete. Check SportsRacingNascarFeedDebug.",
      "Racing",
      10
    );

  return {
    success: true,
    season: season,
    message:
      "Check SportsRacingNascarFeedDebug for status, sample fields, and feed data.",
    summary: summary
  };

}

function debugSportsRacingNascarDriverFeedForSeries_(
  series,
  season
) {

  const urls = [
    "https://feed.nascar.com/api/Driver?series_id=" +
      encodeURIComponent(series.seriesId) +
      "&season=" +
      encodeURIComponent(season),

    "https://feed.nascar.com/api/Driver?seriesId=" +
      encodeURIComponent(series.seriesId) +
      "&season=" +
      encodeURIComponent(season),

    "https://feed.nascar.com/api/Driver?series=" +
      encodeURIComponent(series.seriesId) +
      "&season=" +
      encodeURIComponent(season)
  ];

  const urlResults =
    urls.map(function(url) {
      return debugSportsRacingNascarDriverFeedUrl_(
        url
      );
    });

  const best =
    urlResults
      .slice()
      .sort(function(a, b) {
        return (
          Number(b.bestArrayCount || 0) -
          Number(a.bestArrayCount || 0)
        );
      })[0];

  return {
    label: series.label,
    league: series.league,
    seriesId: series.seriesId,
    season: season,
    bestStatusCode: best ? best.statusCode : "",
    bestArrayPath: best ? best.bestArrayPath : "",
    bestArrayCount: best ? best.bestArrayCount : 0,
    bestSampleKeys: best ? best.sampleKeys : "",
    bestSampleName: best ? best.sampleName : "",
    bestSampleCarNumber: best ? best.sampleCarNumber : "",
    bestSampleTeam: best ? best.sampleTeam : "",
    bestSampleManufacturer: best ? best.sampleManufacturer : "",
    urlResults: urlResults
  };

}

function debugSportsRacingNascarDriverFeedUrl_(url) {

  let statusCode = "";
  let contentType = "";
  let text = "";
  let parsed = null;
  let parseOk = false;
  let error = "";

  try {

    const response =
      UrlFetchApp.fetch(
        url,
        {
          muteHttpExceptions: true,
          followRedirects: true,
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 GoogleAppsScript RacingScoreEngine"
          }
        }
      );

    statusCode =
      response.getResponseCode();

    const headers =
      response.getHeaders();

    contentType =
      headers["Content-Type"] ||
      headers["content-type"] ||
      "";

    text =
      response.getContentText() || "";

    try {
      parsed =
        JSON.parse(text);

      parseOk = true;
    } catch (jsonErr) {
      parseOk = false;
      error =
        "JSON parse failed: " +
        jsonErr.message;
    }

  } catch (err) {

    error =
      err && err.message
        ? err.message
        : String(err);

  }

  const arrays = [];

  if (parseOk) {
    debugSportsRacingNascarCollectObjectArrays_(
      parsed,
      "root",
      arrays,
      0
    );
  }

  arrays.sort(function(a, b) {
    return b.count - a.count;
  });

  const bestArray =
    arrays.length
      ? arrays[0]
      : null;

  const sample =
    bestArray &&
    bestArray.samples &&
    bestArray.samples.length
      ? bestArray.samples[0]
      : {};

  return {
    url: url,
    statusCode: statusCode,
    contentType: contentType,
    parseOk: parseOk,
    bestArrayPath:
      bestArray ? bestArray.path : "",
    bestArrayCount:
      bestArray ? bestArray.count : 0,
    sampleKeys:
      sample
        ? Object.keys(sample).join(", ")
        : "",
    sampleDriverId:
      debugSportsRacingNascarPickField_(
        sample,
        [
          "driver_id",
          "driverId",
          "Driver_ID",
          "nascar_driver_id",
          "nascarDriverId",
          "id",
          "Id"
        ]
      ),
    sampleName:
      debugSportsRacingNascarPickField_(
        sample,
        [
          "full_name",
          "fullName",
          "driver_name",
          "driverName",
          "display_name",
          "displayName",
          "Name",
          "name",
          "Driver",
          "driver"
        ]
      ),
    sampleCarNumber:
      debugSportsRacingNascarPickField_(
        sample,
        [
          "car_number",
          "carNumber",
          "car_no",
          "carNo",
          "number",
          "Number",
          "vehicle_number",
          "vehicleNumber"
        ]
      ),
    sampleTeam:
      debugSportsRacingNascarPickField_(
        sample,
        [
          "team",
          "Team",
          "team_name",
          "teamName",
          "owner",
          "Owner",
          "organization",
          "organization_name"
        ]
      ),
    sampleManufacturer:
      debugSportsRacingNascarPickField_(
        sample,
        [
          "manufacturer",
          "Manufacturer",
          "manufacturer_name",
          "manufacturerName",
          "make",
          "Make"
        ]
      ),
    textPreview:
      String(text || "")
        .slice(0, 300),
    error: error
  };

}

function debugSportsRacingNascarCollectObjectArrays_(
  value,
  path,
  arrays,
  depth
) {

  if (depth > 6) {
    return;
  }

  if (Array.isArray(value)) {

    const objectSamples =
      value.filter(function(item) {
        return (
          item &&
          typeof item === "object" &&
          !Array.isArray(item)
        );
      });

    if (objectSamples.length) {
      arrays.push({
        path: path,
        count: value.length,
        samples:
          objectSamples.slice(0, 3)
      });
    }

    value
      .slice(0, 5)
      .forEach(function(item, index) {
        debugSportsRacingNascarCollectObjectArrays_(
          item,
          path + "[" + index + "]",
          arrays,
          depth + 1
        );
      });

    return;

  }

  if (
    value &&
    typeof value === "object"
  ) {

    Object.keys(value)
      .forEach(function(key) {
        debugSportsRacingNascarCollectObjectArrays_(
          value[key],
          path + "." + key,
          arrays,
          depth + 1
        );
      });

  }

}

function debugSportsRacingNascarPickField_(
  obj,
  fieldNames
) {

  if (
    !obj ||
    typeof obj !== "object"
  ) {
    return "";
  }

  for (let i = 0; i < fieldNames.length; i++) {

    const field =
      fieldNames[i];

    if (
      obj[field] !== undefined &&
      obj[field] !== null &&
      obj[field] !== ""
    ) {
      return obj[field];
    }

  }

  const normalizedMap = {};

  Object.keys(obj)
    .forEach(function(key) {
      normalizedMap[
        String(key)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
      ] = key;
    });

  for (let j = 0; j < fieldNames.length; j++) {

    const normalized =
      String(fieldNames[j])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const realKey =
      normalizedMap[normalized];

    if (
      realKey &&
      obj[realKey] !== undefined &&
      obj[realKey] !== null &&
      obj[realKey] !== ""
    ) {
      return obj[realKey];
    }

  }

  return "";

}

function debugSportsRacingNascarFeedWriteDebugSheet_(
  rows
) {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      SPORTS_RACING_NASCAR_FEED_DEBUG_SHEET
    );

  if (!sh) {
    sh =
      ss.insertSheet(
        SPORTS_RACING_NASCAR_FEED_DEBUG_SHEET
      );
  }

  sh.clearContents();

  const headers = [
    "Timestamp",
    "Season",
    "Series",
    "League",
    "SeriesId",
    "Url",
    "StatusCode",
    "ContentType",
    "ParseOk",
    "BestArrayPath",
    "BestArrayCount",
    "SampleKeys",
    "SampleDriverId",
    "SampleName",
    "SampleCarNumber",
    "SampleTeam",
    "SampleManufacturer",
    "TextPreview",
    "Error"
  ];

  sh
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([headers]);

  if (rows.length) {
    sh
      .getRange(
        2,
        1,
        rows.length,
        headers.length
      )
      .setValues(rows);
  }

  sh.autoResizeColumns(
    1,
    headers.length
  );

}

/************************************************************
 NASCAR OFFICIAL DRIVER PAGE SYNC - KISS VERSION
 Fills blank DefaultCarNumber from NASCAR.com driver page.
************************************************************/

function syncCupDriverNumbersFromNascarDriverPage() {

  return syncDriverNumbersFromNascarDriverPage_({
    league: "nascar-premier",
    url: "https://www.nascar.com/drivers/nascar-cup-series/"
  });

}

function syncDriverNumbersFromNascarDriverPage_(config) {

  const league =
    String(config.league || "")
      .trim()
      .toLowerCase();

  const url =
    String(config.url || "")
      .trim();

  if (!league || !url) {
    throw new Error(
      "Missing league or NASCAR driver page URL."
    );
  }

  setupSportsRacingDriverDatabaseSystem();

  const response =
    UrlFetchApp.fetch(
      url,
      {
        muteHttpExceptions: true,
        followRedirects: true,
        headers: {
          "User-Agent":
            "Mozilla/5.0 GoogleAppsScript RacingScoreEngine"
        }
      }
    );

  const status =
    response.getResponseCode();

  const html =
    response.getContentText() || "";

  if (status < 200 || status >= 300) {
    throw new Error(
      "NASCAR driver page fetch failed. Status: " +
      status
    );
  }

  const numberMap =
    parseNascarDriverNumbersFromDriverPageHtml_(
      html
    );

  const ss =
    SpreadsheetApp.getActive();

  const sh =
    ss.getSheetByName(
      "SportsRacingDrivers"
    );

  if (!sh) {
    throw new Error(
      "SportsRacingDrivers sheet not found."
    );
  }

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return {
      success: true,
      updated: 0,
      matched: 0,
      parsedDrivers: Object.keys(numberMap).length,
      message:
        "No SportsRacingDrivers rows to update."
    };
  }

  const headers =
    data[0].map(function(header) {
      return String(header || "").trim();
    });

  const col = {};

  headers.forEach(function(header, index) {
    col[header] = index;
  });

  const required = [
    "League",
    "DriverName",
    "DefaultCarNumber",
    "ManualOverride",
    "Source",
    "SourceUpdatedAt",
    "UpdatedAt"
  ];

  required.forEach(function(header) {
    if (col[header] === undefined) {
      throw new Error(
        "SportsRacingDrivers missing required column: " +
        header
      );
    }
  });

  let matched = 0;
  let updated = 0;

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowLeague =
      String(row[col.League] || "")
        .trim()
        .toLowerCase();

    if (rowLeague !== league) {
      continue;
    }

    const driverName =
      String(row[col.DriverName] || "")
        .trim();

    const key =
      normalizeNascarDriverPageNameKey_(
        driverName
      );

    const carNumber =
      numberMap[key];

    if (!carNumber) {
      continue;
    }

    matched++;

    const manualOverride =
      String(row[col.ManualOverride] || "")
        .trim()
        .toUpperCase() === "TRUE";

    if (manualOverride) {
      continue;
    }

    const existingCarNumber =
      String(row[col.DefaultCarNumber] || "")
        .trim();

    if (existingCarNumber) {
      continue;
    }

    sh
      .getRange(
        i + 1,
        col.DefaultCarNumber + 1
      )
      .setValue(carNumber);

    sh
      .getRange(
        i + 1,
        col.Source + 1
      )
      .setValue("nascar_driver_page");

    sh
      .getRange(
        i + 1,
        col.SourceUpdatedAt + 1
      )
      .setValue(new Date());

    sh
      .getRange(
        i + 1,
        col.UpdatedAt + 1
      )
      .setValue(new Date());

    updated++;

  }

  SpreadsheetApp.flush();

  return {
    success: true,
    league: league,
    url: url,
    parsedDrivers: Object.keys(numberMap).length,
    matched: matched,
    updated: updated,
    message:
      "Filled blank DefaultCarNumber values from NASCAR driver page."
  };

}

function parseNascarDriverNumbersFromDriverPageHtml_(html) {

  html =
    String(html || "");

  const map = {};

  const patterns = [
    /alt=["']([^"']+?)\s+Badge\s+Number\s+([^"']+?)["']/gi,
    /Image:\s*([^<\n\r]+?)\s+Badge\s+Number\s+([0-9A-Za-z]+)\s*/gi
  ];

  patterns.forEach(function(regex) {

    let match;

    while ((match = regex.exec(html)) !== null) {

      const driverName =
        cleanNascarDriverPageText_(
          match[1]
        );

      const carNumber =
        cleanNascarDriverPageText_(
          match[2]
        );

      const key =
        normalizeNascarDriverPageNameKey_(
          driverName
        );

      if (
        key &&
        carNumber &&
        !map[key]
      ) {
        map[key] = carNumber;
      }

    }

  });

  return map;

}

function cleanNascarDriverPageText_(value) {

  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();

}

function normalizeNascarDriverPageNameKey_(value) {

  return cleanNascarDriverPageText_(value)
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}

/************************************************************
 DRIVER DEFAULTS PASTE - KISS VERSION
 Use this when NASCAR.com blocks Apps Script fetches.
************************************************************/

const SPORTS_RACING_DRIVER_DEFAULTS_PASTE_SHEET =
  "SportsRacingDriverDefaultsPaste";

function prepareSportsRacingDriverDefaultsPaste() {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      SPORTS_RACING_DRIVER_DEFAULTS_PASTE_SHEET
    );

  if (!sh) {
    sh =
      ss.insertSheet(
        SPORTS_RACING_DRIVER_DEFAULTS_PASTE_SHEET
      );
  }

  sh.clearContents();

  const headers = [
    "League",
    "DriverName",
    "DefaultCarNumber",
    "DefaultManufacturer",
    "DefaultTeam",
    "DefaultSponsor",
    "DriverImageUrl",
    "HeadshotUrl",
    "CarNumberImageUrl",
    "Country",
    "BirthDate",
    "Notes"
  ];

  sh
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([headers]);

  sh
    .getRange("A2")
    .setValue("nascar-premier");

  sh
    .getRange("B2")
    .setValue("Kyle Larson");

  sh
    .getRange("C2")
    .setValue("5");

  sh
    .getRange("D2")
    .setValue("Chevrolet");

  sh
    .getRange("E2")
    .setValue("Hendrick Motorsports");

  sh
    .getRange("G2")
    .setValue("Example row - replace with real copied driver data");

  sh
    .autoResizeColumns(
      1,
      headers.length
    );

  SpreadsheetApp
    .getActive()
    .toast(
      "Driver defaults paste sheet is ready.",
      "Racing",
      10
    );

  return {
    success: true,
    sheet:
      SPORTS_RACING_DRIVER_DEFAULTS_PASTE_SHEET,
    message:
      "Paste driver defaults here, then run importSportsRacingDriverDefaultsPaste."
  };

}

function importSportsRacingDriverDefaultsPaste() {

  setupSportsRacingDriverDatabaseSystem();

  const ss =
    SpreadsheetApp.getActive();

  const pasteSheet =
    ss.getSheetByName(
      SPORTS_RACING_DRIVER_DEFAULTS_PASTE_SHEET
    );

  if (!pasteSheet) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_RACING_DRIVER_DEFAULTS_PASTE_SHEET +
      ". Run prepareSportsRacingDriverDefaultsPaste first."
    );
  }

  const driversSheet =
    ss.getSheetByName(
      SPORTS_RACING_DRIVERS_SHEET
    );

  if (!driversSheet) {
    throw new Error(
      "Missing sheet: " +
      SPORTS_RACING_DRIVERS_SHEET
    );
  }

  const pasteData =
    pasteSheet
      .getDataRange()
      .getValues();

  if (pasteData.length <= 1) {
    return {
      success: false,
      message:
        "No driver defaults pasted."
    };
  }

  const pasteHeaders =
    pasteData[0].map(function(header) {
      return String(header || "").trim();
    });

  const pasteCol = {};

  pasteHeaders.forEach(function(header, index) {
    pasteCol[header] = index;
  });

  const requiredPasteHeaders = [
    "League",
    "DriverName",
    "DefaultCarNumber"
  ];

  requiredPasteHeaders.forEach(function(header) {
    if (pasteCol[header] === undefined) {
      throw new Error(
        "Driver defaults paste sheet missing column: " +
        header
      );
    }
  });

  const driverData =
    driversSheet
      .getDataRange()
      .getValues();

  if (driverData.length <= 1) {
    return {
      success: false,
      message:
        "SportsRacingDrivers has no rows to update yet."
    };
  }

  const driverHeaders =
    driverData[0].map(function(header) {
      return String(header || "").trim();
    });

  const driverCol = {};

  driverHeaders.forEach(function(header, index) {
    driverCol[header] = index;
  });

  const requiredDriverHeaders = [
    "League",
    "DriverName",
    "DefaultCarNumber",
    "DefaultManufacturer",
    "DefaultTeam",
    "DefaultSponsor",
    "DriverImageUrl",
    "HeadshotUrl",
    "CarNumberImageUrl",
    "Country",
    "BirthDate",
    "ManualOverride",
    "Source",
    "SourceUpdatedAt",
    "UpdatedAt"
  ];

  requiredDriverHeaders.forEach(function(header) {
    if (driverCol[header] === undefined) {
      throw new Error(
        "SportsRacingDrivers missing column: " +
        header
      );
    }
  });

  const driverRowByKey = {};

  for (let i = 1; i < driverData.length; i++) {

    const league =
      String(driverData[i][driverCol.League] || "")
        .trim()
        .toLowerCase();

    const name =
      String(driverData[i][driverCol.DriverName] || "")
        .trim();

    const key =
      sportsRacingDriverDefaultsKey_(
        league,
        name
      );

    if (key) {
      driverRowByKey[key] = i + 1;
    }

  }

  let pasted = 0;
  let matched = 0;
  let updated = 0;
  let skippedManualOverride = 0;
  let skippedNoMatch = 0;

  for (let r = 1; r < pasteData.length; r++) {

    const row =
      pasteData[r];

    const league =
      String(row[pasteCol.League] || "")
        .trim()
        .toLowerCase();

    const driverName =
      String(row[pasteCol.DriverName] || "")
        .trim();

    const carNumber =
      String(row[pasteCol.DefaultCarNumber] || "")
        .trim()
        .replace(/^#/, "");

    const manufacturer =
      pasteCol.DefaultManufacturer !== undefined
        ? String(row[pasteCol.DefaultManufacturer] || "").trim()
        : "";

    const team =
      pasteCol.DefaultTeam !== undefined
        ? String(row[pasteCol.DefaultTeam] || "").trim()
        : "";

    const sponsor =
      pasteCol.DefaultSponsor !== undefined
        ? String(row[pasteCol.DefaultSponsor] || "").trim()
        : "";

    const driverImageUrl =
  pasteCol.DriverImageUrl !== undefined
    ? String(row[pasteCol.DriverImageUrl] || "").trim()
    : "";

const headshotUrl =
  pasteCol.HeadshotUrl !== undefined
    ? String(row[pasteCol.HeadshotUrl] || "").trim()
    : "";

const carNumberImageUrl =
  pasteCol.CarNumberImageUrl !== undefined
    ? String(row[pasteCol.CarNumberImageUrl] || "").trim()
    : "";

const country =
  pasteCol.Country !== undefined
    ? String(row[pasteCol.Country] || "").trim()
    : "";

const birthDate =
  pasteCol.BirthDate !== undefined
    ? row[pasteCol.BirthDate]
    : "";

    if (
      !league ||
      !driverName
    ) {
      continue;
    }

    pasted++;

    const key =
      sportsRacingDriverDefaultsKey_(
        league,
        driverName
      );

    const driverRowNumber =
      driverRowByKey[key];

    if (!driverRowNumber) {
      skippedNoMatch++;
      continue;
    }

    matched++;

    const existingRow =
      driverData[driverRowNumber - 1];

    const manualOverride =
      String(existingRow[driverCol.ManualOverride] || "")
        .trim()
        .toUpperCase() === "TRUE";

    if (manualOverride) {
      skippedManualOverride++;
      continue;
    }

    let changed = false;

    changed =
      sportsRacingDriverDefaultsFillBlankCell_(
        driversSheet,
        driverRowNumber,
        driverCol.DefaultCarNumber,
        existingRow,
        carNumber
      ) || changed;

    changed =
      sportsRacingDriverDefaultsFillBlankCell_(
        driversSheet,
        driverRowNumber,
        driverCol.DefaultManufacturer,
        existingRow,
        manufacturer
      ) || changed;

    changed =
      sportsRacingDriverDefaultsFillBlankCell_(
        driversSheet,
        driverRowNumber,
        driverCol.DefaultTeam,
        existingRow,
        team
      ) || changed;

    changed =
      sportsRacingDriverDefaultsFillBlankCell_(
        driversSheet,
        driverRowNumber,
        driverCol.DefaultSponsor,
        existingRow,
        sponsor
      ) || changed;

      changed =
  sportsRacingDriverDefaultsFillBlankCell_(
    driversSheet,
    driverRowNumber,
    driverCol.DriverImageUrl,
    existingRow,
    driverImageUrl
  ) || changed;

changed =
  sportsRacingDriverDefaultsFillBlankCell_(
    driversSheet,
    driverRowNumber,
    driverCol.HeadshotUrl,
    existingRow,
    headshotUrl
  ) || changed;

changed =
  sportsRacingDriverDefaultsFillBlankCell_(
    driversSheet,
    driverRowNumber,
    driverCol.CarNumberImageUrl,
    existingRow,
    carNumberImageUrl
  ) || changed;

changed =
  sportsRacingDriverDefaultsFillBlankCell_(
    driversSheet,
    driverRowNumber,
    driverCol.Country,
    existingRow,
    country
  ) || changed;

changed =
  sportsRacingDriverDefaultsFillBlankCell_(
    driversSheet,
    driverRowNumber,
    driverCol.BirthDate,
    existingRow,
    birthDate
  ) || changed;

    if (changed) {

      driversSheet
        .getRange(
          driverRowNumber,
          driverCol.Source + 1
        )
        .setValue("driver_defaults_paste");

      driversSheet
        .getRange(
          driverRowNumber,
          driverCol.SourceUpdatedAt + 1
        )
        .setValue(new Date());

      driversSheet
        .getRange(
          driverRowNumber,
          driverCol.UpdatedAt + 1
        )
        .setValue(new Date());

      updated++;

    }

  }

  SpreadsheetApp.flush();

  SpreadsheetApp
    .getActive()
    .toast(
      "Driver defaults import complete. Updated: " + updated,
      "Racing",
      10
    );

  return {
    success: true,
    pasted: pasted,
    matched: matched,
    updated: updated,
    skippedNoMatch: skippedNoMatch,
    skippedManualOverride: skippedManualOverride
  };

}

function sportsRacingDriverDefaultsFillBlankCell_(
  sheet,
  rowNumber,
  colIndex,
  existingRow,
  newValue
) {

  newValue =
    String(newValue || "").trim();

  if (!newValue) {
    return false;
  }

  const existingValue =
    String(existingRow[colIndex] || "").trim();

  if (existingValue) {
    return false;
  }

  sheet
    .getRange(
      rowNumber,
      colIndex + 1
    )
    .setValue(newValue);

  existingRow[colIndex] =
    newValue;

  return true;

}

function sportsRacingDriverDefaultsKey_(
  league,
  driverName
) {

  league =
    String(league || "")
      .trim()
      .toLowerCase();

  driverName =
    sportsRacingDriverDefaultsNormalizeName_(
      driverName
    );

  if (!league || !driverName) {
    return "";
  }

  return league + "|" + driverName;

}

function sportsRacingDriverDefaultsNormalizeName_(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}