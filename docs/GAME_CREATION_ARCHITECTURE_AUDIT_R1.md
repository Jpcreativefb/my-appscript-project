# PATTC Game Creation Architecture Audit R1

**Status:** Architecture audit only — no runtime behavior changed  
**Audited checkpoint:** `3504c7b63ade5b9f8b018d5a3f72684c1337fb90`  
**Audit branch:** `audit/game-creation-architecture-r1`

## 1. Executive summary

PATTC already has the backend pieces needed for a clean Admin game-creation model, but the Admin surfaces currently mix five different responsibilities:

1. creating the authoritative `Games` row,
2. editing shared game identity/lifecycle fields,
3. configuring game-specific rules,
4. preparing hub/league/season source data,
5. combining already-created games into competitions.

The recommended architecture is therefore:

> **BUILDERS CREATE GAMES**  
> **MANAGERS EDIT GAMES**  
> **ENGINES SUPPORT GAMES**  
> **HUB / LEAGUE / SEASON DATA SUPPLIES GAMES**  
> **COMPETITIONS COMBINE EXISTING GAMES**

The current authoritative generic creation path is `Admin → Games & Design → Manage Games → New Game`, whose `adminCreateGameFromForm()` calls `apiAdminCreateGame(...)` and creates an inactive Draft game. `Manage Games` also owns shared lifecycle, identity, display, cloning, preflight and publication controls. It is therefore currently acting as both **builder and manager**.

`GamesEngine.js` is the authoritative canonical game-type registry. At this checkpoint its supported types are:

- `prediction`
- `head-to-head`
- `confidence`
- `staked-prediction`
- `wager`
- `racing-wager`
- `team-fantasy`
- `season-cup`
- `mixed`
- `combo` (legacy alias of `mixed`)
- `survivor`
- `voting`
- `ranking`

This is important because the current New Game UI uses a **free-text Type field**, while `GamesEngine.normalizeGameType_()` converts any unsupported value to `prediction`. “Oscars”, “Emmys”, “NFL”, “The Traitors”, “DWTS”, etc. are therefore not safe canonical engine types unless represented by an actually-supported game type. They are better treated as hub/group/season identity around an authoritative canonical engine type.

Sports is the clearest example of the current architecture problem. The repository contains dedicated engines such as `SportsConfidenceBuilderEngine.js`, `SportsSurvivorEngine.js`, `SportsTeamFantasyEngine.js`, `NflPlayoffRaceEngine.js`, `NflSeasonPackEngine.js`, `NflCupFuturesEngine.js`, `SportsAdminBridgeEngine.js`, and related sports engines. Those engines should remain authoritative. The Admin builder should orchestrate them; it should not duplicate them.

Team Fantasy already demonstrates the correct split fairly well: the game must exist first, then the dedicated Team Fantasy manager owns Team Fantasy-specific rules while Manage Games owns shared identity/status/display fields. However, its current empty state explicitly instructs the Admin to create the game through Manage Games, which proves the missing builder layer.

The Awards Manager is primarily a **question/data builder for an existing PATTC game**, not an authoritative game creator. It loads existing games, chooses a destination game, maps external/manual Awards events and markets into questions, and follows the destination game’s canonical scoring type. It should sit under Awards ceremony data / game content management after game creation rather than being presented as the sole game builder.

The Reality TV Admin is primarily a **season/episode/result operational manager** backed by `RealityTvSeasonEngine.js` and `RealityTvQuestionPackEngine.js`. At the audited checkpoint there is no separately proven first-class `DWTS` canonical game engine and no Castle Duel engine in the authoritative engine inventory. Those names should not be invented as builder types in R2; they should only appear later if the implementation proves a supported creation path.

Competition architecture is already partially generic. `GamesEngine` contains `season-cup`, `gameRole`, `parentGameId`, `includeInParent`, `parentContributionMode`, `parentContributionWeight`, `parentBestCount`, and placement-point configuration. This supports the conceptual rule **create game first → optionally attach the existing game to a competition**. Current NFL Cup engines are still NFL-specific and should remain unchanged until a future abstraction phase.

### Primary Director recommendation

Do not restructure backend ownership. Build a navigation/orchestration layer around what already exists:

`Admin → Games & Design → Hub → League/Show/Ceremony/Scope → Season → Game Builder | Manage Existing Games | Competitions | Hub/Season Data | Operations`

R2 should create only that shared builder/navigation shell. R3 can then route Sports builders into the existing game creation API plus the existing sports engines without replacing those engines.

---

## 2. Current-state game creation matrix

