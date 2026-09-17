# PRD — Chimin's Arctic Sketchbook (personal site v2)

Owner: Chimin Liu (github: cooleschimo)
Target: replace cooleschimo.github.io
Builder: Claude Code. Read this file and `DESIGN.md` before writing any code.
Revision: 2026-09-17, after the reference teardowns (`docs/refs/teardowns.md`) and the
decisions recorded in §8.

---

## 1. What this is

A personal site that feels like a hand-made travel sketchbook set in a small illustrated arctic world (igloos, a polar bear, an arctic fox, a snowy owl). It shows technical projects and writing, plus photography, travel notes and a design lab of tiny desktop/browser toys.

It is NOT a polished SaaS-style portfolio. Doodle lines, watercolor fills, paper grain, handwriting. Interaction quality (hover, scroll, physics) is the main craft focus.

### The one grammar: ink to colour
Everything on the site starts as pencil or ink linework and gains watercolour when you touch it: hover, keyboard focus, tap, or scroll-into-view. The colour bleeds in under a wobbly SVG mask (feTurbulence + feDisplacementMap on growing blots), never a flat fade. This is the site's signature and applies to project blocks, place globes, animals, headings and the day/night wash. Reduced motion: colour crossfades in.

### Goals
1. One continuous, fluid vertical scroll through the world. Zero navigation friction: every piece of content reachable by scrolling or one click on the mini-map.
2. Thoughtful micro-interactions on everything hoverable.
3. Hobbies get equal billing with work.
4. Adding a new place, photo or project = editing one JSON/MDX file, no component changes.

### Non-goals (v1)
- No enterable igloo "rooms" or side-scrolling navigation (the previous eskimo-version did this; it gated content behind navigation).
- No full 3D world. R3F is used for shaders only, and not before M6.
- No CMS, no backend, no analytics.
- No Vanta, no liquid-logo (both read glossy/digital; revisit in v2 for night mode only).
- No blocking loader or intro gate. The hero draws itself in under ~1.2 s and content is readable before that finishes.
- No custom `cursor: none` cursor. The native cursor stays; the photo hut's viewfinder is the one scoped exception.
- No iframes as content.

---

## 2. Stack

- Vite 8 + React 19.2 + TypeScript. `react` and `react-dom` are pinned to `~19.2.x` because `@react-three/fiber` 9.x declares `react >=19 <19.3`; bump when R3F widens the range.
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Deploy: GitHub Pages via GitHub Actions from `main` only. Repo is a user site (`cooleschimo.github.io`), so Vite `base: '/'`. See §11.
- Content: JSON + MDX under `/content`
- Fonts: self-hosted in `public/fonts` (Shantell Sans variable as the handwriting placeholder, Newsreader variable for reading, JetBrains Mono variable for labels). `chimin-hand.woff2` replaces Shantell Sans by dropping the file in; the `@font-face` is already declared.

### Install (M1 set, already in package.json)

```bash
npm i react@~19.2.8 react-dom@~19.2.8
npm i -D vite @vitejs/plugin-react typescript tailwindcss @tailwindcss/vite
npm i gsap @gsap/react lenis motion roughjs rough-notation
```

Added per milestone, not before:
```bash
# M3 photo hut
npm i perfect-freehand
# M2 travel map
npm i d3-geo topojson-client world-atlas && npm i -D @types/d3-geo @types/topojson-client
# M4 writing
npm i -D @mdx-js/rollup          # verify against Vite 8's rolldown plugin API first
# M5 design lab
npm i matter-js && npm i -D @types/matter-js
# M6 only
npm i three @react-three/fiber @react-three/drei @rive-app/react-canvas && npm i -D @types/three
```

Do not add: `react-pageflip` (unmaintained, unpinned `page-flip@latest`), `wired-elements` (Lit 2 / React 17, re-jitters). Any dependency not listed here needs Chimin's OK first.

