# Sports Confidence Server Loader Hotfix v1.2.16

## Problem
The Confidence week picker loaded Sports Scores Engine data directly in the browser through JSONP. A transient or blocked Apps Script script load produced `Sports API script failed to load` before the weekly Confidence batch could run.

## Fix
- Confidence week loading now goes through the authenticated Awards App backend.
- The Awards backend calls the Sports Scores Engine server-to-server with the existing `sportsWagerFetchJson_` transport.
- The Confidence builder no longer depends on the browser loading the Sports Scores Engine as a `<script>` tag.
- The 16-game grouped Confidence batch writer and duplicate recovery remain unchanged.
- The normal Sports scoreboard transport remains unchanged.

## Recovery
Re-run the same NFL week after deployment. Existing Confidence questions are detected as duplicates and only missing matchups are created.
