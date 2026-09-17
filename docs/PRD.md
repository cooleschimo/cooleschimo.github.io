# PRD — Chimin's Arctic Sketchbook (personal site v2)

Owner: Chimin Liu (github: cooleschimo)
Target: replace cooleschimo.github.io
Builder: Claude Code. Read this file and `DESIGN.md` before writing any code.

---

## 1. What this is

A personal site that feels like a hand-made travel sketchbook set in a small illustrated arctic world (igloos, a polar bear, an arctic fox, a snowy owl). It shows technical projects and writing, plus photography, travel notes and a design lab of tiny desktop/browser toys.

It is NOT a polished SaaS-style portfolio. Doodle lines, watercolor fills, paper grain, handwriting. Interaction quality (hover, scroll, physics) is the main craft focus.

### Goals
1. One continuous, fluid vertical scroll through the world. Zero navigation friction: every piece of content reachable by scrolling or one click on the mini-map.
2. Thoughtful micro-interactions on everything hoverable.
3. Hobbies get equal billing with work.
4. Adding a new place, photo or project = editing one JSON/MDX file, no component changes.

### Non-goals (v1)
- No enterable igloo "rooms" or side-scrolling navigation (the previous eskimo-version did this; it gated content behind navigation).
- No full 3D world. R3F is used for shaders only.
- No CMS, no backend, no analytics.
- No Vanta, no liquid-logo (both read glossy/digital; revisit in v2 for night mode only).

---

## 2. Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Deploy: GitHub Pages via GitHub Actions. Repo is a user site (`cooleschimo.github.io`), so Vite `base: '/'`.
- Content: JSON + MDX under `/content`

### Install

```bash
npm create vite@latest arctic-sketchbook -- --template react-ts
cd arctic-sketchbook

# styling
npm i tailwindcss @tailwindcss/vite

# scroll + animation spine
npm i gsap @gsap/react lenis motion

# shaders (fluid reveal, snow, aurora)
npm i three @react-three/fiber @react-three/drei
npm i -D @types/three

# hand-drawn look
npm i roughjs rough-notation perfect-freehand

# physics (design lab)
npm i matter-js
npm i -D @types/matter-js

# travel map + sketchbook
npm i d3-geo topojson-client world-atlas react-pageflip
npm i -D @types/d3-geo @types/topojson-client

# content
npm i -D @mdx-js/rollup
```

Later milestone only:
```bash
npm i @rive-app/react-canvas
```

Before installing, verify each package's current version supports React 19. If `react-pageflip` does not, build the page turn with GSAP (rotateY on a split page) instead.

### Library roles (do not overlap them)
| Library | Owns |
|---|---|
| Lenis | smooth scroll. Drive it from `gsap.ticker`, call `ScrollTrigger.update` on Lenis scroll. One instance at app root. |
| GSAP + ScrollTrigger | all scroll-linked animation, pinning, timelines |
| GSAP DrawSVG / MorphSVG / SplitText | doodles drawing themselves, text reveals (these plugins are free, included in `gsap`) |
| motion (`motion/react`) | component-level hover/tap/drag/layout animation only. Never scroll. |
| R3F + drei | fluid-reveal shader, snow, night aurora. Single shared `<Canvas>` using drei `<View>`; never one canvas per card. |
| roughjs | every box, border, divider, map outline |
| rough-notation | hover underline/circle/highlight on links and headings |
| perfect-freehand | ink cursor trail (desktop only) |
| matter-js | design-lab gravity |
| d3-geo + world-atlas | map projection, rendered through roughjs |
| Rive (M6) | animal state machines |

### React Bits (reactbits.dev)
Install per component with the CLI command shown on that component's docs page (TS + Tailwind variant). Copy the source in, then restyle to DESIGN.md. Candidates:
- `FallingText` — reference for gravity text
- `SplashCursor` — reference for fluid sim; adapt into the ice-melt reveal
- `ImageTrail` — optional, photo section
- `Ballpit` — reference only for matter-js wiring
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

Global: fixed doodled mini-map (bottom-right; collapses to a compass icon on mobile) with one landmark per section, click = Lenis `scrollTo`. Fixed sun/moon toggle (top-right).

