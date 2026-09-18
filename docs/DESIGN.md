# DESIGN.md — Chimin Liu, personal site

Single source of truth for look and feel. Overrides any installed design skill, component library default, or agent instinct. If something here conflicts with PRD.md, ask.
Revision: 2026-09-18 (v8, "paint in snow": the snow is the thing, deep white and sparkling, made of letters; Chimin's painted pieces stand in it as paint strokes in 3D, not paper cut-outs). Hybrid: 2.5D room plus one real 3D hero object later. Chimin's own direction after three attempts: a 2.5D illustrated igloo room, simple but sophisticated, an aesthetic rather than realism. Art is generated from Chimin's photographs in one collage style (see `docs/ART-BRIEF.md`).

## Feel
One illustrated room inside an igloo, drawn like a page from a good travel sketchbook: warm, low-contrast, quiet, with a lot of space around a few objects. The arctic is told through light, not props: by day the room is lit by natural light through the window, dreamy and pastel; in the evening the sunset comes in warm and low; at night the aurora colours the room and the lamps take over. The ice itself is **clean, crisp crystal**: pale cyan-white blocks that look painted but translucent, light caught inside them, white frosted edges (references: the ice-card igloo, the translucent-block igloo with foxes, the glowing igloo under the aurora). Not matte, not clay, not grey. Nothing is glossy. **Depth is felt, not implied**: a camera that slides with the pointer and dollies toward whatever you open, layers that occlude and grow at different rates, surfaces in perspective. One real 3D object (the vase or the bag) may live inside its own window later; the room itself never becomes 3D geometry.

Test: does it look like a paper diorama someone made by hand, calm, with one thing to look at? If it looks like a game, a render, a clay model or a children's book, it fails.

## Two registers, one hand
**The room is painted volume.** The igloo, its objects and the fox are 2D pictures of solid things: drawn in perspective from one camera (about 20° above eye level, a touch from the right), lit by one soft key light from the upper left, with shaded faces, a cast shadow on the ground, a faint ink line at the silhouette and a wash of paper grain. Reference: Chimin's painted frames of a walled temple on sand (red walls, green tile, a pagoda, stone guardians): high key, warm paper, a light ink line, watercolour weight, nothing glossy. This is what "2D but looks 3D" means here. Not stickers, not flat cut-outs, not renders.

**The postcards are collage.** Every place and every photograph is translated into the cocktail-collage style: torn paper and washi, soft translucent colour, edges slightly off-register, a typewriter caption. Collage lives on the string and inside the postcard sheet, and on the stickers. It does not spread into the room.

Until Chimin's art exists, `tools/render.py` renders the room register from simple 3D forms and paints over them, and `tools/collage.py` makes the postcard register. Both are sketches of their style, replaced file by file.

## Ground and colour
- Paper: cream `#f4efe6`. Ink: warm near-black `#2a2622`. Secondary: `#7a7369`. Accent: one, taken from Chimin's photos once the artefacts exist; placeholder rust `#c7694a`.
- Day light: cool blue-white `#dfe9ee` on the ice wall. Night: navy `#1e2733` room, warm candle `#f0c07a` pools, aurora `#7fd6b5` / `#9a8fd9` at low opacity through the window only.
- Colour lives in the artefacts and the photographs. The room stays within the paper, ink and two light tints.

## Type
- **Instrument Serif** for the name and sheet headings, one weight.
- **JetBrains Mono** (typewriter voice) for captions, labels, magnet names, postcard text, 11–13px. This is the voice of the collages and the stamp archive.
- **Geist** for reading text inside sheets, 15–16px. Newsreader for long essays (M4).
- No handwriting fonts, no bold, no gradient text.

## Letter snow (outside; the idea the site is built on)
Chimin's first reference, restated after the diorama missed it: **snow that looks like real piled snow but is made of letters**, with glitter in it, with Chimin and the fox *in* it, and letters that behave like matter. Dreamy, magical, ethereal: everything blended by one light and one haze, nothing pasted on.
- **Thick white snow.** A heightfield of mounds and drifts under tens of thousands of letter glyphs lying along the slopes in two layers. Snow and letters share one shading (`SNOW_GLSL`): white in the light, pale blue in the shadow and in the hollows, a subsurface glow where the surface turns away, and glitter (tiny random facets that flash as the camera moves), so the letters are the texture of the snow, not confetti on it. Each glyph keeps a soft blue edge so the snow still reads as letters when you look.
- **Light.** The sun (or moon) is low in front of the camera, so the snow is backlit and the glints face the viewer; a soft glow sits over the horizon; distance fog in the horizon colour; bloom only on the true highlights (sparkles, glints); dust drifting in the air near the camera. Day: pastel lilac-pink haze. Evening: peach sky, lavender snow. Night: aurora on the sky and washed across the snow, stars.
- **Physics.** Letters are particles. The cursor pushes them aside; the fox wading through kicks them up and they tumble and fall back onto the slope; small letters drift down from the sky and land. Nothing slides as an image.
- **In the snow.** Chimin lies in a hollow of the field (a negative mound), nearly flat, tipped a little toward the camera, with letters heaped on the rim over her feet. The fox is sunk to its belly. The igloo's plates are set into the middle mound with a drift of letters heaped against their base.
- **Paint in 3D, not paper.** The pieces are painted pictures standing in the scene. Their edges are brushed (alpha broken up by noise), never a straight cut; they take the day's light (tint, brighter toward the top), the scene's fog, and blend into the snow colour where they sink. No white rim: generated pieces are run through `tools/defringe.py` (edge pixels take the piece's own colour), and solid pieces discard anything half-transparent.
- **The igloo** is Chimin's three plates set into the middle mound; click it to go in.
- The camera is in front and a little above, drifting with the pointer. Never a top view.

## The paper pieces (Chimin's generated art)
Chimin's generated pieces in the handmade-paper hand: flat, textured patches with torn edges and paper fibre, placed as planes in the 3D world. The references are the letter snow with the cat lying in it, the ceramic-poster of torn paper patches with tiny figures in front, and the moving Chinese window for light. So:
- **Pieces are paper.** Every thing on the site is a flat picture: large patches of muted colour with handmade-paper fibre and speckle, torn edges and a lighter paper rim, a few tones, no gradients, no gloss. Real 2D art (Chimin's, generated in this hand) on planes. Never a modelled figure.
- **Space is real.** A three.js scene with a camera that drifts with the pointer and moves when you go somewhere; pieces sit at depths and occlude each other; the ground is a painted plane. The depth is felt, the pictures stay flat.
- **Paint is the motion.** A piece arrives as an ink line and fills with watercolour that runs in with a wet edge; when you move on it dissolves into pigment that lifts and drifts. Nothing slides, pops or bounces.
- **The snow is a field of letters** (Chimin's reference) with paper texture and a light that moves with the time of day. It is soft: the cursor pushes it and leaves a trail that slowly fills back; the fox wades through it half sunk and throws up snow; Chimin lies pressed into it, arms out.
- **The igloo is three plates** (the far half of the dome, the near half with the door, the entrance arch) leaning back a little, with a soft shadow under them. Going in is the camera passing between the plates into the door.
- **One focal point at a time.** Outside it is the igloo; inside it will be a table close up with a few objects large enough to touch. Fewer, bigger pieces; calm.
- Post: a little bloom on the sparkles, film grain, a soft vignette. Never more.

## Inside (the room, real 3D, paper)
One focal point: a low wooden table seen from the front, close, with a few paper objects on it large enough to touch: the **camera** (photographs), the **notebook** (writing), a **stack of postcards** (places, one per click), the **vase** with six stems you can take out and put back, a **candle**. Behind it the ice wall with the round **window**; the sky in it follows the time of day. The fox sleeps by the wall. Nothing else.
- Hover lifts an object a little and names it bottom-left. Click: the object **dissolves into pigment** and its sheet opens; closing the sheet paints it back.
- **Light, by time of day.** A soft beam falls from the window across the table, pools on the table top and the floor, a faint wash sits on the wall, and the candle's lamp glows in the evening and at night. Day is bright and pastel, evening peach and lilac, night navy with a warm island at the candle and stars and aurora in the window. All of it is gentle: light is additive planes at low opacity over paper, never a dark room with one hard shaft.
- **The window is interactive.** Click it and an ice shutter slides down; the beam, pools and wash go out and the paper cools. Click again to open.
- The camera drifts a little with the pointer. Bloom only on the brightest points, grain, a soft vignette.

## The postcard (signature)
Front: the place's collage artefact and a typewriter caption. Back: a cream postcard with address lines and a stamp box, holding Chimin's default arrangement of that place's collage pieces (torn paper, washi, a stamp, a caption). Every piece can be dragged; the visitor's arrangement is kept in their browser; Reset restores Chimin's. This is the one interaction that must be perfect.

## Motion
Verbs: **run** (the fox), **descend**, **dolly**, **lift**, **pull down**, **settle**, **sway**.
- Entering from outside as above; on later loads in the session the room fades in by layer (0.9s). Dolly 0.9s `power3.inOut`; the pulled card springs from its place on the string to the centre (bounce 0.12, 0.7s).
- Sheets: rise 24px + fade, 0.35s. Magnets lift 3px on hover.
- Fox: follows the cursor with a lag inside its zone; sits when the cursor leaves. The postcards sway; the candle flickers at night. Nothing else idles.
- Reduced motion: no parallax, no fox chase, sheets fade.

## Never
Realistic rendering, 3D geometry for the room (the outside snowfield and one hero object inside a window are the exceptions), glossy or glassy materials, drop shadows heavier than a paper lift, hand-drawn boxes, wobble filters, code-drawn characters, more than one artefact style, handwriting fonts, bright saturated UI colour, loaders, sound without a mute, scroll pinning, invented facts in the copy.

## Always
- Every interactive object has a keyboard path (a focusable button with the same label) and a tap path.
- Sheets are `role="dialog"`, labelled, Escape closes, focus returns.
- Alt text on photographs and artefacts, in Chimin's voice.
- Copy is Chimin's; placeholder copy is marked in the source.

## When unsure
Take something out of the room.
