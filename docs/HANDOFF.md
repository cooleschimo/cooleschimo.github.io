# Handoff notes — Chimin Liu, personal site (v3)

Updated 2026-09-17 at the end of the second session. Read this, then `docs/PRD.md` and
`docs/DESIGN.md` (both v3), before writing any code.

---

## 1. What happened this session, in order

1. Every reference site in the old HANDOFF §5 was torn down live → `docs/refs/teardowns.md`.
2. The sketchbook decisions were agreed and M1 was built in that style (commits `c0af973`…`1802542`).
3. Chimin reviewed it: "very childish, unprofessional, doesn't have the modern aesthetic taste
   I'm after, doesn't look clean." Chosen direction: closest to jackiezhang.co.za, but on a
   pure white ground; keep the arctic thread only as subtle line-art accents, keep the
   ink-to-colour reveal and a day/night toggle; drop handwriting fonts.
4. M1 was rebuilt under that direction (v3). DESIGN.md was rewritten; PRD.md was updated and
   every section still written in sketchbook language is marked "execution to re-decide".

**Nothing is deployed.** The workflow runs only on pushes to `main`.

## 2. What exists

```
.github/workflows/deploy.yml   build + deploy to Pages on push to main / manual dispatch
content/projects.json          four projects (two tagged draft; Bayes links to PDFs in public/essays/bayes)
public/art/_placeholder/       fox.svg (line art, one path per stroke), project-*.svg (16:10 colour blocks)
public/fonts/                  Instrument Serif, Geist, JetBrains Mono, Newsreader (+italic)
public/essays/                 the old site's essays + PDFs, URLs unchanged
src/lib/                       gsap (DrawSVG, MotionPath, ScrollTrigger registered), lenis, mode, motion-prefs, inline-svg, seed
src/shell/TopBar.tsx           fixed bar: name, links with rough-notation underline on hover, ModeToggle
src/shell/ModeToggle.tsx       sun / crescent icon; setMode() flips tokens
src/sections/Hero.tsx          eyebrow, statement, lede, meta (placeholder copy, marked), Fox
src/sections/Work.tsx          head + two-column grid of ProjectCard, rise-in on first view
src/sections/Footer.tsx        hairline, links, name/year
src/work/ProjectCard.tsx       card; hover flood, tap/keyboard paths, inline expand with links
src/work/InkReveal.tsx         desaturated <img> under an SVG <image> masked by one circle that follows the pointer
src/world/Fox.tsx              inline SVG drawn in with DrawSVG on load
src/styles/tokens.css          colours, type scale, @font-face
src/styles/base.css            all layout and component styles (Tailwind is loaded but barely used)
```

Deleted in v3 (in git history if ever wanted): RoughBox, RoughFocusRing, Watercolor defs,
SketchWobble, PaperGrain, SkyBand, MiniMap, Snow, ScrollCue, the sketchbook Hero/IceBlock,
Shantell Sans, grain.png, the doodle placeholders.

## 3. How the signature pieces work

- **InkReveal**: `.ink-reveal__rest` holds a normal `<img>` with `filter: var(--image-rest)`
  (grayscale). Above it an inline `<svg>` draws the same image via `<image mask="url(#m-…)">`;
  the mask is a single `<circle>` whose centre lerps to the pointer on gsap.ticker and whose
  radius tweens to the box diagonal on enter (0.9s power3.out) and to 0 on leave (0.55s).
  `revealed` (focus / tap / open) forces the full radius. Reduced motion: no mask, the svg
  crossfades opacity. Pointer handling: see the note in `ProjectCard.tsx` about where the hit
  button sits relative to the reveal; if you restructure, re-run the hover probe.
- **ModeToggle**: `setMode()` sets `data-mode` + localStorage and dispatches `modechange`;
  `useMode()` subscribes. The 350ms colour transition lives in base.css.
- **TopBar underline**: rough-notation `underline`, accent colour, 1.4px, 320ms, shown on
  mouseenter/focus and hidden on leave/blur.
- **Fox**: `/art/_placeholder/fox.svg` is fetched and inlined so its `<path>`s can be drawn with
  DrawSVG. Chimin's real drawing replaces the file; keep one `<path>` per stroke and
  `stroke="currentColor"` so it takes the accent.

## 4. Verified (headless Chromium against `vite preview`)

Hero rise + fox draw-in, nav hover underline, card hover flood and recede, keyboard focus flood,
Enter expand, tap-to-flood then tap-to-open on a touch viewport, night toggle persisted,
footer, reduced-motion. Zero console errors, zero failed requests, 61fps while scrolling.
Bundle: ~497 KB raw / ~169 KB gzip JS (motion/react adds ~60 KB for the card expand; swap to
`LazyMotion` + `m` if the budget gets tight).

## 5. Known gaps and follow-ups

1. **All hero copy is placeholder** (marked in `Hero.tsx`). Chimin writes the real eyebrow,
   statement, lede and meta row.
2. Two project cards are tagged `draft` with placeholder blurbs; the PDFs for the Bayes project
   are real. Real 16:10 images are needed for all four.
3. The placeholder fox is code-drawn; it is acceptable but should be replaced by Chimin's own
   line art.
4. Writing, Photography, Travel and Design lab have no v3 execution yet. PRD §3.3–3.6 keep the
   content plan and are marked "to re-decide". Suggested next: Photography first (it is the
   most gallery-like content), as a full-width masonry or a 3-column grid with a lightbox.
5. Night mode is a token swap; check the accent (`#8fa0ff`) against real photographs.
6. The old sketchbook teardown synthesis (`docs/refs/teardowns.md` §1.4) maps findings onto
   decisions that have since changed; §1.1–1.3 and the per-site sections are still valid.

## 6. Deployment (see PRD §11)

- Merge to `main` to deploy. First deploy replaces the old static site.
- One manual step, once: GitHub → Settings → Pages → Source = **GitHub Actions**.
- Preview without deploying: `npm run build && npm run preview`, or build with `--base=./`
  and publish `dist/` as a private artifact page (done this session).

## 7. Open questions for Chimin

- Real hero copy and project copy (see §5).
- Execution for Photography, Writing, Travel, Design lab under v3.
- Whether the bear and owl appear at all.

## 8. Kickoff prompt for the next session

```
Read docs/HANDOFF.md, docs/PRD.md and docs/DESIGN.md (v3).
Branch claude/new-session-kjcz7d has the v3 M1. Run it, critique it against DESIGN.md v3,
list findings. Then propose two executions for the Photography section under v3 and build
the one Chimin picks as M2. Do not deploy; publish a preview. Ask before adding any dependency.
```
