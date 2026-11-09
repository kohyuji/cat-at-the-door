"""codex-v5 브랜치(R5·R6)의 그림에서 이 판에 쓰는 조각만 잘라 assets/r6-extras.png 하나로 묶는다.
원본은 git의 origin/codex-v5 에서 바로 읽는다. 실행: python3 tools/build-extras.py
결과 좌표는 src/pixel-render.js 의 EXTRA 에 그대로 넣는다."""
import io, json, subprocess, sys
from PIL import Image, ImageDraw

REF = sys.argv[1] if len(sys.argv) > 1 else 'origin/codex-v5'

def load(name):
    data = subprocess.run(['git', 'show', REF + ':assets/' + name], capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(data)).convert('RGBA')

def hard(im):  # 생성 그림의 흐린 가장자리를 픽셀 경계로 (codex-v5 texture()와 같은 기준)
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 0 if a < 128 else 255)
    return im

def key_border(im, seeds, tol=34):  # 테두리에 닿은 벽·바닥을 투명하게
    im = im.copy()
    for s in seeds:
        if im.getpixel(s)[3] == 0:
            continue
        ImageDraw.floodfill(im, s, (0, 0, 0, 0), thresh=tol)
    return im

home, props, catp, bed, dev = load('r5-home.png'), load('r5-props.png'), load('r5-cat-portrait.png'), load('r6-bed-v2.png'), load('r6-devices.png')

def border_seeds(w, h, step=6):
    pts = [(x, 0) for x in range(0, w, step)] + [(x, h - 1) for x in range(0, w, step)]
    pts += [(0, y) for y in range(0, h, step)] + [(w - 1, y) for y in range(0, h, step)]
    return pts

pieces = {}
pieces['bedDoorClosed'] = home.crop((686, 102, 804, 355))
pieces['livDoorClosed'] = home.crop((686, 573, 804, 826))
for key, y in (('bedDoorOpen', 90), ('livDoorOpen', 561)):
    c = home.crop((1515, y, 1660, y + 290))
    # 문틀 안(옆방)은 남기고, 오른쪽 벽과 아래 바닥만 지운다
    seeds = [(144, yy) for yy in range(0, 290, 4)] + [(xx, 289) for xx in range(0, 145, 4)] + [(xx, 0) for xx in range(100, 145, 4)] + [(0, yy) for yy in range(270, 290, 2)] + [(xx, 287) for xx in range(0, 145, 3)]
    pieces[key] = key_border(c, seeds, 40)
b = home.crop((30, 236, 334, 396))
pieces['bedEmpty'] = key_border(b, border_seeds(b.width, b.height), 40)
pieces['bedAwake'] = hard(bed.crop((47, 201, 865, 687)))
pieces['bedAsleep'] = hard(bed.crop((955, 201, 1773, 687)))
pieces['umbrella'] = hard(props.crop((658, 653, 919, 907)))
pieces['charcoal'] = hard(props.crop((374, 658, 565, 910)))
pieces['catPortrait'] = hard(catp.crop((286, 222, 963, 1158)))
pieces['broom'] = hard(dev.crop((540, 492, 807, 839)))
pieces['mop'] = hard(dev.crop((964, 490, 1257, 839)))

# 한 줄씩 쌓는다
W = 1800
x = y = rowh = 0
rects = {}
for k, im in pieces.items():
    if x + im.width > W:
        x, y, rowh = 0, y + rowh + 2, 0
    rects[k] = [x, y, im.width, im.height]
    x += im.width + 2
    rowh = max(rowh, im.height)
sheet = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
for k, im in pieces.items():
    sheet.paste(im, (rects[k][0], rects[k][1]))
sheet.save('assets/r6-extras.png', optimize=True)
print(json.dumps(rects))
