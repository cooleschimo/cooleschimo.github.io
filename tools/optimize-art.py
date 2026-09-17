"""
Convert every PNG/JPG under public/art (except _placeholder) to WebP next to it, then delete the
source. The site loads .webp by the names in src/room/art.ts. Run after dropping in new art:
    python3 tools/optimize-art.py
"""
import os, sys
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'art')
total = 0
for dp, _, fs in os.walk(ROOT):
    if '_placeholder' in dp: continue
    for f in fs:
        if not f.lower().endswith(('.png', '.jpg', '.jpeg')): continue
        src = os.path.join(dp, f); dst = os.path.splitext(src)[0] + '.webp'
        im = Image.open(src)
        im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
        im.save(dst, 'WEBP', quality=82, method=6)
        os.remove(src); total += os.path.getsize(dst)
print('webp total', total // 1024, 'KB')
