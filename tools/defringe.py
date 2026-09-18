"""
Take the white fringe off cut-out pieces. An image cut from a white background keeps white in its
half-transparent edge pixels, which shows as a pale sticker outline once the piece is drawn over
snow or a wall. This bleeds the colour of the nearest solid pixel into every soft pixel (so the edge
carries the piece's own colour) and pulls the alpha in by about a pixel.

    python3 tools/defringe.py public/art/paper/chimin.webp [more files]
    python3 tools/defringe.py --all          # every piece under public/art/paper with soft edges

Run it once per new piece: each run erodes the edge a little more.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

def defringe(path: str) -> bool:
    im = Image.open(path).convert('RGBA'); a = np.asarray(im).astype(np.float32)
    al = a[..., 3]
    soft = (al > 0) & (al < 250)
    if soft.sum() == 0: return False
    solid = al >= 250
    # colour of the nearest solid pixel for every soft pixel
    _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    rgb = a[..., :3].copy(); rgb[soft] = a[..., :3][iy[soft], ix[soft]]
    # pull the alpha in: a little erosion, then a soft edge again
    er = ndimage.grey_erosion(al, size=(3, 3))
    new_al = np.clip(al * 0.45 + er * 0.55, 0, 255)
    new_al = ndimage.gaussian_filter(new_al, 0.6)
    new_al[al == 0] = 0
    out = np.concatenate([rgb, new_al[..., None]], axis=-1).clip(0, 255).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(path, 'WEBP', quality=88, method=6)
    return True

if __name__ == '__main__':
    args = sys.argv[1:]
    if args == ['--all']:
        d = os.path.join(os.path.dirname(__file__), '..', 'public', 'art', 'paper')
        args = [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.endswith('.webp')]
    for p in args:
        print(('defringed ' if defringe(p) else 'no soft edge, skipped ') + os.path.basename(p))