| Game Type | Hub | Current Builder Entry | Actual Engine | Required Data | Current Manager | Current Problem | Target Builder | Target Manager | Competition Eligible | Implementation Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| Prediction | General / Awards / Reality | Manage Games → New Game, then Game Setup | `GamesEngine` + Categories/Question storage + Picks/Scoring | Game identity; categories/questions; answers/nominees; timing/results | Manage Games + Game Setup | **MANAGER USED AS BUILDER**; hub identity and engine type are not separated | Shared Prediction Builder scoped to selected hub/season | Manage Existing Games + Game Setup | Yes, using existing parent fields where compatible | Medium |
| Head-to-Head | General / Sports / Awards | Manage Games → New Game, then Game Setup | `GamesEngine` + question/scoring engines; sports data engines when sports-backed | Two-side question data; timing; result source; optional sports matchup data | Manage Games + Game Setup | Generic builder does not explain whether source is manual or sports-backed | Shared Head-to-Head/Prediction Builder | Manage Existing Games + Game Setup | Yes | Medium |
| Confidence | Sports primarily; generic type also usable elsewhere | Manage Games → New Game (`confidence`), then sports question/schedule tooling | `GamesEngine`; `SportsConfidenceBuilderEngine`; `SportsConfidenceAutoPickEngine`; `SportsConfidenceRC24ACompletionEngine`; sports schedule/score bridge | Teams; schedule/matchups; kickoff; week; score/result source; confidence rules | Manage Games / Game Setup plus sports controls | **HIDDEN DEPENDENCY**, **ENGINE EXPOSED DIRECTLY TO USER**, **MANAGER USED AS BUILDER** | Sports → NFL → Season → Game Builder → Confidence | Manage Existing Games; existing Confidence/sports rule surfaces | Yes | High |
| Survivor | Sports primarily; canonical generic `survivor` also exists | Manage Games → New Game (`survivor`), then Survivor/sports setup | `GamesEngine`; `SportsSurvivorEngine`; `SurvivorGameEngine`; KOTH compatibility engines where used | Teams/contestants; schedule/rounds; kickoff/lock timing; scores/results; prior-use state; elimination rules | Manage Games / Game Setup + existing Survivor controls | **HIDDEN DEPENDENCY**, **MANAGER USED AS BUILDER**; schedule/round source is not an explicit builder step | Sports → NFL → Season → Game Builder → Survivor | Manage Existing Games + authoritative Survivor rules manager | Yes | High |
| Team Fantasy Football | Sports → NFL | Manage Games → New Game (`team-fantasy`); dedicated manager refuses to initialize a missing game | `GamesEngine`; `SportsTeamFantasyEngine`; `SportsTeamFantasyGameDayEngine` | NFL team universe; season/week; position groups; scoring/ranking rules; usage limits; eligibility; leagues/playoffs | Dedicated Team Fantasy manager + shared Manage Games identity/status | **WRONG ENTRY POINT** and **MANAGER USED AS BUILDER** in Manage Games; dedicated manager is correctly post-creation | Sports → NFL → Season → Game Builder → Team Fantasy | Existing Team Fantasy manager | Yes conceptually; do not alter current trust boundaries | High |
| Playoff Race | Sports → NFL | Existing game/season data plus dedicated Playoff Race timing page; no distinct canonical `playoff-race` type in `GamesEngine` | `NflPlayoffRaceEngine` plus existing Games record and sports/standings source | Teams; standings; schedule; records; qualification rules; season timing | Dedicated Playoff Race operational timing page + shared game manager | **HIDDEN DEPENDENCY**, **SPECIALIZED TOOL IN WRONG ADMIN AREA** if treated as creator; engine is specialized but canonical Games type is not | Sports → NFL → Season → Game Builder → Playoff / Forecast; builder should select an existing supported storage/game representation and invoke existing engine | Existing Playoff Race manager/timing controls | Yes if represented by an authoritative game record | High |
| Full League Forecast | Sports → NFL | No separately proven first-class builder/type at audited checkpoint | Likely forecast/Playoff Race family only where existing code calls it; no separate canonical type verified | Standings/schedule/team records/season timing if implemented | Not separately proven | **INCOMPLETE / UNVERIFIED** — do not create a duplicate implementation | Fold into Playoff / Forecast builder only after implementation-specific mapping is confirmed | Reuse existing forecast manager if found in R3 | Undetermined | High |
| Bottom Dwellers | Sports → NFL | No separately proven canonical builder/type at audited checkpoint | No separate canonical engine verified by this audit | Do not assume beyond actual implementation | Not separately proven | **INCOMPLETE / UNVERIFIED** | Do not expose as builder until R3 proves authoritative engine/storage | Reuse existing manager if later verified | Undetermined | High |
| Season Cup / NFL Cup | Sports → NFL | Generic `season-cup` can be created as a game; current NFL Cup page configures/prepares Cup/Futures around existing games | `GamesEngine` parent/child fields; `NflCupFuturesEngine`; `NflCupWeeklySeasonR2Engine`; existing Cup control APIs | Existing child game IDs; participation/weights/qualification/placement points; season context | Dedicated NFL Cup page | **COMPETITION MIXED WITH GAME CREATION**; NFL Cup manager explicitly operates existing records | Competitions → Cup Builder; select existing authoritative games | Existing NFL Cup / competition manager | N/A — it is the competition | High |
| NFL Sports Pack / Season Setup | Sports → NFL | Dedicated NFL Season / Sports Setup operation | `NflSeasonPackEngine` | Season context and shared sports game/data setup | Dedicated NFL Season Setup page | **DATA SETUP MIXED WITH GAME CREATION** if presented as normal game builder | League / Season Data or Operations, not Game Builder | Existing season setup operation | N/A | Medium |
| Wager | General / Awards / Sports | Manage Games → New Game (`wager`) + Game Setup/Awards question tooling | `GamesEngine`; `BettingEngine`; `SportsWagerEngine` when sports-backed | Questions/markets; bankroll/wager settings; result source | Manage Games + Game Setup / Awards Manager as applicable | Entry point does not distinguish manual vs external/sports data source | Wager Builder scoped to selected hub | Manage Existing Games + appropriate content manager | Yes | Medium |
| Racing Wager | General / Sports/Racing | Manage Games → New Game (`racing-wager`) | `GamesEngine`; `RacingWagerEngine`; racing source integration | Racing league/series/market, event/results data, wager rules | Manage Games + Game Setup | Generic free-form builder hides racing prerequisites | Racing Wager Builder only where racing scope is selected | Existing manager/setup | Yes | Medium |
| Staked Prediction | General / Awards / Reality | Manage Games → New Game (`staked-prediction`) | `GamesEngine` + standard question/scoring storage | Questions/answers; stake rules; timing/results | Manage Games + Game Setup | Generic creation lacks guided rule sequence | Shared Prediction Builder → Staked variation | Manage Existing Games + Game Setup | Yes | Low-Medium |
| Hybrid / Mixed | General / Awards / Sports | Manage Games → New Game (`mixed`; `combo` legacy) | `GamesEngine`; `HybridGameEngine`; component scoring engines | Question-specific play modes and applicable source data | Manage Games + Game Setup | Flexible but easy to misconfigure; legacy alias remains | Advanced / Other Game builder, not primary beginner path | Manage Existing Games + Game Setup | Yes | High |
| Ranking | General / Awards | Manage Games → New Game (`ranking`) | `GamesEngine`; `RankingGameEngine` | Ranked answers/nominees; lock/result/scoring config | Manage Games + Game Setup | Generic path is functional but not guided | Ranking Builder / Awards variation | Manage Existing Games + Game Setup | Yes | Low-Medium |
| Voting / Competition Game | General / Custom | Manage Games → New Game (`voting`) | `GamesEngine`; `VotingEngine`; `VotingCompetitionEngine` | Entries/submissions; publication; community voting/ranking rules | Manage Games + game-specific voting surfaces | Name “Competition Game” can be confused with Cup/Series/Tournament aggregation | General / Custom → Voting Game Builder | Existing voting manager | Do not automatically treat as Cup/Series/Tournament child without explicit support | Medium |
| Awards prediction (Oscars / Emmys) | Awards → Ceremony → Year | Authoritative game must already exist; Awards Manager then chooses destination game and builds questions from events/markets | Canonical Games type (`prediction`, `confidence`, `wager`, etc.) + `AwardsManagerEngine`, category/result engines and external-results bridge | Ceremony categories/events; nominees/outcomes; official result source; optional external market data | Awards Manager + Manage Games + Game Setup | **HIDDEN DEPENDENCY**: Awards Manager is content/question builder for an existing game, not game creator | Awards → Ceremony → Year → Game Builder; choose canonical play model first | Awards Manager for ceremony content/results; Manage Existing Games for lifecycle | Yes | Medium |
| Reality season prediction | Reality → Show → Season | Generic authoritative game creation plus Reality season setup/operations | Canonical `GamesEngine` type + `RealityTvSeasonEngine` + `RealityTvQuestionPackEngine` | Contestants; episodes; elimination/result data; episode questions; show/season scope | Reality TV Season Manager + Manage Games | **DATA SETUP MIXED WITH GAME CREATION** and generic game creation is disconnected from season setup | Reality → Show → Season → Game Builder using only supported canonical play models | Reality TV Season Manager for season/episode operations; Manage Existing Games for lifecycle | Yes if existing game model supports it | High |
| The Traitors | Reality → The Traitors → Season | No dedicated canonical `traitors` type in `GamesEngine`; current implementation should be treated as Reality season/game content over supported game records unless another explicit engine path is invoked | Reality season/question engines plus whatever supported canonical game type the existing record uses | Contestants; episodes; eliminations; roles/alliance data only where current implementation stores/uses it; result ingestion | Reality TV manager / existing Traitors-specific surfaces | Do not turn show name into engine type; **HIDDEN DEPENDENCY** between game record and season data | Reality → The Traitors → Season → Game Builder with supported templates only | Existing Reality/Traitors manager | Potentially, after game exists | High |
| Castle Duel | Reality | Not verified as an authoritative creation type/engine at this checkpoint | No `CastleDuelEngine` verified in the audited authoritative engine inventory | Not asserted | Not asserted | **UNVERIFIED AT CHECKPOINT** — do not invent builder | None in R2/R3 until implementation is proven | Existing surface only if independently verified | Undetermined | High |
| DWTS | Reality → DWTS | Hub/group inference exists in Manage Games, but no dedicated canonical DWTS game type/engine was verified | Supported generic/Reality engines only if an existing record uses them | Do not invent show-specific dependencies | No dedicated DWTS manager verified in this audit | **UNVERIFIED AS GAME TYPE** | Reality builder may offer DWTS scope only after an actual supported template is defined | Reuse Reality manager only where compatible | Undetermined | High |

