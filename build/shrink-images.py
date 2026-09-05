"""Downscale images for the site. Max 1200px wide, JPEG quality 82.
Usage: python build/shrink-images.py SRC_DIR DST_DIR
Kept out of the pages themselves: the site has no build step for HTML."""
import sys, os
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for name in sorted(os.listdir(src)):
    path = os.path.join(src, name)
    root, ext = os.path.splitext(name)
    if ext.lower() not in (".png", ".jpg", ".jpeg"):
        continue
    im = Image.open(path)
    if im.width > 1200:
        im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    # Screenshots with few colours stay PNG; photos become JPEG.
    out = os.path.join(dst, root + ".jpg")
    im.convert("RGB").save(out, "JPEG", quality=82, optimize=True)
    print(f"{os.path.getsize(path)//1024:6d} KB -> {os.path.getsize(out)//1024:5d} KB  {root}.jpg")
