# PRD — Chimin's Arctic Sketchbook (personal site v2)

Owner: Chimin Liu (github: cooleschimo)
Target: replace cooleschimo.github.io
Builder: Claude Code. Read this file and `DESIGN.md` before writing any code.
Revision: 2026-09-17, after the reference teardowns (`docs/refs/teardowns.md`) and the
decisions recorded in §8.

---

## 1. What this is

> **Direction change, 2026-09-17 (v5, "the igloo").** Chimin found the desk too close to the reference
> sites and set their own direction: a 2.5D illustrated igloo room, simple but sophisticated, an
> aesthetic rather than realism, with every photo and place translated into one paper-collage style
> generated from Chimin's photographs (`docs/ART-BRIEF.md`). See `DESIGN.md` v5. The desk and the two
> earlier builds are in git history. Until the art exists the room is an honest grey blockout.


A personal site that feels like a hand-made travel sketchbook set in a small illustrated arctic world (igloos, a polar bear, an arctic fox, a snowy owl). It shows technical projects and writing, plus photography, travel notes and a design lab of tiny desktop/browser toys.

It is a single illustrated igloo room. Few objects, each opening one sheet. The polish comes from one consistent collage style applied to everything, and from restraint.

### The one signature: the postcard
A magnet on the fridge opens a place. The front is its collage; the back is a postcard holding Chimin's arrangement of that place's collage pieces, which the visitor can rearrange into their own and keep. Everything else in the room is quiet.

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

## 3. Site structure (one room, sheets on top)

- **Outside** (`src/snow/Diorama.tsx`, R3F lazy chunk): the paper diorama: a letter-snow field the cursor and the fox push through, the igloo as three paper plates, Chimin pressed into the snow, pieces that watercolour in and dissolve out (DESIGN.md, "The paper diorama"). Click the igloo to go in. `sessionStorage` remembers; "outside" in the room goes back.
- **The room**: fixed viewport, 1440×900 world scaled to fit, five depth layers under a 2.5D camera (pointer parallax + dolly on open). Objects: the postcard string (places), camera (photographs), vase (flower arranging, in-room), notebook (essays + reader stickers), fox (cursor chase in its zone), window (day/night). The fridge is furniture. Name and role line sit top-left; About is a sheet from the name.
- **Sheets**: rise over the dimmed room; Escape closes.
- **Phones**: the room scales to width; sheets go full height; the fox chase is off.

### 3.0 Day / evening / night
- Three modes (`src/lib/mode.ts`): chosen by the visitor's clock on first visit (7–16 day, 16–20 evening, else night), then by the toggle top-right, persisted in `localStorage`, applied before first paint. Tokens per mode on `:root[data-mode]`.
- Inside, the mode drives the light layers (DESIGN.md, "Light, by time of day"); outside it drives the sky, snow, sun and the igloo's glow. The window shutter (click the window) turns the outside light off inside.

### 3.1 Name and About
- "Chimin Liu" and a role line as a typewriter label top-left; clicking opens About (short paragraph, links). Copy is placeholder until Chimin writes it.

### 3.2 Work
- Not an object in the room yet. Decide: a laptop on the table, or a shelf. Until then Work is reachable from About.

### 3.3 Writing (the notebook)
- The notebook opens a sheet listing the ten essays (links to `/essays/` for now, MDX in M4). Each essay has a sticker slot; a reader picks a sticker from a small tray and it stays on that essay in their browser. Blockout built.

#### Original plan, kept for content
- List of essays/poems as torn-paper slips (torn edge = rough.js clip path, not an image). Hover = rough-notation underline + slip lifts.
- Click expands inline to MDX content in a reading column (serif, max 62ch).
- All ten essays from the old site go live in v1: august, catullus, howardsend, hume, induction, lostfound, salesman, selflove, smith, whitman. Old URLs under `/essays/` keep working until each is converted.
- Snowy owl perched on the igloo; blinks by day, eyes open and head turns at night.

### 3.4 Photographs (the camera)
- The camera opens a contact sheet: each photo shown first as its collage translation, revealing the original on hover or tap. Blockout built with CC0 stand-ins.

#### Original plan, kept for content
- Photos laid out as a loose contact sheet on a lightbox table, slightly rotated. **One draggable per section**: the photos are draggable (motion `drag`, constrained); nothing else in the hut is.
- **Viewfinder interaction:** photos rest at blur(3px) + 40% saturation. The cursor is replaced by the camera viewfinder frame PNG inside the hut only; photos inside the frame render sharp and full colour (CSS mask or clip-path following the pointer, lerped).
- Click = shutter blink (black frame 80ms + subtle scale) then lightbox with caption: place, camera, one line.
- Filter chips: Ricoh / Canon / place, drawn as doodled tags.
- Touch: no viewfinder; photos sharpen as they cross viewport centre (ScrollTrigger).
- Images: responsive `srcset`, AVIF/WebP, lazy, blurhash or dominant-colour placeholder.