### Current-state conclusion

The canonical game **type** and the Admin **scope** are different concepts and must stay different:

- Type answers: “Which game/scoring engine is this?”
- Scope answers: “Where does this game live?” (Sports/NFL/2026, Awards/Oscars/2027, Reality/The Traitors/Season N, etc.)

The current UI partially infers `hubFamily`, `hubGroup`, `season`, and `leagueSeasonScope` from game metadata and names. That inference is useful for migration/navigation but should not be the permanent source of truth for new builders.

---

## 3. Engine dependency matrix

| Classification | Current implementations verified | Actual dependency ownership | Builder implication |
|---|---|---|---|
| A. Schedule / Matchup | Confidence, Survivor, sports head-to-head | `SportsConfidenceBuilderEngine`, `SportsSurvivorEngine`, `SurvivorGameEngine`, `SportsAdminBridgeEngine`, current-week/schedule/score systems | Builder asks for schedule source and rules, then delegates. It does not recreate schedules or scores. |
| B. Fantasy / Roster | Team Fantasy Football | `SportsTeamFantasyEngine`, `SportsTeamFantasyGameDayEngine` | Builder creates/locates the authoritative game and captures league/team source; dedicated manager owns positions, scoring, usage, eligibility, leagues/playoffs. |
| C. Standings / Forecast | Playoff Race; future forecast variants only if verified | `NflPlayoffRaceEngine` and existing standings/sports source | Builder selects team/standings source + forecast mode; specialized engine remains authoritative. Do not invent Full League Forecast or Bottom Dwellers storage. |
| D. Reality / Episode | Current Reality TV season flows | `RealityTvSeasonEngine`, `RealityTvQuestionPackEngine` | Builder establishes game/show/season relationship. Reality manager owns contestants, episodes, question packs and result approval/ingestion. |
| E. Awards / Category | Oscars/Emmys-style content in existing Awards flow | `AwardsManagerEngine`, `CategoriesEngine`, `CategoryResultsEngine`, `ExternalResultsHubBridgeEngine`, normalized question storage | Builder creates canonical game first. Awards Manager then populates ceremony questions/data into the existing destination game. |
| F. General / Manual Prediction | Prediction, head-to-head, confidence, staked, wager, mixed, ranking, voting | `GamesEngine`, Categories/Question storage, Picks/Scoring plus type-specific engines (`HybridGameEngine`, `RankingGameEngine`, `BettingEngine`, `VotingEngine`, etc.) | Shared builder can orchestrate identity → type/rules → content source → timing → review → create without a hub-specific backend rewrite. |