### 3.0 Day / night
- Day: warm paper, blue-grey ink. Work section emphasises code projects.
- Night: deep navy paper, cream ink, aurora shader in the sky band. Writing section is emphasised; owl wakes up.
- Implement as CSS custom properties on `:root[data-mode]`. Persist in `localStorage`. Transition = watercolor wash sweeping across the viewport (SVG mask, ~900ms).

### 3.1 Hero
- Name draws itself stroke by stroke (DrawSVG) in Chimin's handwriting SVG.
- One-line intro, handwriting font.
- Slow parallax snow (R3F points or 2D canvas; cap 150 flakes on mobile).
- Arctic fox peeks from behind a snowdrift; head/eyes track cursor (v1: two-pose sprite swap + small rotate; M6: Rive).
- Scroll cue: doodled arrow that wobbles.

### 3.2 Work igloo — projects
- Grid of "ice blocks" (rough.js rectangles, watercolor ice fill, slight random rotation 1–3°).
- **Fluid reveal (signature interaction):** on hover the ice melts around the cursor to reveal the project image underneath.
  - Implementation: pointer positions stamp a soft brush into an offscreen trail texture that decays over ~1.2s. Fragment shader mixes `iceTexture` and `projectImage` using `smoothstep` on (trail value + low-freq noise) so the edge is wobbly and liquid. Add slight refraction of the image near the edge.
  - Reference: adapt the sim approach from React Bits `SplashCursor`. Cheaper acceptable fallback: 2D canvas mask + SVG goo filter.
  - Touch: tap = melt expands from the tap point to full reveal; second tap opens the project.
  - Reduced motion: simple crossfade.
- Click opens an in-place expanded card (motion `layoutId`), not a new page: title, 2-line summary, stack tags, links.
- Initial projects: NeuroScan, Political Bias Detection Pipeline, Patent Classification (summary only, methodology is proprietary — no detail), Bayesian prediction-markets project.

### 3.3 Writing igloo
- List of essays/poems as torn-paper slips. Hover = rough-notation underline + slip lifts.
- Click expands inline to MDX content in a reading column (serif, max 62ch).
- Snowy owl perched on the igloo; blinks by day, eyes open and head turns at night.

### 3.4 Photo hut — photography (Ricoh GR IIIx + Canon)
- Photos laid out as a loose contact sheet on a lightbox table, slightly rotated, draggable (motion `drag`, constrained).
- **Viewfinder interaction:** photos rest at blur(3px) + 40% saturation. The cursor is replaced by the camera viewfinder frame PNG; photos inside the frame render sharp and full colour (CSS mask or clip-path following the pointer, lerped).
- Click = shutter blink (black frame 80ms + subtle scale) then lightbox with caption: place, camera, one line.
- Filter chips: Ricoh / Canon / place, drawn as doodled tags.
- Touch: no viewfinder; photos sharpen as they cross viewport centre (ScrollTrigger).
- Images: responsive `srcset`, AVIF/WebP, lazy, blurhash or dominant-colour placeholder.

### 3.5 Travel sketchbook
- An open sketchbook, pinned while the user scrolls through spreads (ScrollTrigger pin + page flip).
- Index spread: hand-drawn map (d3-geo → path data → roughjs). Pins per place. Fox walks a dotted line between pins as you scroll. Click pin = jump to that spread.
- Each place spread:
  - doodle illustration: **linework PNG/SVG supplied by Chimin**, watercolor added in code
  - place name (handwriting), date, one-liner "favourite thing"
  - optional 1 photo taped in with doodled washi tape
- **Watercolor bleed-in:** fill layer sits under the linework, revealed by an expanding radial mask with `feTurbulence` + `feDisplacementMap` edges, `mix-blend-mode: multiply`, over paper grain. Triggered when the spread becomes active. Expose filter params as constants so Chimin can tune.
- Initial places: Budapest, Cinque Terre, Split, Mostar, Dubrovnik, Malta, Mallorca, Venice, Verona, Lake Garda, Como, Slovenia, Singapore, Chicago. Ship v1 with whichever 3 have art; the rest render as pencil-only "not painted yet" spreads.

### 3.6 Polar bear's workshop — design lab
- Matter-js world the width of the section, floor at the bottom. When the section enters, items drop from above: each design toy is a body with its icon; empty slots are wooden crates labelled "still building".
- Drag and throw with mouse/touch (`MouseConstraint`). Device tilt optional, off by default.
- Click (not drag) on an item opens its card: what it is, install link.
- Render bodies as DOM elements synced to body position/angle (keeps doodle styling and accessibility), not matter's canvas renderer.
- Pause the engine when the section is off-screen. Below the physics area render a plain accessible list of the same items.
- Polar bear sits at a workbench beside it; glances at whatever you throw (v1: static).

