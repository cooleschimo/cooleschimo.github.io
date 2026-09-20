# Handoff notes — Chimin Liu, personal site (v8, "paint in snow")

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
5. "There's no interactive depth" → the visitor camera (`camera.ts`: zoom, pan, dolly) and the postcard string.
6. "The igloo feels off … start above the igloo with my name … like Jess Paik's opening" and "try working
   on the assets yourself" → `Arrival.tsx` (above-igloo shot, tilt to the door, push through, room assembles
   from a clump) and generated collage stand-in art for every slot.
7. "I didn't want this aesthetic for everything in the room, it's too sticker-like and flat; collage is
   for the postcards; I wanted objects that are 2D but look 3D" (with painted temple-on-sand frames as
   the reference) → `tools/render.py`: a small numpy rasteriser that builds each object and the igloo
   from simple 3D forms, shades them under one light, and paints over the result. Collage stays on the
   postcards and stickers.
8. Chimin sent a "snow made of letters" image: "imagine an igloo centre of this, 3d, and an arctic fox that
   runs around it wherever cursor is. i'll be the eskimo lying in the snow" → `src/snow/Snowfield.tsx`
   (three.js, lazy): the outside. It replaces Arrival.tsx.
9. "3D elements that clearly look painted but clean crisp crystal like … everything looks too plain and
   3D-clay-model like … lighting at different times of the day should filter into the room differently …
   the window should be interactive, if you close it the light goes out" → translucent ice blocks outside
   (MeshPhysicalMaterial transmission, glow inside at night), crystal-gradient blocks inside (render.py),
   three modes (day / evening / night, by clock first), the light layers in the room, the window shutter.
   Chimin judged it: "the figures are basic and odd … too detailed and too 3D … not like the first image".
10. Chimin wants 2D art in 3D space, watercolour that runs in and dissolves out, the cursor shifting the
    snow, the fox pushing through it; asked whether to go textured 3D or flat textured patches in 2.5D.
    Recommended the flat patches (the paper diorama); Chimin: "that's what i want, make the design first".
    Built: `src/snow/Diorama.tsx` (React Three Fiber) + `src/snow/paint.ts` + `tools/paper.py`.
11. Chimin: "yes rebuild the inside as such". Built `src/snow/Inside.tsx`: the room as a paper diorama
    (table close up, camera / notebook / postcards / vase / candle / window / fox), light by mode, shutter.
    `Room.tsx` is now only the switch between Outside and Inside plus the sheets. The old 2.5D room files
    (`camera.ts`, `PostcardString.tsx`, `RoomObject.tsx`, `Vase.tsx`, `Fox.tsx`, `useArt.tsx`, `render.py`
    output in `public/art/room|objects`) are unused and can be deleted once Chimin approves the inside.

**Nothing is deployed.** The workflow runs only on pushes to `main`.

## 2. What exists

```
content/places.json          the fourteen places (slug, name, country)
content/projects.json        four projects (shown in About for now)
docs/ART-BRIEF.md            style spec + numbered shot list + export specs for Chimin's generation run
public/art/                  generated stand-ins (WebP) in every slot named by the brief; _placeholder/ holds CC0 photos + CREDITS.md
tools/render.py              the room and objects: meshes → z-buffer rasteriser → shading → painterly pass (numpy + Pillow); prints CSS slot sizes
tools/collage.py             the postcard fronts, pieces and stickers (collage); its room functions are unused now
tools/optimize-art.py        PNG/JPG under public/art → WebP q82, deletes sources
src/room/art.ts              every image slot, by name
src/room/useArt.tsx          useArt(src) probes whether a file exists; <Art> renders it or the blockout placeholder
src/snow/Letters.tsx         outside (R3F): letter snow. H(x,z) mounds + value noise, glyph atlas, InstancedMesh of letters and the mound with one snow shader (SNOW_GLSL), particle sim, sparkles, dust, sky shader, fox, Chimin, igloo plates
tools/restyle.py             paper-cut → painted, as far as pixels allow: cuts the rim, smooths fibre, feathers; `--body` keeps only the person (drops drawn snow)
tools/defringe.py            takes the white fringe off a cut-out piece (nearest-solid colour bleed + 1px alpha erosion); run once per new piece
src/snow/Inside.tsx          inside (R3F): table close up with the objects, light planes by mode, window + shutter, hover lift, dissolve on open
src/snow/Piece.tsx           the painted plane (shared): paint material, reveal on mount, control ref (reveal/dissolve), tint, hover/click
src/snow/paint.ts            the paint material: ink line → watercolour fill with a wet edge (uReveal), dissolve into drifting pigment (uDissolve), brushed edge (noise on alpha), uCut, uTint + uTopLight, uSink→uSnow, fog
tools/paper.py               stand-in paper pieces: stylise(cut-out) → few tones + fibre + torn edge + rim; drawn igloo plates, drifts, Chimin, fox side view
src/room/Room.tsx            world scaling, five depth layers (data-depth 0..1), camera dolly on open, the pulled postcard, sheets, assemble-on-arrival
src/room/camera.ts           the 2.5D camera: pointer parallax + dolly, applied per layer by depth on gsap.ticker
src/room/PostcardString.tsx  the string and its fourteen cards (positions from stringPoint)
src/room/RoomObject.tsx      interactive object = real <button> with hover lift + label; Block = grey placeholder
src/room/Vase.tsx            six stems; click to put in / take out; kept in localStorage
src/room/Fox.tsx             zone-based chase: cursor becomes a fish, fox lerps toward it; off on touch / reduced motion
src/sheets/Sheet.tsx         modal card over the dimmed room; Escape closes; focus in and back
src/sheets/Postcard.tsx      front (collage slot) / back (drag-and-drop pieces, seeded default, localStorage, Reset, arrow keys)
src/sheets/contents.tsx      About (+Work list), Photos (contact sheet, CC0 stand-ins), Writing (essays + reader stickers)
src/shell/ModeToggle.tsx     cycles day → evening → night (src/lib/mode.ts: modeByClock, nextMode)
src/styles/tokens.css        paper / ice / sky / ink tokens for day and night
src/styles/base.css          all room, blockout and sheet styles
```

