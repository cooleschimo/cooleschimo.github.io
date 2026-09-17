# Handoff notes — Chimin Liu, personal site (v4, "the desk")

Updated 2026-09-17 at the end of the second session. Read this, then `docs/PRD.md` and
`docs/DESIGN.md` (v4), before writing any code.

## 1. What happened, in order

1. Reference sites torn down live → `docs/refs/teardowns.md` (still valid; its §1.4 maps onto old decisions).
2. Sketchbook M1 built → Chimin: "very childish, unprofessional". (commits c0af973…1802542)
3. Clean typographic M1 built → Chimin: "even further from what I wanted… you would have given me something similar to [the references]". (commit e44782f)
4. **The desk** built, modelled directly on jesspaik.com / jackiehu.design, on warm paper:
   photographed objects (CC0 stand-ins cut out with rembg), deal-in, drag, alpha hit-testing,
   Messy/Tidy, five windows, mobile grid + sheet. DESIGN.md v4 and PRD updated to match.

**Nothing is deployed.** The workflow runs only on pushes to `main`.

## 2. What exists

```
content/desk.json                 the objects: kind, image, x/y from centre, rotation, width, which window they open
content/projects.json             four projects
public/art/_placeholder/objects/  camera, sketchbook, letter(2), paints, coffee, tape, pencils (.webp cut-outs, ≤760px)
public/art/_placeholder/photos/   venice, venice2, chicago, singapore, dubrovnik (.jpg ≤900px)
public/art/_placeholder/CREDITS.md  source, creator and license for every stand-in
src/desk/Desk.tsx                 world scaling, deal-in (GSAP), z-order, windows state, Messy/Tidy
src/desk/DeskObject.tsx           motion drag, hot state, click-vs-drag (400ms / 10px)
src/desk/useAlphaHit.ts           offscreen-canvas alpha sampling for cut-outs
src/desk/objects.tsx              renders image / polaroid / folder (SVG) / calendar (live date + moon) / name
src/desk/MobileDesk.tsx           two-column grid + bottom sheet
src/windows/WindowFrame.tsx       draggable window (title-bar drag via dragControls)
src/windows/WindowManager.tsx     AnimatePresence over open windows
src/windows/contents.tsx          About, Work, Photos, Writing (links to /essays/*.html), Travel
src/shell/ModeToggle.tsx          sun/moon
src/styles/tokens.css, base.css   warm paper tokens; all desk/window/mobile styles
```

Removed in v4: everything from the sketchbook and typographic builds (in git history).
`src/lib/lenis.ts`, `seed.ts` and the rough-notation/roughjs packages are unused now; remove
them from package.json when convenient.

## 3. How the pieces work

- **World scaling**: `.desk__world` is 1440×820 and is scaled by
  `min(1, (vw-32)/1440, (vh-120)/820)`; object positions are `calc(50% + Xpx)` inside it.
- **Deal-in**: GSAP `from` per object using `data-x/data-y` (stored on a hidden span) so each
  object starts near the centre; `clearProps` afterwards so motion's drag owns transforms.
- **Hit-testing**: `useAlphaHit(src)` draws the cut-out into a 256px canvas once; on pointer
  move the pointer is un-rotated into the object's box (cos/sin of `item.r`) and alpha is read.
  Non-image objects are always hot.
- **Click vs drag**: `pointerdown` records time/position only if the pixel is hot; `pointerup`
  opens if <400ms and <10px.
- **Tidy**: positions/scales are recomputed in `placed` and tweened with GSAP (`left/top/rotate/scale`).
  Drag offsets from motion are not reset, so a moved object tidies relative to where it was left.
- **Windows**: fixed, offset 28px per open window, z from a counter, `dragConstraints` = body.
- **Mobile**: `matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1024px)')`.

## 4. Verified (headless Chromium against `vite preview`)

Deal-in, hover hot on the camera body and not on its transparent corner, drag moves an object,
click opens Photos, name opens About, folder opens Work, Tidy/Messy, night, mobile grid and
sheet. Zero console errors, zero failed requests, 61fps. JS ≈ 475 KB raw / 162 KB gzip.

## 5. Known gaps and follow-ups

1. **Stand-in objects and photos** (CC0) everywhere. The site becomes Chimin's when their own
   camera, sketchbook, paints, prints and photographs replace the files in `public/art/_placeholder/`
   (same names, or edit `content/desk.json`).
2. **Placeholder copy**: role line, one-liner, About paragraph, project summaries.
3. Tidy mode leaves objects where they were dragged (relative). Consider resetting motion's
   drag offset on Tidy.
4. The folder is an SVG; a photographed folder would match the others better.
5. Windows are not keyboard-focus-trapped; Escape closes the top one.
6. Desk objects are not reachable by keyboard on desktop (they are on mobile via tiles). Add a
   hidden list of "open X" buttons or make hot objects focusable.
7. Photos window needs a lightbox; Travel needs real spreads; Work needs per-project windows.

## 6. Deployment (see PRD §11)

- Merge to `main` to deploy. First deploy replaces the old site; `/essays/*` URLs keep working.
- One manual step, once: GitHub → Settings → Pages → Source = **GitHub Actions**.
- Preview without deploying: build with `--base=./` and publish `dist/` as a private artifact page.

## 7. Kickoff prompt for the next session

```
Read docs/HANDOFF.md, docs/PRD.md and docs/DESIGN.md (v4, "the desk").
Branch claude/new-session-kjcz7d has the desk. Run it, compare it against jesspaik.com and
jackiehu.design, list what still reads as less polished than them, fix those first. Then M2:
swap in Chimin's objects and photographs when supplied, and build the Photos lightbox.
Do not deploy; publish a preview. Ask before adding any dependency.
```
