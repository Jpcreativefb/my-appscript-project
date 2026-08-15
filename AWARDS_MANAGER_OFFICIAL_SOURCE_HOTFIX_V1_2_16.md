# Awards Manager Official Source Hotfix — v1.2.16

## Purpose

Awards Manager can now keep the prediction-market provider link while preferring an official awards/results website as the human result reference.

## Behavior

- `View Event` shows an **Official Website URL (preferred result source)** field.
- Kalshi settlement-source URLs or provider resolution URLs are auto-filled when they point outside Kalshi/Polymarket.
- Admin can paste/replace the official URL manually.
- **Open Official Site** opens that URL for verification.
- Creating a question stores the official URL as the category source when present.
- Provider URL remains stored in source configuration and External Results Hub market mappings.
- Source priority is recorded as `official -> provider -> manual`.
- Automatic settlement remains disabled and administrator review remains required.

## Asset marker

`321-awards-official-source-v1216`