### Sports dependency detail

**Confidence**
- authoritative game record/type: `confidence` in `GamesEngine`
- sports builder/runtime: `SportsConfidenceBuilderEngine`
- autopick/completion: existing Confidence-specific engines
- source data required by current sports model: schedule/matchups, teams, kickoff/current-week and results/scores
- risk: creating only a `Games` row does not build a usable NFL confidence schedule.

**Survivor**
- authoritative game record/type: `survivor`
- sports runtime/rules: `SportsSurvivorEngine` and existing Survivor compatibility engine
- source data: teams/round or week, schedule, kickoff/locks, results and used-team history
- risk: generic category setup cannot substitute for Survivor’s specialized weekly/state rules.

**Team Fantasy**
- authoritative game record/type: `team-fantasy`
- runtime/configuration: `SportsTeamFantasyEngine`, `SportsTeamFantasyGameDayEngine`
- source data: team universe, season/week, positions, ranking/scoring data, usage/eligibility, playoff/leagues
- trust/security boundary must remain unchanged.

**Playoff Race**
- specialized engine: `NflPlayoffRaceEngine`
- current Admin page explicitly presents operational timing for an existing Playoff Race
- no canonical `playoff-race` entry exists in `GamesEngine` type registry
- R3 must map the specialized engine to the authoritative game record already used in production rather than inventing a new type/schema.

---

## 4. Hidden dependency / broken flow report

### 4.1 Manage Games is both builder and manager
**Classification:** `MANAGER USED AS BUILDER`

`Manage Games` renders both existing game cards and a New Game form. The same page also owns shared identity/display settings, archive/clone/preflight and lifecycle publication. Creation and management should be separated in navigation while continuing to reuse the same APIs.

### 4.2 Free-text Type field can misrepresent canonical engine type
**Classification:** `WRONG ENTRY POINT` / `MISLEADING CONFIGURATION`

The New Game form accepts arbitrary text for Type. Backend `GamesEngine` supports a fixed type registry and normalizes unsupported values to `prediction`. A user typing `oscars`, `nfl`, `playoff-race`, `traitors`, etc. can therefore believe they selected a game type when they actually created a Prediction game.

**Target:** builder presents supported canonical engine types as explicit choices; hub/group/season are separate fields.

### 4.3 Confidence creation hides schedule construction
**Classification:** `HIDDEN DEPENDENCY`, `ENGINE EXPOSED DIRECTLY TO USER`

Creating a `confidence` Games row is not equivalent to creating an NFL confidence pool. NFL Confidence relies on sports schedule/matchup data and dedicated Confidence builder/runtime engines. The builder must visibly ask for schedule source and then delegate to the existing engine.

### 4.4 Survivor creation hides weekly schedule/state requirements
**Classification:** `HIDDEN DEPENDENCY`

Survivor is a supported canonical game type, but its NFL implementation depends on weekly sports state, locks/results and team-use history. Those dependencies should be explicit builder steps, not an assumption that Admin already prepared sports data elsewhere.

