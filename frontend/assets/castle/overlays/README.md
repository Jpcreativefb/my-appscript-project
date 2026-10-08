# Castle Portrait Overlay Geometry

All production overlays use `width="320" height="420" viewBox="0 0 320 420"`.

Shared geometry:
- Outer canvas: 320 × 420
- Portrait opening / visible image zone: x=13, y=13, width=294, height=329
- Nameplate: x=13, y=340, width=294, height=68
- Recommended HTML name baseline: y≈369
- Recommended HTML role baseline: y≈397
- Center accent anchor: x=160, y=335

Recommended DOM layering:
1. Card container (320:420 aspect ratio)
2. Google Drive portrait `<img>` using `object-fit: cover`
3. Optional state photo filter (grayscale only for eliminated)
4. SVG overlay asset positioned absolute inset 0
5. HTML name text positioned over nameplate
6. HTML role label positioned beneath name

Hidden Traitor is the only overlay that intentionally supplies generic mystery art and should not render or preload a real portrait beneath it.