### Library roles (do not overlap them)
| Library | Owns |
|---|---|
| Lenis | smooth scroll. Drive it from `gsap.ticker`, call `ScrollTrigger.update` on Lenis scroll. One instance at app root (`src/lib/lenis.ts`). `lerp 0.09`, off under reduced motion, `syncTouch: false`. Stop it while anything is being dragged. |
| GSAP + ScrollTrigger | all scroll-linked animation and timelines. ScrollTrigger is mostly a visibility gate that pauses loops off-screen; at most one scrubbed transform per section; the only pin on the site is the travel map (short, skippable). |
| GSAP DrawSVG / MorphSVG / MotionPath / SplitText | doodles drawing themselves, the sun's arc, text reveals (free, included in `gsap`) |
| motion (`motion/react`) | component-level hover/tap/drag/layout animation only. Never scroll. Drag is `dragMomentum={false}`; mascots snap home with `dragSnapToOrigin` and `bounceStiffness 400, bounceDamping 30`. |
| roughjs | every box, border, divider, map outline, focus ring. Fixed seed per element. |
| rough-notation | hover underline/circle/highlight on links and headings |
| SVG filters (own code) | watercolour edges, the wobble filter, the ink-to-colour mask. `src/primitives/Watercolor.tsx` holds the shared `<defs>`; tune constants there. |
| perfect-freehand | ink cursor trail (desktop only, photo hut) |
| matter-js | design-lab gravity only. Render bodies as DOM or rough.js canvas, never `Matter.Render`. |
| d3-geo + world-atlas | map projection, rendered through roughjs |
| R3F + drei (M6) | wet-paint smear on real watercolours, night aurora. Single shared `<Canvas>` with drei `<View>`; lazy-loaded; never one canvas per card. |
| Rive (M6) | animal state machines |

### React Bits (reactbits.dev)
Source of ideas, not of code to paste. `docs/refs/teardowns.md` §12 records what each does and what to keep:
- `FallingText`: the span→matter-body mapping (M5). Drop `Matter.Render`, the double engine step and the uncancelled rAF.
- `SplashCursor`: full fluid sim. If M6 wants a shader melt, cut it to one decaying heat FBO feeding `smoothstep(heat + noise)`.
- `ImageTrail`: the distance-gated ring buffer, rewritten as one ~100-line hook (M3, optional).
- `Ballpit`: the viewport-world-size helper and rAF gating only (M5).
Do not use any React Bits background that looks neon, glassy or gradient-heavy.

### Agent skills to install in Claude Code
```bash
npx skills add pbakaus/impeccable
npx skills add leonxlnx/taste-skill   # enable only: redesign-existing-projects
```
Use from impeccable: `animate`, `delight`, `adapt`, `critique`, `audit`, `optimize`, `harden`.
Do NOT run `polish`, `normalize`, `quieter`, or any minimalist/high-end/brutalist taste skill. If any skill's advice conflicts with DESIGN.md, DESIGN.md wins.

---

## 3. Site structure (single page, top to bottom)

Global, fixed layers:
- **Sky band** (`position: fixed`, behind the page): watercolour sky wash, snow, the sun by day / the moon by night. Sections scroll over it, so the sun is reachable from anywhere.
- **Sun/moon toggle**: the sun itself is the day/night control. Click it and it arcs below the horizon on a GSAP motion path while the moon rises (~900 ms); the page wash follows. Keyboard: it is a real `<button>`.
- **Mini-map**: a folded map corner bottom-right that unfolds on hover, focus or tap into a doodled map with one landmark per section; click = Lenis `scrollTo`. Collapses to a compass icon on mobile.
- **Paper grain**: tiled noise PNG at ~10% `multiply` (day) / `screen` (night), fixed, pointer-events none.

### 3.0 Day / night
- Day: warm paper, blue-grey ink. Work section emphasises code projects.
- Night: deep navy paper, cream ink, aurora in the sky band (SVG wash in M1–M5, shader in M6). Writing section is emphasised; owl wakes up.
- Implement as CSS custom properties on `:root[data-mode]`. Persist in `localStorage`, applied before first paint by an inline script. Transition = watercolor wash sweeping across the viewport (SVG mask, ~900 ms), crossfade under reduced motion.

### 3.1 Hero
- Name draws itself stroke by stroke (DrawSVG) in Chimin's handwriting SVG, then bleeds colour.
- One-line intro, handwriting font.
- Slow parallax snow in the sky band (2D canvas; cap ~90 flakes on mobile; paused off-screen and when the tab is hidden; static under reduced motion).
- Arctic fox peeks from behind a snowdrift; head/eyes track cursor (v1: two-pose sprite swap + small rotate; M6: Rive). Only the fox's ink is hoverable (alpha hit-testing).
- Scroll cue: doodled arrow that wobbles at ~6 fps and nudges down.
- Key linework carries the **wobble filter** (see DESIGN.md).

