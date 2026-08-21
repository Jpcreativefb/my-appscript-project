# v1.2.18d — Scoreboard / Leaderboard Appearance

Adds one reusable Theme Pack section for standings presentation across the Awards App.

## Appearance Studio
Theme Packs now include **Leaderboard / Standings** controls for:
- Cards, compact rows, or table-like layout
- Compact / standard / comfortable density
- Solid or gradient row backgrounds
- Row opacity, border, radius, spacing, text and muted text
- Rank circle / pill / plain styles
- Player photo visibility, size and shape
- Career Stats and Compare button visibility
- Top 3 colors
- Current-player highlighting
- Stat visibility for score, remaining, win chance, statues, wager stats, mini games and season/survivor stats
- Home / Hub mini-scoreboard background and gradient
- Live preview inside Appearance Studio

## Runtime surfaces
- Full standard Leaderboard page
- Full Wager Leaderboard page
- Reality compact leaderboard rows inside Picks
- Home / My Leagues mini scoreboard

The game-specific Theme Pack controls these surfaces. Public leaderboard identity continues to use the game-specific Display Name/avatar while the internal username remains the scoring/career identity.

## Deployment
Frontend-only. No Apps Script deployment is required because Leaderboard settings are stored inside the existing ThemeJSON field.
