"""
Stand-in pieces for the room's new things, drawn in the same paper hand as tools/paper.py, until Chimin
generates the real ones (prompts in docs/PROMPTS.md): the white puffer and the leather shoulder bag on the
coat hooks, the laptop (base and screen), six enamel pins, the bed, the bedside table, the stack of magazines
and ten magazine covers (one per essay), the vinyl player and a record.
    PYTHONPATH=<pylib> python3 tools/room-standins.py
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from paper import patch, finish, save, pad, torn_polygon, ellipse_pts, CREAM, SAND, CLAY, RUST, ASH, INK, ICE_A, ICE_B, ROSE, MUSTARD  # noqa: E402

def font(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'):
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def rounded(pts_box, r, n=8):
    x0, y0, x1, y1 = pts_box; pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for i in range(n + 1): a = math.radians(a0 + 90 * i / n); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def puffer():
    W, H = 720, 900; img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    body = [(200, 170), (520, 170), (600, 260), (640, 520), (600, 820), (120, 820), (80, 520), (120, 260)]
    d.polygon(torn_polygon(body, 8, 40), fill=(244, 242, 236, 255))
    for y in (300, 420, 540, 660):  # the puffer's baffles: soft shadow lines
        d.line([(110, y), (610, y)], fill=(214, 212, 206, 255), width=10)
    d.polygon(torn_polygon([(260, 120), (460, 120), (500, 200), (220, 200)], 6, 20), fill=(232, 230, 224, 255))  # collar
    d.polygon(torn_polygon([(345, 200), (375, 200), (380, 820), (340, 820)], 3, 20), fill=(224, 222, 216, 255))  # zip
    d.rectangle((340, 60, 380, 130), fill=ASH + (255,))  # the hanger hook
    return finish(img, rough=3, rim=2)

def bag():
    W, H = 760, 860; img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.polygon(torn_polygon([(300, 40), (330, 40), (150, 330), (120, 330)], 3, 20), fill=(96, 64, 44, 255))   # strap
    d.polygon(torn_polygon([(430, 40), (460, 40), (640, 330), (610, 330)], 3, 20), fill=(96, 64, 44, 255))
    d.polygon(torn_polygon(rounded((90, 300, 670, 800), 60), 8, 40), fill=(132, 88, 58, 255))               # the body
    d.polygon(torn_polygon(rounded((90, 300, 670, 480), 40), 8, 30), fill=(116, 76, 50, 255))               # the flap
    d.polygon(torn_polygon(ellipse_pts(380, 470, 40, 28), 3, 12), fill=(196, 168, 110, 255))                 # a brass clasp
    return finish(img, rough=3, rim=3)

def laptop_base():
    W, H = 900, 560; img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.polygon(torn_polygon(rounded((60, 80, 840, 480), 30), 5, 40), fill=(186, 188, 192, 255))
    for r in range(4):
        for c in range(12): d.rectangle((150 + c * 50, 150 + r * 60, 190 + c * 50, 195 + r * 60), fill=(150, 152, 158, 255))
    d.rounded_rectangle((350, 400, 550, 450), 10, fill=(160, 162, 168, 255))
    return finish(img, rough=2, rim=2)

def laptop_screen():
    W, H = 900, 600; img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.polygon(torn_polygon(rounded((60, 40, 840, 560), 30), 5, 40), fill=(186, 188, 192, 255))
    d.rounded_rectangle((110, 80, 790, 520), 14, fill=(236, 240, 246, 255))
    f = font(44); d.text((160, 140), 'chimin', font=f, fill=(58, 54, 52, 255)); d.text((160, 210), 'projects', font=f, fill=(120, 116, 112, 255))
    return finish(img, rough=2, rim=2)

def pin(n):
    S = 240; img = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    cols = [RUST, MUSTARD, (120, 150, 170), ROSE, (110, 140, 110), INK]
    shapes = ['circle', 'star', 'heart', 'circle', 'leaf', 'circle']
    col = cols[n % 6]; kind = shapes[n % 6]; c = S // 2
    if kind == 'star':
        pts = [(c + (90 if i % 2 == 0 else 40) * math.cos(math.radians(-90 + 36 * i)), c + (90 if i % 2 == 0 else 40) * math.sin(math.radians(-90 + 36 * i))) for i in range(10)]
    elif kind == 'heart':
        pts = [(c + 90 * (16 * math.sin(t) ** 3) / 17, c - 90 * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) / 17) for t in [i * 2 * math.pi / 40 for i in range(40)]]
    elif kind == 'leaf':
        pts = [(c + 90 * math.cos(a) * 0.6 - 30 * math.sin(2 * a), c + 90 * math.sin(a)) for a in [i * 2 * math.pi / 40 for i in range(40)]]
    else:
        pts = ellipse_pts(c, c, 92, 92, 40)
    d.polygon(pts, fill=col + (255,)); d.polygon([(x * 0.7 + c * 0.3, y * 0.7 + c * 0.3) for x, y in pts], fill=tuple(min(255, v + 40) for v in col) + (255,))
    d.ellipse((c - 30, c - 46, c - 6, c - 22), fill=(255, 255, 255, 190))  # the enamel's shine
    return finish(img, rough=1, rim=2, strength=0.06)

def bed():
    W, H = 1300, 700; img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.polygon(torn_polygon([(80, 330), (1220, 330), (1240, 620), (60, 620)], 8, 60), fill=CLAY + (255,))              # the frame
    d.polygon(torn_polygon(rounded((100, 250, 1200, 470), 40), 8, 60), fill=(224, 232, 238, 255))                     # the quilt
    d.polygon(torn_polygon([(100, 380), (1200, 380), (1200, 470), (100, 470)], 6, 60), fill=(200, 214, 226, 255))     # its fold
    d.polygon(torn_polygon(rounded((140, 170, 460, 290), 40), 6, 30), fill=CREAM + (255,))                            # the pillow
    d.polygon(torn_polygon([(60, 120), (140, 120), (150, 620), (50, 620)], 6, 30), fill=(120, 84, 60, 255))           # the headboard post
    return finish(img, rough=3, rim=3)

def bedside():
    W, H = 520, 620; img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.polygon(torn_polygon([(40, 60), (480, 60), (500, 130), (20, 130)], 5, 30), fill=CLAY + (255,))
    d.polygon(torn_polygon([(70, 130), (450, 130), (450, 330), (70, 330)], 5, 30), fill=(140, 96, 70, 255))          # a drawer
    d.polygon(torn_polygon(ellipse_pts(260, 230, 22, 22, 24), 2, 10), fill=(196, 168, 110, 255))
    d.polygon(torn_polygon([(70, 330), (110, 330), (110, 600), (70, 600)], 3, 20), fill=(120, 84, 60, 255))
    d.polygon(torn_polygon([(410, 330), (450, 330), (450, 600), (410, 600)], 3, 20), fill=(120, 84, 60, 255))
    return finish(img, rough=3, rim=3)

COVERS = [(206, 156, 146), (208, 176, 108), (120, 150, 170), (168, 122, 96), (110, 140, 110), (150, 74, 52), (196, 222, 232), (128, 122, 116), (238, 232, 222), (232, 200, 150)]
def magazine(n, title):
    W, H = 480, 640; img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    col = COVERS[n % len(COVERS)]
    d.polygon(torn_polygon([(30, 30), (450, 30), (450, 610), (30, 610)], 4, 30), fill=col + (255,))
    d.rectangle((70, 80, 410, 110), fill=(255, 255, 255, 120))
    ink = INK if sum(col) > 420 else CREAM
    f = font(54); words = title.split(' '); y = 150
    for w in words: d.text((70, y), w, font=f, fill=ink + (255,)); y += 66
    d.text((70, 560), 'chimin · essays', font=font(22), fill=ink + (200,))
    return finish(img, rough=2, rim=2)

def magazines():
    W, H = 640, 420; img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for i in range(5):
        m = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(m)
        y = 300 - i * 34; col = COVERS[(i * 3) % len(COVERS)]
        d.polygon(torn_polygon([(120, y), (520, y), (520, y + 36), (120, y + 36)], 3, 20), fill=col + (255,))
        d.polygon(torn_polygon([(120, y - 6), (520, y - 6), (520, y + 4), (120, y + 4)], 2, 20), fill=(240, 236, 228, 255))
        img.alpha_composite(m.rotate((i - 2) * 2.5, resample=Image.BICUBIC, center=(320, y)))
    return finish(img, rough=2, rim=2)

def vinyl():
    W, H = 760, 560; img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.polygon(torn_polygon([(60, 300), (700, 300), (720, 520), (40, 520)], 6, 40), fill=(150, 108, 76, 255))          # the box
    d.polygon(torn_polygon([(80, 260), (680, 260), (700, 310), (60, 310)], 5, 40), fill=(176, 130, 92, 255))          # its top
    d.polygon(torn_polygon(ellipse_pts(330, 270, 190, 60, 48), 3, 16), fill=INK + (255,))                             # the record
    d.polygon(torn_polygon(ellipse_pts(330, 270, 60, 20, 24), 2, 10), fill=RUST + (255,))                             # the label
    d.line([(600, 200), (640, 260), (470, 280)], fill=ASH + (255,), width=10)                                          # the arm
    d.ellipse((585, 185, 625, 225), fill=ASH + (255,))
    return finish(img, rough=3, rim=3)

if __name__ == '__main__':
    save(pad(puffer()), 'puffer.webp'); save(pad(bag()), 'bag.webp'); save(pad(laptop_base()), 'laptop-base.webp'); save(pad(laptop_screen()), 'laptop-screen.webp')
    for n in range(6): save(pin(n), f'pin-{n + 1}.webp')
    save(pad(bed()), 'bed.webp'); save(pad(bedside()), 'bedside.webp'); save(pad(magazines()), 'magazines.webp'); save(pad(vinyl()), 'vinyl.webp')
    essays = [('whitman', 'On Whitman'), ('hume', 'Hume'), ('induction', 'Induction'), ('smith', 'Smith'), ('august', 'August'), ('catullus', 'Catullus'), ('howardsend', 'Howards End'), ('lostfound', 'Lost & Found'), ('salesman', 'Salesman'), ('selflove', 'Self-love')]
    for i, (slug, title) in enumerate(essays): save(pad(magazine(i, title), 12), f'magazine-{slug}.webp')