### 3.5 Travel (the postcard string)
- Fourteen postcards clipped to a string across the room. Click one: the camera dollies to it and the card pulls down into your hand; front = collage, back = the drag-and-drop collage canvas with Chimin's default arrangement, the visitor's changes kept in localStorage, Reset restores. Blockout built.

#### Original plan, kept for content (the snow-globe shelf is dropped)
- A hand-drawn shelf (rough.js) runs down the section with one **snow globe per place**. Inside each globe: the place's linework doodle (supplied by Chimin), a base with the place name in handwriting and the date. Globes sit at seeded tilts and sizes.
- **Shake and settle:** as a globe scrolls into view its snow is stirred up and settles over ~2 s (2D canvas or SVG particles inside a clip path; one shake per visit, none under reduced motion).
- **Ink to colour:** hover/focus/tap fills the globe's doodle with watercolour (the site grammar).
- **Hold to reveal:** press and hold the globe (0.3 s pointer, 0.6 s touch, cancels on >15 px move) and the real photo of the place fades in behind the doodle; release returns it. Touch also gets a small "photo" button. Reduced motion: crossfade.
- **Open:** click opens the place inline (motion `layoutId`) as a taped-in spread: the photo, the doodle, "favourite thing", date, and a tiny map with the pin. This is where text and photos live, so the globe stays uncluttered.
- Index: an unfolded hand-drawn map (d3-geo → path data → roughjs) at the top of the section with a pin per place; clicking a pin scrolls to that globe. The map is the only pinned element on the site (short, skippable via the mini-map). The fox walks the dotted route between pins as the map is scrolled through.
- Initial places: Budapest, Cinque Terre, Split, Mostar, Dubrovnik, Malta, Mallorca, Venice, Verona, Lake Garda, Como, Slovenia, Singapore, Chicago. Ship v1 with whichever 3 have art; the rest render as pencil-only "not painted yet" globes.

### 3.6 The vase
- Six flower stems lie on the table; clicking one puts it in the vase, clicking a stem in the vase returns it. Arrangement kept in localStorage. Blockout built. The design lab is dropped.

#### Original plan, kept for content
- Matter-js world the width of the section, floor at the bottom. When the section enters, items drop from above (60 ms stagger, gravity scale ~0.0014, restitution ~0.12, friction ~0.55, chamfered bodies at 84–92% of the sprite, sleeping on): each design toy is a body with its icon; empty slots are wooden crates labelled "still building".
- Drag and throw with mouse/touch (`MouseConstraint`); Lenis is stopped while dragging. Click-vs-drag: <400 ms and <10 px is a click. Device tilt optional, off by default.
- Click on an item opens its card: what it is, install link.
- Render bodies as DOM elements synced to body position/angle (keeps doodle styling and accessibility), not matter's canvas renderer. Per-tick speed clamp and out-of-bounds rescue so nothing tunnels.
- Pause the engine when the section is off-screen. Below the physics area render a plain accessible list of the same items. Reduced motion: items are placed at rest, no drop.
- Polar bear sits at a workbench beside it; glances at whatever you throw (v1: static).

### 3.7 The fox
- Asleep by the fridge. When the cursor enters its zone the cursor becomes a fish and the fox wakes and follows with a lag; it sits when the cursor leaves. Off on touch and under reduced motion. Blockout built.

### The bear and the owl
Not in the room. Reconsider only once the fox works.

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

The full list, sizes and style spec are in `docs/ART-BRIEF.md` (room layers, objects, fox frames, flowers, sky, string and pegs, the exterior shot for the arrival, one set per place, photographs, stickers). The site loads every image by name from `public/art/` (`src/room/art.ts`), as WebP; `tools/optimize-art.py` converts exported PNGs. Swapping art must require zero code changes.

**Until Chimin's art exists, `tools/render.py` paints the room and objects as shaded volumes and `tools/collage.py` makes the collage postcards and stickers** (currently in `public/art/`, WebP). CC0 photos used inside the stand-in postcards are credited in `public/art/_placeholder/CREDITS.md`.

---

## 6. Quality bars