## 3. How the pieces work

- **Art slots**: `ART.*` in `src/room/art.ts` are the paths from the brief. `useArt` loads each once via
  an `Image` probe; missing files fall back to the placeholder. Drop files in `public/art/` and reload.
  Nothing else changes. (The 404s for missing art are expected in the console until the art exists.)
- **Camera** (`camera.ts`): a point of interest (world units from centre) + zoom, eased each frame into
  `shown`. Layers carry `data-depth` 0..1 and scale by `1 + (zoom-1)*(0.55+0.45d)` about the poi, plus
  pointer parallax (56px at depth 1, ~7px at 0, divided by zoom). Wheel/pinch call `zoomAtScreen()`, which
  keeps the world point under the pointer fixed on the objects layer; drag pans when zoomed; double-click
  jumps to 2× or resets; keys + - 0. `dolly()` saves the visitor's view and moves; `back()` restores it.
  Room passes the `.room` element as the viewport for listeners and shows zoom in `.camctl`.
- **Postcard string**: `stringPoint(i, n)` gives x, sag y and a perspective tilt; cards are buttons with
  a CSS sway; the picked card fades on the string and a `.pulled` card springs from its position to the centre.
- **Postcard back**: pieces are absolutely positioned in a 640×420 space and scaled with
  `scale: calc(100cqw / 640)` so the card can be any width; motion `drag` with `dragConstraints` on
  the card; positions saved per place under `postcard:<slug>`; `defaultPieces(slug)` is a seeded
  arrangement standing in for Chimin's authored one.
- **Fox**: zone `{x:120,y:560,w:520,h:300}` in world units, home `{330,700}`; the world gets
  `.room__world--fish` (cursor: none) and a fish element follows the pointer.
- **Sheets**: one open at a time (`open` state in Room); `role="dialog"`, Escape closes.
- **Outside** (`Diorama.tsx`, lazy, ~270KB gzip with R3F + drei + postprocessing): `Room` reads
  `sessionStorage 'arrived'`; if unset it renders it (z-index 58, under the sheets) over a hidden world.
  `useTrail` ping-pongs two 512² render targets: each frame `h = prev*decay` max'd with soft stamps
  (cursor r.7 s.38, fox r.95 s.7, Chimin r2.7 s.45 fixed) in ground uv (x/G+.5, .5-z/G). The snow shader
  reads the trail for depth (darker trough, lit lip, letters pushed sideways by the slope) and lights the
  letters by mode (uTint/uLight, aurora bands at night). `Piece` = plane + `makePaintMaterial(texture)`;
  `uReveal` tweens 0→1 on mount (staggered `delay`), `control` ref exposes reveal/dissolve for the object
  test (the camera on the table: click → dissolve → paints back). The fox is a Piece in a group that
  faces the camera, y = -0.55 (+bob) so its lower part is under the snow plane, flipped by heading, with
  a 90-particle spray. Chimin is a Piece lying flat. Igloo = three Pieces leaning back (-0.42/-0.3/-0.18
  rad) over a blob shadow; `enterRef` runs the camera between them into the door. Post = Bloom + Noise
  + Vignette. Modes ease `LOOKS` (tint, light, sky, horizon, sparkle, aurora, door glow).
