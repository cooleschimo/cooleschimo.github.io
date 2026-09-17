"""
Painted-volume stand-ins for the room: every object, the wall, the floor and the entrance are
simple 3D forms rendered with one camera (20° down, a touch from the right) and one key light (upper left,
front), then painted over: soft wash, grain, darkened edges, a faint ink line, a blurred ground shadow.
They are meant to read as 2D illustrations of solid things (the reference is a painted, slightly elevated
view of red-walled buildings on sand), not as renders. The collage style stays on the postcards.

Run: PYTHONPATH=<dir with numpy+Pillow> python3 tools/render.py        (then tools/optimize-art.py)
Prints the CSS sizes (image width / margin) for each object so the slots line up.
"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageFilter, ImageChops, ImageOps, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from collage import grain, save, sky as collage_sky  # noqa: E402

random.seed(11); np.random.seed(11)

# ------------------------------------------------------------------ palette (paper, ice, wood, stone)
CREAM = (240, 234, 222); CREAM_D = (214, 204, 190)
ICE = (236, 246, 250); ICE_2 = (206, 234, 242); ICE_DEEP = (166, 216, 232); ICE_JOINT = (128, 186, 208)
WOOD = (176, 138, 98); WOOD_D = (140, 106, 72)
STONE = (198, 186, 166); GLAZE = (208, 196, 178)
INK = (78, 62, 50); DARK = (84, 76, 68); SILVER = (196, 194, 188)
FOX = (240, 236, 228); FOX_2 = (226, 220, 210); NOSE = (52, 46, 42)
RUST = (186, 112, 84); OLIVE = (150, 160, 128); MUSTARD = (208, 176, 108); ROSE = (206, 156, 146); BLUEGREY = (146, 164, 180)
SNOW = (240, 240, 234)

# ------------------------------------------------------------------ meshes
class Mesh:
    def __init__(self):
        self.V = []; self.N = []; self.F = []; self.C = []; self.S = []  # verts, vertex normals, faces, face colour, face spec
    def add(self, verts, normals, faces, colour, spec=0.0):
        b = len(self.V); self.V += list(verts); self.N += list(normals)
        for f in faces: self.F.append((f[0] + b, f[1] + b, f[2] + b)); self.C.append(colour); self.S.append(spec)
        return self
    def merge(self, other):
        b = len(self.V); self.V += other.V; self.N += other.N
        self.F += [(a + b, c + b, d + b) for a, c, d in other.F]; self.C += other.C; self.S += other.S; return self
    def transform(self, fn):
        pts = np.array(self.V); nrm = np.array(self.N)
        self.V = list(fn(pts, False)); self.N = list(fn(nrm, True)); return self
    def arrays(self):
        return np.array(self.V, float), np.array(self.N, float), np.array(self.F, int), np.array(self.C, float) / 255.0, np.array(self.S, float)

def rot_y(deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    def fn(P, is_n):
        x, y, z = P[:, 0], P[:, 1], P[:, 2]
        return np.stack([c * x + s * z, y, -s * x + c * z], 1)
    return fn
def rot_x(deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    def fn(P, is_n):
        x, y, z = P[:, 0], P[:, 1], P[:, 2]
        return np.stack([x, c * y - s * z, s * y + c * z], 1)
    return fn
def rot_z(deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    def fn(P, is_n):
        x, y, z = P[:, 0], P[:, 1], P[:, 2]
        return np.stack([c * x - s * y, s * x + c * y, z], 1)
    return fn
def move(dx, dy, dz):
    def fn(P, is_n): return P if is_n else P + np.array([dx, dy, dz])
    return fn
def scale(sx, sy, sz):
    def fn(P, is_n):
        if is_n:
            n = P / np.array([sx, sy, sz]); return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
        return P * np.array([sx, sy, sz])
    return fn

def box(w, h, d, colour, spec=0.0, cx=0, cy=0, cz=0):
    """Axis-aligned box, base at cy, flat normals."""
    m = Mesh(); x0, x1 = cx - w / 2, cx + w / 2; y0, y1 = cy, cy + h; z0, z1 = cz - d / 2, cz + d / 2
    faces = [  # (4 corners, normal)
        ([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1)),
        ([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], (0, 0, -1)),
        ([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], (1, 0, 0)),
        ([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], (-1, 0, 0)),
        ([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], (0, 1, 0)),
        ([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0)),
    ]
    for quad, n in faces: m.add(quad, [n] * 4, [(0, 1, 2), (0, 2, 3)], colour, spec)
    return m

def lathe(profile, colour, spec=0.0, n=40, cap=True):
    """Revolve a profile [(r, y), ...] (bottom to top) around the y axis; smooth normals."""
    m = Mesh(); P = np.array(profile, float); k = len(P)
    # profile normals (2D), perpendicular to the curve
    d = np.gradient(P, axis=0); pn = np.stack([d[:, 1], -d[:, 0]], 1); pn /= np.maximum(np.linalg.norm(pn, axis=1, keepdims=True), 1e-9)
    verts, norms = [], []
    for i in range(n + 1):
        a = 2 * math.pi * i / n; c, s = math.cos(a), math.sin(a)
        for (r, y), (nr, ny) in zip(P, pn):
            verts.append((r * c, y, r * s)); norms.append((nr * c, ny, nr * s))
    faces = []
    for i in range(n):
        for j in range(k - 1):
            a = i * k + j; b = (i + 1) * k + j
            faces += [(a, b, a + 1), (b, b + 1, a + 1)]
    m.add(verts, norms, faces, colour, spec)
    if cap:
        for (r, y), ny in ((P[0], -1), (P[-1], 1)):
            if r > 1e-6:
                c0 = len(m.V); ring = [(r * math.cos(2 * math.pi * i / n), y, r * math.sin(2 * math.pi * i / n)) for i in range(n)]
                m.add([(0, y, 0)] + ring, [(0, ny, 0)] * (n + 1), [(0, 1 + i, 1 + (i + 1) % n) if ny > 0 else (0, 1 + (i + 1) % n, 1 + i) for i in range(n)], colour, spec)
    return m

def ellipsoid(rx, ry, rz, colour, spec=0.0, n=28, cx=0, cy=0, cz=0):
    prof = [(math.sin(t) + 1e-4, -math.cos(t)) for t in np.linspace(0, math.pi, n // 2 + 1)]
    m = lathe(prof, colour, spec, n, cap=False)
    return m.transform(scale(rx, ry, rz)).transform(move(cx, cy, cz))

def cylinder(r, h, colour, spec=0.0, n=32, cx=0, cy=0, cz=0, r_top=None):
    rt = r if r_top is None else r_top
    return lathe([(r, 0), (r, h * 0.02), (rt, h * 0.98), (rt, h)], colour, spec, n).transform(move(cx, cy, cz))

def tube(path, radius, colour, spec=0.0, n=18, closed=False):
    """Sweep a circle of radius(t) along a polyline path [(x,y,z)...]; smooth normals; capped by tapering."""
    P = np.array(path, float); k = len(P); m = Mesh(); verts, norms = [], []
    T = np.gradient(P, axis=0); T /= np.maximum(np.linalg.norm(T, axis=1, keepdims=True), 1e-9)
    up = np.array([0, 1, 0.001]); frames = []
    for i in range(k):
        t = T[i]; b = np.cross(t, up); b /= max(np.linalg.norm(b), 1e-9); nn = np.cross(b, t); frames.append((b, nn))
    for i in range(k):
        r = radius(i / (k - 1)) if callable(radius) else radius
        b, nn = frames[i]
        for j in range(n + 1):
            a = 2 * math.pi * j / n; d = b * math.cos(a) + nn * math.sin(a)
            verts.append(tuple(P[i] + d * r)); norms.append(tuple(d))
    faces = []
    for i in range(k - 1):
        for j in range(n):
            a = i * (n + 1) + j; c = (i + 1) * (n + 1) + j
            faces += [(a, a + 1, c), (a + 1, c + 1, c)]
    return m.add(verts, norms, faces, colour, spec)

def arc_path(cx, cy, cz, R, a0, a1, k=24, y_fn=None):
    return [(cx + R * math.cos(a), cy + (y_fn(a) if y_fn else 0), cz + R * math.sin(a)) for a in np.linspace(math.radians(a0), math.radians(a1), k)]

# ------------------------------------------------------------------ camera + rasteriser
class Camera:
    def __init__(self, eye, target, W, H, fov=32):
        self.eye = np.array(eye, float); self.W, self.H = W, H
        f = np.array(target, float) - self.eye; f /= np.linalg.norm(f)
        r = np.cross(f, [0, 1, 0]); r /= np.linalg.norm(r); u = np.cross(r, f)
        self.R = np.stack([r, u, -f]); self.fl = (H / 2) / math.tan(math.radians(fov) / 2)
    def project(self, P):
        p = (P - self.eye) @ self.R.T
        z = -p[:, 2]; z = np.maximum(z, 1e-3)
        return np.stack([self.W / 2 + self.fl * p[:, 0] / z, self.H / 2 - self.fl * p[:, 1] / z, z], 1)
    def unproject_ground(self, sx, sy, gy=0.0):
        d = np.array([(sx - self.W / 2) / self.fl, -(sy - self.H / 2) / self.fl, -1.0]) @ self.R
        t = (gy - self.eye[1]) / d[1]; return self.eye + d * t

def rasterise(mesh, cam, two_sided=False):
    """Returns colour (H,W,3 float), normal (H,W,3), depth (H,W), spec, mask."""
    V, N, F, C, S = mesh.arrays(); W, H = cam.W, cam.H
    P = cam.project(V); depth = np.full((H, W), np.inf); col = np.zeros((H, W, 3)); nrm = np.zeros((H, W, 3)); spc = np.zeros((H, W))
    view_dir = V - cam.eye
    for fi, (a, b, c) in enumerate(F):
        pa, pb, pc = P[a], P[b], P[c]
        if min(pa[2], pb[2], pc[2]) < 0.06: continue  # near-plane cull
        area = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1])
        if abs(area) < 1e-6: continue
        x0 = max(int(min(pa[0], pb[0], pc[0])), 0); x1 = min(int(max(pa[0], pb[0], pc[0])) + 1, W - 1)
        y0 = max(int(min(pa[1], pb[1], pc[1])), 0); y1 = min(int(max(pa[1], pb[1], pc[1])) + 1, H - 1)
        if x1 < x0 or y1 < y0: continue
        xs = np.arange(x0, x1 + 1) + 0.5; ys = np.arange(y0, y1 + 1) + 0.5
        X, Y = np.meshgrid(xs, ys)
        w0 = ((pb[0] - X) * (pc[1] - Y) - (pc[0] - X) * (pb[1] - Y)) / area
        w1 = ((pc[0] - X) * (pa[1] - Y) - (pa[0] - X) * (pc[1] - Y)) / area
        w2 = 1 - w0 - w1
        inside = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
        if not inside.any(): continue
        z = 1.0 / (w0 / pa[2] + w1 / pb[2] + w2 / pc[2])
        sub = depth[y0:y1 + 1, x0:x1 + 1]; upd = inside & (z < sub)
        if not upd.any(): continue
        sub[upd] = z[upd]
        n = w0[..., None] * N[a] + w1[..., None] * N[b] + w2[..., None] * N[c]
        if two_sided:
            vd = (view_dir[a] + view_dir[b] + view_dir[c]) / 3
            if np.dot((N[a] + N[b] + N[c]), vd) > 0: n = -n
        col[y0:y1 + 1, x0:x1 + 1][upd] = C[fi]; nrm[y0:y1 + 1, x0:x1 + 1][upd] = n[upd]; spc[y0:y1 + 1, x0:x1 + 1][upd] = S[fi]
    mask = np.isfinite(depth)
    nrm /= np.maximum(np.linalg.norm(nrm, axis=2, keepdims=True), 1e-9)
    return col, nrm, depth, spc, mask

LIGHT = np.array([-0.55, 0.78, 0.55]); LIGHT /= np.linalg.norm(LIGHT)

def shade(col, nrm, spc, mask, cam, key=0.55, amb=0.52, warm=True):
    """Lambert key + sky fill + a little specular, warm in the light and cool in the shade."""
    ndl = np.clip(nrm @ LIGHT, 0, 1)
    sky = 0.5 + 0.5 * nrm[..., 1]
    lit = amb + key * ndl + 0.12 * sky
    out = col * lit[..., None]
    out = np.clip(out, 0, 1) ** 0.92  # high key, like paper
    if warm:
        tint = np.array([1.0, 0.98, 0.94]) * ndl[..., None] + np.array([0.94, 0.955, 1.0]) * (1 - ndl[..., None])
        out *= tint
    # specular (Blinn) toward the camera
    view = np.array([0, 0.35, 1.0]); view /= np.linalg.norm(view); hv = LIGHT + view; hv /= np.linalg.norm(hv)
    sp = np.clip(nrm @ hv, 0, 1) ** 28 * spc
    out += sp[..., None] * 0.55
    rim = np.clip(1.0 - np.abs(nrm[..., 2]), 0, 1) ** 3.0 * 0.18  # cool rim where the surface turns away
    out += rim[..., None] * np.array([0.75, 0.9, 1.0])
    out[~mask] = 0
    return np.clip(out, 0, 1)

def ground_shadow(mesh, cam, blur=11, alpha=0.24, gy=0.0):
    """Project every vertex along the light onto the ground and rasterise that as a soft dark shape."""
    V, N, F, C, S = mesh.arrays()
    t = (V[:, 1] - gy) / LIGHT[1]; G = V - LIGHT * t[:, None]; G[:, 1] = gy
    m = Mesh(); m.add([tuple(g) for g in G], [(0, 1, 0)] * len(G), [tuple(f) for f in F], (0, 0, 0))
    _, _, _, _, mask = rasterise(m, cam)
    img = Image.fromarray((mask * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(img).astype(float) / 255 * alpha
    return a

# ------------------------------------------------------------------ painting over the render
def to_rgba(col, mask):
    rgb = (col * 255).astype(np.uint8); a = (mask * 255).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb, a]), 'RGBA')

def ink_lines(depth, nrm, mask, strength=0.5, thick=1.0):
    """Line mask from depth and normal discontinuities (silhouettes and creases)."""
    d = np.where(np.isfinite(depth), depth, np.nanmax(np.where(np.isfinite(depth), depth, np.nan)) if mask.any() else 1)
    d = d / max(d.max(), 1e-6)
    gx = np.abs(np.diff(d, axis=1, prepend=d[:, :1])); gy = np.abs(np.diff(d, axis=0, prepend=d[:1]))
    dep = np.clip((gx + gy) * 40, 0, 1)
    nx = np.linalg.norm(np.diff(nrm, axis=1, prepend=nrm[:, :1]), axis=2); ny = np.linalg.norm(np.diff(nrm, axis=0, prepend=nrm[:1]), axis=2)
    crease = np.clip((nx + ny) * 0.9 - 0.25, 0, 1)
    sil = mask.astype(float) - np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(float) / 255
    line = np.clip(dep + crease + sil, 0, 1) * strength
    img = Image.fromarray((line * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(thick * 0.7))
    return np.asarray(img).astype(float) / 255

def paint(col, nrm, depth, mask, shadow=None, ink=0.5, edge=0.84, wash=0.9, grain_amt=6, soft=0.6):
    """Turn a shaded render into a painted sprite: soft wash inside, darker edges, ink line, grain, shadow."""
    H, W = mask.shape
    rgb = to_rgba(col, mask)
    # soften the interior colour a little (wash), keeping the alpha crisp
    r, g, b, a = rgb.split(); soft_rgb = Image.merge('RGB', (r, g, b)).filter(ImageFilter.GaussianBlur(wash))
    # keep edges of colour inside the shape: blur pulls in black from outside; fix by normalising with blurred alpha
    A = np.asarray(a).astype(float) / 255; Ab = np.asarray(a.filter(ImageFilter.GaussianBlur(wash))).astype(float) / 255
    sr = np.asarray(soft_rgb).astype(float) / 255 / np.maximum(Ab[..., None], 1e-3)
    base = np.asarray(Image.merge('RGB', (r, g, b))).astype(float) / 255
    out = np.where(A[..., None] > 0, np.clip(sr, 0, 1) * 0.7 + base * 0.3, 0)
    # low-frequency wash variation
    lf = np.asarray(Image.effect_noise((max(1, W // 24), max(1, H // 24)), 40).resize((W, H), Image.BILINEAR)).astype(float) / 255
    out *= (0.95 + 0.10 * lf)[..., None]
    # darker rim where the paint pools at the edge of the shape
    ring = A - np.asarray(a.filter(ImageFilter.MinFilter(5))).astype(float) / 255
    ring = np.asarray(Image.fromarray((np.clip(ring, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))).astype(float) / 255
    out *= (1 - (1 - edge) * ring)[..., None]
    # ink line
    if ink > 0:
        L = ink_lines(depth, nrm, mask, ink)
        out = out * (1 - L[..., None]) + (np.array(INK) / 255) * L[..., None]
    img = Image.fromarray(np.dstack([(np.clip(out, 0, 1) * 255).astype(np.uint8), (A * 255).astype(np.uint8)]), 'RGBA')
    img = grain(img, grain_amt, 2)
    # soft alpha edge
    if soft > 0:
        r, g, b, a = img.split(); a = a.filter(ImageFilter.GaussianBlur(soft)); img = Image.merge('RGBA', (r, g, b, a))
    if shadow is not None:
        sh = Image.fromarray(np.dstack([np.full((H, W, 3), 40, np.uint8), (shadow * 255).astype(np.uint8)]), 'RGBA')
        sh.putalpha(Image.fromarray((shadow * 255).astype(np.uint8)).point(lambda v: v))
        # tint the shadow blue-grey, keep it under the object
        sh_rgb = Image.new('RGBA', (W, H), (96, 88, 80, 0)); sh_rgb.putalpha(Image.fromarray((shadow * 255).astype(np.uint8)))
        img = Image.alpha_composite(sh_rgb, img)
    return img

def crop_pad(img, pad):
    bb = img.getbbox()
    if not bb: return img
    x0, y0, x1, y1 = bb
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))

# ------------------------------------------------------------------ object sprites
CSS = {}

def sprite(name, mesh, target_w, yaw=14, pitch=20, pad=22, shadow=True, ink=0.45, spec_boost=0, css_key=None, fov=24, extra=None, two_sided=False, gy=0.0):
    """Render a mesh so that its own width (without shadow) is target_w CSS px, at 2x. Records CSS width/margin."""
    V = np.array(mesh.V); lo, hi = V.min(0), V.max(0); centre = (lo + hi) / 2; size = hi - lo
    radius = np.linalg.norm(size) / 2
    dist = radius / math.tan(math.radians(fov) / 2) * 1.15
    d = np.array([math.sin(math.radians(yaw)) * math.cos(math.radians(pitch)), math.sin(math.radians(pitch)), math.cos(math.radians(yaw)) * math.cos(math.radians(pitch))])
    RW = RH = 1100
    cam = Camera(centre + d * dist, centre, RW, RH, fov)
    col, nrm, depth, spc, mask = rasterise(mesh, cam, two_sided)
    col = shade(col, nrm, spc, mask, cam)
    sh = ground_shadow(mesh, cam, gy=gy) if shadow else None
    img = paint(col, nrm, depth, mask, sh, ink=ink)
    if extra: img = extra(img, cam)
    # measure object width (mask only) and scale so it equals 2 * target_w
    ys, xs = np.where(mask); ow = xs.max() - xs.min() + 1; s = (2 * target_w) / ow
    bb = Image.fromarray((mask * 255).astype(np.uint8)).getbbox()
    # crop to the object bbox plus pad (in render px), then scale
    pr = int(pad / s)
    x0, y0, x1, y1 = max(0, bb[0] - pr), max(0, bb[1] - pr), min(img.width, bb[2] + pr), min(img.height, bb[3] + pr)
    # include shadow extent below
    if sh is not None:
        sb = Image.fromarray((sh > 0.01).astype(np.uint8) * 255).getbbox()
        if sb: x0, y0, x1, y1 = min(x0, sb[0]), min(y0, sb[1]), max(x1, sb[2]), max(y1, sb[3])
    out = img.crop((x0, y0, x1, y1)); out = out.resize((max(1, int(out.width * s)), max(1, int(out.height * s))), Image.LANCZOS)
    left_pad = (bb[0] - x0) * s / 2; top_pad = (bb[1] - y0) * s / 2
    CSS[css_key or name] = dict(width=out.width / 2, ml=-left_pad, mt=-top_pad)
    save(out, f'objects/{name}.png')
    return out

def fridge_mesh():
    m = box(0.70, 1.30, 0.66, CREAM, 0.12)
    m.merge(box(0.68, 0.010, 0.65, CREAM_D, cy=0.86))
    m.merge(box(0.022, 0.30, 0.02, SILVER, 0.4, cx=0.27, cy=0.94, cz=0.34))
    m.merge(box(0.022, 0.40, 0.02, SILVER, 0.4, cx=0.27, cy=0.36, cz=0.34))
    for i in range(2): m.merge(box(0.03, 0.05, 0.03, DARK, cx=-0.24 + 0.48 * i, cy=-0.05, cz=0.26))
    # magnets: three small discs on the door
    for (x, y, c) in ((-0.18, 1.04, RUST), (-0.06, 0.60, OLIVE), (0.04, 1.14, MUSTARD)):
        disc = lathe([(0.0, 0), (0.032, 0), (0.032, 0.012), (0.0, 0.012)], c, 0.1, 24)
        disc.transform(rot_x(90)).transform(move(x, y, 0.336)); m.merge(disc)
    return m

def table_mesh():
    m = box(2.4, 0.07, 1.1, WOOD, 0.06, cy=0.40)
    for (x, z) in ((-1.1, -0.45), (1.1, -0.45), (-1.1, 0.45), (1.1, 0.45)):
        m.merge(box(0.08, 0.40, 0.08, WOOD_D, cx=x, cz=z))
    m.merge(box(2.2, 0.03, 0.9, WOOD_D, cy=0.36))  # apron under the top
    return m

def camera_mesh():
    m = box(0.14, 0.08, 0.05, DARK, 0.18)
    m.merge(box(0.14, 0.022, 0.048, SILVER, 0.5, cy=0.08))          # top plate
    m.merge(box(0.05, 0.02, 0.03, SILVER, 0.5, cx=0.0, cy=0.10))    # prism
    m.merge(cylinder(0.012, 0.008, SILVER, 0.5, cx=0.052, cy=0.102)) # dial
    m.merge(cylinder(0.006, 0.006, SILVER, 0.5, cx=0.03, cy=0.102))  # shutter button
    lens = lathe([(0.0, 0), (0.030, 0), (0.030, 0.03), (0.024, 0.032), (0.022, 0.032), (0.022, 0.028), (0.0, 0.028)], DARK, 0.4, 32)
    lens.transform(rot_x(90)).transform(move(0.0, 0.04, 0.025)); m.merge(lens)
    glass = cylinder(0.018, 0.004, (48, 56, 68), 0.9, cx=0, cy=0).transform(rot_x(90)).transform(move(0, 0.04, 0.052)); m.merge(glass)
    return m

def vase_mesh():
    prof = [(0.0, 0), (0.06, 0), (0.075, 0.03), (0.085, 0.10), (0.082, 0.17), (0.07, 0.22), (0.055, 0.25), (0.05, 0.27), (0.058, 0.29), (0.062, 0.30)]
    return lathe(prof, GLAZE, 0.35, 48)

def candle_mesh():
    m = cylinder(0.022, 0.11, CREAM, 0.15, n=28)
    m.merge(cylinder(0.003, 0.012, DARK, cx=0, cy=0.11, n=8))
    m.merge(ellipsoid(0.010, 0.020, 0.010, (236, 178, 96), 0.0, 16, cy=0.13))
    m.merge(cylinder(0.05, 0.006, SILVER, 0.4, n=32))  # dish
    return m

def notebook_mesh():
    m = box(0.15, 0.024, 0.20, (108, 84, 68), 0.08, cy=0.0)           # cover (kraft-brown leather)
    m.merge(box(0.146, 0.018, 0.196, CREAM, 0.0, cy=0.003, cx=0.003))  # pages
    m.merge(box(0.012, 0.028, 0.20, (96, 74, 60), cx=-0.072))          # spine
    m.merge(box(0.01, 0.027, 0.206, INK, cx=0.045))                    # elastic band
    return m.transform(rot_y(-14))

def fox_mesh(sitting):
    m = Mesh()
    if not sitting:
        # curled: the body is a ring lying on the floor, the head rests on it, the tail wraps round the front
        body = tube(arc_path(0, 0.10, 0, 0.17, 20, 330, 28, y_fn=lambda a: 0.02 * math.sin(a)), lambda t: 0.105 * (0.75 + 0.5 * math.sin(math.pi * t) ** 0.6), FOX, 0.02, 20)
        m.merge(body)
        m.merge(ellipsoid(0.095, 0.075, 0.085, FOX, 0.02, 24, cx=0.14, cy=0.13, cz=-0.11))   # head, lying on the back
        m.merge(ellipsoid(0.045, 0.028, 0.038, FOX, 0, 14, cx=0.21, cy=0.10, cz=-0.05))    # muzzle
        m.merge(ellipsoid(0.011, 0.009, 0.011, NOSE, 0.3, 10, cx=0.245, cy=0.10, cz=-0.02))
        for dz in (-0.16, -0.06):
            m.merge(ellipsoid(0.026, 0.05, 0.02, FOX_2, 0, 12, cx=0.12, cy=0.19, cz=dz))   # ears
        tail = tube(arc_path(0.02, 0.06, 0.02, 0.27, 300, 420, 20), lambda t: 0.035 + 0.045 * math.sin(math.pi * t) ** 0.7, FOX, 0.02, 16); m.merge(tail)
    else:
        body = tube([(0, 0.16, 0.16), (0, 0.22, 0.10), (0, 0.34, 0.02), (0, 0.44, -0.01)], lambda t: 0.155 - 0.06 * t, FOX, 0.02, 24); m.merge(body)
        m.merge(ellipsoid(0.16, 0.15, 0.16, FOX, 0.02, 28, cy=0.15, cz=0.12))  # haunches, capping the body
        m.merge(ellipsoid(0.095, 0.085, 0.095, FOX, 0.02, 24, cy=0.53, cz=0.05))            # head
        for sx in (-1, 1):
            ear = lathe([(0.0, 0), (0.032, 0), (0.0, 0.085)], FOX_2, 0, 12).transform(move(sx * 0.055, 0.585, 0.02)); m.merge(ear)
            leg = tube([(sx * 0.06, 0.0, 0.16), (sx * 0.065, 0.14, 0.15), (sx * 0.07, 0.26, 0.10)], 0.027, FOX, 0.02, 14); m.merge(leg)
            m.merge(ellipsoid(0.035, 0.02, 0.045, FOX, 0, 12, cx=sx * 0.06, cy=0.012, cz=0.18))  # paws
        m.merge(ellipsoid(0.04, 0.032, 0.05, FOX, 0, 12, cy=0.50, cz=0.13))                 # muzzle
        m.merge(ellipsoid(0.013, 0.011, 0.012, NOSE, 0.3, 10, cy=0.505, cz=0.18))
        for sx in (-1, 1): m.merge(ellipsoid(0.011, 0.011, 0.007, NOSE, 0.4, 10, cx=sx * 0.04, cy=0.55, cz=0.135))
        tail = tube(arc_path(0.02, 0.05, 0.04, 0.2, 200, 330, 18), lambda t: 0.03 + 0.045 * math.sin(math.pi * t) ** 0.7, FOX, 0.02, 16); m.merge(tail)
    return m

def flower_mesh(n):
    heights = [0.62, 0.50, 0.70, 0.56, 0.66, 0.46]; colours = [ROSE, MUSTARD, RUST, BLUEGREY, OLIVE, (222, 206, 190)]
    h = heights[n - 1]; c = colours[n - 1]
    m = Mesh(); segs = 10; pts = []
    for i in range(segs + 1):
        t = i / segs; pts.append((0.02 * math.sin(t * 2.2 + n), h * t, 0.012 * math.sin(t * 1.7)))
    for i in range(segs):
        (x0, y0, z0), (x1, y1, z1) = pts[i], pts[i + 1]
        seg = cylinder(0.006, math.dist((x0, y0, z0), (x1, y1, z1)) * 1.02, OLIVE, 0, 10)
        ang = math.degrees(math.atan2(x1 - x0, y1 - y0))
        seg.transform(rot_z(-ang)).transform(move(x0, y0, z0)); m.merge(seg)
    x, y, z = pts[-1]
    kind = n % 3
    if kind == 0:   # round head
        m.merge(ellipsoid(0.045, 0.040, 0.045, c, 0.05, 20, cx=x, cy=y + 0.02, cz=z))
    elif kind == 1: # bell / tulip
        head = lathe([(0.0, 0), (0.02, 0), (0.045, 0.05), (0.04, 0.075), (0.0, 0.075)], c, 0.05, 24); head.transform(move(x, y - 0.01, z)); m.merge(head)
    else:           # a spray of small heads
        for k in range(5):
            a = k / 5 * 2 * math.pi; m.merge(ellipsoid(0.018, 0.016, 0.018, c, 0.05, 12, cx=x + 0.035 * math.cos(a), cy=y + 0.015 + 0.01 * math.sin(k), cz=z + 0.035 * math.sin(a)))
        m.merge(ellipsoid(0.014, 0.012, 0.014, MUSTARD, 0.05, 12, cx=x, cy=y + 0.03, cz=z))
    # a leaf
    leaf = ellipsoid(0.055, 0.008, 0.02, OLIVE, 0, 14).transform(rot_z(35)).transform(move(0.03, h * 0.35, 0.0)); m.merge(leaf)
    return m

def peg_mesh():
    m = box(0.012, 0.07, 0.008, WOOD_D, cx=-0.007); m.merge(box(0.012, 0.07, 0.008, WOOD_D, cx=0.007))
    m.merge(box(0.028, 0.006, 0.012, SILVER, 0.4, cy=0.032)); return m

# ------------------------------------------------------------------ the room itself (wall, floor, entrance) with one camera
ROOM_R = 3.2
def room_camera(W=1440, H=900):
    return Camera((0.0, 1.35, 1.75), (0.0, 0.95, -1.6), W, H, fov=58)

def dome_blocks(radius, inner=True, window=None, courses=13, gap=0.035, jitter=0.02, base_y=0.0, top_frac=1.0, colours=(ICE, ICE_2), gradient=False):
    """Courses of ice blocks on a sphere of the given radius (centre at origin, floor at y=0)."""
    m = Mesh()
    lat0 = 0.0; lat1 = math.pi / 2 * top_frac
    for ci in range(courses):
        a0 = lat0 + (lat1 - lat0) * ci / courses; a1 = lat0 + (lat1 - lat0) * (ci + 1) / courses
        r_mid = radius * math.cos((a0 + a1) / 2); n = max(6, int(2 * math.pi * r_mid / 0.72))
        off = (ci % 2) * 0.5
        for bi in range(n):
            t0 = 2 * math.pi * (bi + off) / n; t1 = 2 * math.pi * (bi + off + 1) / n
            # inset by the gap (in radians) on each side
            ga = gap / max(r_mid, 0.3); gl = gap / radius
            tt0, tt1 = t0 + ga / 2, t1 - ga / 2; aa0, aa1 = a0 + gl / 2, a1 - gl / 2
            rr = radius + (random.uniform(-jitter, jitter) if inner else random.uniform(-jitter, jitter))
            k = random.uniform(0.965, 1.02)
            if gradient:  # deeper cyan low down, whiter toward the top, like a block of ice lit from above
                f = ci / max(1, courses - 1); base = tuple(ICE_DEEP[j] * (1 - f) + ICE[j] * f for j in range(3))
                c = tuple(min(255, int(v * k)) for v in base)
            else: c = tuple(min(255, int(v * k)) for v in random.choice(colours))
            def P(t, a): return (rr * math.cos(a) * math.sin(t), base_y + rr * math.sin(a), rr * math.cos(a) * math.cos(t))
            quad = [P(tt0, aa0), P(tt1, aa0), P(tt1, aa1), P(tt0, aa1)]
            if window is not None:
                cx, cy, cz = (sum(q[0] for q in quad) / 4, sum(q[1] for q in quad) / 4, sum(q[2] for q in quad) / 4)
                v = np.array([cx, cy - base_y, cz]); v /= np.linalg.norm(v)
                if math.acos(np.clip(v @ window[0], -1, 1)) < window[1]: continue
            # bevel: a slightly smaller, brighter face in the centre to catch the light
            centre = np.mean(quad, axis=0); nvec = centre - np.array([0, base_y, 0]); nvec /= np.linalg.norm(nvec)
            if inner: nvec = -nvec
            wind = [(0, 1, 2), (0, 2, 3)] if not inner else [(0, 2, 1), (0, 3, 2)]
            m.add(quad, [tuple(nvec)] * 4, wind, c, 0.32)
            inner_q = [tuple(centre + (np.array(q) - centre) * 0.78 + (nvec * 0.012)) for q in quad]
            m.add(inner_q, [tuple(nvec)] * 4, wind, tuple(min(255, int(v * 1.04)) for v in c), 0.45)
            core_q = [tuple(centre + (np.array(q) - centre) * 0.45 + (nvec * 0.02)) for q in quad]  # light caught inside the ice
            m.add(core_q, [tuple(nvec)] * 4, wind, tuple(min(255, int(v * 1.08 + 8)) for v in c), 0.6)
    return m

def render_env(mesh, cam, key=0.55, amb=0.5, two_sided=True):
    col, nrm, depth, spc, mask = rasterise(mesh, cam, two_sided=two_sided)
    col = shade(col, nrm, spc, mask, cam, key=key, amb=amb)
    return col, nrm, depth, spc, mask

def wall():
    cam = room_camera()
    # where the window must land: the .window element centre (720, 201) in 1440x900, radius ~100
    d = np.array([(720 - cam.W / 2) / cam.fl, -(201 - cam.H / 2) / cam.fl, -1.0]) @ cam.R
    # ray from eye to the sphere
    o = cam.eye; b = 2 * (o @ d); c = o @ o - ROOM_R ** 2; t = (-b + math.sqrt(b * b - 4 * (d @ d) * c)) / (2 * (d @ d))
    hit = o + d * t; wdir = hit / np.linalg.norm(hit)
    theta = 0.0
    for _ in range(1):
        m = Mesh()
        m.merge(dome_blocks(ROOM_R, inner=True, window=None, courses=14, jitter=0.02, gradient=True))
        RJ = ROOM_R + 0.06
        joint = lathe([(RJ * math.cos(a) + 1e-3, RJ * math.sin(a)) for a in np.linspace(0, math.pi / 2, 20)], ICE_JOINT, 0.0, 48, cap=False)
        # cut the hole in the joint sphere too: remove faces whose centre is inside the window
        V = np.array(joint.V); keep = []
        for fi, f in enumerate(joint.F):
            cen = V[list(f)].mean(0); v = cen / np.linalg.norm(cen)
            if math.acos(np.clip(v @ wdir, -1, 1)) >= theta * 0.98: keep.append(fi)
        joint.F = [joint.F[i] for i in keep]; joint.C = [joint.C[i] for i in keep]; joint.S = [joint.S[i] for i in keep]
        m.merge(joint)
        col, nrm, depth, spc, mask = render_env(m, cam, key=0.22, amb=0.92)
        # measure the hole
    # window glow: blocks near the window are lit cool and bright, far blocks fall to the joint tone
    H, W = mask.shape
    yy, xx = np.mgrid[0:H, 0:W]; dist = np.hypot(xx - 720, yy - 201) / 900
    glow = np.clip(1.12 - dist * 0.45, 0.82, 1.12)
    col = np.clip(col * glow[..., None] * np.array([0.99, 1.0, 1.02]), 0, 1)
    col = col * 0.93 + np.array([246, 250, 252]) / 255 * 0.07
    img = paint(col, nrm, depth, mask, None, ink=0.3, edge=0.8, wash=0.7, grain_amt=4, soft=0.4)
    # the round window: cut per pixel where the .window element sits (centre 720,201; radius 100 + a soft edge)
    r, g, b, a = img.split(); A = np.asarray(a).astype(float)
    cut = np.clip((np.hypot(xx - 720, yy - 201) - 99) / 2.5, 0, 1); a = Image.fromarray((A * cut).astype(np.uint8))
    img = Image.merge('RGBA', (r, g, b, a))
    return img.resize((2880, 1800), Image.LANCZOS)

def floor():
    cam = room_camera()
    m = Mesh()
    # the floor disc, cream snow packed hard
    disc = lathe([(0.0, -0.002), (ROOM_R * 1.02, -0.002), (ROOM_R * 1.02, 0.0), (0.0, 0.0)], CREAM, 0.03, 64); m.merge(disc)
    # rug: where does the rug centre (730, 745) sit on the floor?
    g = cam.unproject_ground(730, 745); rx = 0.62
    rug = Mesh()
    rings = [(0.0, (206, 184, 154)), (0.36, (198, 176, 146)), (0.50, (186, 162, 132)), (0.62, (200, 178, 148))]
    for i in range(len(rings) - 1):
        r0, _ = rings[i]; r1, c = rings[i + 1]
        ring = lathe([(r0 + 1e-3, 0.0), (r0 + 1e-3, 0.018), (r1, 0.018), (r1, 0.0)], c, 0.0, 64, cap=False); rug.merge(ring)
    rug.merge(lathe([(0.0, 0.018), (0.36, 0.018)], rings[1][1], 0.0, 64, cap=False))
    rug.transform(scale(1.25, 1, 0.9)).transform(move(g[0], 0, g[2])); m.merge(rug)
    col, nrm, depth, spc, mask = render_env(m, cam, key=0.35, amb=0.68, two_sided=True)
    H, W = mask.shape
    # soft radial falloff toward the walls + a cooler tone far away
    yy, xx = np.mgrid[0:H, 0:W]; fall = np.clip(1.0 - ((450 - yy) / 900) * 0.35, 0.8, 1.0)
    col = np.clip(col * fall[..., None], 0, 1)
    img = paint(col, nrm, depth, mask, None, ink=0.12, edge=0.92, wash=2.0, grain_amt=7, soft=1.5)
    return img.resize((2880, 1800), Image.LANCZOS)

def entrance():
    cam = room_camera()
    # an arch of thick ice right in front of the camera: torus section around the view axis
    m = Mesh(); R = 1.55; r = 0.42; n = 36; k = 14
    cz = cam.eye[2] - 0.9; cy = cam.eye[1] - 0.55
    verts, norms = [], []
    for i in range(n + 1):
        v = math.pi * i / n  # upper half only
        for j in range(k + 1):
            u = 2 * math.pi * j / k
            x = (R + r * math.cos(u)) * math.cos(v); y = cy + (R + r * math.cos(u)) * math.sin(v); z = cz + r * math.sin(u)
            verts.append((x, y, z)); norms.append((math.cos(u) * math.cos(v), math.cos(u) * math.sin(v), math.sin(u)))
    faces = []
    for i in range(n):
        for j in range(k):
            a = i * (k + 1) + j; b = (i + 1) * (k + 1) + j
            faces += [(a, b, a + 1), (b, b + 1, a + 1)]
    m.add(verts, norms, faces, ICE_2, 0.3)
    for sx in (-1, 1): m.merge(box(2 * r, cy + 0.4, 2 * r, ICE_2, 0.05, cx=sx * R, cy=-0.4, cz=cz))
    col, nrm, depth, spc, mask = render_env(m, cam, key=0.2, amb=0.62, two_sided=True)
    col *= np.array([0.92, 0.95, 1.0])
    img = paint(col, nrm, depth, mask, None, ink=0.0, edge=0.88, wash=3.0, grain_amt=6, soft=6.0)
    return img.resize((2880, 1800), Image.LANCZOS)

def exterior():
    W, H = 1440, 900
    cam = Camera((0.0, 7.6, 8.4), (0.0, 0.7, 0.2), W, H, fov=44)
    m = Mesh()
    m.merge(dome_blocks(ROOM_R, inner=False, courses=13, jitter=0.02, colours=(SNOW, ICE)))
    m.merge(lathe([(ROOM_R * math.cos(a) + 1e-3, ROOM_R * math.sin(a)) for a in np.linspace(0, math.pi / 2, 20)], ICE_JOINT, 0.0, 48, cap=False).transform(scale(0.985, 0.985, 0.985)))
    # entrance tunnel: half cylinder along +z with block courses
    tunnel = Mesh(); tr = 1.25; tl = 1.9; segs = 8; around = 9
    for si in range(segs):
        z0 = ROOM_R * 0.55 + tl * si / segs; z1 = ROOM_R * 0.55 + tl * (si + 1) / segs; off = (si % 2) * 0.5
        for ai in range(around):
            a0 = math.pi * (ai + off) / around; a1 = math.pi * (ai + off + 1) / around
            if a0 < 0 or a1 > math.pi: continue
            ga = 0.03
            def P(a, z): return (tr * math.cos(a), tr * math.sin(a), z)
            quad = [P(a0 + ga, z0 + ga), P(a1 - ga, z0 + ga), P(a1 - ga, z1 - ga), P(a0 + ga, z1 - ga)]
            nv = (math.cos((a0 + a1) / 2), math.sin((a0 + a1) / 2), 0)
            k = random.uniform(0.97, 1.02); c = tuple(min(255, int(v * k)) for v in random.choice((SNOW, ICE)))
            tunnel.add(quad, [nv] * 4, [(0, 2, 1), (0, 3, 2)], c, 0.08)
    tunnel.merge(lathe([(tr * 0.99, 0), (tr * 0.99, tl + 0.2)], ICE_JOINT, 0, 24, cap=False).transform(rot_x(90)).transform(move(0, 0, ROOM_R * 0.55)))
    m.merge(tunnel)
    # the dark mouth of the tunnel: a half disc above the ground at the tunnel's end
    zm = ROOM_R * 0.55 + tl + 0.19; ring = [(tr * 0.9 * math.cos(a), tr * 0.9 * math.sin(a), zm) for a in np.linspace(0, math.pi, 14)]
    mouth = Mesh(); mouth.add([(0, 0, zm)] + ring, [(0, 0, 1)] * (len(ring) + 1), [(0, i + 1, i + 2) for i in range(len(ring) - 1)], (60, 66, 76)); m.merge(mouth)
    # a flatter dome reads as an igloo, not a ball
    m.transform(scale(1.0, 0.82, 1.0))
    col, nrm, depth, spc, mask = render_env(m, cam, key=0.5, amb=0.62, two_sided=True)
    sh = ground_shadow(m, cam, blur=14, alpha=0.20)
    igloo = paint(col, nrm, depth, mask, sh, ink=0.22, edge=0.9, wash=1.6, grain_amt=4, soft=0.8)
    # snow ground: paper-cream with a cool gradient toward the top and soft drifts
    yy, xx = np.mgrid[0:H, 0:W]
    top = np.array([226, 232, 236]) / 255; bot = np.array([242, 239, 232]) / 255
    g = top[None, None] * (1 - yy / H)[..., None] + bot[None, None] * (yy / H)[..., None]
    lf = np.asarray(Image.effect_noise((W // 90, H // 90), 60).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(20))).astype(float) / 255
    g *= (0.975 + 0.05 * lf)[..., None]
    ground = Image.fromarray((np.clip(g, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(ground, 'RGBA')
    # a faint trodden path from the bottom edge to the door
    for i in range(16):
        t = i / 16; y = H - 20 - t * (H - 20 - 640); x = W / 2 + 14 * math.sin(i * 1.3) + (12 if i % 2 else -12)
        d.ellipse((x - 9, y - 5, x + 9, y + 5), fill=(190, 188, 180, 40))
    out = Image.alpha_composite(ground, igloo)
    return grain(out.resize((2880, 1800), Image.LANCZOS), 4, 4)

def string_line():
    W = 2880
    img = Image.new('RGBA', (W, 600), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    pts = [(200 + t * (W - 400) / 80, 300 + 140 * math.sin(math.pi * t / 80)) for t in range(81)]
    d.line(pts, fill=(112, 94, 76, 235), width=4)
    d.line([(x, y + 3) for x, y in pts], fill=(60, 50, 40, 60), width=3)
    return img

def sky(night):
    """Painted sky for the window: a soft gradient and a few loose washes of cloud; night gets stars and an aurora."""
    S = 600
    yy, xx = np.mgrid[0:S, 0:S] / S
    if night == 'evening':
        top = np.array([176, 150, 196]) / 255; bot = np.array([250, 196, 150]) / 255
    elif not night:
        top = np.array([176, 198, 214]) / 255; bot = np.array([222, 230, 232]) / 255
    else:
        top = np.array([22, 30, 46]) / 255; bot = np.array([44, 56, 78]) / 255
    g = top[None, None] * (1 - yy)[..., None] + bot[None, None] * yy[..., None]
    img = Image.fromarray((g * 255).astype(np.uint8)).convert('RGBA')
    # clouds: thresholded blurred noise, brushed horizontally
    n = Image.effect_noise((S // 40, S // 90), 90).resize((S, S), Image.BICUBIC).filter(ImageFilter.GaussianBlur(10))
    c = np.asarray(n).astype(float) / 255; c = np.clip((c - 0.50) * 3.2, 0, 1) * np.clip(1.25 - yy * 1.5, 0, 1)
    cloud = Image.fromarray((c * (200 if night != True else 60)).astype(np.uint8))
    layer = Image.new('RGBA', (S, S), (246, 242, 236, 0) if not night else (255, 214, 190, 0) if night == 'evening' else (90, 100, 120, 0)); layer.putalpha(cloud)
    img = Image.alpha_composite(img, layer)
    if night == 'evening':
        d = ImageDraw.Draw(img, 'RGBA')
        sun = Image.new('RGBA', (S, S), (0, 0, 0, 0)); sd = ImageDraw.Draw(sun); sd.ellipse((S * 0.32, S * 0.58, S * 0.68, S * 0.94), fill=(255, 228, 190, 200))
        img = Image.alpha_composite(img, sun.filter(ImageFilter.GaussianBlur(40)))
    if night is True:
        d = ImageDraw.Draw(img, 'RGBA')
        for _ in range(60):
            x, y = random.uniform(0, S), random.uniform(0, S * 0.7); r = random.uniform(0.6, 1.8)
            d.ellipse((x - r, y - r, x + r, y + r), fill=(236, 236, 226, random.randint(120, 220)))
        aur = Image.new('RGBA', (S, S), (0, 0, 0, 0)); ad = ImageDraw.Draw(aur)
        for i in range(60):
            t = i / 60; x = t * S; y = S * 0.34 + 40 * math.sin(t * 5.5) ; col = (120, 205, 170, 46) if i % 2 else (150, 140, 210, 40)
            ad.line([(x, y), (x + 12, y - 90 - 30 * math.sin(t * 3))], fill=col, width=18)
        aur = aur.filter(ImageFilter.GaussianBlur(18)); img = Image.alpha_composite(img, aur)
    return grain(img, 6, 2)

# ------------------------------------------------------------------ main
if __name__ == '__main__':
    which = sys.argv[1:] or ['objects', 'room']
    if 'objects' in which:
        sprite('fridge-closed', fridge_mesh(), 190, yaw=18)
        sprite('table', table_mesh(), 520, yaw=6, pitch=22, fov=18)
        sprite('camera', camera_mesh(), 84, yaw=-22, pitch=24)
        sprite('vase-empty', vase_mesh(), 96, yaw=10, pitch=16)
        sprite('candle', candle_mesh(), 52, yaw=10, pitch=18)
        sprite('notebook', notebook_mesh(), 150, yaw=0, pitch=38)
        sprite('fox-asleep', fox_mesh(False), 130, yaw=22, pitch=24, ink=0.32)
        sprite('fox-sitting', fox_mesh(True), 80, yaw=24, pitch=14, ink=0.32)
        for n in range(1, 7): sprite(f'flowers/{n}', flower_mesh(n), 44, yaw=0, pitch=8, shadow=False, ink=0.3, css_key=f'flower{n}')
        sprite('peg', peg_mesh(), 12, yaw=0, pitch=10)
        print('\nCSS (1x): ', {k: {kk: round(vv, 1) for kk, vv in v.items()} for k, v in CSS.items()})
    if 'room' in which or 'wall' in which: save(wall(), 'room/wall.png')
    if 'room' in which or 'floor' in which: save(floor(), 'room/floor.png')
    if 'room' in which or 'entrance' in which: save(entrance(), 'room/entrance.png')
    if 'exterior' in which: save(exterior(), 'room/exterior.png')  # unused since the outside went 3D (Snowfield.tsx)
    if 'room' in which or 'sky' in which:
        save(string_line(), 'room/string.png'); save(sky(False), 'sky/day.png'); save(sky('evening'), 'sky/evening.png'); save(sky(True), 'sky/night.png')
