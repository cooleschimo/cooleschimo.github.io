# DESIGN.md — Chimin Liu, personal site

Single source of truth for look and feel. Overrides any installed design skill, component library default, or agent instinct. If something here conflicts with PRD.md, ask.
Revision: 2026-09-17 (v5.3, "the igloo": painted volumes in the room, collage only on the postcards). Hybrid: 2.5D room plus one real 3D hero object later. Chimin's own direction after three attempts: a 2.5D illustrated igloo room, simple but sophisticated, an aesthetic rather than realism. Art is generated from Chimin's photographs in one collage style (see `docs/ART-BRIEF.md`).

## Feel
One illustrated room inside an igloo, drawn like a page from a good travel sketchbook: warm, low-contrast, quiet, with a lot of space around a few objects. The arctic is told through light, not props: blue-white daylight through the ice blocks by day; candle glow and a faint aurora through the window by night. Nothing is glossy. **Depth is felt, not implied**: a camera that slides with the pointer and dollies toward whatever you open, layers that occlude and grow at different rates, surfaces in perspective. One real 3D object (the vase or the bag) may live inside its own window later; the room itself never becomes 3D geometry.

Test: does it look like one person's sketchbook page, with the calm of the stamp-archive posts and the softness of the cocktail collages? If it looks like a game, a render, or a children's book, it fails.

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

## Arrival (once per session)
The site opens **above the igloo**: a near top-down collage of the dome in snow with **Chimin** set large in Instrument Serif over it. After a beat the shot tilts forward and drifts down to the front door (1.7s, `power2.inOut`), the name fading as it goes; then the camera pushes through the door (1.4s, `power3.in`) into dark. The room then **assembles from a clump**: every object starts pulled toward the centre, small, turned and faint, and settles into place (`expo.out`, 1.2s, random stagger), the way Jess Paik's opening scatters. Click anywhere skips it; it plays once per session; under reduced motion it is a 0.6s fade. Copy on this screen is the name only.

## The room (2.5D with a camera)
- A fixed viewport; a 1440×900 world scaled to fit. Layers by depth 0→1: ice wall + window (0), the postcard string (0.25), floor + rug (0.45), furniture and objects (0.7), the notebook and the entrance arc (1).
- **Camera**: the visitor's. Scroll or pinch zooms toward the pointer (1× to 2.6×), dragging the room pans while zoomed, double-click jumps in or resets, `+`/`-`/`0` on the keyboard, a small reset control bottom-right. Pointer parallax of up to 56px at depth 1 and ~7px at depth 0 rides on top. Opening something **dollies** to it (near layers growing more than far ones) and closing returns to the view the visitor had. Under reduced motion the parallax is off; zoom and dolly snap.
- **Postcard string**: a line sagging between two pegs across the upper room, fourteen cards clipped to it, each turned slightly in perspective by its position, swaying ±1.6° slowly. Hover tilts a card toward you and lifts it; click dollies to it and pulls it down into your hand, where it turns over to the collage canvas. Putting it back reverses both.
- Objects, and what they open: the **camera** on the table (photographs), the **vase** (arrange flowers in the room), the **notebook** on the rug (essays; readers leave a sticker), the **fox** (asleep by the fridge; wakes and follows a fish cursor in its zone), the **window** (day/night). The **fridge** is furniture for now. At most seven interactive things.
- Depth cues in the drawing: far layers slightly desaturated and lower-contrast, the entrance arc soft, near things crisp with deeper shadows. Every object carries its own ground shadow, cast to the lower right, so they sit on the floor and the table rather than float.
- Night: one multiply overlay over the whole world (navy at the edges, a warm pool around the candle) instead of per-layer filters.
- Hover: lift 4px, shadow deepens, mono label. Click: dolly, then a sheet (cream card, ink hairline, close dot) over the dimmed room.
- Phones: the room scales to width; sheets go full height; parallax off; the fox chase off.

## The postcard (signature)
Front: the place's collage artefact and a typewriter caption. Back: a cream postcard with address lines and a stamp box, holding Chimin's default arrangement of that place's collage pieces (torn paper, washi, a stamp, a caption). Every piece can be dragged; the visitor's arrangement is kept in their browser; Reset restores Chimin's. This is the one interaction that must be perfect.

## Motion
Verbs: **descend**, **dolly**, **lift**, **pull down**, **settle**, **sway**.
- Arrival as above; on later loads in the session the room fades in by layer (0.9s). Dolly 0.9s `power3.inOut`; the pulled card springs from its place on the string to the centre (bounce 0.12, 0.7s).
- Sheets: rise 24px + fade, 0.35s. Magnets lift 3px on hover.
- Fox: follows the cursor with a lag inside its zone; sits when the cursor leaves. The postcards sway; the candle flickers at night. Nothing else idles.
- Reduced motion: no parallax, no fox chase, sheets fade.

## Never
Realistic rendering, 3D geometry for the room (one hero object inside a window is the exception), glossy or glassy materials, drop shadows heavier than a paper lift, hand-drawn boxes, wobble filters, code-drawn characters, more than one artefact style, handwriting fonts, bright saturated UI colour, loaders, sound without a mute, scroll pinning, invented facts in the copy.

## Always
- Every interactive object has a keyboard path (a focusable button with the same label) and a tap path.
- Sheets are `role="dialog"`, labelled, Escape closes, focus returns.
- Alt text on photographs and artefacts, in Chimin's voice.
- Copy is Chimin's; placeholder copy is marked in the source.

## When unsure
Take something out of the room.