### 3.7 Footer
- Igloo at dusk, links (GitHub cooleschimo, Instagram chi.minutiae, email) as hand-lettered signs. Footer text falls with gravity once when first reached (adapt `FallingText`), skip if reduced motion.

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

Chimin supplies (hand-drawn; transparent PNG @2x or SVG; **linework and fill as separate files**):
| File | Notes |
|---|---|
| `art/name-signature.svg` | name as single-stroke paths (for DrawSVG) |
| `art/fox-{idle,peek,walk1,walk2}` | |
| `art/bear-{sit,glance}` | |
| `art/owl-{asleep,awake}` | |
| `art/igloo-{work,writing,photo,footer}` | |
| `art/places/{slug}-line`, `{slug}-fill` (fill optional) | one per place |
| `art/viewfinder.png` | cutout photo of the actual Ricoh back/frame |
| `fonts/chimin-hand.woff2` | made with Calligraphr |

Generated in code (Claude Code builds these): paper grain, watercolor filters, ice texture, snow, aurora, map, tape, all rough.js shapes, mini-map.

**Until real art exists, create clearly-named placeholders** in `art/_placeholder/` (simple rough.js doodles) so no milestone is blocked. Swapping art must require zero code changes.

---

## 6. Quality bars

- Performance: LCP < 2.5s on mid mobile; initial JS < 250KB gzip. Lazy-load three/R3F, matter-js, map data, Rive by section (`React.lazy` + IntersectionObserver). Cap DPR at 1.5 on mobile. Pause every rAF loop when off-screen or tab hidden.
- Accessibility: all content readable with JS animations disabled; `prefers-reduced-motion` disables Lenis smoothing, physics drop, bleed-in and melt (crossfades instead). Every hover has a focus and tap equivalent. Real `<a>`/`<button>` elements. Alt text on photos and illustrations. Handwriting font never used below 18px or for long text.
- Responsive: 360px up. Mobile is a first-class layout, not a shrunken desktop.
- No layout shift from late-loading art (reserve aspect ratios).

---

## 7. Milestones (vertical slices — each one ships to GitHub Pages)

**M1 — Spine + signature interaction**
Scaffold, Tailwind tokens from DESIGN.md, Lenis↔ScrollTrigger wiring, paper grain + watercolor filter utilities, `<RoughBox>` primitive, hero with DrawSVG name, ONE ice block with working fluid reveal (desktop + tap + reduced motion), GH Actions deploy.
Done when: deployed URL scrolls smoothly at 60fps on a laptop, melt reveal works on hover and tap.

**M2 — Travel sketchbook** with 3 places, bleed-in, rough map, fox on path.
**M3 — Photo hut** with viewfinder, lightbox, filters, 12 photos.
**M4 — Work grid complete + Writing igloo** with MDX.
**M5 — Workshop physics + footer.**
**M6 — Day/night wash, aurora, Rive animals, mini-map polish.**
**M7 — `audit`, `optimize`, `harden`, `adapt` pass; Lighthouse; real-device test.**

After each milestone run impeccable `critique` against DESIGN.md and list findings before moving on.

---

## 8. Decisions already made (defaults — change here if needed)
- One-scroll world, no enterable rooms.
- Animals are static/sprite-swap until M6.
- Touch: fluid reveal = tap-to-melt; viewfinder = sharpen on scroll.
- Art overlap: no separate "art" section; watercolor lives inside the travel sketchbook.

## 9. Open questions for Chimin
- Which 3 places get art first?
- Which essays/poems go live in v1?
- Custom domain or stay on github.io?

---

## 10. Kickoff prompt for Claude Code

```
Read PRD.md and DESIGN.md fully. Do not start coding yet.
1. Verify every package in PRD §2 supports React 19; report any that don't with your proposed substitute.
2. Propose the folder structure and the list of components for M1 only.
3. Wait for my OK, then build M1 as a vertical slice and get it deployed to GitHub Pages.
Rules: DESIGN.md overrides any installed design skill. Use placeholder art from art/_placeholder. Ask before adding any dependency not listed in the PRD.
```
