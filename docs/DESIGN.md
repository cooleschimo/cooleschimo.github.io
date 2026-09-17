# DESIGN.md — Chimin Liu, personal site

This file is the single source of truth for look and feel. It overrides any installed design skill, component library default, or agent instinct. If something here conflicts with PRD.md, ask.
Revision: 2026-09-17 (v3). Replaces the "arctic sketchbook" direction after Chimin reviewed the M1 build and found it childish and unclean. Closest reference: jackiezhang.co.za for confidence and single-colour line art; scottmilton.com for typographic discipline. Ground is white, not dark.

## Feel
A clean, modern, gallery-white portfolio with one voice: sharp typography, generous space, and a single accent colour that also draws every illustration. Quiet confidence. Personality comes from the writing, the photographs and a few precise line drawings, never from wobble, texture or cuteness.

Test for any screen: would a design director at a good studio put this in their portfolio? If it reads as a template, it's wrong. If it reads as a children's book, it's wrong.

## Ground and colour
- Ground is pure white by day, near-black by night. No paper texture, no grain, no gradients, no tints behind sections.
- Ink is near-black, two greys for secondary text and hairlines, and **one accent**: cobalt. The accent does three jobs and nothing else: links and hover states, the italic word in the statement, and the stroke colour of every line drawing.
- Colour otherwise comes only from photographs and project images.

```css
:root[data-mode="day"]   { --bg:#ffffff; --ink:#141414; --ink-2:#6b6b6b; --ink-3:#a3a3a3; --line:#e6e6e6; --accent:#2743c8; --accent-soft:#e9edfb; }
:root[data-mode="night"] { --bg:#0f0f10; --ink:#f2f2f2; --ink-2:#9a9a9a; --ink-3:#5c5c5c; --line:#262626; --accent:#8fa0ff; --accent-soft:#1a2040; }
```

## Type
- **Instrument Serif** (display): the hero statement, section titles, card titles. One weight. Tight leading (1.02), slight negative tracking. Italic only for the one accent word.
- **Geist** (body and interface): everything else. 17px body, 15px secondary, 14px interface.
- **JetBrains Mono** (labels): 12px uppercase with 0.08em tracking. Eyebrows, counts, tags, footer meta. The only second voice.
- **Newsreader** (reading): long-form essays only (M4). 62ch, line-height 1.6.
- Scale: statement clamp(44px, 6.6vw, 88px); section title clamp(32px, 3.4vw, 44px); card title 24px; body 17/15/14; label 12. Nothing else.
- Hierarchy by size and colour (ink vs grey), never bold. No text shadows, no gradient text, no handwriting fonts anywhere.

## Layout
- One 1200px column with a fluid gutter. Fixed 64px top bar: name left, section links centre, day/night icon right.
- Sections are separated by space (72–140px) and at most a hairline, never by background changes.
- Grids are real grids: two columns for work, aligned edges, equal gaps. No scatter, no rotation, no overlap, no tape or pins.
- Images sit edge to edge in their cell with no radius, no border, no shadow. Titles and tags share a baseline row under the image.
- Mobile stacks to one column; the top bar keeps name, two links and the toggle.

## Illustration
- Line art only, one colour (the accent), one stroke width (1.8 at 300px viewBox), single confident strokes. No fills, no hatching, no wobble, no watercolour.
- One drawing per section at most, placed like a photograph would be (in the grid, not floating over text). The arctic thread is the subject of these drawings (fox, ice, snow, hut), not a theme applied to the page.
- Final art is Chimin's. The placeholder fox is code-drawn and must be replaced.

## Motion
Verbs: **draw**, **rise**, **flood**, **settle**.
- Line drawings draw themselves in once on load (DrawSVG, ~1.2s total, staggered strokes).
- Text rises 14px and fades in on load, 0.7s, 80ms stagger. Cards rise 24px on first scroll-into-view. Nothing animates on scroll after that.
- **Flood** is the signature: project images rest desaturated; on hover, colour floods out from the pointer under a crisp circular mask (0.9s ease-out) and recedes to where the pointer left (0.55s). Focus and tap flood everything. This is the only place the pointer is tracked.
- Hover elsewhere: colour change to accent in 160ms, an arrow nudging 3px, a single thin scribbled underline drawn under nav links (rough-notation, one colour, 320ms). Nothing lifts, tilts or scales more than 1.02.
- Easing: `power3.out` for entrances, `cubic-bezier(.2,.8,.2,1)` for expands. No bounce over 0.15, no elastic, no yoyo loops.
- Day/night is a 350ms token crossfade. No wash, no sun arcing.
- Scroll is Lenis-smoothed and never pinned or scrubbed.

## Never
Textures and grain, hand-drawn boxes or borders, hatching, wobble/boil filters, watercolour, blobs, pastel palettes, handwriting fonts, mascots that react to the cursor, drop shadows, glass, gradients, rounded "card" chrome, emoji or icon sets, sticky-note or tape metaphors, blocking loaders, custom cursors, sound, scroll pinning, more than one accent colour, invented facts in the copy.

## Always
- `prefers-reduced-motion`: no draw-in, no rise, flood becomes a 350ms crossfade, expands become fades.
- Every hover has a focus and tap equivalent; focus is a 2px accent outline with 4px offset.
- Real `<a>`/`<button>` elements; alt text on every image; contrast AA in both modes.
- The copy is Chimin's. Claude writes placeholder copy only when marked as such in the source.

## When unsure
Remove something.
