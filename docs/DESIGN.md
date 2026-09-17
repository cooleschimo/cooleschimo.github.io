# DESIGN.md — Chimin's arctic sketchbook

This file is the single source of truth for look and feel. It overrides any installed design skill, component library default, or agent instinct. If something here conflicts with PRD.md, ask.
Revision: 2026-09-17, after the reference teardowns (`docs/refs/teardowns.md`).

## Feel
A hand-made travel sketchbook that happens to live in a small arctic world. Warm, curious, slightly wonky. It should feel drawn by a person at a desk, not rendered by a product team. Cute, never childish. Quiet, never empty.

Test for any screen: if you removed the content, would it still obviously be *this* site? If it could pass as a template, it's wrong.

## The grammar: ink, then colour
Everything starts as linework and gains watercolour when touched (hover, focus, tap, scroll-into-view). Colour arrives as a bleed under a wobbly mask, never a flat fade. The ink layer stays on top at full opacity, so lines never disappear. This is the one rule every component obeys.

## Line
- All shapes, borders, dividers and frames are hand-drawn: roughjs or supplied SVG linework.
- roughjs defaults: `roughness: 1.4`, `bowing: 1.2`, fixed `seed` per element so lines do not re-jitter on re-render.
- Three stroke widths, as tokens: `--stroke-heavy` (3.2) for hero-scale drawings and igloos, `--stroke-medium` (1.6) for frames and boxes, `--stroke-fine` (0.9) for dividers, map lines and hairlines. Nothing in between.
- Stroke colour is ink, not black. Coloured outlines are encouraged (dusty blue, rust, moss) and may differ per object.
- No perfect rectangles, no 1px CSS borders, no border-radius pills.
- Key illustrations boil: the **wobble filter** (`feTurbulence baseFrequency 0.02, numOctaves 1` + `feDisplacementMap scale 2–4`, seed re-randomised at ~8 fps) on linework and handwriting only, never on paragraphs. Runs only while in view; frozen under reduced motion.

## Fill
- Watercolor only: uneven, translucent, pooling at edges, allowed to miss the outline by a few pixels on purpose.
- Built with SVG `feTurbulence` + `feDisplacementMap`, `mix-blend-mode: multiply`, over paper grain. Constants live in one place (`src/primitives/Watercolor.tsx`).
- Never flat fills, never linear gradients, never glassmorphism or blur-panels.

## Paper
- Background is textured paper, never #fff and never pure black.
- Day paper: warm off-white. Night paper: deep navy with visible grain.
- Grain is a small tiled noise image at ~10% opacity, fixed, pointer-events none, `multiply` by day and `screen` by night. Not a live full-page SVG filter (too costly on mobile); feTurbulence is for watercolour edges and the wobble filter only.

## Colour tokens (placeholders — replace with values sampled from Chimin's own photos and paintings)
```css
:root[data-mode="day"] {
  --paper: #f6f1e7;
  --ink: #2f3b4a;
  --ink-soft: #6b7785;
  --ice: #cfe3ea;
  --sky: #a9c8d8;
  --rust: #c9704f;
  --moss: #8a9a6b;
  --blush: #e8b9a8;
  --sun: #f0c66a;
}
:root[data-mode="night"] {
  --paper: #172233;
  --ink: #efe6d4;
  --ink-soft: #a9b3c2;
  --ice: #3a5468;
  --sky: #22344c;
  --rust: #d98a6a;
  --moss: #9db08a;
  --blush: #c99a94;
  --sun: #f3e2a8;   /* becomes the moon */
  --aurora-a: #7fd6b5;
  --aurora-b: #9a8fd9;
}
```
Use at most three accent colours in any one viewport.