- Performance: LCP < 2.5s on mid mobile; initial JS < 250KB gzip (M1 scaffold measures ~110KB). Lazy-load three/R3F, matter-js, map data, Rive by section (`React.lazy` + IntersectionObserver). Cap DPR at 1.5 on mobile. Pause every rAF loop and every wobble filter when off-screen or tab hidden.
- Accessibility: all content readable with JS animations disabled; `prefers-reduced-motion` disables Lenis smoothing, physics drop, bleed-in, wobble and melt (crossfades instead). Every hover has a focus and tap equivalent. Real `<a>`/`<button>` elements. Alt text on photos and illustrations. Handwriting font never used below 18px or for long text.
- Responsive: 360px up. Mobile is a first-class layout, not a shrunken desktop.
- No layout shift from late-loading art (reserve aspect ratios).

---

## 7. Milestones (vertical slices — each one is built and previewed on the branch; deploy is a separate, manual decision, see §11)

**M1 — The igloo** (built, v5.2)
Outside (3D letter snowfield, igloo, fox chase, Chimin in the snow, descent into the door), room with the visitor camera (parallax, zoom, pan, dolly), postcard string, postcard collage with drag-and-drop and persistence, camera contact sheet, notebook with reader stickers, vase arranging, fox chase, day/night, sheets, keyboard paths. Every image slot named per `docs/ART-BRIEF.md` and filled with generated collage stand-ins.

**M2 — Art in.** Chimin generates the room layers, objects and the first three places per the art brief; the blockout images are swapped for them with no code changes; tune light, shadow, parallax and dolly to the art.
**M2b — The 3D hero object** (vase or bag) as a generated model inside its window, lazy-loaded three.js.
**M3 — All fourteen places, twelve photographs, essays as MDX.**
**M4 — Work scatter complete + Writing igloo** with all ten essays in MDX.
**M5 — Workshop physics + footer.**
**M6 — Day/night wash polish, aurora shader, Rive animals, optional wet-paint shader, mini-map polish.**
**M7 — `audit`, `optimize`, `harden`, `adapt` pass; Lighthouse; real-device test.**

After each milestone run impeccable `critique` against DESIGN.md and list findings before moving on.

---

## 8. Decisions made (2026-09-17; change here if needed)
- v5 direction: the illustrated igloo, 2.5D with a real camera (parallax + dolly), Chimin's own idea; not realistic; two registers: the room and its objects as painted volumes (2D pictures of solid things, one camera, one light; reference Chimin's temple-on-sand frames), the postcards and stickers as cocktail-collage; art generated from Chimin's photos via the skills Chimin found. Hybrid: one real 3D hero object (vase or bag) may be added later inside its window (three.js then, not before). Postcards hang on a string; the fridge is furniture.
- The bag idea is shelved. The design lab, bear and owl are dropped for now.
- Fonts: Instrument Serif (name, headings), JetBrains Mono (labels, one-liner), Geist (window body), Newsreader (long-form, M4).
- One fixed room on desktop, sheets for content; the room scales to width on phones.
- Deploy from `main` only; preview on the branch first. Stay on cooleschimo.github.io.
- All ten old essays go live in v1 (M4). Old essay URLs keep working from `public/essays/`.
- `react`/`react-dom` pinned to 19.2.x; `react-pageflip` and `wired-elements` are not used. three.js + React Three Fiber + drei + @react-three/postprocessing power the paper diorama outside (lazy chunk); the room will move to the same stack.
- Copy: Claude may write placeholder copy only when marked as such in the source; Chimin writes the real copy.

## 9. Open questions for Chimin
- 3–5 test photos run through the collage skill with the style spec, so the style can be locked.
- Then the room layers and objects per `docs/ART-BRIEF.md` §A, and three places per §B.
- Real copy: name label, About paragraph. Which object should carry Work.

## 10. Kickoff prompt for the next session

```
Read docs/HANDOFF.md, docs/PRD.md, docs/DESIGN.md (v5) and docs/ART-BRIEF.md.
Branch claude/new-session-kjcz7d has the igloo with the arrival shot and generated stand-in art.
If Chimin has supplied art, drop it into public/art/ by the brief's names (run tools/optimize-art.py)
and tune light, shadow and parallax to it (M2). If not, refine the stand-ins in tools/collage.py,
the fox and the postcard collage until they feel finished. Do not deploy; publish a preview.
```

## 11. Deployment

- `.github/workflows/deploy.yml` builds with `npm ci && npm run build` and deploys `dist/` to GitHub Pages. It runs **only on pushes to `main`** and on manual `workflow_dispatch`. Work on feature branches never deploys.
- One-time manual step: GitHub → Settings → Pages → Build and deployment → Source = **GitHub Actions**. Until this is set, the workflow's deploy job fails with a "Pages not enabled" error and the old static site keeps serving.
- Previewing a branch: `npm run build && npm run preview` locally, or ask Claude Code to publish the built `dist/` as a private artifact page (it builds with a relative base for that).
- Going live = merging the branch into `main`. The first deploy replaces the old site; the old essays keep their URLs under `/essays/`.
