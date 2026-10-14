#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PROD = ROOT / "frontend/assets/castle/production"
ATLAS = PROD / "castle-production-r3-atlas.webp"
INVENTORY = PROD / "CASTLE_PRODUCTION_ART_R3_INVENTORY.md"
README = PROD / "README.md"
REVIEW_SVG = PROD / "review/castle-production-art-r3-contact-sheet.svg"
AUDIT = PROD / "STANDALONE_RUNTIME_EXPORT_AUDIT.txt"

ATLAS_NAME = "castle-production-r3-atlas.webp"
ATLAS_RUNTIME = "/assets/castle/production/castle-production-r3-atlas.webp"

svg_dim = re.compile(r'<svg[^>]*\bwidth="(?P<w>\d+)"[^>]*\bheight="(?P<h>\d+)"', re.I)
img_tag = re.compile(r'<image\b[^>]*>', re.I)
attr = lambda name: re.compile(rf'\b{name}="(?P<v>-?\d+)"', re.I)

if not ATLAS.exists():
    raise SystemExit(f"Missing atlas: {ATLAS}")

atlas = Image.open(ATLAS)
atlas.load()

wrappers = []
for svg in sorted(PROD.rglob("*.svg")):
    text = svg.read_text(encoding="utf-8")
    if ATLAS_NAME in text:
        wrappers.append((svg, text))

if not wrappers:
    raise SystemExit("No atlas-backed SVG wrappers found; refusing no-op export")

exported = []
for svg, text in wrappers:
    m = svg_dim.search(text)
    it = img_tag.search(text)
    if not m or not it:
        raise SystemExit(f"Could not parse wrapper geometry: {svg}")
    tag = it.group(0)
    width = int(m.group("w"))
    height = int(m.group("h"))
    mx = attr("x").search(tag)
    my = attr("y").search(tag)
    if not mx or not my:
        raise SystemExit(f"Missing crop coordinates: {svg}")
    x = int(mx.group("v"))
    y = int(my.group("v"))
    left = -x
    top = -y
    right = left + width
    bottom = top + height
    if left < 0 or top < 0 or right > atlas.width or bottom > atlas.height:
        raise SystemExit(f"Crop outside atlas for {svg}: {(left, top, right, bottom)} atlas={atlas.size}")
    crop = atlas.crop((left, top, right, bottom))
    if crop.size != (width, height):
        raise SystemExit(f"Wrong crop size for {svg}: {crop.size} != {(width, height)}")
    out = svg.with_suffix(".webp")
    # Lossless WebP avoids introducing another lossy generation; pixels are the
    # exact decoded pixels from the already-approved R3 atlas crop.
    crop.save(out, "WEBP", lossless=True, method=6)
    with Image.open(out) as check:
        check.load()
        if check.size != (width, height):
            raise SystemExit(f"WebP verification failed for {out}: {check.size}")
    exported.append((svg, out, width, height))

# Update authoritative inventory to direct standalone WebP runtime paths.
inv = INVENTORY.read_text(encoding="utf-8")
inv = inv.replace(
    "Individual raster compositions are exported as small SVG runtime files backed by one shared WebP atlas. This keeps every asset independently addressable while avoiding dozens of duplicate raster payloads. Dynamic TV contestant and PATTC player photographs remain interchangeable and are never baked into portrait-state overlays.",
    "Every raster Production Art item is exported as its own directly loadable standalone WebP. No runtime production image depends on a shared atlas, nested SVG image reference, or runtime crop coordinates. Dynamic TV contestant and PATTC player photographs remain interchangeable and are never baked into portrait-state overlays."
)
inv = re.sub(r'^\| Shared \| Production raster atlas \|.*\n', '', inv, flags=re.M)
for old, new, width, height in exported:
    old_rel = old.relative_to(ROOT).as_posix()
    new_rel = new.relative_to(ROOT).as_posix()
    inv = inv.replace(f"`{old_rel}`", f"`{new_rel}`")
inv = inv.replace("SVG wrapper → shared WebP atlas", "WebP")
inv = inv.replace("inside the atlas-backed export", "in the standalone WebP export")
inv = inv.replace(
    "`frontend/assets/castle/production/host/host-teal-source.svg` is the approved supplied Host/show source export.",
    "`frontend/assets/castle/production/host/host-teal-source.webp` is the approved supplied Host/show source export."
)
# Replace any older standalone-audit section to keep inventory authoritative.
inv = re.sub(r'\n## Standalone runtime packaging audit\n.*\Z', '', inv, flags=re.S)

# Remove old wrappers and shared atlas only after all standalone exports verify.
for old, new, width, height in exported:
    old.unlink()
ATLAS.unlink()
if REVIEW_SVG.exists():
    REVIEW_SVG.unlink()

remaining_svg = sorted(PROD.rglob("*.svg"))
for svg in remaining_svg:
    txt = svg.read_text(encoding="utf-8")
    if ATLAS_NAME in txt or "/frontend/assets/" in txt or re.search(r'<image\b', txt, re.I):
        raise SystemExit(f"Remaining Production SVG is not self-contained: {svg}")

standalone = sorted(PROD.rglob("*.webp"))
if len(exported) != 46:
    raise SystemExit(f"Expected 46 atlas-backed runtime exports, got {len(exported)}")
if any(p.name == ATLAS_NAME for p in standalone):
    raise SystemExit("Shared atlas still present")

inv += "\n\n## Standalone runtime packaging audit\n\n"
inv += "- Shared atlas runtime dependency: **REMOVED**\n"
inv += "- Atlas-backed SVG runtime wrappers: **REMOVED**\n"
inv += "- Runtime crop-coordinate dependency: **REMOVED**\n"
inv += f"- Standalone raster Production Art exports: **{len(exported)} WebP files**\n"
inv += "- Production SVGs retained only when self-contained vector artwork/overlays: **VERIFIED**\n\n"
inv += "### Self-contained Production SVGs retained\n\n"
for svg in remaining_svg:
    inv += f"- `{svg.relative_to(ROOT).as_posix()}`\n"
INVENTORY.write_text(inv, encoding="utf-8")

README.write_text(
    "# PATTC Castle Production Art R3\n\n"
    "Every raster Production Art runtime item is a direct standalone WebP.\n\n"
    "- No runtime item depends on `castle-production-r3-atlas.webp`.\n"
    "- No raster runtime item is an SVG wrapper around another raster.\n"
    "- No runtime crop coordinates are required.\n"
    "- Remaining Production SVGs are self-contained vector overlays/treatments only.\n"
    "- Dynamic contestant and PATTC player portraits remain separate and interchangeable.\n",
    encoding="utf-8",
)

lines = [
    "PATTC CASTLE PRODUCTION ART R3 — STANDALONE RUNTIME EXPORT AUDIT",
    "",
    f"standalone_webp_created={len(exported)}",
    "shared_atlas_present=NO",
    "atlas_backed_svg_wrappers_present=NO",
    "bad_frontend_assets_runtime_refs=0",
    "remaining_production_svg_external_image_refs=0",
    "",
    "STANDALONE WEBP FILES",
]
lines.extend(new.relative_to(ROOT).as_posix() for old, new, w, h in exported)
lines += ["", "SELF-CONTAINED SVG FILES RETAINED"]
lines.extend(svg.relative_to(ROOT).as_posix() for svg in remaining_svg)
AUDIT.write_text("\n".join(lines) + "\n", encoding="utf-8")

print(f"Exported {len(exported)} standalone WebPs")
print(f"Retained {len(remaining_svg)} self-contained Production SVGs")
print("Shared atlas removed")
print("Runtime wrapper dependency removed")
