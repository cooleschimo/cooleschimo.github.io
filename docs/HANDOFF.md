# Handoff notes — arctic sketchbook v2

Written 2026-09-17 at the end of the first planning session. Read this, then
`docs/PRD.md` and `docs/DESIGN.md`, before writing any code. Nothing has been
scaffolded yet; the repo still contains the old static site.

---

## 1. Status

- Branch: `claude/new-session-kjcz7d`
- Repo state: old site only (`index.html`, `index-old.html`, `essays/` with 11
  essay HTML pages, `essays/bayes/` with 2 PDFs). No package.json, no workflow.
- PRD kickoff steps 1 and 2 are done (package check, M1 structure). Step 3
  (build M1) is waiting on the decisions in §3.
- The first session could NOT open any of the reference sites in §5 because the
  cloud environment's network access was set to Trusted. See §6 to fix that.

## 2. Decisions Chimin has already approved

- Pin `react` and `react-dom` to **19.2.x** (currently 19.2.8). Reason:
  `@react-three/fiber` 9.7.0 declares peer `react >=19 <19.3`, so 19.3 fails
  peer resolution. Bump when R3F widens the range.
- **Drop `react-pageflip`.** Last published May 2022, no declared React peer,
  depends on an unpinned `page-flip@latest`. Build page turns with GSAP
  (rotateY on a split page), as PRD §2 already allows.
- Old site: move `essays/*.html`, `essays/essay.css` and `essays/bayes/*.pdf`
  into `public/essays/` so existing URLs keep working until M4 converts them to
  MDX. Delete `index.html` and `index-old.html` (they stay in git history).
- Vite project lives at the repo root (user site, `base: '/'`).
- After the first Actions deploy, Chimin must set GitHub Settings → Pages →
  Source to "GitHub Actions". Cannot be done from a session.

## 3. Decisions still open (ask Chimin, then build)

1. **Ink-to-colour as the site-wide grammar**, with an SVG-mask reveal
   replacing the WebGL ice-melt for M1. Everything starts as pencil/ink
   linework and gains watercolour on hover, focus or scroll-into-view.
   Keeps three.js out of the initial bundle. Upgrade to a shader in M6 only if
   the SVG version feels flat.
2. **Travel sketchbook: pin only the index map spread.** Place spreads scroll
   naturally as a loose stack of tilted, taped pages. Page flip becomes a
   hover/click affordance, not a scroll mechanic. Reason: 14 pinned spreads
   would be the scroll-jacking DESIGN.md forbids.
3. **Sun as the day/night toggle** (sits in the hero sky; click and it arcs
   below the horizon on a GSAP motion path while the moon rises) and
   **mini-map as a folded map corner** that unfolds on hover.
4. **Shantell Sans** as the placeholder handwriting font until the Calligraphr
   `chimin-hand.woff2` exists. It is variable with bounce and informality axes.
5. From the reference review (§5), proposed additions:
   - Three stroke-width tokens: heavy marker for hero-scale drawings and
     igloos, medium for frames, fine for dividers and map lines.
   - Work section as a **scatter** of different-sized ice blocks, not a grid
     (see the textjar screenshot in `docs/refs/`).
   - **Hold-to-reveal** on a place spread: press and hold the doodle and the
     real photo of the place fades in underneath (from davidwhyte.com).
   - The fox travels the whole page and does one small thing per section.
   - One draggable thing per section, no more.
   - Wet-paint cursor effect on real watercolours deferred to M6 (needs three).
   - A fixed type scale: handwriting 22/28/40/64, serif 17/19, mono 13.

## 4. Package verification (npm registry, 2026-09-17)

