# Art brief — the igloo (v5)

What to generate, in which style, at what size. Every image on the site comes from this list.
Run the collage skill (the "C'est la vie" cocktail-collage look) with the **style spec** below
prepended to each prompt so all outputs match. Test on 3–5 photos first; send me those before
generating the rest.

## Style spec: the room (prepend to every room and object prompt)
*A painted illustration of a solid object, seen from slightly above (about 20° down) and a touch from the right, in perspective. One soft key light from the upper left and front; faces shaded, a soft cast shadow on the ground toward the lower right; a faint warm ink line at the silhouette; clean and crisp, high key, fine paper grain. Ice is clear crystal: pale cyan-white translucent blocks with light caught inside and white frosted edges (references: the ice-card igloo, the translucent-block igloo). Muted palette otherwise: cream, warm wood, stoneware, one rust accent. No matte clay look, no outlines heavier than a pencil, no flat sticker look, no photoreal render, no text, no people.* (Reference: the painted temple-on-sand frames Chimin shared: red walls, green tile, stone guardians, warm sky.)

## Style spec: the postcards (prepend to every place, photo and sticker prompt)
*Paper collage: torn paper and washi-tape layers, soft translucent colour, edges slightly off-register, a typewriter caption on cream. Muted palette, no gloss.* (Reference: the cocktail collage.)

## A. The room (one illustration, layered)

Prompt: *inside a small igloo, seen from the entrance, slightly from above (a 20° top-down angle). Curved
wall of pale blue-white ice blocks with a round window on the back wall showing a strip of sky. A low
wooden table centre-right with a small film camera and a stoneware vase. A small cream fridge on the left
wall. A round woven rug on the floor with a closed notebook on it. An arctic fox curled asleep beside the
fridge. Candle on the table. No people.*

Export the room as separate transparent PNG layers at 2880×1800 (2× of 1440×900):
1. `room/wall.png` — ice wall and window frame, sky area transparent.
2. `room/floor.png` — floor and rug.
3. `room/entrance.png` — the foreground arc of the entrance tunnel (dark, soft edge), everything else transparent.
Plus each object on its own, transparent, same camera angle, at the size it appears in the room ×2:
4. `objects/fridge-closed.png` (the fridge, door closed, two or three magnets on it)
5. `objects/table.png`, `objects/camera.png`, `objects/vase-empty.png`, `objects/candle.png`
6. `objects/notebook.png`
7. `objects/fox-asleep.png`, `objects/fox-sitting.png`, `objects/fox-walking-1.png`, `objects/fox-walking-2.png` (same size, same feet position)
8. `objects/flowers/{1..6}.png` — six single stems, different heights and muted colours
9. `sky/day.png`, `sky/evening.png`, `sky/night.png` — the window's sky: soft clouds; a sunset with a low sun; stars with a faint aurora
10. `room/string.png` — the postcard string with its two pegs, no cards, transparent (spans the room at 2880 wide); and `objects/peg.png`, one small wooden peg

Camera note: the room is viewed from the entrance at a 20° top-down angle; keep that angle in every object so the layered parallax reads correctly. Leave generous transparent margins around the wall and floor layers (they move up to 60px).

## B. Places (one set per place; 14 places)

For each place, from 2–4 of Chimin's photos of it:
1. `places/{slug}/magnet.png` — optional now (the fridge is furniture); keep for later.
2. `places/{slug}/postcard-front.png` — 1280×840, the collage of the place with a typewriter caption (the place name, lower left). This is what hangs on the string, so it must read at 96px wide too: one clear subject, calm background.
3. `places/{slug}/pieces/{1..8}.png` — transparent collage pieces for the postcard back: torn paper shapes cut from the photos (2–3), washi strips (2), one stamp-style badge, one small caption strip, one doodle mark. Each ≤ 480px on its long side.

Slugs: budapest, cinque-terre, split, mostar, dubrovnik, malta, mallorca, venice, verona, lake-garda, como, slovenia, singapore, chicago.

## C. Photographs

`photos/{n}.jpg` — the originals, ≤ 2000px long side, plus `photos/{n}-collage.png` (1280 long side) as the translated version shown first. 12 to start.

## D. Stickers for the notebook

`stickers/{1..8}.png` — 200×200 transparent, in the same collage style: a star, a heart, a small fox, a snowflake, "good", "read", a coffee cup, a moon. Visitors give these to essays.

## Export rules
- Export PNGs by the names above into `public/art/`, then run `python3 tools/optimize-art.py` (needs Pillow): it converts everything to WebP, which is what the site loads, and deletes the PNGs.
- Until your art exists: `python3 tools/render.py` regenerates the painted room and objects (needs numpy + Pillow; prints the CSS sizes for the slots), `python3 tools/collage.py` the collage postcards and stickers.
- PNG with transparency for everything except originals. sRGB. No drop shadows baked in (the site adds a paper lift).
- Keep the same light direction (soft, from the upper left) and the same paper tone in every image.
- File names exactly as above; the site loads them by name from `public/art/`.
