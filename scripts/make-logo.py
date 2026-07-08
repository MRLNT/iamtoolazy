#!/usr/bin/env python3
# Generates the iamtoolazy koala logo (pixel art, PIL) — no external
# assets, no copyright issues. Outputs:
#   assets/logo.png                     512px, transparent background
#   assets/logo-dark.png                512px, on the terminal-dark tile
#   packages/extension/icons/icon{16,32,48,128}.png  (dark tile)
# A koala sleeping on the job: eyes closed, conserving tokens.
from PIL import Image, ImageDraw

# 22x22 pixel map. Legend:
# . transparent   D dark outline   G fur gray   L light fur
# E ear inner     N nose           Z closed-eye line
MAP = """
......................
...DDD.........DDD....
..DGGGD.......DGGGD...
.DGEEEGD.....DGEEEGD..
.DGEEEGGDDDDDGGEEEGD..
.DGEEGGGGGGGGGGGEEGD..
..DGGGGGGGGGGGGGGGD...
..DGGGGGGGGGGGGGGGD...
.DGGGGGGGGGGGGGGGGGD..
.DGGLLGGGGGGGGGLLGGD..
.DGGZZGGGGGGGGGZZGGD..
.DGGGGGGDNNNDGGGGGGD..
.DGGGGGGNNNNNGGGGGGD..
.DGGGGGGDNNNDGGGGGGD..
.DGGGGGGGDDDGGGGGGGD..
..DGGGGGGGGGGGGGGGD...
..DGGGGGGGGGGGGGGGD...
...DGGGGGGGGGGGGGD....
....DDGGGGGGGGGDD.....
......DDDDDDDDD.......
......................
......................
"""

COLORS = {
    'D': (43, 52, 65, 255),      # outline, deep slate
    'G': (154, 165, 177, 255),   # koala gray
    'L': (196, 204, 213, 255),   # light fur (eye patches)
    'E': (120, 130, 143, 255),   # ear inner, darker gray
    'N': (36, 41, 51, 255),      # nose, near-black
    'Z': (36, 41, 51, 255),      # closed eyes (sleeping = lazy)
}

rows = [r for r in MAP.strip('\n').split('\n')]
H, W = len(rows), max(len(r) for r in rows)

def render(px, bg=None, radius_ratio=0.22):
    """Render the map at `px` size; optional dark rounded tile behind."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in COLORS:
                img.putpixel((x, y), COLORS[ch])
    img = img.resize((px, px), Image.NEAREST)
    if bg is None:
        return img
    tile = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    d.rounded_rectangle([0, 0, px - 1, px - 1], int(px * radius_ratio), fill=bg)
    # koala at 82% of tile, centered
    k = render(int(px * 0.82))
    tile.alpha_composite(k, ((px - k.width) // 2, (px - k.height) // 2))
    return tile

import os
os.makedirs('assets', exist_ok=True)
os.makedirs('packages/extension/icons', exist_ok=True)

DARK = (13, 17, 23, 255)  # matches the demo.gif terminal background
render(512).save('assets/logo.png')
render(512, bg=DARK).save('assets/logo-dark.png')
for s in (16, 32, 48, 128):
    render(s, bg=DARK).save(f'packages/extension/icons/icon{s}.png')

print('logo.png (transparent) + logo-dark.png + icons 16/32/48/128 — done')
