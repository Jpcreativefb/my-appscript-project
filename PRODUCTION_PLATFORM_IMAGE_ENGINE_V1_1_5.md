# Production Platform Image Engine v1.1.5

## Purpose

This release adds one shared, zero-charge image delivery layer for the main app.
It covers the current dynamic image render points used by:

- Reality TV contestants, groups, episode questions, and Season Survivor
- Awards nominees, comparison cards, archives, and leaderboards
- Sports teams, leagues, players, starters, props, and wager cards
- Racing images rendered through the sports and betting pages
- Game dashboard hero images
- Admin previews and profile avatars

The External Results Hub is a separate project and is not changed by this package.

## Default mode: always free

`frontend/js/config.js` keeps the engine in `browser` mode. This mode:

- Requires no Cloudflare Images subscription.
- Requires no R2 bucket.
- Requires no Worker.
- Works on `pages.dev` and VS Code Live Server.
- Uses native lazy loading, IntersectionObserver, asynchronous decoding, fixed dimensions, and browser caching.
- Uses smaller provider-native URLs where a safe provider rule exists for TMDB, ESPN team logos, Google Drive thumbnails, and Google-hosted images.
- Falls back to the original image URL if an optimized URL fails.

## Optional locally hosted images

Only copy and host images when you have permission to do so.

1. Install Pillow once:

   ```bash
   python3 -m pip install Pillow
   ```

2. Create folders under `media-source`, for example:

   ```text
   media-source/
     reality/
     awards/
     sports/
     racing/
     logos/
     heroes/
   ```

3. Put original JPG, PNG, WebP, GIF, BMP, or TIFF files in those folders.

4. Run:

   ```bash
   python3 tools/optimize_local_images.py
   ```

5. Commit the generated files under:

   ```text
   frontend/assets/images/
   ```

The full-size originals under `media-source/` are ignored by Git and are not deployed.

## Using a generated asset

A source file at:

```text
media-source/reality/survivor-50/jane-doe.jpg
```

is registered as:

```text
asset:reality/survivor-50/jane-doe
```

Put that asset address in the existing image URL field. The app automatically chooses the correct generated variant for the screen:

- `thumb` for compact rows
- `card` for pick cards
- `profile` for biographies and larger profiles
- `logo` or `icon` for team/group/league art
- `hero` for game banners

## Cloudflare transformation mode

Cloudflare URL transformations are deliberately disabled. A `pages.dev` hostname is not a dependable transformation origin. Only enable this mode later when a custom domain in a Cloudflare zone is available.

Keep this zero-charge configuration:

```js
window.PLATFORM_IMAGE_CONFIG = {
  enabled: true,
  mode: "browser",
  cloudflareBaseUrl: "",
  transformExternal: false,
  providerOptimization: true,
  lazyRootMargin: "350px 0px"
};
```

## Diagnostics

Open the browser console and run:

```js
PlatformImageEngine.metrics()
```

It reports discovered, requested, loaded, provider-optimized, local-manifest, fallback, failed, and background-image counts.

## Important boundary

The engine handles image delivery and rendering. It does not:

- Make Apps Script spreadsheet requests faster by itself.
- Automatically copy every third-party image into the project.
- Grant permission to rehost copyrighted images.
- Modify the separate External Results Hub frontend.