| Package | Latest | React 19 | Note |
|---|---|---|---|
| react / react-dom | 19.3.0 | — | pin to 19.2.8, see §2 |
| vite | 8.3.0 | — | rolldown-based |
| @vitejs/plugin-react | 6.1.1 | yes | |
| tailwindcss / @tailwindcss/vite | 4.3.3 | yes | |
| gsap | 3.15.0 | yes | DrawSVG, MorphSVG, SplitText confirmed in tarball |
| @gsap/react | 2.1.2 | yes | |
| lenis | 1.3.26 | yes | |
| motion | 13.4.0 | yes | |
| three | 0.186.0 | — | |
| @react-three/fiber | 9.7.0 | 19.0–19.2 only | 10.0 alpha has the same range |
| @react-three/drei | 10.7.8 | yes | needs fiber ^9 |
| roughjs | 4.6.6 | n/a | |
| rough-notation | 0.5.1 | n/a | 2022 but tiny and stable |
| perfect-freehand | 1.2.3 | n/a | |
| matter-js / @types | 0.20.0 / 0.20.2 | n/a | |
| d3-geo / topojson-client / world-atlas | 3.1.1 / 3.1.0 / 2.0.2 | n/a | |
| react-pageflip | 2.0.3 | not declared | dropped, see §2 |
| @mdx-js/rollup | 3.1.1 | n/a | targets rollup plugin API; verify under Vite 8 in M4 |
| @rive-app/react-canvas | 4.34.3 | yes | M6 only |
| wired-elements | 3.0.0-rc.6 | no | **do not add**: 2022, Lit 2, React wrapper pinned to React 17, shapes re-jitter on render. Build own rough.js primitives instead. |

## 5. Reference sites and inspiration

None of these could be fetched from the first session (proxy 403). What is
recorded below comes from Chimin's own notes, one screenshot, and third-party
write-ups. **Each one still needs a real teardown: fetch the HTML, CSS and JS
bundles and record how the effects are built.**

| Site | Chimin's note | What is known so far | To investigate |
|---|---|---|---|
| https://www.familiatipo.com/ | doodle art goes from black-and-white to colour on hover | Confirmed by Simplified's write-up (https://simplified.com/blog/design/10-ways-to-use-doodle-art-in-web-design). Reference image: https://siteimages.simplified.com/blog/Familia-Tipo-Art2-1.png | How the colour layer is masked/revealed; is it SVG, CSS filter, or image swap |
| https://textjar.app | screenshot in `docs/refs/textjar-app-mobile.png` | Thick marker linework, one jar motif repeated at varied sizes and tilts, scattered off-grid, small serif labels, warm paper, one solid button | Do the jars move or animate; how the scatter is laid out (absolute vs physics) |
| https://jackiezhang.co.za | "this person's site is amazing" | Scrapbook feel; scribble hover states in the menu; torn paper from hero travels into work on scroll; a "cutting board" where you drag images; bio photo you drag out from under the work (https://www.landing.love/sites/jackiezhang/, https://www.killerportfolio.com/by/jackie-zhang). Fonts Inter + JetBrains Mono, green/white | How the scribble hover is implemented; how the torn paper is scroll-linked; drag implementation |
| https://yashf.in | listed | nothing found | full teardown |
| https://jackiehu.design | listed | Typographic restraint, decorative symbols as punctuation (https://ilovecreatives.com/internet-gem-websites/jackie-hu-design) | full teardown |
| https://jesspaik.com | listed | "interactive case studies, desktop-optimised" | full teardown |
| https://taliahhh.com | listed | nothing found | full teardown |
| https://davidwhyte.com/experience/ | "has watercolor elements" | Real watercolours by painter Matthew Phinn; wet-paint distortion follows the cursor; long-press on a painting reveals video of the real place; WebGL + custom sound; by Immersive Garden (https://www.awwwards.com/case-study-david-whyte-experience-by-immersive-garden.html, https://immersive-g.com/projects/david-whyte-experience/) | The cursor distortion shader; how long-press is handled on touch; how paintings are loaded |
| https://www.sutera.ch | "cool 3D elements rotating" | Portfolio of Stella Mühlhaus by Okey Studio; WebGL, GSAP, Nuxt; blueprint-to-reality transition; Awwwards SOTD (https://www.awwwards.com/sites/sutera) | The blueprint-to-reality transition (same idea as ink-to-colour); decide if any 3D belongs in v2 |
| https://scottmilton.com | listed | Framer site; clean layouts carried by a type system (https://www.scottmilton.com/) | full teardown, mainly type scale |

