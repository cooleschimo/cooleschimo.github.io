# Prompt pack for the paper pieces

Generate each piece with an image model (GPT Image or similar), save it under `public/art/paper/` with the
exact file name, run `python3 tools/optimize-art.py` if it is a PNG, and reload. The site loads pieces by name.

## Rules that make them fit
- **Transparent background.** Ask for it. If the model cannot, ask for a plain pure-white background and I cut it out.
- **Front view, camera a little above** (about 15° down), the way you see a table from a chair. Same for every object, so they sit together.
- **Light from the upper left**, soft. **No cast shadow on the ground** and no drop shadow: the scene adds those.
- **Flat and paper**: patches of colour, no gradients, no gloss, no 3D render look, no outline heavier than a pencil.
- **Nothing else in the picture**: one object, centred, generous margin, no text, no ground, no props.
- Square or the aspect noted. 1024 px or larger. PNG.

## Style prefix (paste before every prompt)
> Flat paper-cut illustration in the style of a handmade collage poster: large patches of muted colour cut from handmade paper, visible paper fibre and tiny dark speckles, slightly torn irregular edges with a thin lighter paper rim, three to five tones per object, no gradients, no gloss, no outlines heavier than a pencil line, soft light from the upper left, no cast shadow, no background, centred with generous margin. Muted palette: cream, sand, clay, rust, ash, ink, pale ice blue. Not a 3D render, not clip art, not a sticker.

## Outside (the snowfield)
| File | Prompt (after the prefix) | Aspect |
|---|---|---|
| `igloo-back.png` | the far half of an igloo dome made of pale ice-blue snow blocks in staggered courses, seen from the front, a flat semicircle plate, whiter at the top, faintly deeper blue at the base | 3:2 |
| `igloo-front.png` | the near half of an igloo dome made of pale ice-white snow blocks in staggered courses, seen from the front, a flat semicircle plate, no door in it | 3:2 |
| `igloo-arch.png` | the small entrance tunnel of an igloo: an arch of ice-white snow blocks with an open dark navy mouth, seen from the front | 4:3 |
| `fox-side.png` | an arctic fox walking to the right, side view, white winter coat with a pale grey belly, bushy tail, small dark eye and nose, ears up | 3:2 |
| `fox-sit.png` | an arctic fox sitting and asleep, curled slightly, tail wrapped round its paws, side view facing right, white coat, ears up | 3:4 |
| `chimin.png` | a person lying on their back in the snow making a snow angel, seen from directly above, arms and legs out, a sand-coloured parka with a fur-trimmed hood, rust mittens, dark boots, a small calm face, black hair | 3:4 |
| `drift-1.png`, `drift-2.png`, `drift-3.png` | a soft oval drift of snow, a single pale lavender-white paper patch with a torn edge, seen from above | 5:2 |

## Inside (the room)
| File | Prompt (after the prefix) | Aspect |
|---|---|---|
| `wall-inside.png` | the inside wall of an igloo: pale ice-white snow blocks in staggered courses filling the whole picture, a round window hole cut through near the top centre showing nothing (transparent), whiter near the top, faintly deeper blue near the bottom | 12:7, no margin, fills the frame |
| `floor-inside.png` | a packed-snow floor of cream paper filling the whole picture, with a round braided rug of two tones of kraft brown in the lower middle, seen from a low front angle | 2:1, no margin, fills the frame |
| `table-front.png` | a low wooden table seen straight from the front: a thick slab top in warm clay, a darker apron under it, two straight legs, nothing on it | 5:2 |
| `shutter.png` | a round shutter of pale ice-blue snow blocks, a flat disc, seen from the front | 1:1 |
| `camera.png` | a small vintage 35mm film camera with a round lens, black leatherette body and silver top plate, seen from the front slightly above | 4:3 |
| `sketchbook.png` | a closed sketchbook lying flat, cream paper cover with a kraft spine and an elastic band, seen from the front slightly above | 2:1 |
| `postcards.png` | a small fanned stack of three vintage postcards, cream and ice-white, each with a muted picture and a stamp, seen from the front slightly above | 4:3 |
| `vase.png` | a stoneware vase with a narrow neck, sand-coloured with a pale glaze patch and a darker rim, empty, seen from the front | 3:4 |
| `flower-1.png` … `flower-6.png` | a single flower stem with one or two leaves and a paper-cut head, upright, colours in order: dusty rose, mustard, rust, dusty blue, sage, cream | 1:3 |
| `candle.png` | a short cream candle in a small silver dish with a tiny warm flame, seen from the front | 1:2 |

## The window's sky (`public/art/sky/`)
| File | Prompt (after the prefix) | Aspect |
|---|---|---|
| `day.png` | a soft pale blue-grey sky with a few loose paper clouds, filling the frame | 1:1 |
| `evening.png` | a sunset sky, lilac at the top to peach at the bottom with a low warm sun, filling the frame | 1:1 |
| `night.png` | a navy night sky with a faint green and violet aurora curtain and small stars, filling the frame | 1:1 |

## Postcards (the collage side, later)
For each place, a front (3:2) and eight loose pieces (torn photo scraps, washi tape, a stamp, a typewriter caption) in the cocktail-collage style; see `docs/ART-BRIEF.md` §B. Do these after the room pieces are right.
