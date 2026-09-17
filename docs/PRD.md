# PRD — Chimin's Arctic Sketchbook (personal site v2)

Owner: Chimin Liu (github: cooleschimo)
Target: replace cooleschimo.github.io
Builder: Claude Code. Read this file and `DESIGN.md` before writing any code.
Revision: 2026-09-17, after the reference teardowns (`docs/refs/teardowns.md`) and the
decisions recorded in §8.

---

## 1. What this is

> **Direction change, 2026-09-17 (v4, "the desk").** Chimin rejected the sketchbook build
> (childish) and then the clean typographic rebuild (further from the references). The site is
> now modelled directly on jesspaik.com and jackiehu.design: a photographed desk of real objects
> on warm paper, each draggable, the important ones opening a small window with that section's
> content. See `DESIGN.md` v4. The content plan below still stands; every section is now a
> **window** opened from an object on the desk, not a scroll section. Sections written in
> sketchbook language are kept for their content only.


A personal site that feels like a hand-made travel sketchbook set in a small illustrated arctic world (igloos, a polar bear, an arctic fox, a snowy owl). It shows technical projects and writing, plus photography, travel notes and a design lab of tiny desktop/browser toys.

It is a playful, tactile portfolio in the manner of jesspaik.com and jackiehu.design: photographed objects on a desk, a serif name in the middle, small windows for content. The polish comes from the objects being real photographs.

### The one signature: the desk
Everything on the desk is a real object you can pick up. Hover lights only its actual pixels and shows its label; a click opens its window; the Tidy button sweeps the desk into a grid. That tactility is the site.

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
- Fonts: self-hosted in `public/fonts`: Instrument Serif (display), Geist (body/UI), JetBrains Mono (labels), Newsreader (long-form reading, M4). No handwriting font.

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

## 3. Site structure (one desk, windows on top)

Global:
- **The desk** (desktop): a fixed viewport, objects from `content/desk.json`, Messy/Tidy toggle bottom-centre, name top-left, day/night icon top-right. No scroll.
- **Phones**: the same objects as a two-column grid under the name; taps open a bottom sheet.
- **Windows**: About (the name), Work (folder), Photos (camera, polaroids), Writing (letter), Travel (sketchbook). Draggable, stackable, Escape closes.

### 3.0 Day / night
- Day: white ground, near-black ink. Night: near-black ground, off-white ink, lighter accent.
- CSS custom properties on `:root[data-mode]`, persisted in `localStorage`, applied before first paint. Switching is a 350ms token crossfade.

### 3.1 The name and the About window
- "Chimin Liu" in Instrument Serif, a mono role line, a mono one-liner (all placeholder copy, marked). Clicking the name opens About: a short paragraph and links (GitHub, Instagram, email).

### 3.2 Work window (the folder)
- A list of projects: serif title, mono tags, one-line summary, links. Projects without a link are tagged `draft`.
- Projects: NeuroScan, Political Bias Detection, Patent Classification (summary only), Bayesian Estimation of Informed Trading (paper + slides from `public/essays/bayes/`).
- Later: each project gets its own window with images.

### 3.3 Writing window (the letter)
- Built: a list of the ten essays linking to their existing pages under `/essays/`. Later: essays rendered inside the window (MDX, M4).

#### Original plan, kept for content
- List of essays/poems as torn-paper slips (torn edge = rough.js clip path, not an image). Hover = rough-notation underline + slip lifts.
- Click expands inline to MDX content in a reading column (serif, max 62ch).
- All ten essays from the old site go live in v1: august, catullus, howardsend, hume, induction, lostfound, salesman, selflove, smith, whitman. Old URLs under `/essays/` keep working until each is converted.
- Snowy owl perched on the igloo; blinks by day, eyes open and head turns at night.

### 3.4 Photos window (the camera and the polaroids)
- Built: a two-column grid of photographs with mono captions; CC0 stand-ins until Chimin's own. Later: a lightbox, camera/place filters, more polaroids on the desk.

#### Original plan, kept for content
- Photos laid out as a loose contact sheet on a lightbox table, slightly rotated. **One draggable per section**: the photos are draggable (motion `drag`, constrained); nothing else in the hut is.
- **Viewfinder interaction:** photos rest at blur(3px) + 40% saturation. The cursor is replaced by the camera viewfinder frame PNG inside the hut only; photos inside the frame render sharp and full colour (CSS mask or clip-path following the pointer, lerped).
- Click = shutter blink (black frame 80ms + subtle scale) then lightbox with caption: place, camera, one line.
- Filter chips: Ricoh / Canon / place, drawn as doodled tags.
- Touch: no viewfinder; photos sharpen as they cross viewport centre (ScrollTrigger).
- Images: responsive `srcset`, AVIF/WebP, lazy, blurhash or dominant-colour placeholder.

### 3.5 Travel window (the sketchbook)
- Built: an intro line and the list of places. Later: one spread per place (sketch, photo, note) paged inside the window; the open sketchbook on the desk shows the latest spread.

