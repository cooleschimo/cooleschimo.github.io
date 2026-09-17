# Handoff notes — arctic sketchbook v2

Updated 2026-09-17 at the end of the second session (teardowns, decisions, M1 build).
Read this, then `docs/PRD.md` and `docs/DESIGN.md`, before writing any code.

---

## 1. Status

- Branch: `claude/new-session-kjcz7d`. **Nothing is deployed.** The workflow only runs on
  pushes to `main`; Chimin wants to review a preview before anything goes live.
- M1 is built and verified headless (see §4). Run it with `npm install && npm run dev`.
- `docs/refs/teardowns.md` has the full teardown of every reference site plus a synthesis
  (§1 of that file) mapping findings onto the decisions.
- All HANDOFF §3 decisions from the first session are answered and folded into PRD §8 and
  DESIGN.md. The travel section is no longer a sketchbook: it is a **snow-globe shelf**
  (PRD §3.5).

## 2. What exists in the repo

```
.github/workflows/deploy.yml   build + deploy to Pages on push to main / manual dispatch
index.html, vite.config.ts     Vite 8, React 19.2, Tailwind 4; optional chimin-hand font check
content/projects.json          NeuroScan only (placeholder image + summary)
public/art/_placeholder/       name-signature.svg, fox-idle.svg, fox-peek.svg, project-neuroscan.svg
public/art/grain.png           tiled paper grain
public/fonts/                  Shantell Sans, Newsreader (+italic), JetBrains Mono, all variable woff2
public/essays/                 the old site's essays + Bayes PDFs, URLs unchanged
src/lib/                       gsap (plugins registered), lenis, seed, mode, motion-prefs, inline-svg
src/primitives/                RoughBox, RoughFocusRing, Watercolor (shared filter defs), SketchWobble, PaperGrain
src/shell/                     SkyBand (fixed sky + snow + aurora), ModeToggle (the sun), MiniMap (folded corner)
src/sections/                  Hero, Work
src/work/                      IceBlock, InkReveal (the signature reveal)
src/world/                     Snow, Fox, ScrollCue
src/styles/                    tokens.css (colours, strokes, type scale, @font-face), paper.css (everything else)
```

## 3. How the signature pieces work (so you don't re-derive them)

- **InkReveal**: the project image sits in an inline `<svg>` as `<image mask="url(#…)">`. The mask
  is six `<circle>`s filtered by `#wc-edge` (feTurbulence + feDisplacementMap). A gsap.ticker loop
  lerps the first circle to the pointer and chains the rest behind it; radius tweens in with
  `back.out` and out over 1.2 s. `revealed` (focus / tap) tweens the radius past the diagonal.
  Reduced motion drops the mask and crossfades opacity. The hit `<button>` is passed in as
  `overlay` so pointer events bubble through the component.
- **ModeToggle**: sun and moon are `<g>`s in one SVG; `MotionPathPlugin` moves the leaving one down
  a hidden arc and the arriving one up the mirrored arc. A `.mode-wash` div in the new paper colour
  grows as a `clip-path: circle()` from the sun, `setMode()` fires when it covers the page, and
  `html.no-transition` stops the CSS colour transitions from flashing underneath.
- **SketchWobble**: one filter per instance; seed re-rolled at `fps` (default 8) via gsap.ticker,
  only while an IntersectionObserver says it is visible. The wrapper needs a layout box
  (`display:block` / positioned) or the filter clips absolutely positioned children.
- **Hero ground**: the hero has an opaque paper ground from 48% down (54% on phones) with the
  wobbly horizon on its top edge, so scrolling covers the fixed sky band.
- **RoughBox / RoughFocusRing**: rough.js into an absolutely positioned SVG, redrawn on resize,
  seed from `hashSeed(key)`. The focus ring shows via `:focus-visible > .rough-focus`.

## 4. Verified this session (headless Chromium, `vite preview`)

Hero draw-in, fox peek, hover reveal + recede, keyboard focus full reveal, Enter opens the
detail, tap-to-melt then tap-to-open on a touch viewport, night toggle (mode persisted in
localStorage), mini-map unfold + scrollTo, reduced-motion crossfade. Zero console errors,
zero failed requests, 61 fps sampled while scrolling. Bundle: 325 KB raw / 110 KB gzip JS.
The verification script lived in the session scratchpad; recreate it from this list if needed.

## 5. Known gaps and follow-ups (in rough priority)

1. Only one project block. The scatter and deal-in are wired for N blocks; add the other
   three to `content/projects.json` with real images and summaries (M4).
2. The day/night wash is a clip-path circle, not the watercolour-masked sweep PRD §3.0 asks
   for. Upgrade in M6 with the same blot-mask technique as InkReveal.
3. The aurora is two radial gradients under `#wc-wash` + blur, visible only at night. It reads
   fine but is a gradient; M6 replaces it with a shader or a painted SVG wash.
4. Placeholder art everywhere. The fox is a doodle; `name-signature.svg` is a fake signature.
   Real files drop into the same paths with no code changes (`chimin-hand.woff2` too).
5. The full reveal (focus/open) ends with hard image edges because the mask circle exceeds
   the box. Acceptable; a torn-paper clip on the image would be nicer.
6. Run impeccable `critique` against DESIGN.md before M2 (skills not installed in this session).
7. Mobile: the sun scales to 0.8 and sits top-right; check it doesn't collide with the name on
   very short viewports.

## 6. Deployment (unchanged, see PRD §11)

- Merge to `main` to deploy. First deploy replaces the old static site.
- One manual step, once: GitHub → Settings → Pages → Source = **GitHub Actions**.
- Preview without deploying: `npm run build && npm run preview`, or publish `dist/` built with
  `--base=./` as a private artifact page (that is what this session did).

## 7. Open questions for Chimin (PRD §9)

- Which 3 places get art first? (M2)
- Real images and one-liners for the four projects (M4)

## 8. Kickoff prompt for the next session

```
Read docs/HANDOFF.md, docs/PRD.md, docs/DESIGN.md and docs/refs/teardowns.md §1.
Branch claude/new-session-kjcz7d has M1. Run it, critique it against DESIGN.md, list findings,
then build M2 (PRD §3.5, the snow-globe shelf) as a vertical slice with 3 placeholder globes.
Do not deploy; publish a preview. Ask before adding any dependency not in PRD §2.
```
