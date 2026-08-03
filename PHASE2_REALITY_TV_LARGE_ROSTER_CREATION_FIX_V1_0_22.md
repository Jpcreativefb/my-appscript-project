# Phase 2 Reality TV Large Roster Creation Fix v1.0.22

## Problem
Creating a Reality TV season with a full historical cast and long image URLs could fail or time out with only the generic message "Could not create the season."

## Root causes fixed
- The entire contestant roster was sent through a GET/JSONP URL.
- Long image URLs could make the request too large.
- Contestants and External Results Hub mappings were written one row at a time.
- The frontend discarded useful connection/error messages.
- Retrying after a partial timeout could be blocked by a partially created season.

## Changes
- Season creation and existing-season bulk contestant additions now use POST.
- The Apps Script POST dispatcher accepts the two Reality TV large-write actions.
- Contestants, Hub subjects, and Hub mappings are written in batches.
- Interrupted Episode 1 setup can be rerun safely.
- Missing Episode 1 answers are added during repair without duplicating existing answers.
- Existing completed season creation returns a successful duplicate/refresh response.
- Detailed backend or network error messages are shown in the manager.
- Past episode dates remain allowed for historical-season backfill.

## Deployment
This fix changes both Apps Script backend and Cloudflare frontend files.

1. Replace the changed files.
2. Run `clasp push -f`.
3. Edit the existing Apps Script web-app deployment and select **New version**.
4. Commit and push the frontend files to GitHub.
5. Hard-refresh after Cloudflare deploys.

## Retry behavior
After deployment, use the same season details and click **Create Season & Episode 1** again.
- If the first attempt created nothing, creation starts normally.
- If it created only part of the season, the manager repairs it.
- If it finished after the browser timed out, the manager reports that the season already exists and refreshes the dashboard.
