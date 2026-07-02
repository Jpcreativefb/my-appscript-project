# Sports Scoring Engine Sheet Headers

## SportsScores
GameId	ESPNEventId	Sport	League	Status	State	Period	Clock	HomeTeam	AwayTeam	HomeScore	AwayScore	Winner	Completed	LastUpdated	GameDateTime	HomeLogo	AwayLogo	HomeRecord	AwayRecord						

## SportsOdds
OddsId	League	SportKey	OddsEventId	CommenceTime	HomeTeam	AwayTeam	HomeOdds	AwayOdds	BookmakerKey	Bookmaker	Market	Source	LastUpdated	HomeSpread	HomeSpreadOdds	AwaySpread	AwaySpreadOdds	TotalPoints	OverOdds	UnderOdds	DrawOdds	Markets	RawMarketsJSON	DrawOdds		

## SportsOddsApiLog
Timestamp	Source	League	SportKey	Endpoint	Markets	Regions	EventsReturned	BookmakersReturned	MarketsReturned	CostLast	RequestsUsed	RequestsRemaining	UrlNoKey

## OddsApiLog
Timestamp	Source	SportKey	Endpoint	Markets	Regions	Bookmakers	EventIdsCount	EventsReturned	BookmakersReturned	MarketsReturned	CostLast	RequestsUsed	RequestsRemaining	UrlNoKey											

## SportsFighterImages
League	FighterName	ImageUrl	Active	Notes	UpdatedAt

## SportsSnapshots
SnapshotId	Timestamp	GameId	ESPNEventId	Sport	League	SnapshotType	Period	Clock	HomeScore	AwayScore	Notes														

## SportsSettings
Sport |	League | Enabled | PollPreGameMinutes | PollLiveMinutes | PollFinalMinutes | SavePeriodSnapshots | ESPNScoreboardUrl	

## SportsGames
GameId	Sport	League	ESPNEventId	Name	ShortName	Season	Week	GameDateTime	HomeTeam	AwayTeam	Active	Completed	LastChecked	LastStatus

## SportsOddsSettings
League	SportKey	OddsEnabled	AutoRefreshEnabled	ManualRefreshEnabled	MaxRefreshesPerDay	MonthlyBudget	StopAtMonthlyCalls	CallsToday	CallsThisMonth	LastRefreshDate	LastRefreshAt	LastRefreshStatus	LastRefreshMessage	UpdatedAt	Notes	DefaultMarkets	DefaultRegions	EstimatedCostPerRefresh	LastApiCost	LastApiRemaining

## SportsOddsUsage
Month	TotalCallsUsed	WarnAt	HardCap	UpdatedAt	Notes

## SportsSettings
JobId |	Sport |	League | SeasonName | StartDate | EndDate | NextDate | BatchDays | Status| LastRun | DaysProcessed | GamesFetched | UniqueGames | Errors | CreatedAt | CompletedAt

## SportsLogs
Timestamp	Level	FunctionName	Message	Details																					