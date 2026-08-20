# v1.2.18c1 — Home Identity + Hub Appearance

Focused visual cleanup after v1.2.18c.

## Player Home
- Snark line is smaller and fades/collapses after a few seconds.
- Profile and Trophy Room buttons share one compact row.
- Career Stats no longer has the white status/header block.
- Games / Wins / Top 3 remain visible in the compact Career row; tiny `more` control expands Avg Finish + Accuracy.
- When Home scrolls, only the square profile image and Display Name remain in a compact sticky player bar.

## Game cards
- Home and Hub game cards inherit the game's assigned Theme Color.
- Hero artwork is restored to mobile cards and can cover the full card surface.
- Drive HeroImageFileId is used as a fallback when HeroImage URL is blank.
- Attention, Discover, Active, League-standing, and Archived cards use game color/artwork instead of white cards.

## Hub + Navigation Appearance
Appearance Manager now includes a Hub + Navigation Appearance editor.

It supports:
- Main hubs: Home, Sports, Reality, Awards, General, More.
- Sports subhubs: NFL, MLB, NBA, NHL, NCAA, NASCAR, Formula 1, Soccer, Other Sports.
- Reality subhubs: Survivor, MasterChef, Top Chef, The Traitors, Amazing Race, DWTS, Big Brother, Other Reality.
- Awards subhubs: Oscars, Emmys, Grammys, Golden Globes, Tony Awards, Other Awards.
- Display name.
- Primary color.
- Hub/subhub image upload.
- Hub/nav icon upload with emoji/text fallback.
- Bottom-nav label show/hide for Home, Sports, Reality, Awards and More.

Settings are stored in a new `AppearanceHubSettings` sheet. The sheet is created automatically by Appearance setup.

## Performance
Dashboard hub appearance is cached in Apps Script for five minutes and invalidated immediately when Admin saves a Hub Appearance setting.