### 3.2 Work igloo — projects
- A **scatter** of different-sized ice blocks (rough.js rectangles, watercolour ice fill, seeded rotation 1–3° and seeded offsets, rejection-sampled for spacing), not a grid. On first scroll-into-view the blocks deal in from above with a 60 ms stagger and settle (GSAP, `back.out`). Real physics is not used here.
- **Ink-to-colour reveal (signature interaction):** at rest each block is linework over an ice-blue wash. On hover the project image bleeds in from the pointer under an SVG mask of growing blots with feTurbulence-displaced edges; the mask follows the pointer with a lerp and recedes ~1.2 s after it leaves.
  - Touch: tap = bleed expands from the tap point to full reveal; second tap opens the project.
  - Keyboard: focus = full reveal; Enter opens.
  - Reduced motion: simple crossfade.
  - M6 option: replace the mask with a single-FBO heat shader if the SVG version feels flat.
- Click opens an in-place expanded card (motion `layoutId`), not a new page: title, 2-line summary, stack tags, links.
- Initial projects: NeuroScan, Political Bias Detection Pipeline, Patent Classification (summary only, methodology is proprietary — no detail), Bayesian prediction-markets project.

### 3.3 Writing igloo
- List of essays/poems as torn-paper slips (torn edge = rough.js clip path, not an image). Hover = rough-notation underline + slip lifts.
- Click expands inline to MDX content in a reading column (serif, max 62ch).
- All ten essays from the old site go live in v1: august, catullus, howardsend, hume, induction, lostfound, salesman, selflove, smith, whitman. Old URLs under `/essays/` keep working until each is converted.
- Snowy owl perched on the igloo; blinks by day, eyes open and head turns at night.

### 3.4 Photo hut — photography (Ricoh GR IIIx + Canon)
- Photos laid out as a loose contact sheet on a lightbox table, slightly rotated. **One draggable per section**: the photos are draggable (motion `drag`, constrained); nothing else in the hut is.
- **Viewfinder interaction:** photos rest at blur(3px) + 40% saturation. The cursor is replaced by the camera viewfinder frame PNG inside the hut only; photos inside the frame render sharp and full colour (CSS mask or clip-path following the pointer, lerped).
- Click = shutter blink (black frame 80ms + subtle scale) then lightbox with caption: place, camera, one line.
- Filter chips: Ricoh / Canon / place, drawn as doodled tags.
- Touch: no viewfinder; photos sharpen as they cross viewport centre (ScrollTrigger).
- Images: responsive `srcset`, AVIF/WebP, lazy, blurhash or dominant-colour placeholder.

### 3.5 Travel — the snow-globe shelf
- A hand-drawn shelf (rough.js) runs down the section with one **snow globe per place**. Inside each globe: the place's linework doodle (supplied by Chimin), a base with the place name in handwriting and the date. Globes sit at seeded tilts and sizes.
- **Shake and settle:** as a globe scrolls into view its snow is stirred up and settles over ~2 s (2D canvas or SVG particles inside a clip path; one shake per visit, none under reduced motion).
- **Ink to colour:** hover/focus/tap fills the globe's doodle with watercolour (the site grammar).
- **Hold to reveal:** press and hold the globe (0.3 s pointer, 0.6 s touch, cancels on >15 px move) and the real photo of the place fades in behind the doodle; release returns it. Touch also gets a small "photo" button. Reduced motion: crossfade.
- **Open:** click opens the place inline (motion `layoutId`) as a taped-in spread: the photo, the doodle, "favourite thing", date, and a tiny map with the pin. This is where text and photos live, so the globe stays uncluttered.
- Index: an unfolded hand-drawn map (d3-geo → path data → roughjs) at the top of the section with a pin per place; clicking a pin scrolls to that globe. The map is the only pinned element on the site (short, skippable via the mini-map). The fox walks the dotted route between pins as the map is scrolled through.
- Initial places: Budapest, Cinque Terre, Split, Mostar, Dubrovnik, Malta, Mallorca, Venice, Verona, Lake Garda, Como, Slovenia, Singapore, Chicago. Ship v1 with whichever 3 have art; the rest render as pencil-only "not painted yet" globes.

