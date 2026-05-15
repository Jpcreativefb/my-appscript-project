function testSchema(){

const picks = readSheet("Picks");

Logger.log(picks.headers);
Logger.log(picks.rows.length);

}

function testCategorySettings(){

const settings = getCategorySettings();

Logger.log(
JSON.stringify(
settings["best-picture"],
null,
2
)
);

}

function testCategories(){

const cats = getCategories();

Logger.log(cats.length);

Logger.log(
JSON.stringify(cats[0], null, 2)
);

}

function testSavePick(){

const result = savePick({
gameId: "oscars-2026",
username: "TestUser",
categoryId: "best-picture",
nomineeId: "test2"
});

Logger.log(JSON.stringify(result,null,2));

}

function testMultiGame(){

Logger.log(
getUserPicks(
"TestUser",
"oscars-2026"
)
);

Logger.log(
getUserPicks(
"TestUser",
"goldenglobes-2027"
)
);

}

function testGames(){

Logger.log(
JSON.stringify(
getGames(),
null,
2
)
);

}

function testDefaultGame(){

Logger.log(
getDefaultGameId()
);

}

function testSingleGame(){

Logger.log(
JSON.stringify(
getGame("oscars-2027"),
null,
2
)
);

}

function testGamesEngine() {
  Logger.log(getGames());
  Logger.log(getActiveGames());
  Logger.log(getDefaultGameId());
}