### 4.5 Team Fantasy has the right manager but the wrong creation entry
**Classification:** `WRONG ENTRY POINT`, `MANAGER USED AS BUILDER`

The Team Fantasy manager explicitly says: create the season game first in Games & Design / Manage Games, then return. This is the strongest proof that a dedicated Game Builder layer is missing. Keep the existing Team Fantasy manager; add an orchestrated Team Fantasy builder before it.

### 4.6 Playoff Race timing is a manager, not a creator
**Classification:** `SPECIALIZED TOOL IN WRONG ADMIN AREA` when used as creation path

The dedicated page describes itself as operational timing for the **existing** NFL Playoff Race. It should remain under Manage Existing Games / specialized game manager or Operations, while a future Playoff/Forecast builder handles initialization.

### 4.7 NFL Cup is a competition configuration surface
**Classification:** `COMPETITION MIXED WITH GAME CREATION`

The dedicated NFL Cup page configures Futures, participation, weighting, qualification and publication around existing records. A Cup must not be the primary way to create child games.

### 4.8 NFL Sports Pack is season setup
**Classification:** `DATA SETUP MIXED WITH GAME CREATION`

The dedicated NFL Season / Sports Setup page says it builds or repairs the shared season game pack and is not Cup-only administration. That makes it a season convenience/setup operation, not the normal authoritative game builder.

### 4.9 Awards Manager expects an existing destination game
**Classification:** `HIDDEN DEPENDENCY`, `DATA SETUP MIXED WITH GAME CREATION`

Awards Manager loads existing games into a “PATTC Predicts Game” selector, follows the selected game’s canonical play/scoring type, then creates ceremony questions/answers from manual/external events. It is an excellent ceremony content builder, but not the authoritative Games-row builder.

### 4.10 Reality TV manager owns season operations, not generic game identity
**Classification:** `DATA SETUP MIXED WITH GAME CREATION`

Reality TV Admin is centered on contestants, episodes, episode questions, result queues, approval/finalization and next-episode construction. Keep that ownership. A new Reality Game Builder should only establish the authoritative game + show/season linkage and then hand off.

### 4.11 Scope inference is compatibility logic, not a builder contract
**Classification:** `HIDDEN DEPENDENCY`

Manage Games currently infers family/group/season from explicit fields or text such as Emmy/Oscar/Traitors/DWTS/NFL. This is useful for organizing legacy records, but future builders should write scope explicitly rather than depend on naming conventions.

---

## 5. Sports target architecture

```text
Admin
└── Games & Design
    └── Sports
        └── NFL
            └── 2026
                ├── GAME BUILDER
                │   ├── Confidence
                │   ├── Survivor
                │   ├── Team Fantasy
                │   ├── Playoff / Forecast
                │   └── Other Game
                ├── MANAGE EXISTING GAMES
                ├── COMPETITIONS
                │   ├── Cups
                │   ├── Series
                │   └── Tournaments
                ├── LEAGUE / SEASON DATA
                │   ├── Teams
                │   ├── Schedule
                │   ├── Scores
                │   ├── Standings
                │   ├── Odds
                │   └── Season timing
                └── OPERATIONS
                    └── Sports Engine Controls
```

### Confidence builder
1. Identity — name, ID, hub=Sports, league=NFL, season=2026.
2. Schedule source — choose existing NFL season/schedule source; display readiness.
3. Confidence rules — use existing Confidence configuration.
4. Lock rules — kickoff/weekly lock behavior through existing engine contracts.
5. Scoring — existing Confidence scoring mode only; no scoring rewrite.
6. Review — show game record + schedule dependency + rule summary.
7. Create — call existing game creation API, then existing sports Confidence builder/setup API(s).
8. Optional competition placement — only after successful authoritative game creation.

### Survivor builder
1. Identity.
2. Schedule source.
3. Survivor rules.
4. Team-use rules.
5. Autopick.
6. Locks.
7. Review.
8. Create using existing `survivor` game type and Survivor engine/setup path.
9. Optional competition placement.

### Team Fantasy builder
1. Identity.
2. League/team source.
3. Positions.
4. Scoring/rank source.
5. Usage limits.
6. Eligibility.
7. Playoff mode.
8. Review.
9. Create authoritative `team-fantasy` game, then save through existing Team Fantasy API/engine ownership.
10. Optional competition placement.

**After creation:** route to the existing Team Fantasy manager; do not duplicate that manager’s rules, scoring, league, sync or trust logic.

### Playoff / Forecast builder
1. Identity.
2. Team/standings source.
3. Forecast type — only choices actually supported by the existing engine at implementation time.
4. Season timing.
5. Qualification/scoring — existing engine configuration only.
6. Review.
7. Create/initialize through the existing authoritative game + `NflPlayoffRaceEngine` path.
8. Optional competition placement.

**Important:** because `playoff-race` is not a canonical `GamesEngine` type at this checkpoint, R3 must first prove the production game’s persisted type/role and reuse it. Do not add a new backend type merely to make the UI clean.

### Other Game
Only expose canonical `GamesEngine` types that make sense in Sports scope. Do not use “Other Game” to create unrecognized free-text types.

---

## 6. Reality target architecture

