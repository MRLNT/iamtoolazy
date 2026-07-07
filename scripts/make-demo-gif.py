#!/usr/bin/env python3
# Generates assets/demo.gif — an original animated terminal demo of
# iamtoolazy's actual behavior. No external assets, no copyright issues.
from PIL import Image, ImageDraw, ImageFont

W, H, PAD, LH = 780, 400, 22, 24
BG = (13, 17, 23)
FG = (201, 209, 217)
DIM = (110, 118, 129)
GREEN = (63, 185, 80)
BLUE = (88, 166, 255)
YELLOW = (210, 168, 100)
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 15)
FONT_B = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 15)

# (text, color, bold)
LINES = [
    ("$ you:", DIM, False),
    ('  "Hi! Could you please maybe fix this bug for me', FG, False),
    ('   when you get a chance? Thanks so much in advance!!"', FG, False),
    ("", FG, False),
    ("lazy> compress   \"Fix this bug.\"              (-83% chars)", GREEN, True),
    ("lazy> inject     skipped — short task, would cost more", DIM, False),
    ("lazy>            than it saves. 0 tokens wasted.", DIM, False),
    ("", FG, False),
    ("$ you:", DIM, False),
    ('  "Implement login with rate limiting, avoid extra deps,', FG, False),
    ('   show the code with comments..."', FG, False),
    ("", FG, False),
    ("lazy> classify   coding · expected ~700 tok", BLUE, False),
    ("lazy> inject     terse + YAGNI ladder + budget ≤455 tok", GREEN, True),
    ("lazy> ledger     input +74 · predicted savings 245", YELLOW, False),
    ("lazy>            predicted net  +171 tokens", GREEN, True),
    ("", FG, False),
    ("   too lazy to waste tokens.", DIM, False),
]

def frame(upto_line, upto_chars=None, hold_cursor=True):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # window chrome
    d.rounded_rectangle([6, 6, W - 6, H - 6], 10, outline=(48, 54, 61), width=1)
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([20 + i * 22, 16, 32 + i * 22, 28], fill=c)
    d.text((W - 150, 14), "iamtoolazy", font=FONT, fill=DIM)
    y = 44
    for i, (text, color, bold) in enumerate(LINES[: upto_line + 1]):
        t = text
        if i == upto_line and upto_chars is not None:
            t = text[:upto_chars]
        d.text((PAD, y), t, font=FONT_B if bold else FONT, fill=color)
        if i == upto_line and hold_cursor:
            wpx = d.textlength(t, font=FONT_B if bold else FONT)
            d.rectangle([PAD + wpx + 2, y + 2, PAD + wpx + 10, y + 18], fill=GREEN)
        y += LH
    return img

frames, durations = [], []
for i, (text, _c, _b) in enumerate(LINES):
    if text.startswith("lazy>") or text.startswith("$"):
        frames.append(frame(i, 0)); durations.append(120)
    step = max(6, len(text) // 4)
    for c in range(step, len(text) + step, step):
        frames.append(frame(i, min(c, len(text)))); durations.append(45)
    frames.append(frame(i)); durations.append(200 if text else 60)
frames.append(frame(len(LINES) - 1, hold_cursor=False)); durations.append(2600)

frames[0].save(
    "assets/demo.gif", save_all=True, append_images=frames[1:],
    duration=durations, loop=0, optimize=True,
)
import os
print(f"assets/demo.gif — {len(frames)} frames, {os.path.getsize('assets/demo.gif')//1024} KB")
