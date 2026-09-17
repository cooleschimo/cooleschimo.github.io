# DESIGN.md — Chimin Liu, personal site

Single source of truth for look and feel. Overrides any installed design skill, component library default, or agent instinct. If something here conflicts with PRD.md, ask.
Revision: 2026-09-17 (v5, "the igloo"). Chimin's own direction after three attempts: a 2.5D illustrated igloo room, simple but sophisticated, an aesthetic rather than realism. Art is generated from Chimin's photographs in one collage style (see `docs/ART-BRIEF.md`).

## Feel
One illustrated room inside an igloo, drawn like a page from a good travel sketchbook: warm, low-contrast, quiet, with a lot of space around a few objects. The arctic is told through light, not props: blue-white daylight through the ice blocks by day; candle glow and a faint aurora through the window by night. Nothing is rendered or glossy. Depth comes from three or four parallax layers and from objects lifting toward you, never from 3D geometry.

Test: does it look like one person's sketchbook page, with the calm of the stamp-archive posts and the softness of the cocktail collages? If it looks like a game, a render, or a children's book, it fails.

## The one style: paper collage
Every place and every photograph on the site is translated into the **cocktail-collage style**: torn paper and washi-tape layers, soft translucent colour, edges slightly off-register, a typewriter caption. The room itself, its objects and the fox are illustrated in the same hand (flat colour, torn-paper edges, paper texture, no outlines heavier than a pencil). One style, everywhere, generated from Chimin's photos and a written room description with a fixed style spec, so every output matches.

## Ground and colour
- Paper: cream `#f4efe6`. Ink: warm near-black `#2a2622`. Secondary: `#7a7369`. Accent: one, taken from Chimin's photos once the artefacts exist; placeholder rust `#c7694a`.
- Day light: cool blue-white `#dfe9ee` on the ice wall. Night: navy `#1e2733` room, warm candle `#f0c07a` pools, aurora `#7fd6b5` / `#9a8fd9` at low opacity through the window only.
- Colour lives in the artefacts and the photographs. The room stays within the paper, ink and two light tints.

## Type
- **Instrument Serif** for the name and sheet headings, one weight.
- **JetBrains Mono** (typewriter voice) for captions, labels, magnet names, postcard text, 11–13px. This is the voice of the collages and the stamp archive.
- **Geist** for reading text inside sheets, 15–16px. Newsreader for long essays (M4).
- No handwriting fonts, no bold, no gradient text.

## The room (2.5D)
- A fixed viewport; a 1440×900 world scaled to fit. Layers, back to front: ice wall + window (sky), floor + rug, objects, foreground entrance arc. Pointer parallax of ±6/±10/±14px per layer, eased; none under reduced motion.
- Objects, and what they open: the **fridge** (the magnets on its door are the places; a magnet opens that place's postcard), the **camera** on the table (photographs), the **vase** (arrange flowers from the table, in the room, no sheet), the **notebook** on the rug (essays; readers can leave a sticker), the **fox** (asleep by the fridge; wakes and follows the cursor, which becomes a fish, inside its zone), the **window** (day/night). At most seven interactive things.
- Hover: lift 4px, a soft shadow deepens, a mono label appears. Click: a sheet rises over the room (cream card, ink hairline, close dot), the room dims 20%.
- Phones: the room scales to width; tall sheets become full-height; the fox chase is off.

## The postcard (signature)
Front: the place's collage artefact and a typewriter caption. Back: a cream postcard with address lines and a stamp box, holding Chimin's default arrangement of that place's collage pieces (torn paper, washi, a stamp, a caption). Every piece can be dragged; the visitor's arrangement is kept in their browser; Reset restores Chimin's. This is the one interaction that must be perfect.

## Motion
Verbs: **lift**, **settle**, **drift**.
- Room fades and settles in on load (layers slide 10px into place, 0.8s). No deal-in, no bounce.
- Sheets: rise 24px + fade, 0.35s. Magnets lift 3px on hover.
- Fox: follows the cursor with a lag inside its zone; sits when the cursor leaves. Blinks occasionally. Nothing else idles except candle flicker at night (opacity ±4%).
- Reduced motion: no parallax, no fox chase, sheets fade.

## Never
Realistic rendering, 3D geometry, glossy or glassy materials, drop shadows heavier than a paper lift, hand-drawn boxes, wobble filters, code-drawn characters, more than one artefact style, handwriting fonts, bright saturated UI colour, loaders, sound without a mute, scroll pinning, invented facts in the copy.

## Always
- Every interactive object has a keyboard path (a focusable button with the same label) and a tap path.
- Sheets are `role="dialog"`, labelled, Escape closes, focus returns.
- Alt text on photographs and artefacts, in Chimin's voice.
- Copy is Chimin's; placeholder copy is marked in the source.

## When unsure
Take something out of the room.
