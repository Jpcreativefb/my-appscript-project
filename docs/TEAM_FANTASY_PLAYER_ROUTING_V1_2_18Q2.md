# Team Fantasy Player Routing v1.2.18q2

Corrected release-control build for the failed v1.2.18q candidate.

The original q installer stopped safely because its lite Dashboard progress patch depended on an exact interior source snippet. q2 replaces those fragile interior replacements with function-aware edits keyed to the existing AppDataEngine function names.

Runtime change remains limited to `backend/engines/AppDataEngine.js`.

Behavior:
- preserves `team-fantasy` as a Dashboard mode;
- labels the game Team Fantasy Football;
- uses Make Lineup / Continue Lineup actions;
- bypasses generic Category progress in lite and full Dashboard paths;
- places Team Fantasy in Sports / NFL;
- shows Locks by NFL kickoff in lite Home and full Dashboard paths;
- preserves v1.2.18p fast preflight;
- preserves Notifications and Reality TV compatibility.