### 3.6 Polar bear's workshop — design lab
- Matter-js world the width of the section, floor at the bottom. When the section enters, items drop from above (60 ms stagger, gravity scale ~0.0014, restitution ~0.12, friction ~0.55, chamfered bodies at 84–92% of the sprite, sleeping on): each design toy is a body with its icon; empty slots are wooden crates labelled "still building".
- Drag and throw with mouse/touch (`MouseConstraint`); Lenis is stopped while dragging. Click-vs-drag: <400 ms and <10 px is a click. Device tilt optional, off by default.
- Click on an item opens its card: what it is, install link.
- Render bodies as DOM elements synced to body position/angle (keeps doodle styling and accessibility), not matter's canvas renderer. Per-tick speed clamp and out-of-bounds rescue so nothing tunnels.
- Pause the engine when the section is off-screen. Below the physics area render a plain accessible list of the same items. Reduced motion: items are placed at rest, no drop.
- Polar bear sits at a workbench beside it; glances at whatever you throw (v1: static).

### 3.7 Footer
- Igloo at dusk, links (GitHub cooleschimo, Instagram chi.minutiae, email) as hand-lettered signs. Footer text falls with gravity once when first reached (span→body mapping from `FallingText`), skip if reduced motion.

### The fox
The fox travels the whole page and does exactly one small thing per section: peeks and tracks the cursor in the hero, sniffs a block in the work igloo, walks the map route in travel, curls up asleep by the workshop, waves in the footer. It never blocks content and never asks for a click.

---

## 4. Content model

```
/content
  projects.json
  places.json
  photos.json
  toys.json
  /writing/*.mdx      (frontmatter: title, date, kind: essay|poem, mode: night)
/public/art           (see asset manifest)
/public/photos
```

```ts
type Project = { slug: string; title: string; summary: string; tags: string[];
  image: string; links: { label: string; href: string }[]; mode: 'day' | 'night' }

type Place = { slug: string; name: string; country: string; coords: [number, number]; // [lon, lat]
  date: string; favourite: string; lineArt?: string; fillArt?: string; photo?: string }

type Photo = { src: string; camera: 'ricoh' | 'canon'; place?: string; caption?: string;
  w: number; h: number }

type Toy = { slug: string; name: string; status: 'shipped' | 'building';
  icon?: string; blurb?: string; href?: string }
```

---

## 5. Asset manifest

Chimin supplies (hand-drawn; transparent PNG @2x or SVG; **linework and fill as separate files**, or one SVG with `.line` and `.colour` groups):
| File | Notes |
|---|---|
| `art/name-signature.svg` | name as single-stroke paths (for DrawSVG); one `<path>` per stroke |
| `art/fox-{idle,peek,walk1,walk2}` | |
| `art/bear-{sit,glance}` | |
| `art/owl-{asleep,awake}` | |
| `art/igloo-{work,writing,photo,footer}` | |
| `art/places/{slug}-line`, `{slug}-fill` (fill optional) | one per place, drawn to fit inside a globe |
| `art/viewfinder.png` | cutout photo of the actual Ricoh back/frame |
| `fonts/chimin-hand.woff2` | made with Calligraphr; drop in to replace Shantell Sans |

Generated in code (Claude Code builds these): paper grain tile, watercolor filters, wobble filter, ice texture, snow, aurora, map, shelf, globes, tape, all rough.js shapes, mini-map.

**Until real art exists, use the clearly-named placeholders** in `public/art/_placeholder/` so no milestone is blocked. Swapping art must require zero code changes.

---

## 6. Quality bars

- Performance: LCP < 2.5s on mid mobile; initial JS < 250KB gzip (M1 scaffold measures ~110KB). Lazy-load three/R3F, matter-js, map data, Rive by section (`React.lazy` + IntersectionObserver). Cap DPR at 1.5 on mobile. Pause every rAF loop and every wobble filter when off-screen or tab hidden.
- Accessibility: all content readable with JS animations disabled; `prefers-reduced-motion` disables Lenis smoothing, physics drop, bleed-in, wobble and melt (crossfades instead). Every hover has a focus and tap equivalent. Real `<a>`/`<button>` elements. Alt text on photos and illustrations. Handwriting font never used below 18px or for long text.
- Responsive: 360px up. Mobile is a first-class layout, not a shrunken desktop.
- No layout shift from late-loading art (reserve aspect ratios).

---

## 7. Milestones (vertical slices — each one is built and previewed on the branch; deploy is a separate, manual decision, see §11)

