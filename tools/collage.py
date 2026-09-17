"""
Collage-style stand-in art for the igloo, written to public/art/ by the names in docs/ART-BRIEF.md.
Paper cut-outs with torn edges, grain, a second off-register layer and a soft shadow.
Run: python3 tools/collage.py   (needs Pillow). Chimin's generated art replaces these files by name.
"""
import math, os, random, json
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageOps

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'art')
random.seed(7)

# palette (muted, from the cocktail-collage reference)
CREAM = (243, 238, 228); PAPER2 = (236, 229, 216); KRAFT = (205, 184, 154); KRAFT2 = (188, 165, 132)
ICE1 = (221, 231, 236); ICE2 = (203, 217, 225); ICE3 = (184, 203, 214); ICE_DEEP = (160, 184, 199)
GREY = (190, 182, 170); GREY2 = (150, 143, 132); DARK = (108, 102, 94); INK = (52, 47, 42)
TERRA = (199, 124, 94); OLIVE = (158, 168, 138); MUSTARD = (214, 180, 110); ROSE = (214, 160, 150); BLUEGREY = (150, 168, 184)
NIGHT_SKY = (28, 36, 50); AURORA_G = (120, 200, 170); AURORA_V = (150, 140, 210)

def grain(img, amount=9, scale=2):
    """Multiply paper grain into an RGBA image's colour, keeping alpha."""
    w, h = img.size
    n = Image.effect_noise((max(1, w // scale), max(1, h // scale)), amount).resize((w, h), Image.BILINEAR)
    n = ImageOps.autocontrast(n).point(lambda v: 255 - int((255 - v) * 0.22))  # mostly white, subtle dark specks
    rgb = img.convert('RGB'); a = img.split()[3]
    rgb = ImageChops.multiply(rgb, Image.merge('RGB', (n, n, n)))
    out = rgb.convert('RGBA'); out.putalpha(a); return out

def torn_polygon(pts, jitter=6, steps=24):
    """Densify a polygon and displace it along the edge normal with smooth low-frequency noise
    (the big irregularities of a tear) plus a little fine roughness (the fibres)."""
    out = []
    n = len(pts)
    for i in range(n):
        x0, y0 = pts[i]; x1, y1 = pts[(i + 1) % n]
        ex, ey = x1 - x0, y1 - y0; L = math.hypot(ex, ey) or 1
        nx, ny = -ey / L, ex / L
        # smooth noise: sum of two sines with random phase and a slow random walk
        a1, a2, f1, f2 = random.uniform(0, 6.28), random.uniform(0, 6.28), random.uniform(1.5, 3.5), random.uniform(4, 7)
        k = max(steps, int(L / 14))
        for s in range(k):
            u = s / k
            low = math.sin(u * f1 * 6.28 + a1) * 0.6 + math.sin(u * f2 * 6.28 + a2) * 0.4
            fine = random.uniform(-0.18, 0.18)
            d = (low + fine) * jitter
            out.append((x0 + ex * u + nx * d, y0 + ey * u + ny * d))
    return out

def paper_shape(size, pts, color, jitter=6, edge=True, soft=0.6, grain_amt=9):
    """A torn-paper cut-out of a polygon (in local coords) as RGBA."""
    w, h = size
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).polygon(torn_polygon(pts, jitter), fill=255)
    if soft: mask = mask.filter(ImageFilter.GaussianBlur(soft))
    img = Image.new('RGBA', (w, h), color + (255,)); img.putalpha(mask)
    img = grain(img, grain_amt)
    if edge:  # the white fibrous edge of torn paper
        ring = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(7)))
        ring = ring.filter(ImageFilter.GaussianBlur(1.0))
        white = Image.new('RGBA', (w, h), (255, 255, 255, 0)); white.putalpha(ring.point(lambda v: int(v * 0.5)))
        img = Image.alpha_composite(img, white)
    return img

def rect_pts(x, y, w, h): return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]

def ellipse_pts(cx, cy, rx, ry, n=40): return [(cx + rx * math.cos(2 * math.pi * i / n), cy + ry * math.sin(2 * math.pi * i / n)) for i in range(n)]

def paper_rect(w, h, color, jitter=5, pad=16, **kw):
    return paper_shape((w + pad * 2, h + pad * 2), rect_pts(pad, pad, w, h), color, jitter, **kw)