- **Inside** (`Inside.tsx`): camera at (0,4.6,12.5) looking at (0,3,0), drifting with the pointer. Wall plate
  (`wall-inside`, hole at world y 6) with the sky disc behind it and the shutter plate (`shutter`) that
  tweens from y 9.3 to 6.0. `LOOKS[mode]` → eased `cur` → `tint` (a Color every Piece lerps toward via
  its `tint` prop), scene background, and the additive planes: beam (window→table), two pools, wall wash,
  candle lamp; all × 0 when `shut`. Objects sit on `TY = 2.35` (the `table-front` piece's top). Hover →
  `hoverRef` → a group lifts 0.18; `opened` prop (from Room: photos→camera, writing→notebook,
  place→postcards) → that piece's control `dissolve(1)`, and back to `reveal(1)` when it closes. The
  vase's `inVase[]` is in localStorage under `vase`; postcards open places in order (`nextPlace` in Room).
- **Letter snow** (`Letters.tsx`, v8): `H(x,z)` = sum of gaussian mounds (one negative: Chimin's hollow at `CHIMIN`) +
  three octaves of JS value noise; `moundGeometry` is a 180² plane displaced by H (opaque; also the raycast target for
  the cursor). `SNOW_GLSL` is shared by the mound and the letters: `snowShade` (wrap-lit white→shadow, hollow darkening
  by world y, fresnel glow, a soft highlight), `glitter` (hashed cells with jittered normals, (reflect·V)^40, twinkle),
  `auroraOn`. Colours per mode in `LOOKS` (white, shadow, light, sky/mid/horizon, sun + sunDir, sparkle, aurora, glow,
  stars) eased in `cur`→`tgt`; the sun is in front of the camera (z negative) so the field is backlit. `glyphAtlas()`
  draws 64 glyphs on a 1024² canvas; `buildField` makes one `InstancedMesh` of N+NF unit quads (N = 96000, 48000 under
  760px) with per-instance `aGlyph`/`aColor`/`aSeed`, letters distributed where the camera looks (x ±36, z −32…22,
  denser near); `restOrientation` aligns a letter to the slope normal with random yaw/tilt. The letter shader adds a
  blue edge per glyph (atlas alpha 0.5…0.8) and a per-letter facet glint. `kick()` samples a stride of indices around
  a point and launches letters; `stepField` integrates flying ones, lands them on `H`, respawns sky-fallers (`spawnSky`,
  z ≤ 18 so nothing appears beside the camera), and uploads only touched instances via `addUpdateRange`. Sparkles =
  1500 twinkle points on the surface; dust = 420 soft points drifting down near the camera. Sky = a sphere shader
  (three-stop gradient, fbm haze at the horizon, sun glow, aurora curtains, stars). Post = Bloom (threshold 0.96, so
  only glints and sparkles bloom) + Noise + Vignette; DepthOfField was tried and dropped (it softened the igloo).
  Fox/Chimin/igloo are `Piece`s with `solid` (depthWrite on, discard < 0.5) plus `tint`, `snow`, `fog`, and `sink`
  (igloo 0.1–0.14, fox 0.2); Chimin lies at `H+0.5` on a quaternion = surface normal + 0.5·toward-camera, ~520 letters
  are heaped on her rim and ~1400 in a drift against the igloo's base (`useEffect` after `buildField`).
- **v8.1, alive**: the glyph atlas is drawn in Caveat (`src/fonts/caveat-latin.woff2`, registered in tokens.css; redrawn when
  `document.fonts.load` resolves) with a grain pass over the alpha (`drawAtlas`), and the letter shader cuts at 0.38 with a
  softer blue edge. The paint material (`paint.ts`) is also a puppet: `uPivot/uRegion/uAngle[BONES=6]` warp the plane's
  vertices (a 48² plane when `bones` is given) by rotating each limb about its pivot (v13.1: a limb is a capsule
  `pivot → tip`, radius as a fraction of the width, weight 1 all the way past the tip so mittens, boots and paws come
  along, fading in over `blend` at the joint and 0.6× thinner there; before it was a soft ellipse whose rim stayed still); `uBreath` swells the
  picture; `uEye`+`uBlink` draw fur over an eye. `Piece` takes `bones`, `pose` (a ref `{angles, breath, blink}` read every
  frame), `eye`, plus `frost`, `grain`, `glisten`, `light`. Rigs are in `Letters.tsx`: `CHIMIN_BONES` (head, arms, legs; the
  picture is 1086×1432) and `FOX_BONES` (head, tail, front legs, back legs; 1505×995), `CHIMIN_TIPS` = mitten/boot uv per
  bone. Per frame: the fox nods, swings its tail, strides when moving (±0.32 rad on the gait), breathes and blinks every
  2.5–6.5 s; Chimin breathes and turns her head, and while hovered (`chiminHover`) `angel.on` eases to 1, her arms sweep
  ±0.5 rad and legs ±0.28 in a 3.4 rad/s cycle, and her mittens and boots (transformed by the bone angle and
  `chiminGrp.localToWorld`) `kick` the letters. The fox never comes within `KEEP_CHIMIN` (3.7) of her: both its target and
  its step are deflected round that circle like round the igloo. The snow shaders take `uCursor/uCursorOn`: within 2.6 of
  the cursor the mound brightens and glitters more, and the letters lift (vertex shader) and shimmer. Igloo pieces get
  `glisten={1}`: fine hashed dots on the bright parts twinkle in turn and a slow light sweeps across. Debug: `window.__snow`
  exposes the fox state, both poses, `angel`, `dbg.noRig`, the cursor and gsap (headless probes call
  `gsap.ticker.lagSmoothing(0)`, because at SwiftShader's 1 fps gsap's lag smoothing makes every reveal crawl).
- The old three.js Snowfield (v5.4–5.5) is in git history if needed. Ground = a 2048 canvas of ~30k letters
  as a repeating texture (5.5×) + one non-repeating drift overlay; sparkles = `Points` with a twinkle
  shader (additive); igloo = one `InstancedMesh` of boxes on a sphere + tunnel, a joint sphere, a dark
  mouth, a blob shadow, `scale.y .86`; fox = capsules/spheres, `stepFox` moves it toward the cursor's
  ground point (raycast on a plane), keeps it outside `R+1.3`, steers around the wall, gait/sit poses;
  Chimin = a parka figure lying on a "snow angel" blob. Click igloo / Enter / "go inside" → GSAP moves
  `camera.position` and a `look` vector to the door and in, `.snow__dark` fades, `onEnter` → Room sets
  `arrived`, assembles from a clump. `.outside` in the room clears the flag. DPR ≤ 1.5, pauses when hidden,
  disposes on unmount. three is a separate chunk (~170KB gzip) loaded only outside.
- **Stand-in art, room register** (`tools/render.py`): `box/lathe/ellipsoid/cylinder/tube` build meshes;
  `Camera` + `rasterise` give colour/normal/depth buffers (perspective-correct depth, near-plane cull);
  `shade` is Lambert key + sky fill + a little specular, warm in light and cool in shade; `paint` adds a
  soft wash, grain, darker rims, an ink line from depth/normal edges, and the projected ground shadow.
  `sprite()` frames each object so its own width is N CSS px at 2x and prints the CSS width/margin
  (pad 11px). The wall, floor and entrance share `room_camera()`; the rug is placed by unprojecting the
  rug's screen position onto the floor; the window is cut per pixel at (720,201) r100. The exterior
  (arrival shot) is the same dome from above with a tunnel. Slot sizing is the "real art in the slots"
  block at the end of `base.css`.
- **Stand-in art, postcard register** (`tools/collage.py`): torn paper, washi, off-register sheets, grain.
- **Light** is `.light` inside `.room__world`: `.light__tint` (multiply), `.light__wash` (screen), the beam
  (an SVG polygon with an feGaussianBlur, gradient stops from `--beam-a/--beam-b`), `.light__pool` and
  `.light__lamp` (screen radials). Everything is chosen per mode in CSS (`:root[data-mode] .light…`);
  `.room--shut` (window shutter, `shut` state in Room) turns the beam, pool and wash off and swaps the tint.
- **Outside by mode**: `LOOKS` in Snowfield.tsx (ground tint, sky, horizon/fog, lights, glow, sparkle gain,
  aurora) eased every frame in `applyLook`; the igloo's `lamp` PointLight, joint emissive, door `mouthMat` and
  `spill` plane are the night glow. `renderer.transmissionResolutionScale = 0.5` keeps the translucent blocks cheap.

## 4. Verified (headless Chromium against `vite preview`)

Arrival plays and clears (skipped on reload in the same session); every art file loads; 61 fps at rest; no console errors. Room renders; parallax moves layers at different rates; a string card → dolly + pulled card; turn over; a piece drags and the
new position persists across reload; camera → photos; notebook → sticker given to an essay; vase
stem in; fox wakes and the fish cursor appears in its zone; window click → night; mobile taps.
Console: clean (art exists for every slot now). The verify scripts lived in the session scratchpad (verify6.cjs was the last); rewrite from this list if needed.

## 5. Known gaps and follow-ups

1. **Stand-in art only.** The painted room is a sketch of the register so it can be judged with volume
   and light on; Chimin generates the real art per the brief and drops files in by name. Known weak
   stand-ins (room): the sleeping fox (reads as a curled shape, not quite a fox), the loose flower stems (thin),
   the day sky's clouds.
1b. The paper pieces are stand-ins from `tools/paper.py` (posterised CC0 cut-outs, drawn shapes). Chimin's
   generated art replaces them by name in `public/art/paper/`. The fox side view and Chimin are drawn
   shapes: charming, not finished. Only the outside is in the diorama language; the room inside is still
   the v5 painted-volume build and must be rebuilt in the same language (a table close up, few objects).
1c. Headless screenshots are unreliable (frames captured mid-render, SwiftShader fps is meaningless for 82k instances); judge in a browser.
1d. Letter snow to tune with Chimin: mound shapes, density per layer, letter size, kick strength, sky-fall rate. Real-GPU performance is unmeasured (SwiftShader reads 1 fps regardless); if a laptop struggles, lower N first, then the sparkle/dust counts.
1u. **v15, the letters as grains on the GPU** (`src/snow/grains.ts`, `createGrains`). Every letter (N 380000, phone
   120000; `?grains=N` in the URL overrides, for probes) lives in three float textures (position + state, velocity +
   landing time, quaternion) stepped by `GPUComputationRenderer` (part of three, no new dependency). States: 0 at rest
   (lies on the ground, face settles to the ground's normal + its own yaw/tilt), 1 flying (gravity, tumble, lands),
   2 falling from the sky (drifts, respawns; stays if it lands in a hole). The ground = baked terrain height (640×480
   float over x −40..40, z −36..24) + pile − trail·0.5. The **pile** is (density − density0) · `PILE_K` 0.02, where the
   density is the rest letters rendered as 1-px points into a 160×120 half-float target every frame and density0 the same
   at the start: take letters away and the ground drops, land them and it rises. Letters on a pile slope past `uRepose`
   0.5 hop downhill (`uSlide`). Kicks are a per-frame list (up to 8: centre, radius, strength, `frac` = share of the
   letters inside that go, push, radial share); a landed letter waits `uCool` 0.3 s. The scene calls `grains.kick`
   (cursor wake and dig, fox steps and leap landing, the angel's tips) and `grains.step(dt, t)`; the mound follows the
   pile too (`uDensity/uDensity0/uHBox/uPileK` in `snowUniforms`). The drawn letters are one instanced quad per grain
   placed from the textures (`aRef`), with the shared `LETTER_FRAG`. The CPU field (`buildField`/`stepField`) remains only
   for the static window view. Probes: `grains.readStates()`, `readPile(x,z)`, `readCell(x,z,r)` read the GPU back.
   Verified headless at 40k grains: a kick launches ~65% of the letters inside it, they land, and the density cell they
   left reads one grain lower; the full count is untested on a real GPU (this container has none).
1t. **v14, the ground built of letters.** Every letter is on the surface now (no under/deep layers), sized 0.3–1.05
   so they tile it, 70% flagged white, tilt ±0.35; the mound is solid (`uAlpha` 1) and darkened by `uGap` 0.6 so it is
   only the shadowed gaps between letters, fading back to plain snow past the letter field (z < −26, |x| > 30: the far
   hills). The letters carry the light and the sparkle; the mound still carries the raycast, the door pool and the prints.
   v14.1: the letters are a heap of four layers (0.24 apart, the lower ones tinted down 10% a layer, white flags only
   on the top two) and the painted mound is dropped 0.8 under them inside the field (`uPile`, `vIn`; darkened by `uGap`
   0.72) as the heap's shadowed floor, seen only through gaps; an unseen copy at the true height (`pickMat`) takes the ray.
1s. **v13.5, sweeps that bring the snow back; letters grounded.** The wake now carries letters along the sweep
   (`kick` takes `radial` 0.25 and a push along the motion; strength 1.6+0.4·sp, push 1.4+0.6·sp, so flights are ~0.4–2
   units) instead of blowing them out; a landed letter is not kicked again for `COOL` 0.3 s (`field.landed`, `field.time`),
   so one sweep moves a letter one hop rather than herding it to the end of the sweep, and the sweep back returns it.
   `slide()` samples surface letters near the cursor and the fox and hops them downhill where the surface map is steeper
   than 0.3, so a heap pours into a hole and swept-aside snow returns. `launch()` is the shared "one letter flies" step.
   Letters lie 0.005–0.055 above the surface again (the 0.16 lift read as floating), the white surface letters keep 55%
   of the snow's shading, and the cursor ring lift is halved. `sim-sweep.cjs` in the scratchpad models this at 60 fps.
   v13.5.1: a pressed drag cuts a trench (dig rate 8/s, radius 1.6; ~1.7 in one pass, wider each pass) and the fast
   refill starts only past `FILL_FROM` 1.2 (`FILL` 0.4), so a trench settles to ~1.2 in seconds and then lasts.
1r. **v13.4, snow that slides and fills, white letters on top.** `slump()` runs an angle-of-repose flow over the whole
   map (one row in six each frame, flow scaled to match; `REPOSE` 0.08 per texel, `SLIDE` 10): steep walls pour in, a
   heap slumps. `settleTrail` also fills anything deeper than a print (`FILL_FROM` 0.7) fast and faster the deeper
   (`FILL` 0.5, quadratic), so a hole you stop digging is a shallow dip within seconds while paw prints keep their τ 70 s.
   `GRAIN` 0.03; pressed-still dig 1.2/s. `tools`: `sim-trail.cjs` in the scratchpad was the 60 fps model used to tune
   these (not in the repo). Surface letters: 60% flagged 1.08 (white, lifted to the snow's white, glint × 2.4, twinkle),
   heights up to 0.16 above the surface; mound alpha 0.58, its glitter 0.15×, a fine crust in its normal.
1q. **v13.3, snow that adds up.** The surface map is signed and additive: −1 (heaped) to 2 (dug), stored as
   (v + 1) · 85, shaders read `.r * 3.0 - 1.0` (so an untouched map must be filled with 85; `makeSnowView` gets one).
   `stamp` still max-blends (prints); `heap(t, x, z, r, amount)` adds (positive digs, negative heaps). The cursor uses
   `heap` at a rate × dt (1.7/s moving, 4.5/s pressed, 0.35/s still, 1.6/s still and pressed), so passes wear a track
   deeper. Letters carry snow (`GRAIN` 0.05): `kick` digs where a letter left, `stepField` heaps where it lands (a faller
   0.3× that), so flicked snow piles up and can be flicked back into a hole; `field.trail` links the two. Settle τ 70 s.
   The sparkle and dust point clouds are gone: N 180000 (phone 70000), NF 2400 (900); the letters' facet glint twinkles
   (`tw`), the mound's glitter is 0.4× and its alpha 0.66, so the glisten and the snowfall are the letters.
1p. **v13.2, digging, the lit doorway, a slower fox.** The trail map now holds 0–2 (bytes at half scale, the shaders
   read `.r * 2.0`): prints stay under 1, a dug hole goes past it (sink = trail × `uTrailDepth` 0.5, so up to 1 unit).
   The cursor digs: held still it deepens (`dig` ref, 0.35/s to 1.3; pressed 1.6/s to 2.0) and throws letters out
   (`kick`) every 0.12 s (0.06 s pressed); moving, the wake is bigger and pressed it drags a trench (depth 1.5). Pointer
   down/up on the canvas sets `pressing` unless the igloo is hovered (`hoverRef`, kept by the scene's `setHover`
   wrapper). The arch picture's doorway is painted opaque dark, so `DoorFill` lays light over it: `doorMask()` builds a
   mask from the arch image (opaque and dark = the opening), `doorMaterial()` draws a lamp low inside, light moving on
   the walls, glints, alpha fading toward the crown, `uSill` clips it below the snow in front; no depth test, at z 3.95
   over the arch at 3.9. One `flick` (four sines) drives the door fill, the additive halo and `uDoorGlow` on the snow.
   Fox: top speed 4.0 (was 5.5), leap speed 4, leap time exit/4.5, gallop from speed 2.4.
1o. **v13, Chimin's own drawing** (`chimin.webp`, 1086×1259 after the crop; cut out with rembg + matting, defringe,
   restyle `--rim 4 --smooth 3`, then a fleck pass that drops saturated matting flecks at the edge). `CHIMIN_ASPECT`
   1259/1086; `CHIMIN_BONES` re-placed (neck pivot 0.5,0.78 with the hair in the head region; shoulders 0.38/0.63 at
   0.75; hips 0.45/0.56 at 0.5); `CHIMIN_BODY` 19 points (a second head point for the spilled hair). v13.1: the rig
   became capsules (see `paint.ts` above) because her mittens and boots sat outside the old ellipses and stayed still
   while the upper limb turned: arms reach the mitten tips 0.07/0.94 at 0.83 (radius 0.1), legs the boots 0.15/0.86 at
   0.08 (radius 0.13, blend 0.08), head tip 0.52,0.96 (radius 0.17). `FOX_BONES` converted the same way. The prompt for
   the drawing is in PROMPTS.md (pale-yellow puffer, saggy beanie, tan gloves, navy jeans, off-white boots, side part).
1n. **v12.2, one fox**: the six-picture switching read as several animals, so the fox is one drawing again: the side
   view, rigged, turned toward its heading up to ±0.7 rad; the leap picture only while airborne (quick fade), the
   sleeping picture only after it has stopped (slow fade). `fox-run`, `fox-front`, `fox-back` stay in `public/art/paper`
   but are not mounted. The gallop is the walk with a faster stride and a higher bob. Facing from the lateral component
   with a dead band, frozen mid-leap.
1m. **v12, the fox in six pictures** (Chimin's: `fox-side`, `fox-run`, `fox-leap`, `fox-front`, `fox-back`, plus the
   earlier `fox-sit`; they arrived with a baked checkerboard, cut out with rembg u2net + alpha matting, then defringe +
   restyle `--rim 4 --smooth 3`). All six are `Piece`s in the fox group with `control` refs in `views`; `viewState`
   {cur, want, since} picks one per frame: sit when idle > 3.5 s, leap during the flight, front when the heading is
   within 0.6 rad of the camera direction, back when beyond 2.55 rad, run above speed 3.6, else side; a switch waits
   0.18 s of scene time (0 for the leap) then cross-dissolves (0.22 s leap, 1.1 s sit, 0.35 s otherwise). Front/back
   billboard straight at the camera; the side pictures keep the ±0.8 rad turn. `FOX_BONES` re-placed for the new side
   picture (legs at uv x 0.86/0.72/0.56/0.40, pivots y 0.38; eye 0.9,0.72); `FOX_RUN_BONES` rig the gallop picture's
   pairs (bones 2 and 4). Debug: `__snow.views`, `__snow.viewState`, `__snow.clock()`. Headless renders here run at a
   frame every few seconds, so a view switch needs ~15–45 s of wall time in a probe.
   v12.1: the switch is an opacity crossfade (`PieceControl.fade`, the fox pieces are transparent, not solid) with
   enter/leave hysteresis (front < 0.5 in, > 0.85 out; back > 2.65 in, < 2.3 out; run > 4.3 in, < 3.0 out), a hold
   of 0.3 s on the wanted view and a dwell of 0.8 s in the current one (the leap is immediate); the gallop picture's
   legs are not rigged (head and tail only) and it bounds higher; facing comes from the lateral component of the
   heading against the camera's right (±0.25 dead band) and never changes mid-leap or in the front/back views; the
   side turn is ±0.45 rad. `Piece` leaves `uOpacity` alone when a `control` is given.
1l. **v11, the outside tuned**: terrain = 19 mounds (two negative hollows, tall steep ones at the sides and far) + four
   octaves of value noise (2.0 / 0.8 / 0.3 / 0.1). Fox rig = six bones: head, tail, four legs on their own bones (the
   picture shows all four); gait = a diagonal trot (near-front with far-back) that blends to a gallop (front pair, back
   pair 1.1 rad behind) above speed 3.2, amplitude 0.42→0.64. Leap = crouch (16 % of the time, squash), spring (back
   legs drive back, front legs fold), flight (all four stretched, a little stretch), landing (front legs reach down,
   back legs tuck), body nose-up→level→nose-down; if `fox-leap.webp` exists (`useArt`) it cross-dissolves in for the
   flight. Cursor: `kick()` takes a push vector; moving = a wide kick (r 2.4, 60–130 letters, thrown along the motion)
   plus a bow wave ahead and a furrow (two stamps r 1.15 / 0.9); at rest a stir every 0.12 s (6 letters hop) and a slow
   press; the shaders' ring is r 4.2 with a ripple (sin(dist·2.6 − t·3.2)) lifting the letters and lighting the ground.
   Chimin: `CHIMIN_BODY` (18 points: head, torso, arms, legs, with bone index and radius) is stamped every frame so her
   bed never fades, limbs deeper and wider while the angel plays; mittens/boots kick on the sweep.
1k. **v10, the inside as Chimin specified** (`Inside.tsx` rewritten again, `sheets/room.tsx` new): stops = the coats
   (pos −3.2,2.9,9.4 looking at the left wall), the bed (looking right), the window (0,3.7,5.6 → the window whole). Pieces
   on the left wall are rotated `onLeft` (y +π/2) at x ≥ WALL_L+0.2 (the wall plate's relief reaches x −9.8; anything
   closer is buried). **Bag/laptop**: the laptop is a closed slab (base group `baseG` + `hinge` group, both pivoting at
   its bottom) standing in the bag; `bagHover` raises it 0.75; `opened === 'laptop'` flies it to `inFront(2.6, 0, −0.75)`
   at scale 1.4 and then lays the base down (rotation.x 1.35) and leans the screen (−0.22); the Projects sheet opens over
   it. **Pins**: `PINS` in bag units, groups `pinRefs`; hover scale 1.6 + glisten 2.2; `opened === 'pin:n'` flies it to
   `inFront(2.6, −0.6, 0.05)` at scale 3.8 and turns it; `DesignPanel` docks right (`Sheet dock="right"`), content from
   `content/design.json`. **Magazines**: `magazines` stack piece + one `magazine-<slug>` piece per essay (`ESSAYS` in
   `src/lib/essays.ts`), fan on hover (`fanOn`, 350 ms grace) to an arc above the table; click → `Magazine` (fetches
   `public/essays/<slug>.html`, splits `<p>` into ~640-char pages, CSS 3D leaves that turn on click / arrow keys; cover
   art `magazine-<slug>.webp`). **Vinyl**: `Vinyl` panel (`content/songs.json`, `src` empty until mp3s are dropped in
   `public/audio`), volume 0.9 at the bed, 0.28 elsewhere. **Window**: `CARDS` postcards lying on the chest (dissolve when
   the spread is open) → `PlacesSpread` (every place as a card flying in; pick → the `Postcard` with `bare` = no lines).
   Stand-in art from `tools/room-standins.py`; prompts for the real pieces in PROMPTS.md. The ceiling plane ends at the
   back wall (z −6.5) so it never shows through the window. Headless: `.inside__nav button:nth-child(n)` jumps stops.
1j. **v9, the inside** (`Inside.tsx`, rewritten): `STATIONS` (pos, look, name, hint) = the entry (0.6, 2.7, 11.4) →
   the table (0, 3.3, 6.2) → the window (0, 4.1, 1.6); `station` state in `Inside`, gsap-tweened `pos`/`look` in the
   scene (1.7 s), wheel (throttled 1.1 s, |deltaY| ≥ 30), arrow keys, and `.inside__nav`. Room: floor piece ×2 (z 0.2 and
   13.2), the wall (width 20, centre y 1.83, its hole at uv (0.503, 0.824) → `WIN` (0, 5.6, −6.6), r ≈ 1.7) plus the same
   plate as side walls at x ±10 and a plain ceiling plane at y 7.6 in the room colour. `makeSnowView()` (exported from
   Letters.tsx) is the world outside: sky sphere, a rect mound (x ±40, z −70…−8.5) and 22k letters (z −60…−9.5) at group
   y 2.4, ticking its own `LOOKS` easing; it must stay behind the wall (z < −6.6). Light: `LOOKS[mode]` → `tint`,
   `bg`, `shadow`, lamp A (the window, at WIN+0.3 z; ×0 when shut) and lamp B (the candle, flickering) via the paint
   material's `uLampA/uLampB` (position + strength, colour; falloff 1/(1+d²k)). Things: paints → About, camera → photos,
   sketchbook → writing, postcards → places, vase flowers toggle (localStorage `vase`), coffee/fox hover only, window
   click → shutter (`shutterY` 9.4 → WIN y, behind the wall). Sizes: TY 1.9 (table-front width 6.4 at y 1.085), chest
   width 4.8 (top 1.45), bench (`table`) width 3.0 (top 0.65). Debug: `window.__inside.gsap` (headless probes call
   `lagSmoothing(0)`).
1i. **v8.4**: the fox aims at the cursor held outside two keep-out circles (`keepOut`: igloo R+1.4 for the goal, R+1.0
   for the step; Chimin `KEEP_CHIMIN`), re-aims only when the cursor moves > 0.45, eases its speed (`F.speed`), stops at
   0.3, turns its heading smoothly, flips with hysteresis (|hx| > 0.2), and yaws its picture up to ±0.8 rad off the
   billboard toward the side perpendicular to its heading (a three-quarter view). After `idle > 3.5 s` it sits: the walking
   piece dissolves (`camCtl`), the sitting piece (`fox-sit`, `sitCtl`, started at uDissolve 1) paints in; reversed when called.
   Sky: `LOOKS.band/bandI` (a horizon belt toward the sun, strongest in evening), aurora curtains ×2 with rays, ground
   aurora wash 0.2; the snow's `uWhite` leans 16% toward the mid sky and `uShadow` 12% toward the zenith. Camera look
   y 3.0. Doorway: an additive sprite in the arch mouth (`doorMat`, faces the camera) + the pool plane, both breathing,
   0.28 opacity by day to ~0.8 at night. Scroll: `onWheel` on `.snow` accumulates deltaY; > 260 enters. Letters: N 128k
   (56k phones) in layers (surface / just under / deep, `i % 8`), the mound is translucent (`uAlpha` 0.74, transparent pass)
   so the deep layers show through; fallers are flagged by colour 1.2 and drawn bright. Chimin at H+0.68, tilt 0.42.
   The igloo base is a mound term ([0, 2.8, 4.2, 0.55]) with the drift letters lying on it.
   Next: the inside as Chimin describes it: paper 2.5D, entryway → middle → window, three stations, each close on its focal thing.
1h. **Prints and paper** (v8.3): `Trail` in `Letters.tsx` is a 512×384 pressure map over x −32…32, z −26…22 (a
   Float32 master + a Uint8 `DataTexture`, RedFormat). `stamp()` presses a soft disc (max blend), `settleTrail()` fades it
   (τ 45 s: the snow fills the prints back in) and uploads. Both snow shaders take `uTrail/uTrailBox/uTrailDepth` (0.5):
   the mound's vertices and every letter sink by trail×depth, `trailTilt()` tilts the shading normal from the map's
   gradient so a print has a lit far wall and a shadowed near wall, and the trough is mixed toward the shadow colour. Stamps:
   the fox's wading furrow (r 0.55) plus a paw print every half gait cycle (front/back, left/right in turn, r 0.27, 0.85),
   Chimin's sweeping arms and legs (tips r 0.62), and the cursor as it moves (r 0.6, 0.3). The mound raycast still uses the
   undisplaced geometry (the cursor lands a few cm off inside a print; harmless). `uDebug` on the mound material paints the
   trail as colour for probing; `window.__snow` also exposes `trail`, `stamp`, `moundMat`, `letterMat`, `field`, `gl`.
   Paper: `paperize()` in `SNOW_GLSL` lays handmade-paper fibre and tiny dark speckles over the snow and each letter, the
   wrap-lit tone is half posterised into flat patches, letters get a lighter cut rim inside a blue edge, and the day white
   is cream (`#f6f4f0`), to match Chimin's paper pieces.
1g. **Relief** (v8.2): every outside piece gets a height map inflated from its silhouette at load (`heightMap` in
   `Piece.tsx`: chamfer distance transform at 384 px wide, square-root profile, small blur, a `DataTexture` cached per
   image). The paint shader shades the form from it (`uRelief`: key light upper-left front, blue in the turn, a rim
   toward the sun, shadow at the base) and the vertex shader pushes the plane out by `uPuff` × height, so the pieces
   have volume and parallax. Chimin puff 0.28, fox 0.25, igloo plates 0.5/0.5/0.3 with relief 0.7. The current pictures
   were run through `tools/restyle.py` (Chimin `--rim 8 --body`, foxes `--rim 10`); new pictures: defringe → restyle.
   The snow angel now sweeps eight points along her arms and legs (`CHIMIN_TIPS`), mittens and boots hardest.
1f. Chimin is unsure the paper-cut style is right for the outside pieces; `docs/PROMPTS.md` has a painted prefix B to regenerate igloo/Chimin/fox. If she regenerates, re-run `tools/defringe.py` on the new files and re-check the bone regions (they are in picture uv and assume the current compositions).
1e. The inside is rebuilt (1j). Open: a real entry arch seen from inside (looking back), more to touch at the entry, the fox indoors could breathe/blink like the one outside, phones (the stations are framed for landscape).
2. Chimin's authored default postcard arrangements (replace `defaultPieces`) once pieces exist.
3. Work has no object in the room (it's listed in About). Decide: a laptop on the table or a shelf. The fridge is furniture now; it could carry Work.
3b. The 3D hero object (vase or bag) is planned for M2b with lazy three.js; not added yet.
3c. The evening/night light layers are CSS blends over the painted room; the objects themselves keep their
   daylight shading. If that reads wrong, render per-mode object sprites (render.py takes a light colour) and swap by mode.
4. Phones: the room scales to width and is small; a dedicated phone composition (objects stacked
   vertically) should follow once the art exists.
5. Copy is placeholder everywhere it says so.
6. The fox does not blink or walk (needs the walking frames from the brief).
7. `_placeholder/objects/` still holds the v4 desk cut-outs (unused); delete once nobody wants them back.

## 6. Deployment (see PRD §11)

- Merge to `main` to deploy. First deploy replaces the old site; `/essays/*` URLs keep working.
- One manual step, once: GitHub → Settings → Pages → Source = **GitHub Actions**.
- Preview without deploying: build with `--base=./` and publish `dist/` as a private artifact page.

## 7. Kickoff prompt for the next session

```
Read docs/HANDOFF.md, docs/PRD.md, docs/DESIGN.md (v5) and docs/ART-BRIEF.md.
Branch claude/new-session-kjcz7d has the igloo with the arrival shot and generated stand-in art.
If Chimin has supplied art, drop it into public/art/ by the brief's names (run tools/optimize-art.py)
and tune light, shadow and parallax to it (M2). If not, refine the stand-ins in tools/collage.py,
the fox and the postcard collage until they feel finished. Do not deploy; publish a preview.
```
