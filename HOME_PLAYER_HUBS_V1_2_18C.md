# Awards App v1.2.18c — Player Home + Game Hubs

## Goal
Turn Home into a player dashboard instead of a flat game/archive list.

## Player block
- Uses the general Profile photo, Display Name and optional Short Profile Note.
- Profile image is rendered as a square crop.
- Adds lightweight situation-based rotating/snarky comments. No AI/network request is used.
- Keeps a Profile button in the card.
- Career Stats are collapsed by default and still hydrate from verified archive history in the background.
- Trophy Room button opens the new Trophy Room foundation page.

## Home game workflow
- Needs Your Attention shows started games with unanswered/new categories.
- Games You're Playing shows games where the user has begun making picks.
- New Games Available shows active games the user has not started.
- Archived games are removed from Home.
- Existing league standings continue to hydrate after the main Home render.

## Hubs
Dashboard payload assigns each game a hub category and subgroup:
- Sports: NFL, MLB, NBA, NHL, NCAA, NASCAR, Formula 1, Soccer, Racing/Other Sports.
- Reality: Survivor, MasterChef, Top Chef, The Traitors, The Amazing Race, DWTS, Big Brother, Other Reality.
- Awards: Oscars, Emmys, Grammys, Golden Globes, Tony Awards, Other Awards.
- General: everything else, grouped by game type.

Each subgroup includes:
- Needs Attention
- My Active Games
- Available to Play
- Past / Archived Games

## Navigation
Mobile/app bottom navigation is now:
Home / Sports / Reality / Awards / More

More contains General Games, Trophy Room, Profile, My Leagues, Admin (admins only), and Log Out.

## Performance
- The small general profile is included inside the existing Dashboard backend request instead of adding another blocking browser request.
- Career history and league standings remain post-render/background hydration.

## Future Trophy Room
The page currently shows game wins, podiums and ranked finishes. Admin-created awards/trophies remain the next Trophy Room phase.