```text
Admin
└── Games & Design
    └── Reality
        └── Show
            └── Season
                ├── GAME BUILDER
                ├── MANAGE EXISTING GAMES
                ├── COMPETITIONS
                ├── SHOW / SEASON DATA
                └── OPERATIONS
```

### Ownership
- Authoritative game record / canonical play type: `GamesEngine`.
- Show/season/contestant/episode lifecycle: `RealityTvSeasonEngine`.
- Episode question generation/storage: `RealityTvQuestionPackEngine` plus existing normalized question storage.
- Existing Reality TV manager remains authoritative for roster, episodes, result approval/finalization and next-episode operations.

### Builders that are safe to expose now
Only templates that can be mapped to supported canonical game types and the current Reality season engines. Examples can include a standard prediction or other supported play type when the current implementation already uses it.

### The Traitors
Treat “The Traitors” as **show scope**, not a new canonical `GamesEngine` type. Its builder should select the existing supported play/template path and connect it to the existing Reality season data.

### Castle Duel
No authoritative `CastleDuelEngine` was verified in the audited engine directory at this checkpoint. Do not add a Castle Duel builder in R2/R3 based only on design/prototype work. Re-audit if/when a production engine/API lands.

### DWTS
Manage Games contains DWTS scope inference, but that does not prove a dedicated DWTS engine or template. Do not invent one. A future Reality adaptation can add DWTS as a Show once a supported game template and result flow are explicit.

---

## 7. Awards target architecture

```text
Admin
└── Games & Design
    └── Awards
        └── Ceremony
            └── Year / Season
                ├── GAME BUILDER
                ├── MANAGE EXISTING GAMES
                ├── COMPETITIONS
                ├── CEREMONY DATA
                └── OPERATIONS
```

### Current implementation model
Awards Manager already understands multiple canonical game play types (`prediction`, `head-to-head`, `confidence`, `staked-prediction`, `wager`, `racing-wager`, `mixed`, `ranking`, `survivor`) and maps them to scoring modes. It then selects an existing PATTC game and creates/configures ceremony questions from official/manual or external market sources.

### Target Awards builder
1. Ceremony identity — Oscars / Emmys / other actual ceremony scope.
2. Year/season.
3. Canonical play model — Prediction, Confidence, Staked, Wager, Ranking, Hybrid, etc., limited to actual supported types.
4. Shared game timing / publication defaults.
5. Review.
6. Create authoritative game with existing game API.
7. Hand off immediately to Awards Manager to load categories/events/nominees/markets.
8. Optional competition placement after game exists.

### Oscars and Emmys
“oscars” and “emmys” should be ceremony/group identity, not arbitrary `GamesEngine.type` values. Existing records with legacy/custom data must remain unchanged; future builders should make the distinction explicit.

---

## 8. General / Custom target architecture

```text
Admin
└── Games & Design
    └── General / Custom
        └── Scope (optional)
            └── Season / Event (optional)
                ├── GAME BUILDER
                ├── MANAGE EXISTING GAMES
                ├── COMPETITIONS
                ├── DATA / QUESTIONS
                └── OPERATIONS
```

Recommended builder choices should come from the actual `GamesEngine.getSupportedGameTypes()` registry rather than free text:

- Prediction
- Head-to-Head
- Confidence
- Staked Prediction
- Wager
- Racing Wager where appropriate
- Team Fantasy only under the specialized Sports flow
- Hybrid / Mixed (advanced)
- Survivor where its source/round model is defined
- Voting
- Ranking

`season-cup` should be presented under Competitions rather than as an ordinary custom game template.

Manual category/question creation remains in Game Setup after the game exists. Template-based creation may clone or preconfigure existing supported game structures, but must ultimately create one authoritative Games record rather than a parallel schema.

---

## 9. Competition architecture

### Core rule

```text
CREATE GAME
→ GAME EXISTS AUTHORITATIVELY
→ OPTIONAL COMPETITION MEMBERSHIP
```

A competition references existing authoritative games. It does not copy or recreate them.

### What is already generic
`GamesEngine` already exposes fields sufficient for the current parent/child aggregation model:

- canonical `season-cup` type,
- `gameRole` (`parent`, `mini`, `standalone`),
- `parentGameId`,
- `includeInParent`,
- `parentContributionMode`,
- `parentContributionWeight`,
- `parentBestCount`,
- `placementPointsJSON`,
- hub/leaderboard behavior fields.

This is enough to support a future Competition Builder UI without a schema migration if the Director chooses to model Cup/Series/Tournament as presentation/configuration over the existing parent relationship.

### What is NFL-specific
- `NflCupFuturesEngine`
- `NflCupWeeklySeasonR2Engine`
- current NFL Cup Admin cards/control center
- NFL-specific qualification/season semantics

These should remain unchanged in R1–R4.

### What can remain as-is
- Existing Games rows and IDs.
- Existing parent/child relationships.
- Existing NFL Cup calculations and APIs.
- Existing `season-cup` records.

### What needs future abstraction
A generic Competition Builder would need a UI-level abstraction for:

- competition label/type (`Cup`, `Series`, `Tournament`),
- eligible child-game selection,
- contribution/scoring presentation,
- qualification rules,
- publication/standings presentation,
- validation that a child game exists and is compatible.

