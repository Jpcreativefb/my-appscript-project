function runNormalizedStorageSheetsOnly() {
  const result =
    setupNormalizedQuestionStorageSheetsOnly();

  console.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}

function runNormalizedQuestionMigrationOnce() {
  const result =
    setupNormalizedQuestionStorage({
      migrateExisting: true,
      force: false,
      rebuildIndexes: true
    });

  console.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}