"""Slice illustration sheets into individual assets by connected components."""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
OUT = os.path.join(SRC, 'sliced')
os.makedirs(OUT, exist_ok=True)

SHEETS = {
    'icons-channels': (4, 40), 'tara-states': (5, 50), 'tara-errors': (3, 60), 'tara-poses': (6, 50),
    'layer-icons': (10, 36), 'feature-icons': (6, 50), 'avatars': (6, 30), 'store-tiers': (3, 60),
}

def components(im: Image.Image, expect: int, grow: int, thr: int = 24):
    a = np.array(im.convert('RGBA'))
    if im.mode == 'RGBA' and a[..., 3].min() < 10:
        mask = a[..., 3] > thr
    else:
        mask = (a[..., :3].min(axis=2) < max(150, 255 - thr))
    big = ndi.binary_dilation(mask, iterations=grow)
    lab, n = ndi.label(big)
    boxes = []
    for i, sl in enumerate(ndi.find_objects(lab), start=1):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        area = int((lab[sl] == i).sum())
        if area < (im.size[0] * im.size[1]) * 0.004: continue
        boxes.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
    # reading order: group by row
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in boxes:
        if cur and abs((b[1] + b[3]) / 2 - np.mean([(c[1] + c[3]) / 2 for c in cur])) > im.size[1] * 0.14:
            rows.append(cur); cur = []
        cur.append(b)
    if cur: rows.append(cur)
    out = []
    for r in rows: out += sorted(r, key=lambda b: b[0])
    return out

for name, (expect, grow) in SHEETS.items():
    im = Image.open(os.path.join(SRC, name + '.webp'))
    boxes = []
    for thr in [240, 220, 200, 170, 140, 110, 80, 50, 24]:
        for g in [6, 12, 20, 30, 45, 60]:
            b = components(im, expect, g, thr)
            if len(b) == expect:
                boxes, grow = b, g
                break
        if boxes: break
    print(name, im.size, 'found', len(boxes), 'expected', expect, 'grow', grow, 'thr', thr)
    for i, (x0, y0, x1, y1) in enumerate(boxes):
        pad = 6
        crop = im.crop((max(0, x0 + grow - pad), max(0, y0 + grow - pad), min(im.size[0], x1 - grow + pad), min(im.size[1], y1 - grow + pad)))
        crop.save(os.path.join(OUT, f'{name}-{i}.webp'), quality=92)
        print('  ', i, crop.size)

# landscapes: three panels (opaque, slanted dividers) -> thirds
ls = Image.open(os.path.join(SRC, 'landscapes.webp'))
W, H = ls.size
for i, (a, b) in enumerate([(0.0, 0.36), (0.32, 0.68), (0.64, 1.0)]):
    ls.crop((int(W * a), 0, int(W * b), H)).save(os.path.join(OUT, f'landscapes-{i}.webp'), quality=90)

# login hero: orb + store from the warm banner (right side)
bw = Image.open(os.path.join(SRC, 'banner-warm.webp'))
bw.crop((int(bw.size[0] * 0.58), 0, bw.size[0], bw.size[1])).save(os.path.join(SRC, 'login-hero.png'))
print('done')