This does **not** imply new schema in this audit. First preference should be to map those concepts onto existing generic parent fields and leave NFL-specific fields where they are.

---

## 10. Current APIs/renderers to reuse

### Shared game creation/lifecycle
Reuse the existing frontend/API contracts already used by Manage Games:

- `apiAdminCreateGame(...)`
- `apiAdminCloneGame(...)`
- `apiAdminUpdateGame(...)`
- `apiAdminArchiveGame(...)`
- `apiAdminRunGamePreflight(...)`
- `adminGetGames` / existing game-list wrappers
- `renderAdminGamesPage()` / existing Manage Games components where a manager surface is needed
- `admin-game-setup:<gameId>` / existing Game Setup route for category/question content

### Team Fantasy
Reuse:

- `adminGetTeamFantasyDashboard`
- existing Team Fantasy settings/scoring/league/sync APIs invoked by `adminTeamFantasy.js`
- `SportsTeamFantasyEngine`
- `SportsTeamFantasyGameDayEngine`
- existing dedicated `renderAdminTeamFantasyPage()` manager

### Confidence
Reuse:

- `SportsConfidenceBuilderEngine`
- `SportsConfidenceAutoPickEngine`
- `SportsConfidenceRC24ACompletionEngine`
- existing sports admin bridge / schedule / score APIs

Do not reproduce sports-question generation in the frontend shell.

### Survivor
Reuse:

- `SportsSurvivorEngine`
- `SurvivorGameEngine`
- existing Survivor/KOTH compatibility APIs and locks
- existing sports schedule/score APIs

### Playoff Race / Forecast
Reuse:

- `NflPlayoffRaceEngine`
- existing Playoff Race timing/config card and load function
- existing standings/schedule source

### Sports season / operations
Reuse:

- `NflSeasonPackEngine`
- existing NFL Season / Sports Setup page
- `SportsAdminBridgeEngine`
- existing dedicated Sports Engine Controls page

### Awards
Reuse:

- `apiAdminAwardsGetDashboard()` and existing Awards API wrappers
- `AwardsManagerEngine`
- `CategoriesEngine`
- `CategoryResultsEngine`
- `ExternalResultsHubBridgeEngine`
- existing `renderAdminAwardsPage()`

### Reality
Reuse:

- existing Reality TV dashboard/API calls from `adminRealityTv.js`
- `RealityTvSeasonEngine`
- `RealityTvQuestionPackEngine`
- existing result approval/finalization operations

### Competition
Reuse:

- `GamesEngine` parent/child fields
- `NflCupFuturesEngine`
- `NflCupWeeklySeasonR2Engine`
- existing NFL Cup manager and current Cup relationships

---

## 11. Backend ownership that must remain unchanged

The builder/navigation work must not move business logic out of current authoritative engines.

- `GamesEngine`: game identity, supported types and shared Games-row semantics.
- Categories/question storage engines: generic question/category persistence.
- Picks/Scoring engines: existing scoring behavior.
- Sports Confidence engines: Confidence schedule/question/autopick/completion logic.
- Survivor engines: Survivor rules, locks, used-team state and scoring behavior.
- Team Fantasy engines: ranking/scoring/eligibility/usage/leagues/playoffs and trust/security boundaries.
- `NflPlayoffRaceEngine`: Playoff Race/forecast behavior and scoring.
- NFL Cup engines: existing Cup/Futures aggregation.
- Reality engines: contestants/episodes/question packs/result ingestion/approval.
- Awards engines: ceremony content/results/external market ingestion.
- Cloudflare/API routing: unchanged by the builder shell unless a later explicitly approved phase needs a route-only change.

A builder is an **orchestrator**, not a new engine.

---

## 12. Proposed implementation phases

### R1 — Architecture audit only
This document. No runtime change.

### R2 — Shared Game Builder navigation shell
- Add `Game Builder`, `Manage Existing Games`, `Competitions`, `Hub/Season Data`, `Operations` navigation model.
- No engine rewrite.
- No schema/API change.
- Keep old manager routes reachable while routing is proven.

### R3 — Sports builder routing using existing engines
- Build guided Confidence, Survivor, Team Fantasy and Playoff/Forecast entry flows.
- Call existing create API and existing sports engines.
- Explicitly surface data-source readiness.
- No scoring/gameplay changes.

### R4 — Manage Existing Games cleanup
- Remove creation responsibility from the normal Manage Existing Games presentation once R2/R3 is accepted.
- Preserve lifecycle, identity, publication, setup and specialized manager links.
- Do not delete legacy routes until acceptance proves parity.

### R5 — Competition Builder shell
- Select existing authoritative games.
- Map onto current parent/child model first.
- Keep NFL Cup engine behavior unchanged.

### R6 — Reality adaptation
- Add Show/Season-scoped builder shell around supported canonical types and current Reality engines.
- Do not invent DWTS/Castle templates without verified implementation.

### R7 — Awards adaptation
- Add Ceremony/Year builder that creates the game first and hands off to existing Awards Manager for content.

### R8 — General / Custom adaptation
- Guided interface over actual `GamesEngine` supported types.
- Replace free-text Type creation for new flows with canonical selections.

---

## 13. Risk register

