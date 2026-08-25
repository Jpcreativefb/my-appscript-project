# PATTC Predicts v1.2.19-rc8 — Sports Wager Integrity Certification

Functional production certification found that Sports → Create Wager could write the legacy Categories and CategorySettings rows while a recent normalized-storage sync marker prevented the new option rows from reaching Questions / QuestionOptions immediately. Admin Run Check then saw the wager category but reported no active nominees/answers.

RC8 keeps wager math and settlement rules unchanged. It repairs only the storage/integrity boundary:

- Newly created Sports Wager markets are synchronized into normalized Questions / QuestionOptions before create returns.
- Re-creating an already existing wager market acts as a repair path for partial historical rows.
- Sports cache invalidation clears the normalized legacy-sync marker before the forced synchronization.
- Wager preflight performs a narrow setup-integrity repair before validation, so current partial markets can be repaired by Run Check without spreadsheet editing.
- Duplicate CategorySettings DisplayOrder values inside a wager game are made unique while preserving other games.

## Live certification

After deployment, run Check on `Production Test - Wager`. Expected result:

- no `has no active nominees/answers` errors for Sports Wager markets;
- no duplicate DisplayOrder warning for those repaired markets;
- `No default game is currently set` may remain as the expected test-game warning;
- a market with `pending-real-odds` may remain non-wagerable until numeric odds are available and is not itself a storage failure.