## Type
- Handwriting (`chimin-hand`, made from Chimin's own writing; **Shantell Sans** with bounce and informality axes as the placeholder): headings, labels, notes, one-liners. Never below 18px, never for paragraphs.
- Reading serif (**Newsreader**, variable): anything longer than two lines. Max width 62ch, line-height 1.6.
- Mono (**JetBrains Mono**), sparingly: code tags and stack labels only, 13px, may be uppercase. It is the only second voice on the page.
- Fixed scale, nothing else: handwriting 64 / 40 / 28 / 22, serif 19 / 17, mono 13. On phones the two largest handwriting sizes drop to 44 / 32.
- One weight per face. Hierarchy comes from size and colour (ink vs `--ink-soft` pencil grey), never from bold. A title and its subtitle may share a size, with the second line in pencil grey.
- No all-caps tracking-wide labels except the mono voice. No gradient text. No text shadows.
- Emphasis comes from a rough-notation underline, circle or highlight, not from bold weight.

## Layout
- Deliberately imperfect: elements rotate 1–3°, overlap slightly, sit a little off-grid. Randomness is seeded, so it is stable between visits.
- Scatter, don't grid: groups of things (ice blocks, globes, photos) are placed by a seeded scatter with a minimum spacing, at varied sizes, the way things land on a desk.
- Generous margins, like a sketchbook page. Content column is never full-bleed text.
- Things are taped, pinned, clipped, shelved or stacked, not placed in cards.
- The sky (sun, moon, snow) is a fixed band behind the page; sections scroll over it.
- No bento grids, no centered hero with a CTA button, no sticky top navbar. Navigation is the doodled mini-map, a folded map corner.
- Only the drawn ink of a sticker, animal or doodle is hoverable, never its bounding box.

## Motion
Vocabulary: things **draw**, **bleed**, **wobble**, **melt**, **fall**, **settle**, and you can **hold** them.
- Lines draw themselves in (DrawSVG), 600–1200ms, slight overshoot.
- Watercolor bleeds in after the line finishes, never before. Bleed = a mask of growing blots with feTurbulence-displaced edges, 400–900 ms.
- Hover = a small physical reaction: lift 2–4px, tilt 1–2°, a wobble, a redraw of the outline. 150–250ms. The object keeps its resting rotation while hovered (never snaps upright).
- Hover may start a loop (a globe's snow, a record spinning); nothing loops unprompted except idle life.
- Hold = press for 0.3 s (0.6 s on touch), cancelled by moving more than 15 px, to reveal what is underneath. Touch also gets a visible button for the same thing.
- Fall / settle = things deal in from above with a 60 ms stagger and land with `back.out`; real physics only in the workshop.
- Easing: springy or hand-like (`back.out`, `elastic.out(1, 0.6)`, motion springs). Avoid generic ease-in-out slides and fade-up-on-scroll applied to everything.
- Idle life: snow drifts, an animal blinks, a line boils very slightly (wobble filter) on key illustrations only.
- One signature moment per section. Everything else stays calm.
- One draggable thing per section, at most.
- Scroll is smooth and unhurried. At most one scroll-scrubbed transform per section; the travel map is the only pinned element and it is short and skippable via the mini-map. Never trap the user.

## Characters
- Polar bear (maker, workshop), arctic fox (guide, travels with you), snowy owl (writer, night).
- They react to the user: glance, peek, blink, follow. The fox does exactly one small thing per section. They never talk in speech bubbles more than once, never block content, never demand a click.
- Final character art is Chimin's. Code-drawn versions are placeholders only.

## Photography
- Photos are the one "real" thing in a drawn world. Present them as physical objects: prints, contact sheets, taped-in snapshots, the thing behind a held globe.
- No filters on the photos themselves beyond the viewfinder focus effect. Never crop to circles. Keep original aspect ratios.

## Voice
First person, lower-case friendly, short. A note scribbled in a margin, not a bio. No "passionate about", no "I build delightful experiences".

## Never
Drop shadows (use a drawn shadow scribble instead), neon, glow, glass, `backdrop-filter`, gradient meshes, bento grids, stock icon sets (Lucide, Heroicons), emoji as icons, skeleton shimmer loaders, cookie-cutter section headers, parallax star fields, dark-mode-purple anything, blocking intro loaders, `cursor: none` outside the photo hut, iframes as content, sound that plays without a gesture and a mute, hover states that drop an object's tilt, glitch or VHS effects.

## Always
- `prefers-reduced-motion`: no smoothing, no physics drop, no bleed, wobble or melt; use crossfades. Every timeline has this branch.
- Every hover has a tap and a keyboard-focus equivalent. Focus ring is a rough.js outline, clearly visible.
- All content reachable and readable without waiting for any animation to finish.
- Every rAF loop and filter animation pauses when off-screen or the tab is hidden.
- Text contrast meets WCAG AA on paper in both modes.
- Alt text for every photo and illustration, written in the site's voice.

## When unsure
Choose the option that looks more like it was made with a pen and a small paint set.
