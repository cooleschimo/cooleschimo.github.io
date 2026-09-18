"""
Turn a paper-cut piece into a painted one, as far as pixels allow: cut the pale paper rim off the
silhouette, smooth the paper fibre and speckle into flat soft paint, and feather the edge. For Chimin
(`--body`), also drop the white snow around her (the drawn snow-angel wings) so only she remains and
the letter snow makes the angel.

    python3 tools/restyle.py public/art/paper/fox-side.webp --rim 10
    python3 tools/restyle.py public/art/paper/chimin.webp --rim 8 --body

Run once per new piece, after defringe.py; each run cuts a little more.
"""
import argparse, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

def restyle(path: str, rim: int, body: bool, smooth: int):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32); al = a[..., 3] / 255.0
    solid = al > 0.5
    if body:
        # the person: pixels with some colour or darkness, the largest connected blob, closed and padded
        r, g, b = a[..., 0], a[..., 1], a[..., 2]; mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
        sat = (mx - mn) / np.maximum(mx, 1.0); dark = mx < 150
        core = solid & ((sat > 0.12) | dark)
        core = ndimage.binary_opening(core, iterations=2)
        lab, n = ndimage.label(core)
        if n > 1: sizes = ndimage.sum(core, lab, range(1, n + 1)); core = lab == (int(np.argmax(sizes)) + 1)
        core = ndimage.binary_closing(core, structure=np.ones((3, 3)), iterations=14)
        core = ndimage.binary_fill_holes(core)
        core = ndimage.binary_dilation(core, iterations=6)
        solid = solid & core
    # cut the rim: pull the silhouette in
    if rim > 0: solid = ndimage.binary_erosion(solid, iterations=rim)
    # feather
    new_al = ndimage.gaussian_filter(solid.astype(np.float32), 2.2)
    new_al = np.clip((new_al - 0.25) / 0.5, 0, 1)
    # paint: smooth the fibre and speckle, keep the tones
    rgb = Image.fromarray(a[..., :3].astype(np.uint8), 'RGB')
    if smooth > 0: rgb = rgb.filter(ImageFilter.MedianFilter(smooth)).filter(ImageFilter.GaussianBlur(0.8))
    rgbn = np.asarray(rgb).astype(np.float32)
    # bleed colour outward so the feathered edge carries the piece's colour, not the old rim
    _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    out_rgb = rgbn[iy, ix]
    out = np.concatenate([out_rgb, (new_al * 255)[..., None]], axis=-1).clip(0, 255).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(path, 'WEBP', quality=88, method=6)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('files', nargs='+'); ap.add_argument('--rim', type=int, default=8); ap.add_argument('--body', action='store_true'); ap.add_argument('--smooth', type=int, default=7)
    args = ap.parse_args()
    for p in args.files: restyle(p, args.rim, args.body, args.smooth); print('restyled', os.path.basename(p))
