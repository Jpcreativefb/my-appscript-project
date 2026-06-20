/* =========================
   SCHEMA REGISTRY (CORE)
========================= */

const SCHEMA = {

  Picks: {
    required: [
      "GameId",
      "Timestamp",
      "Username",
      "CategoryId",
      "NomineeId",
      "Points",
      "OriginalNomineeId",
      "ChangeCount",
      "LastUpdated"
    ],
    types: {
      GameId: "string",
      Timestamp: "date",
      Username: "string",
      CategoryId: "string",
      NomineeId: "string",
      Points: "number",
      OriginalNomineeId: "string",
      ChangeCount: "number",
      LastUpdated: "date"
    }
  },

  Categories: {
    required: [
      "Category",
      "CategoryId",
      "Nominee",
      "NomineeId",
      "Section",
      "Active"
    ]
  },

  CategorySettings: {
    required: [
      "CategoryId",
      "Points",
      "Locked",
      "WinnerNomineeId",
      "ChangePenalty",
      "MaxChanges",
      "LockDateTime"
    ]
  },

  Users: {
    required: [
      "Username",
      "Pin",
      "IsAdmin",
      "Avatar",
      "ThemeColor",
      "CreatedAt"
    ]
  },

  Votes: {
    required: [
      "Timestamp",
      "Username",
      "CategoryId",
      "NomineeId",
      "Rank"
    ]
  }

};

/* =========================
   SCHEMA VALIDATOR
========================= */

function validateSheet(schemaName, headers) {

  const schema = SCHEMA[schemaName];

  if (!schema) {
    throw new Error("Unknown schema: " + schemaName);
  }

  const missing = schema.required.filter(h => !headers.includes(h));

  if (missing.length > 0) {
    throw new Error(
      `❌ ${schemaName} missing columns: ` + missing.join(", ")
    );
  }

  return true;
}

function getColumnMap(headers) {

  const map = {};

  headers.forEach((h, i) => {
    map[String(h).trim()] = i;
  });

  return map;
}