Other references named in the PRD/DESIGN, not yet examined: React Bits
`FallingText`, `SplashCursor`, `ImageTrail`, `Ballpit` (reactbits.dev);
impeccable and taste-skill agent skills.

## 6. Network access for the next session

The reference sites are blocked under the default Trusted policy. To read
their source:

1. Open https://claude.ai/code in a phone or desktop browser (not the app).
2. Tap the cloud icon showing the environment name, in the row above the
   message box.
3. Open that environment's settings (gear icon) and set **Network access** to
   **Full**, or **Custom** with the list below and "Also include default list
   of common package managers" ticked.
4. Save and start a **new** session. Running sessions keep their old policy.

```
familiatipo.com
www.familiatipo.com
siteimages.simplified.com
textjar.app
jackiezhang.co.za
yashf.in
jackiehu.design
jesspaik.com
taliahhh.com
davidwhyte.com
*.davidwhyte.com
sutera.ch
www.sutera.ch
scottmilton.com
www.scottmilton.com
reactbits.dev
```

Sites on Webflow, Framer or Nuxt load scripts from other CDNs; if Custom
blocks one, add the host the error names.

## 7. Proposed M1 layout (approved in principle, build after §3 is answered)

```
/
  .github/workflows/deploy.yml     build + deploy to Pages
  index.html                       Vite entry
  vite.config.ts                   react, tailwind, base '/'
  content/projects.json            one project for M1 (NeuroScan)
  public/art/_placeholder/         name-signature.svg, fox-idle.svg, ice.png
  public/fonts/                    empty until chimin-hand.woff2 exists
  public/essays/                   old essays + PDFs, moved
  src/
    main.tsx, App.tsx
    styles/tokens.css              DESIGN.md colour tokens on :root[data-mode]
    styles/paper.css               grain overlay, base type, type scale
    lib/lenis.ts                   single Lenis instance driven by gsap.ticker
    lib/seed.ts                    seeded random so wobble is stable
    lib/motion-prefs.ts            prefers-reduced-motion hook
    primitives/RoughBox.tsx        rough.js frame with fixed seed
    primitives/RoughFocusRing.tsx
    primitives/Watercolor.tsx      SVG feTurbulence + displacement filter defs
    primitives/PaperGrain.tsx      fixed, pointer-events none
    sections/Hero.tsx              DrawSVG name, intro, snow, fox, scroll cue
    sections/Work.tsx              one ice block for M1
    work/IceBlock.tsx              DOM card; tap and reduced-motion paths
    work/InkReveal.tsx             SVG mask reveal (or MeltReveal.tsx if WebGL)
    world/Snow.tsx                 2D canvas flakes, capped on mobile
    world/Fox.tsx                  two-pose sprite swap, cursor tracking
    world/ScrollCue.tsx            wobbling doodled arrow
    shell/ModeToggle.tsx           sun/moon, localStorage
    shell/MiniMap.tsx              stub with hero and work landmarks
```

## 8. Content already in the repo to carry over (M4)

Essays in `essays/`: august, catullus, howardsend, hume, induction, lostfound,
salesman, selflove, smith, whitman. Bayes project PDFs in `essays/bayes/`.
PRD §9 still asks which essays go live in v1 and which 3 places get art first.

## 9. Suggested kickoff prompt for the next session

```
Read docs/HANDOFF.md, docs/PRD.md and docs/DESIGN.md.
1. If network access is open, fetch each site in HANDOFF §5 and write a
   per-site teardown into docs/refs/teardowns.md: what technique each effect
   uses and which to adopt.
2. Answer the open decisions in HANDOFF §3 with me.
3. Fold agreed changes into docs/PRD.md and docs/DESIGN.md.
4. Build M1 per HANDOFF §7 and deploy to GitHub Pages.
```
