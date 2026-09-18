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

## Style prefix B: painted, for the outside (try this if the paper-cut pieces still look pasted on)
The snow outside is soft, luminous and grainy; a flat paper cut-out with a torn rim reads as a sticker against it. For the
igloo, Chimin and the fox, generate again with this prefix instead, same prompts, same file names:
> Soft gouache and pastel illustration with visible grain, painted light: pale forms modelled with gentle tonal shading, no outlines, no paper texture, no torn edges, no rim, edges soft and slightly dry-brushed, a few muted tones, matte, no gloss, lit from behind and above by a low pale sun so the top and far edges catch a faint glow and the shadows are pale blue, no cast shadow on the ground, no background, transparent, centred with generous margin. Palette: white, ice blue, lilac shadow, sand, rust, ink. Not a 3D render, not clip art, not a sticker, not paper.

The site already frosts, grains, glistens and shades every piece in the shader (a relief inflated from its silhouette), so a painted piece needs no sparkle or heavy modelling drawn in; flat soft tones with a little shading are best. Drop new files in by name, then run `python3 tools/defringe.py <file>` and `python3 tools/restyle.py <file> --rim 6` (add `--body` for Chimin if the model draws snow around her: the letter snow makes the angel).

## Outside (the snowfield)
| File | Prompt (after the prefix) | Aspect |
|---|---|---|
| `igloo-back.png` | the far half of an igloo dome made of pale ice-blue snow blocks in staggered courses, seen from the front, a flat semicircle plate, whiter at the top, faintly deeper blue at the base | 3:2 |
| `igloo-front.png` | the near half of an igloo dome made of pale ice-white snow blocks in staggered courses, seen from the front, a flat semicircle plate, no door in it | 3:2 |
| `igloo-arch.png` | the small entrance tunnel of an igloo: an arch of ice-white snow blocks with an open dark navy mouth, seen from the front | 4:3 |
| `fox-side.png` | an arctic fox walking to the right, side view, white winter coat with a pale grey belly, bushy tail, small dark eye and nose, ears up | 3:2 |
| `fox-leap.png` | an arctic fox in mid-leap to the right, side view, stretched out: front legs reaching forward, back legs trailing behind, tail streaming, ears back, white winter coat | 3:2 |
| `fox-run.png` | an arctic fox at full gallop to the right, side view, body stretched long, all four legs off the ground, tail out straight | 3:2 |
| `fox-front.png` | an arctic fox walking toward the viewer, three-quarter view from the front, white winter coat, ears up, looking at you | 3:4 |
| `fox-back.png` | an arctic fox walking away from the viewer, three-quarter view from behind, white winter coat, bushy tail, head turned a little back | 3:4 |
| `fox-sit.png` | an arctic fox sitting and asleep, curled slightly, tail wrapped round its paws, side view facing right, white coat, ears up | 3:4 |
| `chimin.png` | a young woman lying on her back in the snow making a snow angel, seen from directly above, arms and legs out wide (the same pose as before, so the rig still fits), eyes closed, a small calm smile. She wears a pastel-yellow puffer jacket so pale it is almost off-white, with a matching collar and no hood; a slouchy knitted beanie in oatmeal, soft and saggy at the back; tan knitted gloves; dark navy-blue jeans; off-white winter boots. Her hair is long and straight, dark, side-parted on her right (the viewer's left as she lies facing up), the longer side falling across the left side of her face (the viewer's right) and spilling onto the snow. No snow drawn around her, no wings, nothing else in the picture | 3:4 |
| `drift-1.png`, `drift-2.png`, `drift-3.png` | a soft oval drift of snow, a single pale lavender-white paper patch with a torn edge, seen from above | 5:2 |

## Inside (the room, v10: the coats, the bed, the window)
| File | Prompt (after the prefix) | Aspect |
|---|---|---|
| `puffer.png` | a white puffer jacket hanging from a wall hook by its collar, seen from the front, its baffles softly stitched, a small dark hook above it | 4:5 |
| `bag.png` | a large brown leather shoulder bag with a flap and a brass clasp, hanging by its strap from a wall hook, seen from the front, the flap plain (the pins are separate pieces) | 7:8 |
| `laptop-base.png` | the lower half of a slim silver laptop seen from the front and a little above: the keyboard and trackpad only, no screen | 3:2 |
| `laptop-screen.png` | the screen half of a slim silver laptop seen from the front, the display pale cream and empty | 3:2 |
| `pin-1.png` … `pin-6.png` | a small round enamel pin badge, one motif each: a fox, a snowflake, a star, a heart, a leaf, a letter C; bold flat colours, a little shine | 1:1 |
| `bed.png` | a low single bed seen from the front: a wooden frame, a pale blue quilt folded back, one cream pillow at the left | 13:7 |
| `bedside.png` | a small wooden bedside table with one drawer and a brass knob, seen from the front | 5:6 |
| `magazines.png` | a stack of five thin magazines lying flat, seen from the front and slightly above, spines toward you, in muted colours | 3:2 |
| `magazine-<slug>.png` | one magazine cover, portrait, a single muted colour with the essay's title in a serif at the top (slugs: whitman, hume, induction, smith, august, catullus, howardsend, lostfound, salesman, selflove) | 3:4 |
| `vinyl.png` | a small record player in a wooden case, lid open, a black record with a rust label on the platter and the tone arm resting on it, seen from the front and slightly above | 4:3 |

## Inside (the room, earlier pieces)
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
