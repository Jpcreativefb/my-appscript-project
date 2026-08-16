# Sports Confidence Week Builder — v1.2.16

## Purpose
Keep the existing Confidence Game/scoring workflow and make weekly sports setup fast.

## Admin workflow
1. Open Sports.
2. In **Sports Builders**, choose League.
3. Choose **League Week** (NFL/college football) or Date Range.
4. Choose Season Year, Phase, and Week.
5. Click **Pick Games for Confidence**.
6. Keep/remove the desired pregame matchups.
7. Choose a Confidence-enabled destination game in Setup, Preview, or Live.
8. Add the selected games.

## What is created automatically
Each selected game creates one Confidence question with:
- question text `Who will win? Away @ Home`
- Away and Home team choices
- `ScoreMode = confidence-points`
- Sports Scores Engine linkage via `SportsGameId` and `ESPNEventId`
- `ResultSource = sports-engine`
- kickoff time as `LockDateTime`
- sports/team metadata and logos
- duplicate protection by destination GameId + sports event

## Settlement
The existing sports finalizer resolves the winner from the Sports Scores Engine. The existing Confidence scoring engine then awards the user's assigned confidence points.

A tied Confidence matchup is written as a **push/no-points** resolution; wager-specific half-refund behavior is not used for Confidence.

## Safety
- Admin-only.
- Destination must be Confidence-enabled and in Setup, Preview, or Live.
- Draft and Archived destinations are excluded.
- Games already in progress/final are disabled in the picker and rejected server-side.
- Existing Confidence scoring behavior is unchanged.
