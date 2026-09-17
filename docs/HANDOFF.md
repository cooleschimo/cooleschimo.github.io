# Handoff notes — Chimin Liu, personal site (v5, "the igloo")

Updated 2026-09-17 at the end of the second session. Read this, then `docs/PRD.md`,
`docs/DESIGN.md` (v5) and `docs/ART-BRIEF.md`, before writing any code.

## 1. What happened, in order

1. Reference sites torn down live → `docs/refs/teardowns.md`.
2. Sketchbook build → "childish". Typographic build → "further from what I wanted". Desk build
   (jesspaik/jackiehu model, CC0 photo cut-outs) → "too similar to the example websites".
   All three are in git history (c0af973, e44782f, 88f85d3…fddeafb).
3. Chimin set the direction: a 2.5D illustrated igloo room, not realistic, simple but sophisticated,
   with every photo and place translated into the **cocktail-collage style** (torn paper, washi,
   typewriter captions on cream), generated from Chimin's photos with the skills they found.
4. Built: the **igloo blockout**. Grey flat shapes in the right proportions, every interaction
   working, every image an `<Art>` slot that swaps to the real file by name (`src/room/art.ts`).

**Nothing is deployed.** The workflow runs only on pushes to `main`.

## 2. What exists

```
content/places.json          the fourteen places (slug, name, country)
content/projects.json        four projects (shown in About for now)
docs/ART-BRIEF.md            style spec + numbered shot list + export specs for Chimin's generation run
public/art/                  EMPTY except _placeholder/; the room loads art by the brief's names when present
src/room/art.ts              every image slot, by name
src/room/useArt.tsx          useArt(src) probes whether a file exists; <Art> renders it or the blockout placeholder
src/room/Room.tsx            world scaling, five depth layers (data-depth 0..1), camera dolly on open, the pulled postcard, sheets
src/room/camera.ts           the 2.5D camera: pointer parallax + dolly, applied per layer by depth on gsap.ticker
src/room/PostcardString.tsx  the string and its fourteen cards (positions from stringPoint)
src/room/RoomObject.tsx      interactive object = real <button> with hover lift + label; Block = grey placeholder
src/room/Vase.tsx            six stems; click to put in / take out; kept in localStorage
src/room/Fox.tsx             zone-based chase: cursor becomes a fish, fox lerps toward it; off on touch / reduced motion
src/sheets/Sheet.tsx         modal card over the dimmed room; Escape closes; focus in and back
src/sheets/Postcard.tsx      front (collage slot) / back (drag-and-drop pieces, seeded default, localStorage, Reset, arrow keys)
src/sheets/contents.tsx      About (+Work list), Photos (contact sheet, CC0 stand-ins), Writing (essays + reader stickers)
src/shell/ModeToggle.tsx     sun/moon (also triggered by clicking the window)
src/styles/tokens.css        paper / ice / sky / ink tokens for day and night
src/styles/base.css          all room, blockout and sheet styles
```

## 3. How the pieces work

- **Art slots**: `ART.*` in `src/room/art.ts` are the paths from the brief. `useArt` loads each once via
  an `Image` probe; missing files fall back to the placeholder. Drop files in `public/art/` and reload.
  Nothing else changes. (The 404s for missing art are expected in the console until the art exists.)
- **Camera** (`camera.ts`): layers carry `data-depth` 0..1. Each frame: translate by pointer parallax
  (56px at depth 1, ~7px at 0) plus the dolly offset, and scale by `1 + (zoom-1)*(0.55+0.45d)`, so near
  layers grow more. `dolly(x, y, zoom)` moves toward a world point relative to centre; `reset()` returns.
  `goTo()` in Room dollies then opens.
- **Postcard string**: `stringPoint(i, n)` gives x, sag y and a perspective tilt; cards are buttons with
  a CSS sway; the picked card fades on the string and a `.pulled` card springs from its position to the centre.
- **Postcard back**: pieces are absolutely positioned in a 640×420 space and scaled with
  `scale: calc(100cqw / 640)` so the card can be any width; motion `drag` with `dragConstraints` on
  the card; positions saved per place under `postcard:<slug>`; `defaultPieces(slug)` is a seeded
  arrangement standing in for Chimin's authored one.
- **Fox**: zone `{x:120,y:560,w:520,h:300}` in world units, home `{330,700}`; the world gets
  `.room__world--fish` (cursor: none) and a fish element follows the pointer.
- **Sheets**: one open at a time (`open` state in Room); `role="dialog"`, Escape closes.

## 4. Verified (headless Chromium against `vite preview`)

Room renders; parallax moves layers at different rates; a string card → dolly + pulled card; turn over; a piece drags and the
new position persists across reload; camera → photos; notebook → sticker given to an essay; vase
stem in; fox wakes and the fish cursor appears in its zone; window click → night; mobile taps.
Console: only the expected 404s for not-yet-existing art. See the verify script list in §4 of
this file's git history if the scratchpad is gone.

## 5. Known gaps and follow-ups

1. **No art yet.** Everything is grey on purpose. Chimin runs the collage skill per the brief;
   test 3–5 photos first to lock the style.
2. Chimin's authored default postcard arrangements (replace `defaultPieces`) once pieces exist.
3. Work has no object in the room (it's listed in About). Decide: a laptop on the table or a shelf. The fridge is furniture now; it could carry Work.
3b. The 3D hero object (vase or bag) is planned for M2b with lazy three.js; not added yet.
4. Phones: the room scales to width and is small; a dedicated phone composition (objects stacked
   vertically) should follow once the art exists.
5. Copy is placeholder everywhere it says so.
6. The fox does not blink or walk (needs the walking frames from the brief).

## 6. Deployment (see PRD §11)

- Merge to `main` to deploy. First deploy replaces the old site; `/essays/*` URLs keep working.
- One manual step, once: GitHub → Settings → Pages → Source = **GitHub Actions**.
- Preview without deploying: build with `--base=./` and publish `dist/` as a private artifact page.

## 7. Kickoff prompt for the next session

```
Read docs/HANDOFF.md, docs/PRD.md, docs/DESIGN.md (v5) and docs/ART-BRIEF.md.
Branch claude/new-session-kjcz7d has the igloo blockout. If Chimin has supplied art, drop it into
public/art/ by the brief's names and tune light, shadow and parallax to it (M2). If not, refine the
postcard collage interaction and the fox until they feel finished. Do not deploy; publish a preview.
```