| Risk | Severity | Why | Mitigation |
|---|---|---|---|
| Builder duplicates engine logic | Critical | Would create split ownership and regress scoring/gameplay | Builder must only orchestrate existing APIs/engines |
| New UI invents unsupported game types | High | Backend normalizes unsupported type to `prediction` | Populate type choices from canonical supported registry/mapped constants |
| Hub identity is confused with game type | High | Oscars/NFL/Traitors/DWTS are navigation scope, not necessarily engines | Separate Hub/Group/Season from canonical Type in every builder |
| Sports game created before source data is ready | High | Confidence/Survivor/Playoff require schedule/standings/team state | Add readiness checks and explicit data-source step before create/finalize |
| Team Fantasy trust/security boundary is bypassed | Critical | Dedicated engine owns sensitive qualification/scoring/state | Route to current manager/APIs; never reimplement in generic builder |
| Playoff Race type is guessed | High | No canonical `playoff-race` type exists in GamesEngine registry | R3 must inspect current production record representation and reuse it |
| Competition builder recreates child games | High | Would violate authoritative-game rule and existing relationships | Require selected existing game IDs only after creation |
| Existing NFL Cup fields are generalized too early | High | NFL semantics may not cleanly map to all competitions | R5 presentation abstraction first; no schema migration |
| Legacy game scope inference becomes persisted contract | Medium | Current name-based inference can be ambiguous | Use inference for legacy display only; builders write explicit scope fields where existing schema supports them |
| Awards Manager is moved into creation and loses current data workflow | High | It already works as destination-game question/data builder | Keep manager intact; builder creates game then hands off |
| Reality show-specific types are invented | High | Traitors/DWTS/Castle names do not prove canonical types | Expose only verified templates/engines |
| Manage Games cleanup happens before builders reach parity | High | Could strand admin workflows | R4 only after R2/R3 acceptance; preserve legacy route during transition |

---

## 14. Director decisions required before implementation

1. **Canonical separation:** Approve that Hub/League/Show/Ceremony/Season is navigation/scope and `GamesEngine.type` remains the engine/scoring type.
2. **Creation API:** Approve continued use of existing `apiAdminCreateGame(...)` as the authoritative initial Games-row creation API for the builder shell, with specialized engines invoked after it where required.
3. **Manage Games role:** Approve moving “New Game” out of the normal Manage Existing Games UX after builder parity, while keeping shared lifecycle/identity/status/display management there.
4. **Sports data gating:** Decide whether builders may create a Draft when schedule/standings source data is not ready, or must block creation until prerequisites pass. Recommendation: allow Draft identity creation but block “Ready/Preview/Active” progression until specialized preflight passes.
5. **Playoff Race persisted representation:** Before R3, explicitly confirm the current production Playoff Race Games row type/role. Do not add `playoff-race` to backend merely for UI convenience.
6. **Full League Forecast / Bottom Dwellers:** Decide only after R3 code-level verification whether these are modes of `NflPlayoffRaceEngine`, separate existing games, or not yet production features.
7. **Competition naming:** Decide whether Cup/Series/Tournament are UI-level competition kinds over existing `season-cup` parent fields initially. Recommendation: yes; avoid schema abstraction until proven necessary.
8. **NFL Sports Pack:** Keep as Season Setup / Operations convenience tool rather than a normal builder. Recommendation: yes.
9. **Awards handoff:** Approve flow `Create Awards game → open Awards Manager to populate ceremony content` rather than making Awards Manager create Games rows implicitly.
10. **Reality templates:** Approve that R6 exposes only templates proven against existing engines. The Traitors is a Show scope; DWTS/Castle are not new canonical types unless code proves otherwise.
11. **General builder:** Approve replacing free-text Type with supported canonical choices for new creation flows while leaving existing legacy game records untouched.
12. **No schema/API migration:** Confirm R2–R4 should prefer orchestration over current contracts before any request for backend abstraction.

---

## Audit evidence / authoritative code reviewed

Pinned to checkpoint `3504c7b63ade5b9f8b018d5a3f72684c1337fb90`:

- `frontend/js/pages/adminGamesRc24e.js` — Manage Games, generic New Game, clone/lifecycle, scope inference.
- `frontend/js/pages/adminGameSetup.js` — canonical setup behavior and per-question scoring/rule configuration.
- `frontend/js/pages/adminTeamFantasy.js` — dedicated Team Fantasy manager; requires game to exist first.
- `frontend/js/pages/adminSportsManagersR3.js` — NFL Cup, NFL Season Setup, Playoff Race and Sports Engine specialized manager pages.
- `frontend/js/pages/adminAwards.js` — existing-game destination selection and Awards question/data workflow.
- `frontend/js/pages/adminRealityTv.js` — Reality season/episode/result operations.
- `backend/engines/GamesEngine.js` — canonical supported game types and parent/child fields.
- `backend/engines/` inventory — current authoritative engine families, including Awards, Reality, sports, Cup, Confidence, Survivor, Team Fantasy and Playoff Race engines.

## Runtime-change confirmation

**No runtime behavior was changed.**  
**No production data was modified.**  
**No schema was migrated.**  
**No API was added or changed.**  
**No gameplay or scoring was changed.**  
**No merge was performed.**  
**No deploy was performed.**
