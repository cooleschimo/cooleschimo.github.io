# DESIGN.md — Chimin Liu, personal site

Single source of truth for look and feel. Overrides any installed design skill, component library default, or agent instinct. If something here conflicts with PRD.md, ask.
Revision: 2026-09-17 (v4, "the desk"). Modelled directly on jesspaik.com and jackiehu.design after Chimin rejected both the sketchbook build (childish) and the typographic rebuild (further from the references). Warm paper ground, per Chimin.

## Feel
A photographed desk. Real objects, cut out and laid on warm paper: a camera, an open travel sketchbook, a letter, a folder, polaroids, a palette, a cup, tape, pencils, today's date. The name sits in the middle in a sharp serif. Everything can be picked up and moved; the objects that matter open a small window. It should feel like Jess Paik's and Jackie Hu's desks: playful, tactile, and polished because the objects are real.

Test: would this pass as one of the reference sites with the name changed? If any object looks drawn by code, it fails.

## Materials
- **Objects are photographs**, cut out with transparent backgrounds, lit from above, with a soft real shadow. Until Chimin supplies their own (their camera, prints, sketchbook, paints), the stand-ins are CC0 photographs listed in `public/art/_placeholder/CREDITS.md`.
- Paper objects that carry text (polaroid, date card, folder tab) are built in CSS/SVG but must read as physical: white stock, slight warmth, the same shadow as the photos.
- No vector doodles, no line-art mascots, no generated textures.

## Ground and colour
- Ground is flat warm paper `#fbf7ef` by day, warm near-black `#1d1b18` by night. Windows are cream stock `#fdfbf6` in both modes.
- Type is near-black ink; secondary text warm grey. One accent, coral `#d9603f`, for the window close dot and links only. Colour otherwise comes from the objects.

```css
:root[data-mode="day"]   { --bg:#fbf7ef; --win-bg:#fdfbf6; --ink:#1c1a17; --ink-2:#6f6a62; --line:#e6dfd3; --accent:#d9603f; }
:root[data-mode="night"] { --bg:#1d1b18; --win-bg:#f6f1e7; --ink:#f1ece2; --ink-2:#a9a298; --line:#3a3630; --accent:#e9744f; }
```

## Type
- **Instrument Serif** for the name (80px) and window headings (20–22px). One weight.
- **JetBrains Mono** for everything small: role line, one-liner, object labels, window titles, tags, captions. 11–13px, labels uppercase with 0.08em tracking. This is the Jackie Hu voice.
- **Geist** for window body copy (14–16px).
- No handwriting fonts. No gradient or shadowed text.

## Layout
- Desktop: one fixed viewport, no page scroll. A 1440×820 "world" scaled to fit. Objects are absolutely placed by `content/desk.json` (x, y from centre; rotation; width). Big things at the edges, small things near the name, nothing touching the name block.
- Two layouts, toggled bottom-centre: **Messy** (the authored scatter) and **Tidy** (a 6-column grid, rotation 0, wide objects scaled down). Objects animate between them.
- Windows: 560px, cream, 1.5px ink border, 10px radius, title bar with a coral close dot, body scrolls. Draggable by the title bar. Several can be open; the last touched is on top. Escape closes the top one.
- Phones and small touch screens: the same objects in a two-column grid under the name; a tap opens a bottom sheet instead of a window. No pan, no drag.

## Interaction
- **Deal-in** on load: objects fly from under the name to their places, 1.1s `expo.out`, 45ms stagger.
- **Drag**: every object, `dragMomentum: false`, stays where dropped, lifts (scale 1.05, deeper shadow) while held.
- **Alpha hit-testing**: only opaque pixels of a cut-out are hot. Hot = pointer cursor, slight lift, and the object's label appears beneath it.
- **Open**: a press under 400ms that moved under 10px opens the object's window; anything else was a drag.
- Day/night: a small sun/moon icon top-right; 350ms token crossfade.
- Reduced motion: no deal-in, no lift; windows fade.
- Nothing loops. No sounds. No cursor replacement.

## Never
Code-drawn illustrations or mascots, textures and grain, hand-drawn boxes, wobble filters, watercolour effects, handwriting fonts, pastel palettes, gradients (other than shading inside an object), glass, blocking loaders, scroll pinning, iframes as content, invented facts in the copy.

## Always
- Real `<button>`/`<a>` for anything that opens or links; windows are `role="dialog"` with a labelled close.
- Every object that opens something has a visible label on hover and is reachable on mobile as a tile.
- Alt text on photographs; decorative object images are `alt=""`.
- Copy is Chimin's. Placeholder copy is marked in the source.

## When unsure
Look at jesspaik.com. If it isn't there, don't add it.
