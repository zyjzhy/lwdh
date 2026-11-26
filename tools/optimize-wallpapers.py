"""Convert local wallpapers to WebP and point styles.css at them.

Maintenance-time tool only: requires Pillow (`pip install pillow`).
Original JPG/PNG files are kept as sources so the conversion can be re-run.
"""

from pathlib import Path
import re

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = sorted((ROOT / "wallpapers").glob("*.jpg")) + [
    ROOT / "wallpaper-window.png",
    ROOT / "123.jpg",
]


def convert() -> None:
    for src in SOURCES:
        dst = src.with_suffix(".webp")
        quality = 72 if src.name == "wallpaper-window.png" else 68
        with Image.open(src) as im:
            im.convert("RGB").save(dst, "WEBP", quality=quality, method=6)
        print(f"{src.name} -> {dst.name}: {dst.stat().st_size / 1024:.0f} KB")


def rewrite_css() -> None:
    css_path = ROOT / "styles.css"
    css = css_path.read_text(encoding="utf-8-sig")
    css = re.sub(r"(wallpapers/[^'\")\s]+)\.jpg", r"\1.webp", css)
    css = css.replace("wallpaper-window.png", "wallpaper-window.webp")
    css = re.sub(r"(?<![\w/])123\.jpg", "123.webp", css)
    css_path.write_text(css, encoding="utf-8")
    print(f"updated {css_path.name}")


if __name__ == "__main__":
    convert()
    rewrite_css()