**M1 — Spine + signature interaction** (this session)
Scaffold, tokens from DESIGN.md, Lenis↔ScrollTrigger wiring, paper grain + watercolour + wobble filter utilities, `<RoughBox>` and rough focus ring, fixed sky band with the sun/moon toggle, hero with DrawSVG name, snow, fox and scroll cue, ONE ice block with the working ink-to-colour reveal (hover + tap + keyboard + reduced motion), mini-map stub, GH Actions workflow.
Done when: the preview scrolls smoothly at 60fps on a laptop, the reveal works on hover and tap, the sun toggles night.

**M2 — Travel shelf** with 3 globes, shake-and-settle, hold-to-reveal, inline spread, rough map with fox on route.
**M3 — Photo hut** with viewfinder, lightbox, filters, 12 photos.
**M4 — Work scatter complete + Writing igloo** with all ten essays in MDX.
**M5 — Workshop physics + footer.**
**M6 — Day/night wash polish, aurora shader, Rive animals, optional wet-paint shader, mini-map polish.**
**M7 — `audit`, `optimize`, `harden`, `adapt` pass; Lighthouse; real-device test.**

After each milestone run impeccable `critique` against DESIGN.md and list findings before moving on.

---

## 8. Decisions made (2026-09-17; change here if needed)
- One-scroll world, no enterable rooms. Animals are static/sprite-swap until M6.
- Ink-to-colour is the site-wide grammar; M1 does it with an SVG mask, not WebGL. three.js stays out of the bundle until M6.
- No pinned sections except the travel map. Page-flip and the pinned sketchbook are dropped; travel is the snow-globe shelf (§3.5).
- The sun is the day/night toggle in a fixed sky band; the mini-map is a folded map corner.
- Shantell Sans is the handwriting placeholder until `chimin-hand.woff2` exists.
- Three stroke-width tokens (heavy / medium / fine). Fixed type scale: handwriting 22/28/40/64, serif 17/19, mono 13. One weight per face; hierarchy by colour, not bold; mono uppercase as the only second voice.
- Work section is a seeded scatter with a GSAP deal-in, not a grid and not live physics.
- Hold-to-reveal on places. The fox does one thing per section. One draggable thing per section.
- Wobble filter on key linework and handwriting; tiled-noise paper grain; alpha hit-testing on sticker-like art.
- Wet-paint cursor shader deferred to M6 and optional.
- Touch: ink reveal = tap-to-bleed; viewfinder = sharpen on scroll.
- Art overlap: no separate "art" section; watercolour lives inside the travel shelf.
- All ten old essays go live in v1. Stay on cooleschimo.github.io (no custom domain for now).
- `react`/`react-dom` pinned to 19.2.x; `react-pageflip` and `wired-elements` are not used.
- Old `essays/*.html`, `essay.css` and the Bayes PDFs live in `public/essays/` so existing URLs keep working; `index.html`/`index-old.html` are gone (in git history).

## 9. Open questions for Chimin
- Which 3 places get art first? (needed for M2)
- Real project images and one-line summaries for the four projects (M4)

---

## 10. Kickoff prompt for the next session

```
Read docs/PRD.md, docs/DESIGN.md and docs/refs/teardowns.md §1.
The M1 slice is on branch claude/new-session-kjcz7d. Run `npm install && npm run dev`,
run impeccable `critique` against DESIGN.md on it, list findings, then build M2 (PRD §3.5)
as a vertical slice. Do not deploy; publish a preview instead (see PRD §11).
Rules: DESIGN.md overrides any installed design skill. Use placeholder art from
public/art/_placeholder. Ask before adding any dependency not listed in PRD §2.
```

## 11. Deployment

- `.github/workflows/deploy.yml` builds with `npm ci && npm run build` and deploys `dist/` to GitHub Pages. It runs **only on pushes to `main`** and on manual `workflow_dispatch`. Work on feature branches never deploys.
- One-time manual step: GitHub → Settings → Pages → Build and deployment → Source = **GitHub Actions**. Until this is set, the workflow's deploy job fails with a "Pages not enabled" error and the old static site keeps serving.
- Previewing a branch: `npm run build && npm run preview` locally, or ask Claude Code to publish the built `dist/` as a private artifact page (it builds with a relative base for that).
- Going live = merging the branch into `main`. The first deploy replaces the old site; the old essays keep their URLs under `/essays/`.