#### Original plan, kept for content (the snow-globe shelf is dropped)
- A hand-drawn shelf (rough.js) runs down the section with one **snow globe per place**. Inside each globe: the place's linework doodle (supplied by Chimin), a base with the place name in handwriting and the date. Globes sit at seeded tilts and sizes.
- **Shake and settle:** as a globe scrolls into view its snow is stirred up and settles over ~2 s (2D canvas or SVG particles inside a clip path; one shake per visit, none under reduced motion).
- **Ink to colour:** hover/focus/tap fills the globe's doodle with watercolour (the site grammar).
- **Hold to reveal:** press and hold the globe (0.3 s pointer, 0.6 s touch, cancels on >15 px move) and the real photo of the place fades in behind the doodle; release returns it. Touch also gets a small "photo" button. Reduced motion: crossfade.
- **Open:** click opens the place inline (motion `layoutId`) as a taped-in spread: the photo, the doodle, "favourite thing", date, and a tiny map with the pin. This is where text and photos live, so the globe stays uncluttered.
- Index: an unfolded hand-drawn map (d3-geo → path data → roughjs) at the top of the section with a pin per place; clicking a pin scrolls to that globe. The map is the only pinned element on the site (short, skippable via the mini-map). The fox walks the dotted route between pins as the map is scrolled through.
- Initial places: Budapest, Cinque Terre, Split, Mostar, Dubrovnik, Malta, Mallorca, Venice, Verona, Lake Garda, Como, Slovenia, Singapore, Chicago. Ship v1 with whichever 3 have art; the rest render as pencil-only "not painted yet" globes.

### 3.6 Design lab (not on the desk yet)
- Later: a small object (a toy) that opens a window listing the toys. The physics sandbox is dropped unless it can live inside a window.

#### Original plan, kept for content
- Matter-js world the width of the section, floor at the bottom. When the section enters, items drop from above (60 ms stagger, gravity scale ~0.0014, restitution ~0.12, friction ~0.55, chamfered bodies at 84–92% of the sprite, sleeping on): each design toy is a body with its icon; empty slots are wooden crates labelled "still building".
- Drag and throw with mouse/touch (`MouseConstraint`); Lenis is stopped while dragging. Click-vs-drag: <400 ms and <10 px is a click. Device tilt optional, off by default.
- Click on an item opens its card: what it is, install link.
- Render bodies as DOM elements synced to body position/angle (keeps doodle styling and accessibility), not matter's canvas renderer. Per-tick speed clamp and out-of-bounds rescue so nothing tunnels.
- Pause the engine when the section is off-screen. Below the physics area render a plain accessible list of the same items. Reduced motion: items are placed at rest, no drop.
- Polar bear sits at a workbench beside it; glances at whatever you throw (v1: static).

### 3.7 Footer
- None. Links live in the About window.

### The animals
Dropped. The arctic thread survives only in Chimin's own photographs and paintings once they replace the stand-ins.

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

**M1 — The desk** (built, v4)
Desk with 13 objects (CC0 stand-ins), deal-in, drag, alpha hit-testing, Messy/Tidy, five windows with real content (essay links, PDFs, project list), mobile grid + sheet, day/night, GH Actions workflow.
Done: verified headless (hit-testing, drag, open, tidy, night, mobile), no console errors, 61fps.

**M2 — Chimin's own objects and photos** replace the stand-ins; Photos window gets a lightbox and filters.
**M3 — Travel spreads** inside the sketchbook window.
**M4 — Work scatter complete + Writing igloo** with all ten essays in MDX.
**M5 — Workshop physics + footer.**
**M6 — Day/night wash polish, aurora shader, Rive animals, optional wet-paint shader, mini-map polish.**
**M7 — `audit`, `optimize`, `harden`, `adapt` pass; Lighthouse; real-device test.**

After each milestone run impeccable `critique` against DESIGN.md and list findings before moving on.

---

## 8. Decisions made (2026-09-17; change here if needed)
- v4 direction: the desk, modelled on jesspaik.com / jackiehu.design, warm paper ground. Chimin: the sketchbook build was "childish, unprofessional"; the typographic rebuild was "even further from what I wanted".
- Objects are photographs (CC0 stand-ins for now). No code-drawn illustration, no handwriting font, no grain, no line-art mascots.
- Fonts: Instrument Serif (name, headings), JetBrains Mono (labels, one-liner), Geist (window body), Newsreader (long-form, M4).
- One fixed desk on desktop, windows for content; a scrolling grid on phones. Lenis is no longer used on the desk.
- Deploy from `main` only; preview on the branch first. Stay on cooleschimo.github.io.
- All ten old essays go live in v1 (M4). Old essay URLs keep working from `public/essays/`.
- `react`/`react-dom` pinned to 19.2.x; `react-pageflip` and `wired-elements` are not used. three.js not before a shader is actually needed.
- Copy: Claude may write placeholder copy only when marked as such in the source; Chimin writes the real copy.

## 9. Open questions for Chimin
- Photos of your own objects on a plain background (camera, sketchbook, prints, paints) to replace the CC0 stand-ins; and 8–12 of your photographs.
- Real copy: role line, one-liner, About paragraph, project summaries.
- Which project gets its own window first.

## 10. Kickoff prompt for the next session

```
Read docs/HANDOFF.md, docs/PRD.md and docs/DESIGN.md (v4, "the desk").
Branch claude/new-session-kjcz7d has the desk. Run it, compare it against jesspaik.com and
jackiehu.design, list what still reads as less polished than them, fix those first. Then M2:
swap in Chimin's objects and photographs when supplied, and build the Photos lightbox.
Do not deploy; publish a preview. Ask before adding any dependency.
```

## 11. Deployment

- `.github/workflows/deploy.yml` builds with `npm ci && npm run build` and deploys `dist/` to GitHub Pages. It runs **only on pushes to `main`** and on manual `workflow_dispatch`. Work on feature branches never deploys.
- One-time manual step: GitHub → Settings → Pages → Build and deployment → Source = **GitHub Actions**. Until this is set, the workflow's deploy job fails with a "Pages not enabled" error and the old static site keeps serving.
- Previewing a branch: `npm run build && npm run preview` locally, or ask Claude Code to publish the built `dist/` as a private artifact page (it builds with a relative base for that).
- Going live = merging the branch into `main`. The first deploy replaces the old site; the old essays keep their URLs under `/essays/`.
