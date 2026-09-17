"""
Stand-in art for the paper diorama: flat, textured patches in the hand of Chimin's ceramic-poster
reference (large patches of muted colour, handmade-paper fibre and speckle, torn edges, a lighter paper
rim), written to public/art/paper/. Two kinds of piece:
  - stylise(cut-out photo) → a flat 3–4 tone paper patch of a real silhouette (the fox, the objects)
  - drawn pieces (the igloo plates, a snow drift, Chimin lying in the snow)
Run: PYTHONPATH=<pylib> python3 tools/paper.py   (Pillow, numpy; rembg for new cut-outs)
Chimin's generated art replaces these files by name.
"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageChops

sys.path.insert(0, os.path.dirname(__file__))
from collage import torn_polygon  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'art', 'paper')
PH = os.path.join(os.path.dirname(__file__), '..', 'public', 'art', '_placeholder')
random.seed(3); np.random.seed(3)

# muted paper palette (from the poster): rust, clay, sand, ash, ink-black, cream, and the arctic tints
CREAM = (238, 232, 222); SAND = (206, 188, 158); CLAY = (168, 122, 96); RUST = (150, 74, 52); ASH = (128, 122, 116); INK = (58, 54, 52)
ICE_A = (232, 242, 246); ICE_B = (196, 222, 232); ICE_C = (160, 196, 214); ICE_D = (120, 160, 186)
FOX_A = (244, 240, 232); FOX_B = (214, 208, 198); FOX_C = (170, 162, 152)

def save(img, name):
    p = os.path.join(OUT, name); os.makedirs(os.path.dirname(p), exist_ok=True)
    img.save(p, 'WEBP', quality=86, method=6); print(name, img.size, os.path.getsize(p) // 1024, 'KB')

# ------------------------------------------------------------------ paper texture
def fibre(size, strength=0.14, speck=0.0025, scale=3):
    """Handmade paper: soft cloudy fibre noise plus dark speckles and a few pale flecks. Returns an RGB multiplier (float 0..1)."""
    w, h = size
    n = Image.effect_noise((max(1, w // scale), max(1, h // scale)), 48).resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.2))
    n2 = Image.effect_noise((max(1, w // 24), max(1, h // 24)), 60).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))
    a = np.asarray(n).astype(float) / 255; b = np.asarray(n2).astype(float) / 255
    m = 1 - strength * (0.5 - a) * 2 * 0.5 - strength * 0.8 * (0.5 - b)
    m = np.clip(m, 0.6, 1.15)
    rgb = np.stack([m, m, m], 2)
    # speckles: dark and light flecks like inclusions in the pulp
    k = np.random.random((h, w))
    dark = k < speck; light = (k > 1 - speck * 0.6)
    rgb[dark] *= 0.45; rgb[light] = np.minimum(rgb[light] * 1.25 + 0.15, 1.2)
    rgb = np.asarray(Image.fromarray((np.clip(rgb, 0, 1.2) / 1.2 * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(float) / 255 * 1.2
    return rgb

def apply_paper(img, strength=0.14, speck=0.0025):
    rgb = np.asarray(img.convert('RGB')).astype(float) / 255; a = img.split()[3]
    out = np.clip(rgb * fibre(img.size, strength, speck), 0, 1)
    o = Image.fromarray((out * 255).astype(np.uint8)).convert('RGBA'); o.putalpha(a); return o

def torn_alpha(alpha, rough=6, fine=1.5):
    """Rough the edge of an alpha mask like torn paper: threshold a blurred mask against low-frequency noise."""
    w, h = alpha.size
    n = Image.effect_noise((max(1, w // 6), max(1, h // 6)), 70).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(3))
    f = Image.effect_noise((w, h), 40).filter(ImageFilter.GaussianBlur(0.6))
    A = np.asarray(alpha.filter(ImageFilter.GaussianBlur(rough))).astype(float) / 255
    N = (np.asarray(n).astype(float) / 255 - 0.5) * 0.5 + (np.asarray(f).astype(float) / 255 - 0.5) * 0.18 * fine
    return Image.fromarray(((A - N * 0.4 > 0.5) * 255).astype(np.uint8))

def paper_rim(img, width=3, lift=0.22):
    """A lighter rim just inside the edge: the thickness of the paper catching the light."""
    a = img.split()[3]
    inner = a.filter(ImageFilter.MinFilter(width * 2 + 1))
    rim = ImageChops.subtract(a, inner).filter(ImageFilter.GaussianBlur(0.8))
    r = np.asarray(rim).astype(float) / 255 * lift
    rgb = np.asarray(img.convert('RGB')).astype(float) / 255
    out = np.clip(rgb + r[..., None] * (1 - rgb) * 1.4, 0, 1)
    o = Image.fromarray((out * 255).astype(np.uint8)).convert('RGBA'); o.putalpha(a); return o

def posterise(img, tones, key=(0.55, 0.78)):
    """Flatten a photo cut-out to a few paper tones by luminance (tones: dark → light)."""
    g = np.asarray(ImageOps.autocontrast(img.convert('L'), cutoff=2)).astype(float) / 255
    g = np.asarray(Image.fromarray((g * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))).astype(float) / 255
    cuts = np.linspace(0, 1, len(tones) + 1)[1:-1] if key is None else key
    idx = np.zeros(g.shape, int)
    for c in cuts: idx += (g > c)
    pal = np.array(tones, float) / 255
    rgb = pal[np.clip(idx, 0, len(tones) - 1)]
    o = Image.fromarray((rgb * 255).astype(np.uint8)).convert('RGBA'); o.putalpha(img.split()[3]); return o

def finish(img, rough=5, rim=3, strength=0.14, speck=0.0025):
    a = torn_alpha(img.split()[3], rough); img = img.copy(); img.putalpha(a)
    img = apply_paper(img, strength, speck); return paper_rim(img, rim)

def stylise(path, tones, size=None, rough=5, cut=None):
    im = Image.open(path).convert('RGBA')
    if size: im.thumbnail(size, Image.LANCZOS)
    im = posterise(im, tones, cut if cut else (0.55, 0.78)[:len(tones) - 1])
    return finish(im, rough)

def pad(img, p=24):
    o = Image.new('RGBA', (img.width + 2 * p, img.height + 2 * p), (0, 0, 0, 0)); o.paste(img, (p, p)); return o

# ------------------------------------------------------------------ drawn pieces
def patch(size, pts, colour, jitter=10, strength=0.14):
    """A torn patch of one colour with paper texture: the poster's building block."""
    img = Image.new('RGBA', size, (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.polygon(torn_polygon(pts, jitter, 28), fill=colour + (255,))
    return finish(img, rough=3, rim=3, strength=strength)

def ellipse_pts(cx, cy, rx, ry, n=48): return [(cx + rx * math.cos(2 * math.pi * i / n), cy + ry * math.sin(2 * math.pi * i / n)) for i in range(n)]

def igloo_plate(kind):
    """Three plates: 'back' (the far half of the dome), 'front' (the near half with the door), 'arch' (the entrance tunnel)."""
    W, H = 1400, 900
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    if kind in ('back', 'front'):
        cx, cy, rx, ry = 700, 640, 600, 520
        pts = [(cx + rx * math.cos(a), cy - ry * math.sin(a)) for a in np.linspace(0, math.pi, 60)] + [(cx - rx, cy + 40), (cx + rx, cy + 40)]
        d.polygon(torn_polygon(pts, 8, 30), fill=((216, 233, 240) if kind == 'back' else ICE_A) + (255,))
        # courses: bands of slightly different tone, the block joints as faint lines
        rgb = np.asarray(img.convert('RGB')).astype(float); a = img.split()[3]
        yy, xx = np.mgrid[0:H, 0:W]
        for i, y0 in enumerate(range(160, 700, 68)):
            band = ((yy >= y0) & (yy < y0 + 68))
            t = 0.97 + 0.05 * ((i % 2) - 0.5) + random.uniform(-0.015, 0.015)
            rgb[band] *= t
        # vertical joints, offset by course
        for i, y0 in enumerate(range(160, 700, 68)):
            for x0 in range(-40 + (i % 2) * 60, W, 120):
                jx = (xx >= x0) & (xx < x0 + 3) & (yy >= y0) & (yy < y0 + 68); rgb[jx] *= 0.9
            hz = (yy >= y0 + 66) & (yy < y0 + 69); rgb[hz] *= 0.9
        # a lighter cap and a deeper base
        rgb *= (1.06 - (yy / H) * 0.14)[..., None]
        img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert('RGBA'); img.putalpha(a)
        img = finish(img, rough=4, rim=4, strength=0.1, speck=0.0012)
        return img
    if kind == 'arch':
        img = Image.new('RGBA', (900, 700), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
        outer = [(450 + 330 * math.cos(a), 480 - 300 * math.sin(a)) for a in np.linspace(0, math.pi, 40)] + [(120, 660), (780, 660)]
        d.polygon(torn_polygon(outer, 8, 30), fill=ICE_A + (255,))
        d.ellipse((240, 260, 660, 700), fill=(0, 0, 0, 0))
        inner = Image.new('L', img.size, 0); ImageDraw.Draw(inner).polygon(torn_polygon([(450 + 210 * math.cos(a), 480 - 200 * math.sin(a)) for a in np.linspace(0, math.pi, 40)] + [(240, 700), (660, 700)], 6, 30), fill=255)
        a = ImageChops.subtract(img.split()[3], inner); img.putalpha(a)
        rgb = np.asarray(img.convert('RGB')).astype(float); yy, xx = np.mgrid[0:700, 0:900]
        for x0 in range(120, 800, 90): rgb[(xx >= x0) & (xx < x0 + 3)] *= 0.9
        img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert('RGBA'); img.putalpha(a)
        return finish(img, rough=4, rim=4, strength=0.1, speck=0.0012)

def drift(n):
    """Snow drifts: pale patches to lay on the letters, three sizes."""
    W, H = [(900, 360), (600, 300), (1200, 420)][n - 1]
    pts = ellipse_pts(W / 2, H / 2, W * 0.42, H * 0.36, 40)
    return patch((W, H), pts, (236, 238, 250), jitter=14, strength=0.08)

def chimin():
    """Chimin lying in the snow, seen from above: a parka, a fur hood, mittens, boots. Flat, paper."""
    W, H = 700, 900
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    parka = (196, 168, 136); fur = (240, 236, 226); skin = (232, 196, 168); mitt = RUST; boot = (88, 70, 58); hair = INK
    # body
    d.polygon(torn_polygon([(280, 300), (420, 300), (450, 560), (250, 560)], 5, 20), fill=parka + (255,))
    # arms out (snow angel)
    d.polygon(torn_polygon([(280, 320), (330, 380), (150, 560), (100, 500)], 5, 16), fill=parka + (255,))
    d.polygon(torn_polygon([(420, 320), (370, 380), (550, 560), (600, 500)], 5, 16), fill=parka + (255,))
    for (x, y) in ((90, 520), (610, 520)): d.ellipse((x - 40, y - 40, x + 40, y + 40), fill=mitt + (255,))
    # legs
    d.polygon(torn_polygon([(270, 550), (340, 550), (300, 800), (220, 790)], 5, 16), fill=parka + (255,))
    d.polygon(torn_polygon([(360, 550), (430, 550), (480, 790), (400, 800)], 5, 16), fill=parka + (255,))
    for (x, y) in ((255, 830), (445, 830)): d.rounded_rectangle((x - 45, y - 35, x + 45, y + 35), radius=18, fill=boot + (255,))
    # hood ring, head, hair
    d.ellipse((240, 130, 460, 350), fill=fur + (255,))
    d.ellipse((280, 170, 420, 310), fill=skin + (255,))
    d.chord((280, 170, 420, 310), 200, 340, fill=hair + (255,))
    for (x, y) in ((325, 250), (375, 250)): d.ellipse((x - 5, y - 4, x + 5, y + 4), fill=INK + (255,))
    d.arc((335, 262, 365, 282), 10, 170, fill=INK + (255,), width=3)
    return finish(img, rough=3, rim=3)

def fox_side():
    """The fox walking, side view facing right: a flat paper silhouette (body, chest, head, ears, brush tail, legs)."""
    W, H = 820, 520
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    # tail: a thick brush, drawn on its own layer and rotated
    tail = Image.new('RGBA', (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(tail)
    td.ellipse((40, 210, 330, 330), fill=FOX_A + (255,)); td.ellipse((40, 226, 120, 314), fill=FOX_B + (255,))
    tail = tail.rotate(24, resample=Image.BICUBIC, center=(300, 280)); img.alpha_composite(tail)
    # legs (walking: one pair forward, one back)
    for (x0, y0, x1, y1) in ((300, 330, 340, 470), (350, 330, 385, 462), (500, 330, 540, 470), (555, 330, 590, 462)):
        d.polygon(torn_polygon([(x0, y0), (x1, y0), (x1 + 8, y1), (x0 + 6, y1)], 3, 10), fill=FOX_B + (255,))
    # body + chest + head
    d.polygon(torn_polygon(ellipse_pts(420, 290, 200, 92, 48), 4, 8), fill=FOX_A + (255,))
    d.ellipse((470, 180, 640, 350), fill=FOX_A + (255,))
    d.polygon(torn_polygon(ellipse_pts(640, 215, 78, 62, 40), 3, 8), fill=FOX_A + (255,))
    d.polygon(torn_polygon([(690, 205), (780, 236), (692, 252)], 3, 10), fill=FOX_A + (255,))
    d.ellipse((772, 228, 790, 246), fill=INK + (255,))
    for (a, b, c) in (((596, 172), (612, 96), (648, 170)), ((640, 168), (668, 100), (690, 176))):
        d.polygon([a, b, c], fill=FOX_A + (255,)); d.polygon([(a[0] + 8, a[1] - 2), (b[0], b[1] + 22), (c[0] - 8, c[1] - 2)], fill=(214, 186, 178, 255))
    d.ellipse((650, 198, 664, 210), fill=INK + (255,))
    d.chord((560, 250, 700, 360), 0, 180, fill=FOX_B + (255,))  # the pale chest fur
    return finish(img, rough=3, rim=3)

def table_patch():
    return patch((900, 420), [(80, 120), (820, 120), (860, 300), (40, 300)], CLAY, jitter=8)

if __name__ == '__main__':
    # the fox: two poses from the CC0 cut-out photos in _placeholder (sitting) and src (side view, if present)
    fox_sit = stylise(os.path.join(PH, 'objects', 'fox.webp'), [FOX_C, FOX_B, FOX_A], size=(700, 700), rough=4)
    save(pad(fox_sit), 'fox-sit.webp')
    side = os.path.join(PH, 'photos', 'fox-side.png')
    if os.path.exists(side):
        save(pad(stylise(side, [FOX_C, FOX_B, FOX_A], size=(800, 600), rough=4)), 'fox-side.webp')
    for name, tones in (('camera', [INK, ASH, (200, 196, 190)]), ('sketchbook', [CLAY, SAND, CREAM]), ('paints', [RUST, SAND, CREAM]), ('coffee', [INK, CLAY, CREAM])):
        save(pad(stylise(os.path.join(PH, 'objects', f'{name}.webp'), tones, size=(600, 600), rough=4)), f'{name}.webp')
    for k in ('back', 'front', 'arch'): save(igloo_plate(k), f'igloo-{k}.webp')
    for n in (1, 2, 3): save(drift(n), f'drift-{n}.webp')
    save(chimin(), 'chimin.webp'); save(table_patch(), 'table.webp'); save(pad(fox_side()), 'fox-side.webp')
