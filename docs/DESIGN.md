# DESIGN.md — Chimin's arctic sketchbook

This file is the single source of truth for look and feel. It overrides any installed design skill, component library default, or agent instinct. If something here conflicts with PRD.md, ask.

## Feel
A hand-made travel sketchbook that happens to live in a small arctic world. Warm, curious, slightly wonky. It should feel drawn by a person at a desk, not rendered by a product team. Cute, never childish. Quiet, never empty.

Test for any screen: if you removed the content, would it still obviously be *this* site? If it could pass as a template, it's wrong.

## Line
- All shapes, borders, dividers and frames are hand-drawn: roughjs or supplied SVG linework.
- roughjs defaults: `roughness: 1.4`, `bowing: 1.2`, `strokeWidth: 1.6`, fixed `seed` per element so lines do not re-jitter on re-render.
- Stroke colour is ink, not black. Coloured outlines are encouraged (dusty blue, rust, moss) and may differ per object.
- No perfect rectangles, no 1px CSS borders, no border-radius pills.

## Fill
- Watercolor only: uneven, translucent, pooling at edges, allowed to miss the outline by a few pixels on purpose.
- Built with SVG `feTurbulence` + `feDisplacementMap`, `mix-blend-mode: multiply`, over paper grain.
- Never flat fills, never linear gradients, never glassmorphism or blur-panels.

## Paper
- Background is textured paper, never #fff and never pure black.
- Day paper: warm off-white. Night paper: deep navy with visible grain.
- Subtle grain overlay on the whole page, fixed, pointer-events none.

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
- Handwriting (`chimin-hand`, made from Chimin's own writing): headings, labels, notes, one-liners. Never below 18px, never for paragraphs.
- Reading serif (e.g. Newsreader or Source Serif): anything longer than two lines. Max width 62ch, line-height 1.6.
- Mono (e.g. JetBrains Mono), sparingly: code tags and stack labels only.
- No all-caps tracking-wide labels. No gradient text. No text shadows.
- Emphasis comes from a rough-notation underline, circle or highlight, not from bold weight.

## Layout
- Deliberately imperfect: elements rotate 1–3°, overlap slightly, sit a little off-grid. Randomness is seeded, so it is stable between visits.
- Generous margins, like a sketchbook page. Content column is never full-bleed text.
- Things are taped, pinned, clipped or stacked, not placed in cards.
- No bento grids, no centered hero with a CTA button, no sticky top navbar. Navigation is the doodled mini-map.

## Motion
Vocabulary: things **draw**, **bleed**, **wobble**, **melt**, **fall**, **settle**.
- Lines draw themselves in (DrawSVG), 600–1200ms, slight overshoot.
- Watercolor bleeds in after the line finishes, never before.
- Hover = a small physical reaction: lift 2–4px, tilt 1–2°, a wobble, a redraw of the outline. 150–250ms.
- Easing: springy or hand-like (`back.out`, `elastic.out(1, 0.6)`, motion springs). Avoid generic ease-in-out slides and fade-up-on-scroll applied to everything.
- Idle life: snow drifts, an animal blinks, a line boils very slightly (2–3 frame wobble at ~6fps) on key illustrations only.
- One signature moment per section. Everything else stays calm.
- Scroll is smooth and unhurried. Never scroll-jack in a way that traps the user; pinned sections must be short and skippable via the mini-map.

## Characters
- Polar bear (maker, workshop), arctic fox (guide, travels with you), snowy owl (writer, night).
- They react to the user: glance, peek, blink, follow. They never talk in speech bubbles more than once, never block content, never demand a click.
- Final character art is Chimin's. Code-drawn versions are placeholders only.

## Photography
- Photos are the one "real" thing in a drawn world. Present them as physical objects: prints, contact sheets, taped-in snapshots.
- No filters on the photos themselves beyond the viewfinder focus effect. Never crop to circles. Keep original aspect ratios.

## Voice
First person, lower-case friendly, short. A note scribbled in a margin, not a bio. No "passionate about", no "I build delightful experiences".

## Never
Drop shadows (use a drawn shadow scribble instead), neon, glow, glass, gradient meshes, bento grids, stock icon sets (Lucide, Heroicons), emoji as icons, skeleton shimmer loaders, cookie-cutter section headers, parallax star fields, dark-mode-purple anything.

## Always
- `prefers-reduced-motion`: no smoothing, no physics drop, no bleed or melt; use crossfades.
- Every hover has a tap and a keyboard-focus equivalent. Focus ring is a rough.js outline, clearly visible.
- All content reachable and readable without waiting for any animation to finish.
- Text contrast meets WCAG AA on paper in both modes.
- Alt text for every photo and illustration, written in the site's voice.

## When unsure
Choose the option that looks more like it was made with a pen and a small paint set.
