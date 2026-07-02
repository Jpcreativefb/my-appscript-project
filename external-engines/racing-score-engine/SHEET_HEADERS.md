# Racing Score Engine Sheet Headers

## SportsRacingRaceEntries
EntryId	League	SeriesId	Season	GameId	ESPNEventId	NascarRaceId	RaceName	DriverKey	DriverName	CarNumber	Manufacturer	Team	Sponsor	DriverImageUrl	HeadshotUrl	CarNumberImageUrl	StartingPosition	QualifyingSpeed	Source	SourceUpdatedAt	ManualOverride	Notes	CreatedAt	UpdatedAt	

## SportsRacingDrivers
DriverKey	League	SeriesId	Season	NascarDriverId	EspnAthleteId	DriverName	FirstName	LastName	DisplayName	AliasNames	DefaultCarNumber	DefaultManufacturer	DefaultTeam	DefaultSponsor	DriverImageUrl	HeadshotUrl	CarNumberImageUrl	Country	BirthDate	Active	LastSeenRaceId	LastSeenAt	Source	SourceUpdatedAt	ManualOverride	Notes	CreatedAt	UpdatedAt

## SportsRacingDriverDefaultPaste
League	DriverName	DefaultCarNumber	DefaultManufacturer	DefaultTeam	DefaultSponsor	DriverImageUrl	HeadshotUrl	CarNumberImageUrl	Country	BirthDate	Notes	

## SportsRacingNascarFeedDebug
Timestamp	Season	Series	League	SeriesId	Url	StatusCode	ContentType	ParseOk	BestArrayPath	BestArrayCount	SampleKeys	SampleDriverId	SampleName	SampleCarNumber	SampleTeam	SampleManufacturer	TextPreview	Error													

## SportsRacingRawPaste
ImportType	League	ESPNEventId	GameId	RaceName	RaceDateTime	Series	Notes																			

## SportsRacingSourceLinks
SourceLinkId	Timestamp	League	GameId	ESPNEventId	RaceName	RaceDateTime	Series	GridUrl	ResultsUrl	Enabled	LastImportedAt	LastImportStatus	LastImportMessage	UpdatedAt												

## SportsRacingSupplemental
SupplementalId	Timestamp	GameId	ESPNEventId	League	RaceName	RaceDateTime	DriverId	DriverName	Source	SourceRaceId	SourceDriverId	Team	CarNumber	Manufacturer	Sponsor	StartingPosition	StartingPositionSource	QualifyingPosition	QualifyingSpeed	FinalPosition	FinalPositionSource	CurrentPosition	CurrentPositionSource	Laps	LapsLed	Points	Bonus	Penalty	StageWins	DNFStatus	Winner	Notes	RawSourceJSON	UpdatedAt

## SportsRacingManualImport
League	ESPNEventId	GameId	RaceName	RaceDateTime	DriverName	Team	CarNumber	Manufacturer	Sponsor	StartingPosition	QualifyingPosition	QualifyingSpeed	FinalPosition	Laps	LapsLed	Points	Bonus	Penalty	StageWins	DNFStatus	Winner	Notes			

## SportsRacingResults
RaceResultId	Timestamp	GameId	ESPNEventId	Sport	League	RaceName	RaceDateTime	Status	State	Completed	DriverId	DriverName	Team	CarNumber	StartingPosition	FinalPosition	CurrentPosition	Laps	Points	StageWins	Winner	RawCompetitorJSON	LastUpdated	StartingPositionSource	FinalPositionSource	CurrentPositionSource	WinnerSource	DataQualityNotes