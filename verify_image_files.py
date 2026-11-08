import os
from PIL import Image

base = r"d:\phim ai thời trang\data\assets\prj_1507511d78c4"
files = [
    ("Pos 1", "asset_f48d6e3de6dd-image.png.png"),
    ("Pos 2", "asset_17238b519fcd-image.png.png"),
    ("Pos 3", "asset_efd6cf3fd6d0-image.png.png"),
    ("Pos 4", "asset_0b5f6daf449e-image.png.png"),
    ("Pos 5", "asset_7fccdbf29be3-image.png.png"),
    ("Pos 6", "asset_0fd42709e000-image.png.png"),
    ("Pos 7", "asset_f9a71ac49dff-image.png.png"),
    ("Pos 8", "asset_main_character_hero.png")
]

for pos, fname in files:
    p = os.path.join(base, fname)
    if os.path.exists(p):
        im = Image.open(p)
        print(f"{pos} -> {fname}: size={im.size}, format={im.format}")
    else:
        print(f"{pos} -> NOT FOUND: {fname}")
