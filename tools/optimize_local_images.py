#!/usr/bin/env python3
"""Build small WebP image variants for Cloudflare Pages static delivery.

Only place images in media-source when you have permission to copy and host them.
The source folder is intentionally outside frontend so the large originals are not
published. Optimized outputs and a JavaScript manifest are written under frontend.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, Tuple

try:
    from PIL import Image, ImageOps
except ImportError as exc:  # pragma: no cover - friendly CLI failure
    raise SystemExit(
        "Pillow is required. Install it with: python3 -m pip install Pillow"
    ) from exc

SUPPORTED = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"}

PORTRAIT_VARIANTS: Dict[str, Tuple[int, int, str, int]] = {
    "thumb": (120, 150, "cover", 74),
    "card": (240, 300, "cover", 76),
    "profile": (480, 600, "cover", 78),
}
LOGO_VARIANTS: Dict[str, Tuple[int, int, str, int]] = {
    "icon": (64, 64, "contain", 76),
    "logo": (160, 160, "contain", 80),
}
HERO_VARIANTS: Dict[str, Tuple[int, int, str, int]] = {
    "hero": (1200, 675, "cover", 80),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compress permission-cleared app images into standard WebP variants."
    )
    parser.add_argument(
        "--input",
        default="media-source",
        help="Folder containing original images (default: media-source)",
    )
    parser.add_argument(
        "--output",
        default="frontend/assets/images",
        help="Published output folder (default: frontend/assets/images)",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Delete generated WebP files before rebuilding.",
    )
    return parser.parse_args()


def safe_key(path: Path) -> str:
    no_suffix = path.with_suffix("").as_posix().strip("/")
    return re.sub(r"[^A-Za-z0-9/_-]+", "-", no_suffix).strip("-")


def infer_kind(relative_path: Path) -> str:
    parts = [part.lower() for part in relative_path.parts]
    joined = "/".join(parts)
    if any(token in joined for token in ("logo", "logos", "icon", "icons", "team", "teams", "league", "tribe", "group")):
        return "logo"
    if any(token in joined for token in ("hero", "heroes", "banner", "background", "backdrop")):
        return "hero"
    return "portrait"


def variants_for(kind: str) -> Dict[str, Tuple[int, int, str, int]]:
    if kind == "logo":
        return LOGO_VARIANTS
    if kind == "hero":
        return HERO_VARIANTS
    return PORTRAIT_VARIANTS


def flatten_animation(image: Image.Image) -> Image.Image:
    try:
        image.seek(0)
    except EOFError:
        pass
    return image.copy()


def prepare(image: Image.Image) -> Image.Image:
    image = flatten_animation(image)
    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "transparency" in image.info else "RGB")
    return image


def resize_cover(image: Image.Image, width: int, height: int) -> Image.Image:
    return ImageOps.fit(image, (width, height), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def resize_contain(image: Image.Image, width: int, height: int) -> Image.Image:
    contained = ImageOps.contain(image, (width, height), method=Image.Resampling.LANCZOS)
    has_alpha = contained.mode == "RGBA"
    canvas = Image.new("RGBA" if has_alpha else "RGB", (width, height), (255, 255, 255, 0) if has_alpha else (255, 255, 255))
    left = (width - contained.width) // 2
    top = (height - contained.height) // 2
    if has_alpha:
        canvas.alpha_composite(contained, (left, top))
    else:
        canvas.paste(contained, (left, top))
    return canvas


def output_relative_url(output_root: Path, file_path: Path) -> str:
    relative = file_path.relative_to(output_root).as_posix()
    return "./assets/images/" + relative


def iter_images(source_root: Path) -> Iterable[Path]:
    for path in sorted(source_root.rglob("*")):
        if path.is_file() and path.suffix.lower() in SUPPORTED:
            yield path


def main() -> int:
    args = parse_args()
    project_root = Path(__file__).resolve().parent.parent
    source_root = (project_root / args.input).resolve()
    output_root = (project_root / args.output).resolve()

    source_root.mkdir(parents=True, exist_ok=True)
    output_root.mkdir(parents=True, exist_ok=True)

    if args.clean:
        for generated in output_root.rglob("*.webp"):
            generated.unlink()

    manifest: Dict[str, Dict[str, str]] = {}
    processed = 0
    failed = 0

    for source in iter_images(source_root):
        relative = source.relative_to(source_root)
        key = safe_key(relative)
        kind = infer_kind(relative)
        target_dir = output_root / relative.parent
        target_dir.mkdir(parents=True, exist_ok=True)
        entry: Dict[str, str] = {"kind": kind}

        try:
            with Image.open(source) as opened:
                image = prepare(opened)
                for variant_name, (width, height, fit, quality) in variants_for(kind).items():
                    resized = resize_contain(image, width, height) if fit == "contain" else resize_cover(image, width, height)
                    target = target_dir / f"{source.stem}.{variant_name}.webp"
                    save_args = {
                        "format": "WEBP",
                        "quality": quality,
                        "method": 6,
                    }
                    if resized.mode == "RGBA":
                        save_args["lossless"] = False
                    resized.save(target, **save_args)
                    entry[variant_name] = output_relative_url(output_root, target)

            fallback_order = ("profile", "card", "thumb", "logo", "icon", "hero")
            entry["original"] = next((entry[name] for name in fallback_order if name in entry), "")
            manifest[key] = entry
            processed += 1
            print(f"OK  {relative} -> {kind}")
        except Exception as exc:  # pylint: disable=broad-except
            failed += 1
            print(f"ERR {relative}: {exc}", file=sys.stderr)

    json_path = output_root / "image-manifest.json"
    js_path = output_root / "image-manifest.js"
    json_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    js_path.write_text(
        "// Generated by tools/optimize_local_images.py\n"
        "window.PLATFORM_IMAGE_MANIFEST = "
        + json.dumps(manifest, separators=(",", ":"), sort_keys=True)
        + ";\n",
        encoding="utf-8",
    )

    print(f"\nGenerated {processed} image entries. Failed: {failed}.")
    print(f"Manifest: {js_path.relative_to(project_root)}")
    if processed == 0:
        print("Add permission-cleared images under media-source, then run this command again.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
