# Awards Manager v1.2.13

## Fixes
- Create Question now batch-creates answers with `adminBulkCreateNominees`.
- External Results Hub bridge now supports Awards Manager single-market mapping jobs.
- Grouped provider events can create one Awards App question with many answers.
- Each grouped answer maps to the `Yes` outcome of its corresponding provider market.
- Grouped answer labels are editable before creation.
- Auto-settlement remains off and administrator review remains required.

## Example
A provider event with binary team markets:
- Will Kansas City win the Super Bowl?
- Will Buffalo win the Super Bowl?
- Will Philadelphia win the Super Bowl?

can become one Awards App question:
- Who will win the Super Bowl?
  - Kansas City
  - Buffalo
  - Philadelphia

Each answer retains its own provider market mapping and probability.
