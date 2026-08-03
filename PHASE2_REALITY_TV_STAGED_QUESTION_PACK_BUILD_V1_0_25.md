# Phase 2 Reality TV Staged Question Pack Build v1.0.25

## Problem fixed

`Save & Build Current Episode` could exceed the Cloudflare request window while it created several questions, copied contestant/tribe answers, and wrote External Results Hub markets and mappings. The browser then received a 524 timeout even when part of the work had completed.

## New workflow

The button now performs a short setup request and creates a normalized build job in `RealityQuestionBuildJobs`. The browser then continues the build in small retry-safe stages:

1. Build or repair one Game Setup question and its answers.
2. Sync that question's Hub market, subjects, and mappings.
3. Move to the next enabled question type.
4. Mark the build complete.

A timeout can be resumed without duplicating questions, answers, markets, or mappings.

## Administrator experience

- The button shows `Resume Build (x/y)` when an unfinished job exists.
- Progress and the last saved stage are shown in the Episode Question Pack panel.
- Connection timeouts are retried automatically.
- If the browser is refreshed, the saved build job remains available.
- An interrupted v1.0.24 build can be safely repaired by saving the pack again.

## Performance improvements

The local builder no longer reloads the full Game Setup after every newly created question. It reuses the current setup snapshot and only reloads when recovering from an already-created category.

## New backend action

`adminContinueRealityTvQuestionPackBuild`

## New normalized sheet

`RealityQuestionBuildJobs`

## Deployment

This release changes both Apps Script and frontend files. Push the backend, create a new Apps Script deployment version, then push the frontend to GitHub/Cloudflare.