def paper_ellipse(w, h, color, jitter=5, pad=16, **kw):
    return paper_shape((w + pad * 2, h + pad * 2), ellipse_pts(pad + w / 2, pad + h / 2, w / 2, h / 2), color, jitter, **kw)

def with_shadow(img, dx=6, dy=10, blur=10, alpha=0.22):
    """Soft paper-lift shadow under a cut-out, expanding the canvas as needed."""
    w, h = img.size; pad = blur * 3
    out = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sh = Image.new('RGBA', out.size, (0, 0, 0, 0))
    a = img.split()[3].point(lambda v: int(v * alpha))
    sh.paste((40, 30, 15, 255), (pad + dx, pad + dy), a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    out = Image.alpha_composite(out, sh)
    out.alpha_composite(img, (pad, pad))
    return out

def offset_layer(img, color, dx=4, dy=4, alpha=0.55):
    """A second, off-register sheet of paper under the first (the collage 'misprint')."""
    w, h = img.size
    under = Image.new('RGBA', (w, h), color + (0,))
    under.putalpha(img.split()[3].point(lambda v: int(v * alpha)))
    out = Image.new('RGBA', (w + abs(dx), h + abs(dy)), (0, 0, 0, 0))
    out.alpha_composite(under, (max(0, dx), max(0, dy)))
    out.alpha_composite(img, (max(0, -dx), max(0, -dy)))
    return out

def rot(img, deg): return img.rotate(deg, resample=Image.BICUBIC, expand=True)

def place(canvas, img, cx, cy, deg=0):
    if deg: img = rot(img, deg)
    canvas.alpha_composite(img, (int(cx - img.width / 2), int(cy - img.height / 2)))

def washi(w, h=44, base=OLIVE, pattern='stripes'):
    """A translucent washi-tape strip with a small pattern."""
    img = Image.new('RGBA', (w, h), base + (0,))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, h], fill=base + (185,))
    light = tuple(min(255, c + 40) for c in base) + (150,)
    if pattern == 'stripes':
        for x in range(-h, w, 18): d.line([(x, h), (x + h, 0)], fill=light, width=6)
    elif pattern == 'dots':
        for x in range(8, w, 20):
            for y in range(8, h, 16): d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=light)
    elif pattern == 'grid':
        for x in range(0, w, 14): d.line([(x, 0), (x, h)], fill=light, width=1)
        for y in range(0, h, 14): d.line([(0, y), (w, y)], fill=light, width=1)
    # torn ends
    mask = Image.new('L', (w, h), 255); md = ImageDraw.Draw(mask)
    md.polygon([(0, 0), (random.randint(6, 12), 0), (random.randint(2, 8), h // 2), (random.randint(6, 12), h), (0, h)], fill=0)
    md.polygon([(w, 0), (w - random.randint(6, 12), 0), (w - random.randint(2, 8), h // 2), (w - random.randint(6, 12), h), (w, h)], fill=0)
    a = ImageChops.multiply(img.split()[3], mask); img.putalpha(a)
    return grain(img, 10)

def save(img, path):
    full = os.path.join(OUT, path); os.makedirs(os.path.dirname(full), exist_ok=True)
    img.save(full, optimize=True); print(path, img.size, os.path.getsize(full) // 1024, 'KB')

# ---------------------------------------------------------------- the room
W, H = 2880, 1800  # 2x of 1440x900
FLOOR_Y = 1040

def wall():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    # backing sheet of pale ice paper, torn along the floor line (a gentle curve)
    pts = [(-200, -200), (W + 200, -200)] + [(W + 200 - i * 60, FLOOR_Y + 40 + 18 * math.sin(i / 6)) for i in range(0, (W + 400) // 60 + 1)]
    back = paper_shape((W + 400, H + 400), [(x + 200, y + 200) for x, y in pts], ICE1, jitter=10, soft=1.5, grain_amt=14)
    img.alpha_composite(back, (-200, -200))
    # ice blocks in staggered rows, following the dome: rows get narrower toward the top
    bw, bh, gap = 188, 132, 12
    rows = list(range(int(FLOOR_Y - bh), -bh, -(bh + gap)))
    for r, y in enumerate(rows):
        off = (bw + gap) // 2 if r % 2 else 0
        for x in range(-bw + off, W + bw, bw + gap):
            cx, cy = x + bw / 2, y + bh / 2
            # window hole
            if math.hypot(cx - W / 2, cy - 420) < 300: continue
            tone = random.choice([ICE1, ICE2, ICE2, ICE3])
            blk = paper_rect(bw - random.randint(0, 10), bh - random.randint(0, 8), tone, jitter=4, pad=10, grain_amt=12)
            blk = offset_layer(blk, ICE_DEEP, dx=random.randint(2, 5), dy=random.randint(3, 6), alpha=0.35)
            place(img, blk, cx, cy, random.uniform(-1.5, 1.5))
    # window rim: a ring of slightly darker paper
    rim = paper_shape((720, 720), ellipse_pts(360, 360, 300, 300), ICE3, jitter=6, soft=1.2)
    hole = Image.new('L', (720, 720), 0); ImageDraw.Draw(hole).ellipse([70, 70, 650, 650], fill=255); hole = hole.filter(ImageFilter.GaussianBlur(2))
    a = ImageChops.subtract(rim.split()[3], hole); rim.putalpha(a)
    place(img, rim, W / 2, 420)
    # cut the window through the backing sheet too
    cut = Image.new('L', (W, H), 255); ImageDraw.Draw(cut).ellipse([W / 2 - 292, 420 - 292, W / 2 + 292, 420 + 292], fill=0)
    img.putalpha(ImageChops.multiply(img.split()[3], cut))
    return img

def floor():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    pts = [(-200, FLOOR_Y + 60 + 20 * math.sin(i / 5)) for i in range(0)]
    top = [(i * 60 - 200, FLOOR_Y + 30 + 22 * math.sin(i / 5.5)) for i in range(0, (W + 400) // 60 + 1)]
    poly = top + [(W + 200, H + 200), (-200, H + 200)]
    sheet = paper_shape((W + 400, H + 400), [(x + 200, y + 200) for x, y in poly], CREAM, jitter=9, soft=1.5, grain_amt=16)
    img.alpha_composite(sheet, (-200, -200))
    rug = paper_ellipse(1040, 420, KRAFT, jitter=7, pad=30, grain_amt=22)
    rug = offset_layer(rug, KRAFT2, dx=6, dy=8, alpha=0.5)
    place(img, with_shadow(rug, 0, 6, 8, 0.18), 1460, 1500)
    return img

def entrance():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ring = paper_shape((W + 800, H + 800), ellipse_pts(W / 2 + 400, H / 2 + 400 + 120, W / 2 + 260, H / 2 + 220), CREAM, jitter=14, soft=6, grain_amt=10)
    a = ImageOps.invert(ring.split()[3])
    arc = Image.new('RGBA', (W + 800, H + 800), CREAM + (255,)); arc.putalpha(a.point(lambda v: int(v * 0.96)))
    arc = grain(arc, 12)
    img.alpha_composite(arc, (-400, -400))
    return img

def sky(night):
    s = 460
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    base = paper_shape((s, s), ellipse_pts(s / 2, s / 2, s / 2 + 8, s / 2 + 8), NIGHT_SKY if night else (207, 224, 234), jitter=3, edge=False, grain_amt=14)
    img.alpha_composite(base)
    if night:
        for i, col in enumerate([AURORA_G, AURORA_V, AURORA_G]):
            band = paper_shape((s, 120), [(0, 30 + i * 8), (s, 10 + i * 12), (s, 70 + i * 10), (0, 90 + i * 6)], col, jitter=8, edge=False, soft=6, grain_amt=6)
            band.putalpha(band.split()[3].point(lambda v: int(v * 0.42)))
            img.alpha_composite(band, (0, 120 + i * 60))
        d = ImageDraw.Draw(img)
        for _ in range(26):
            x, y = random.randint(20, s - 20), random.randint(20, s - 20); d.ellipse([x, y, x + 3, y + 3], fill=(240, 236, 224, 200))
    else:
        cloud = paper_ellipse(220, 70, (240, 244, 246), jitter=8, edge=False, grain_amt=8)
        place(img, cloud, 160, 300, 4); place(img, paper_ellipse(150, 50, (240, 244, 246), jitter=6, edge=False, grain_amt=8), 330, 200, -3)
    circ = Image.new('L', (s, s), 0); ImageDraw.Draw(circ).ellipse([0, 0, s, s], fill=255)
    img.putalpha(ImageChops.multiply(img.split()[3], circ))
    return img

# ---------------------------------------------------------------- objects
def fridge():
    body = paper_rect(360, 640, (245, 241, 233), jitter=5, pad=20)
    body = offset_layer(body, GREY, 5, 6, 0.4)
    handle = paper_rect(14, 150, GREY2, jitter=2, pad=6)
    place(body, handle, 320, 300)
    for (x, y, col) in [(90, 130, ICE3), (210, 220, TERRA), (140, 330, OLIVE)]:
        m = paper_rect(52, 52, col, jitter=3, pad=6); place(body, with_shadow(m, 2, 3, 3, 0.25), x, y, random.uniform(-8, 8))
    return with_shadow(body, 8, 14, 14, 0.2)

def table():
    img = Image.new('RGBA', (1120, 300), (0, 0, 0, 0))
    top = offset_layer(paper_rect(1040, 54, KRAFT, jitter=4, pad=16), KRAFT2, 4, 6, 0.5)
    for lx in (120, 1000):
        leg = paper_rect(30, 200, KRAFT2, jitter=3, pad=10); place(img, leg, lx, 170)
    place(img, with_shadow(top, 0, 10, 12, 0.2), 560, 60)
    return img

def camera():
    body = offset_layer(paper_rect(220, 128, DARK, jitter=4, pad=14), INK, 3, 4, 0.5)
    lens = paper_ellipse(74, 74, (236, 232, 224), jitter=3, pad=6); place(body, lens, 124, 78)
    inner = paper_ellipse(34, 34, INK, jitter=2, pad=4, edge=False); place(body, inner, 124, 78)
    bump = paper_rect(60, 20, GREY2, jitter=2, pad=6); place(body, bump, 70, 16)
    return with_shadow(body, 4, 8, 8, 0.22)

def vase():
    v = paper_shape((160, 220), [(40, 20), (120, 20), (150, 80), (150, 200), (10, 200), (10, 80)], BLUEGREY, jitter=5)
    v = offset_layer(v, (120, 138, 154), 4, 5, 0.5)
    return with_shadow(v, 4, 8, 8, 0.2)

def candle():
    c = paper_rect(40, 92, (244, 240, 230), jitter=3, pad=8); c = offset_layer(c, GREY, 3, 3, 0.45)
    wick = paper_rect(4, 14, INK, jitter=1, pad=2); place(c, wick, 28, 8)
    return with_shadow(c, 3, 6, 6, 0.2)

def notebook():
    cov = offset_layer(paper_rect(300, 220, (222, 214, 200), jitter=5, pad=14), GREY, 5, 6, 0.45)
    band = paper_rect(18, 220, TERRA, jitter=2, pad=8); place(cov, band, 262, 124)
    return with_shadow(cov, 6, 10, 10, 0.2)

def fox(sitting):
    img = Image.new('RGBA', (300, 200), (0, 0, 0, 0))
    WHITE = (247, 245, 240)
    if sitting:
        body = paper_shape((220, 170), [(40, 165), (50, 90), (90, 45), (150, 40), (185, 80), (195, 165)], WHITE, jitter=6)
        head = paper_shape((120, 120), [(18, 110), (8, 55), (30, 10), (52, 34), (68, 34), (90, 10), (112, 55), (102, 110)], WHITE, jitter=4)
        place(img, with_shadow(body, 4, 8, 8, 0.16), 150, 115)
        place(img, with_shadow(head, 3, 5, 6, 0.16), 205, 72, -4)
        for (x, y) in ((190, 82), (222, 82)): place(img, paper_ellipse(6, 6, INK, jitter=0.5, pad=2, edge=False), x, y)
        place(img, paper_ellipse(12, 10, INK, jitter=0.5, pad=2, edge=False), 214, 108)
        tail = paper_shape((100, 60), [(5, 50), (40, 10), (95, 5), (90, 35), (50, 58)], (238, 234, 226), jitter=5)
        place(img, tail, 70, 160, 10)
    else:
        tail = paper_shape((120, 70), [(5, 55), (30, 15), (110, 8), (115, 40), (60, 66)], (238, 234, 226), jitter=5)
        place(img, with_shadow(tail, 3, 5, 6, 0.14), 70, 150, -8)
        body = paper_shape((250, 120), [(15, 110), (40, 40), (110, 15), (200, 30), (240, 110)], WHITE, jitter=6)
        head = paper_shape((110, 90), [(18, 84), (10, 40), (32, 8), (50, 28), (64, 28), (84, 8), (104, 40), (96, 84)], WHITE, jitter=4)
        place(img, with_shadow(body, 4, 8, 8, 0.16), 150, 128)
        place(img, with_shadow(head, 3, 5, 6, 0.16), 205, 122, 22)
        place(img, paper_ellipse(11, 9, INK, jitter=0.5, pad=2, edge=False), 236, 150)
    return img

def flower(n):
    cols = [ROSE, OLIVE, MUSTARD, BLUEGREY, TERRA, (200, 196, 150)]
    hs = [184, 236, 148, 208, 172, 256]
    h = hs[n - 1]
    img = Image.new('RGBA', (120, h + 60), (0, 0, 0, 0))
    stem = paper_rect(8, h, (150, 160, 120), jitter=2, pad=6); place(img, stem, 60, h / 2 + 40, random.uniform(-3, 3))
    if n % 3 == 0:
        head = paper_shape((80, 70), [(40, 5), (75, 30), (60, 65), (20, 65), (5, 30)], cols[n - 1], jitter=4)
    elif n % 3 == 1:
        head = paper_ellipse(56, 56, cols[n - 1], jitter=5, pad=8)
        core = paper_ellipse(16, 16, MUSTARD if n != 3 else INK, jitter=1, pad=3, edge=False); place(head, core, 36, 36)
    else:
        head = paper_shape((70, 90), [(35, 5), (65, 40), (50, 85), (20, 85), (5, 40)], cols[n - 1], jitter=4)
    place(img, with_shadow(head, 2, 4, 5, 0.18), 60, 40, random.uniform(-15, 15))
    return img

def string_line():
    img = Image.new('RGBA', (W, 600), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    pts = [(200 + t * (W - 400) / 80, 300 + 140 * math.sin(math.pi * t / 80)) for t in range(81)]
    d.line(pts, fill=(120, 100, 80, 230), width=4)
    for x, y in (pts[0], pts[-1]):
        peg = paper_rect(18, 44, KRAFT2, jitter=2, pad=6); place(img, peg, x, y - 10)
    return img

def peg():
    return with_shadow(paper_rect(12, 32, KRAFT2, jitter=2, pad=6), 2, 3, 3, 0.25)

# ---------------------------------------------------------------- exterior (the intro)
def exterior():
    """Top-down-ish view: snow field, the igloo dome, its door at the bottom. 2880x1800."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sky_sheet = paper_rect(W + 200, 700, (214, 226, 233), jitter=12, pad=0, edge=False, grain_amt=12)
    img.alpha_composite(sky_sheet, (-100, -100))
    horizon = [(i * 80 - 200, 560 + 30 * math.sin(i / 4)) for i in range(0, (W + 400) // 80 + 1)]
    snow = paper_shape((W + 400, H + 400), [(x + 200, y + 200) for x, y in horizon + [(W + 200, H + 200), (-200, H + 200)]], (247, 245, 240), jitter=10, soft=2, grain_amt=14)
    img.alpha_composite(snow, (-200, -200))
    # dome: courses of blocks following the dome silhouette (ellipse), each course a ring seen from above/front
    cx, cy = W / 2, 1000
    dome = paper_ellipse(1500, 900, ICE1, jitter=12, pad=40, grain_amt=8)
    place(img, with_shadow(dome, 0, 30, 40, 0.16), cx, cy)
    for ring, (rx, ry) in enumerate([(720, 430), (600, 360), (480, 288), (360, 216), (240, 144), (120, 72)]):
        bw = 150 - ring * 12; bh = 78 - ring * 6
        circ = math.pi * (3 * (rx + ry) - math.sqrt((3 * rx + ry) * (rx + 3 * ry)))
        n = max(6, int(circ / (bw + 10)))
        for i in range(n):
            a = 2 * math.pi * (i + (0.5 if ring % 2 else 0)) / n
            px, py = cx + rx * math.cos(a), cy + ry * math.sin(a)
            if ring == 0 and py > cy + 300 and abs(px - cx) < 200: continue  # leave room for the door
            blk = paper_rect(bw, bh, random.choice([ICE1, ICE2, ICE2, ICE3]), jitter=4, pad=10, grain_amt=8)
            blk = offset_layer(blk, ICE_DEEP, 3, 4, 0.3)
            tangent = math.degrees(math.atan2(ry * math.cos(a), -rx * math.sin(a)))
            place(img, blk, px, py, -tangent + random.uniform(-2, 2))
    # the door: a dark arch at the bottom front, with a short tunnel
    tunnel = paper_ellipse(360, 220, ICE2, jitter=8, pad=20); place(img, with_shadow(tunnel, 0, 14, 16, 0.18), cx, cy + 470)
    door = paper_shape((240, 200), [(30, 190), (30, 90), (60, 30), (120, 10), (180, 30), (210, 90), (210, 190)], (58, 62, 70), jitter=5, edge=False)
    place(img, door, cx, cy + 470)
    # a few snow specks
    d = ImageDraw.Draw(img)
    for _ in range(60):
        x, y = random.randint(0, W), random.randint(0, H); r = random.randint(2, 5); d.ellipse([x, y, x + r, y + r], fill=(255, 255, 255, 160))
    return img

# ---------------------------------------------------------------- places, photos, stickers
def load_photo(path, size):
    im = Image.open(path).convert('RGB'); im = ImageOps.fit(im, size, Image.LANCZOS)
    return im

def torn_photo(photo, jitter=8):
    w, h = photo.size
    mask = Image.new('L', (w, h), 0); ImageDraw.Draw(mask).polygon(torn_polygon(rect_pts(10, 10, w - 20, h - 20), jitter), fill=255)
    img = photo.convert('RGBA'); img.putalpha(mask.filter(ImageFilter.GaussianBlur(0.7)))
    ring = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(7))).filter(ImageFilter.GaussianBlur(0.8))
    white = Image.new('RGBA', (w, h), (255, 255, 255, 0)); white.putalpha(ring.point(lambda v: int(v * 0.7)))
    img = Image.alpha_composite(img, white)
    # soften the photo toward the collage palette: slight desaturation and warmth
    rgb = img.convert('RGB'); g = ImageOps.grayscale(rgb).convert('RGB'); rgb = Image.blend(rgb, g, 0.18)
    warm = Image.new('RGB', (w, h), (246, 236, 216)); rgb = ImageChops.multiply(rgb, warm).point(lambda v: min(255, int(v * 1.06)))
    out = rgb.convert('RGBA'); out.putalpha(img.split()[3]); return out

def postcard_front(photo_path):
    card = paper_rect(1240, 800, (250, 247, 240), jitter=3, pad=20, grain_amt=14)
    if photo_path:
        ph = torn_photo(load_photo(photo_path, (980, 620)))
        place(card, with_shadow(ph, 5, 8, 8, 0.2), 640, 400, random.uniform(-2.5, 2.5))
        tape = washi(260, 46, random.choice([OLIVE, ROSE, BLUEGREY]), random.choice(['stripes', 'dots', 'grid']))
        place(card, tape, 640, 100, random.uniform(-6, 6))
    else:
        blank = paper_rect(980, 620, PAPER2, jitter=6, pad=20, grain_amt=16); place(card, blank, 640, 400, random.uniform(-2, 2))
    return card

def pieces(photo_path):
    out = []
    ph = load_photo(photo_path, (900, 600)) if photo_path else None
    for i in range(3):
        if ph:
            x, y = random.randint(0, 500), random.randint(0, 300); crop = ph.crop((x, y, x + random.randint(280, 400), y + random.randint(220, 300)))
            out.append(torn_photo(crop, 10))
        else:
            out.append(paper_rect(random.randint(280, 380), random.randint(200, 280), random.choice([PAPER2, KRAFT, ICE2]), jitter=8))
    out.append(washi(random.randint(220, 300), 48, random.choice([OLIVE, ROSE, BLUEGREY]), 'stripes'))
    out.append(washi(random.randint(200, 260), 44, random.choice([MUSTARD, ICE3, TERRA]), 'dots'))
    stamp = paper_rect(150, 180, (250, 247, 240), jitter=2, pad=12); d = ImageDraw.Draw(stamp)
    for x in range(14, 170, 12): d.ellipse([x, 6, x + 6, 12], fill=(0, 0, 0, 0)); d.ellipse([x, 180, x + 6, 186], fill=(0, 0, 0, 0))
    inner = torn_photo(load_photo(photo_path, (110, 140)), 4) if ph else paper_rect(110, 140, ICE2, jitter=3, pad=6)
    place(stamp, inner, 87, 102)
    out.append(stamp)
    out.append(paper_rect(280, 54, (250, 247, 240), jitter=3, pad=10))
    mark = paper_ellipse(80, 80, TERRA, jitter=5, pad=10, edge=False); out.append(mark)
    return out

def sticker(n):
    col = [MUSTARD, ROSE, OLIVE, ICE3, TERRA, BLUEGREY, KRAFT, (236, 232, 222)][n - 1]
    s = 200
    if n == 1:  # star
        pts = [(100 + (80 if i % 2 == 0 else 36) * math.cos(-math.pi / 2 + i * math.pi / 5), 100 + (80 if i % 2 == 0 else 36) * math.sin(-math.pi / 2 + i * math.pi / 5)) for i in range(10)]
        img = paper_shape((s, s), pts, col, jitter=3)
    elif n == 2:  # heart
        pts = [(100 + 70 * (16 * math.sin(t) ** 3) / 16, 100 - 70 * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) / 17) for t in [i * 2 * math.pi / 40 for i in range(40)]]
        img = paper_shape((s, s), pts, col, jitter=3)
    elif n == 3:  # flower
        img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        for i in range(6):
            a = i * math.pi / 3; place(img, paper_ellipse(60, 40, col, jitter=3, pad=6), 100 + 42 * math.cos(a), 100 + 42 * math.sin(a), math.degrees(a))
        place(img, paper_ellipse(40, 40, MUSTARD, jitter=2, pad=4), 100, 100)
    elif n == 4:  # snowflake
        img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        for i in range(3):
            place(img, paper_rect(150, 16, col, jitter=2, pad=6), 100, 100, i * 60)
    elif n == 7:  # cup
        img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        place(img, paper_shape((120, 110), [(10, 10), (110, 10), (98, 100), (22, 100)], col, jitter=3), 96, 110)
        place(img, paper_ellipse(40, 40, (0, 0, 0, 0) if False else col, jitter=2, pad=6), 150, 96)
    elif n == 8:  # moon
        img = paper_shape((s, s), ellipse_pts(100, 100, 70, 70), col, jitter=3)
        cut = Image.new('L', (s, s), 255); ImageDraw.Draw(cut).ellipse([70, 20, 200, 150], fill=0); img.putalpha(ImageChops.multiply(img.split()[3], cut))
    else:  # word stickers: a strip (the word is set in the DOM)
        img = paper_rect(150, 60, col, jitter=3, pad=20)
    return with_shadow(img, 2, 4, 4, 0.2)

if __name__ == '__main__':
    save(wall(), 'room/wall.png'); save(floor(), 'room/floor.png'); save(entrance(), 'room/entrance.png')
    save(exterior(), 'room/exterior.png'); save(string_line(), 'room/string.png'); save(peg(), 'objects/peg.png')
    save(sky(False), 'sky/day.png'); save(sky(True), 'sky/night.png')
    save(fridge(), 'objects/fridge-closed.png'); save(table(), 'objects/table.png'); save(camera(), 'objects/camera.png')
    save(vase(), 'objects/vase-empty.png'); save(candle(), 'objects/candle.png'); save(notebook(), 'objects/notebook.png')
    save(fox(False), 'objects/fox-asleep.png'); save(fox(True), 'objects/fox-sitting.png')
    for n in range(1, 7): save(flower(n), f'objects/flowers/{n}.png')
    photos = {'venice': '_placeholder/photos/venice.jpg', 'chicago': '_placeholder/photos/chicago.jpg', 'singapore': '_placeholder/photos/singapore.jpg', 'dubrovnik': '_placeholder/photos/dubrovnik.jpg', 'como': '_placeholder/photos/venice2.jpg'}
    slugs = ['budapest', 'cinque-terre', 'split', 'mostar', 'dubrovnik', 'malta', 'mallorca', 'venice', 'verona', 'lake-garda', 'como', 'slovenia', 'singapore', 'chicago']
    for slug in slugs:
        p = os.path.join(OUT, photos[slug]) if slug in photos else None
        save(postcard_front(p), f'places/{slug}/postcard-front.png')
        for i, pc in enumerate(pieces(p)): save(pc, f'places/{slug}/pieces/{i + 1}.png')
    for n in range(1, 9): save(sticker(n), f'stickers/{n}.png')
