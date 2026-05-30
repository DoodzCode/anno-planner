# PixiJS Evaluation for an Anno 1800 Building Icon Renderer on GitHub Pages

> **Scope under review:** a small, statically-hosted HTML/JS/CSS tool that renders ~50–200 top-down building sprite icons from *Anno 1800*, with light interaction (hover, select, maybe pan/zoom). Priorities: simplicity, low bundle size, long-term maintainability.

## TL;DR

- **PixiJS v8** is healthy, MIT-licensed, on a monthly release cadence as of v8.10, and currently at **v8.18.x (April 2026)** [1][2][3]. It is technically capable for this use case but drags in a full WebGL renderer (commonly cited at **~120 KB gzipped / ~476 KB minified** from secondary sources [4] — I could not load Bundlephobia's primary numbers via web fetch to verify exactly, but every comparison cites PixiJS as materially smaller than Three.js and materially larger than Konva) that you will use almost none of for static building thumbnails.
- For ~50–200 static sprite icons with hover/click/zoom, **plain Canvas 2D (`drawImage`) is the more honest fit** — zero dependencies, a few dozen lines, and no migration risk on a long-lived static site [5][6].
- If you want a small library with an object model and built-in events but not WebGL overhead, **Konva.js** is a closer fit than PixiJS for this scope; it's built on Canvas 2D and ships with drag/drop and event handling out of the box [7][8].
- The real PixiJS pain points in community discussion cluster around (a) the **v7 → v8 rewrite churn** (texture model, Graphics API, async init, deprecated `Texture.from(url)`) [9][10], (b) **pixel-art scaling configuration** that bites people repeatedly [11][12], (c) **CORS / file:// loading** on static hosts [13][14], and (d) **iOS Safari WebGL context loss** [15][16].
- **Verdict: ❌ Don't start with PixiJS.** Use Canvas 2D `drawImage` (or Konva.js if you want events for free). Switch to PixiJS only if you later need WebGL effects, thousands of sprites, or rich filtering.

---

## PixiJS Overview

### Version, license, maintenance

PixiJS is MIT-licensed [3]. The latest stable release at time of writing is **v8.18.1 (April 14, 2026)**, with v8.18.0 fixing text width/word-wrap reporting and v8.17 adding an optimized `BlurFilter` and improved text renderer parity [1]. Starting with **v8.10.0 (mid-2025)** the project moved to a monthly release cadence [2]. The repository has activity from ~380 contributors and ongoing releases, so maintenance health is fine [2].

### Rendering model

PixiJS v8 defaults to **WebGL or WebGPU** rendering, with an **experimental Canvas renderer reintroduced in v8.16.0** for environments without WebGL/WebGPU support [1]. For a static GitHub Pages site this is mostly a non-issue — every modern browser supports WebGL — but the dependency on a GPU context is what creates the iOS Safari context-loss problems noted later [15].

### Minimum example

The official v8 sprite example, simplified to the smallest useful form (note that v8 requires `await app.init(...)` and `Texture.from` no longer accepts URLs — you must go through `Assets.load`) [10]:

```js
import { Application, Assets, Sprite } from 'pixi.js';

const app = new Application();
await app.init({ width: 640, height: 360 });
document.body.appendChild(app.canvas);

const texture = await Assets.load('/sprites/farm.png');
const sprite = new Sprite(texture);
app.stage.addChild(sprite);
```

Compare against the same job in vanilla Canvas 2D — no library, no async init, no extension imports [5][6]:

```js
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const img = new Image();
img.onload = () => ctx.drawImage(img, 0, 0);
img.src = '/sprites/farm.png';
```

---

## Size and Complexity

### Bundle size

Published figures for the full v8 single-package build are commonly cited at **~476 KB minified / ~120 KB gzipped** in third-party comparisons [4]. I was unable to verify these figures directly against Bundlephobia (its size page loads numbers via client-side JS that web fetch doesn't execute), so treat the exact KB as approximate. The qualitative ranking is consistent across every comparison I saw: Konva < PixiJS < Three.js [4][7][8]. PixiJS v8 reverted to a single-package structure (no more `@pixi/sprite`, `@pixi/app` sub-packages), and the maintainers' pitch is that tree-shaking is now better than v7 [10][17]. To get tree-shaking benefits in practice you need a bundler (Vite/Rollup/esbuild) — the **CDN UMD build is the full library**.

### API surface

PixiJS's API for sprite rendering alone is small (`Application`, `Assets`, `Sprite`, `Texture`, `Container`). But the surface a beginner is exposed to in the v8 docs is wide: `Container`, `Graphics`, `Mesh`, `ParticleContainer`, `Ticker`, `Filter`, `Shader`, `RenderTexture`, `Culler`, event modes (`static` / `dynamic` / `passive` / `auto`), `Assets` bundles and aliases, the new texture-source hierarchy (`ImageSource` / `CanvasSource` / `VideoSource` / `BufferSource` / `CompressedSource`), etc. [10]. For ~50–200 static sprite thumbnails, you will use a single-digit percentage of the surface.

### Build tooling and GitHub Pages

PixiJS **can** be used via a single CDN `<script>` tag with the UMD build and run directly off GitHub Pages [18]:

```html
<script src="https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js"></script>
<script>
  // PIXI global is available here
</script>
```

Two caveats worth flagging:

1. The PixiJS team explicitly says `pixijs.download` is **not for production** — use jsDelivr or unpkg, or self-host [18].
2. With the UMD build you lose tree-shaking entirely; you ship the whole library. To actually benefit from the v8 single-package tree-shaking story you need a real bundler in your dev workflow [10][17]. That contradicts the "plain static HTML/JS/CSS, no build server required at runtime" constraint — you'd be adding a build step.

### Asset loading

`Assets.load(url)` works fine over plain HTTP from a static host like GitHub Pages [19]. However, two recurring problems show up in issues and forum posts:

- **`file://` loading fails** during local development due to browser CORS rules — you need a local HTTP server (e.g., `python -m http.server`) to iterate [13][14].
- **Cross-origin image loading** (e.g., images served from a different domain than the page) requires the remote server to send `Access-Control-Allow-Origin` headers; PixiJS surfaces a CORS error otherwise, and there are long-running issues about this being confusing [13][14][20].

For an Anno 1800 icon tool where the sprites are checked into the same repo as the HTML, both of these are non-issues *as long as you don't open `index.html` via `file://`*.

---

## Fit for the Specific Use Case

### Top-down icon rendering

PixiJS is comfortably capable here — it's overkill, but not in a way that produces *worse* output. Sprite anchors, position, scale, rotation, tint, and z-ordering via `Container` children all work as expected [10][17].

### Pixel-art and HiDPI scaling

This is **the** recurring frustration for new PixiJS users with pixel-art sprites:

- The `scaleMode` must be set on the **texture/texture source**, not on the sprite. Many users set it on the sprite and find no effect [11].
- v8 deprecated the `SCALE_MODES.NEAREST` constant in favor of the string `'nearest'` — old tutorials will mislead you [10].
- Even with nearest-neighbor scaling, sprites at sub-pixel positions look blurry; you need `roundPixels` and pixel-aligned positioning [11][21].
- **Spritesheets must have ≥ 2 px padding between frames**, or texture filtering bleeds neighboring pixels into the rendered sprite at certain zoom levels [11][22].
- HiDPI/retina handling is done via the `resolution` option on `Application` or `AbstractRenderer.defaultOptions.resolution` (v8 removed the global `settings` object) [10].

None of this is fundamentally broken; it's just easy to get wrong and there's no shortage of GitHub Discussions threads from people who tried [11][12][21][22].

### Interaction

PixiJS v7 replaced the old InteractionManager with a federated event system. You set `sprite.eventMode = 'static'` (or `'dynamic'`) and `cursor = 'pointer'`, then attach `pointerdown` / `pointerover` / `pointerout` / `pointermove` listeners — pointer events are recommended for cross-device behavior [23]. For pan/zoom over a board of sprites, the community library `pixi-viewport` provides drag, pinch, mouse-wheel zoom, clamping, snap-to-zoom, etc. [24] — but that's another dependency for what could be ~30 lines of wheel-event math against Canvas 2D transforms.

### Performance for ~50–200 sprites

This is **far below** PixiJS's sweet spot. PixiJS's batched WebGL rendering benchmarks at 60 fps with 8 000 sprites in Chrome; Konva's Canvas 2D path renders the same scene at ~23 fps [7][8]. For 200 sprites, *both* are nowhere near the floor, and **plain Canvas 2D will also hit 60 fps trivially** for hundreds of static or lightly animated icons on any modern device [25].

---

## Stack Overflow & Reddit Pain Points

Common reported issues, with one representative link and a one-line takeaway each:

**1. v6 → v7 → v8 migration breakage.** The v8 rewrite removes `Texture.from(url)`, requires async `app.init()`, replaces the `Graphics` chain API (`beginFill` / `drawRect` / `endFill` → `.rect().fill()`), deletes `BaseTexture`, deletes `DisplayObject`, removes the global `settings` object, restricts children to `Container` subclasses only, and replaces `cacheAsBitmap` with `cacheAsTexture()` [10]. Users have filed bugs against the migration guide for *additional* breaking changes that aren't documented (e.g., missing `cullable` on `DisplayObject`, `Bounds.contains` → `Bounds.rectangle.contains`, missing `maxWidth` on text style) [9]. **Takeaway:** every major version has been a real rewrite, not a refactor.

**2. Texture loading and CORS.** Issues like `pixijs/pixijs#4043`, `#4056`, `#10845`, `#7552` repeatedly describe `crossOrigin` confusion, black canvases, and "render warning" messages — the resolution is almost always "configure your server, or run a real HTTP server locally" [13][14][20][26]. **Takeaway:** annoying during development if you open `index.html` via `file://`, but a non-issue when GitHub Pages serves the assets.

**3. Pixel-art blurriness.** Discussions #9249, #9603, #9807 and issue #6087 all surface variants of "I set NEAREST and it's still blurry" — the answer is usually `roundPixels`, integer scale factors, spritesheet padding, or scaleMode on the wrong object [11][12][21][22]. **Takeaway:** PixiJS does pixel-art correctly, but the configuration is non-obvious and the docs don't lead you to the right answer fast.

**4. TypeScript types.** v8 ships first-party types; v7 had a lot of friction. Open v8 issues (e.g., `#11173`, `#11594`) still report missing types on `init` options and incorrect inference on `_onRender` [27][28]. **Takeaway:** types are good but not 100% accurate at the edges; the 80% case is fine.

**5. Memory leaks and cleanup.** GPU resources need explicit cleanup — `texture.destroy(true)`, `container.destroy({ children: true, texture: true })`, and removing event listeners. Issues like `#10533`, `#8986`, `#6556` document leaks even after `Application.destroy()` in some scenarios [29][30][31]. **Takeaway:** for a tool that mounts once and stays put, this rarely bites; for SPAs that mount/unmount PixiJS apps it's a real concern.

**6. iOS Safari WebGL context loss.** Issue `#9676` documents Safari 17.0 specifically failing `isWebGLSupported()`; multiple reports note that lock/unlock or backgrounding Safari kills the context, and iOS limits the number of concurrent WebGL contexts (~16) [15][16][32]. **Takeaway:** you need a `webglcontextlost` handler if you care about mobile Safari behavior. Canvas 2D doesn't have this failure mode at all.

---

## Devil's Advocate Section

The honest case against PixiJS for **this** project:

**The whole library is ~120 KB gzipped to do what `ctx.drawImage` does in one line.** A static page of building thumbnails does not need a WebGL renderer, a scene graph, a particle container, a filter pipeline, a ticker, a federated event system, or a `Culler`. Every byte of PixiJS in this project is paying for capability you will never use. For an under-200-sprite icon grid, **the entire renderer fits in <40 lines of plain Canvas 2D** [5][6][25], and the resulting bundle is whatever your sprites weigh — no library at all.

**PixiJS has had a breaking-API rewrite every major version.** v5 split into sub-packages; v8 un-split them. v7 replaced the InteractionManager; v8 deleted `DisplayObject`, replaced the Graphics API, removed `Texture.from(url)`, removed `settings`, and made `app.init()` async [10]. Multiple GitHub issues document that **the v8 migration guide itself is incomplete** [9]. For a hobby/static tool you might leave alone for two years, "this version's tutorials don't work anymore" is a real failure mode. Plain Canvas 2D has not had a breaking change in over a decade and won't.

**You're depending on WebGL for a problem that doesn't need WebGL.** That gives you iOS Safari context-loss bugs you wouldn't otherwise have [15][16], adds a chance that the renderer fails to initialize on some user's exotic browser config, and forces you to think about texture lifetimes and GPU memory [29]. Canvas 2D has none of these failure modes.

**"PixiJS is fast" is not a virtue for 200 static sprites.** The PixiJS benchmark advantage shows up at 8 000+ moving sprites [7][8]. At ~200 mostly-static icons, **everything is fast enough** — Canvas 2D, Konva, raw `<img>` tags in CSS Grid, all of it. Choosing PixiJS for performance is solving a problem you don't have.

**The simpler alternatives are *almost insultingly simple* for an icon grid:**

- **Raw `<img>` + CSS Grid.** If you don't need pan/zoom, you don't even need a canvas. A CSS Grid of `<img>` tags gives you native browser image rendering, free `image-rendering: pixelated` for nearest-neighbor scaling, free CSS hover states, free accessibility (alt text, tab focus), free right-click "save image as", and a zero-byte runtime cost. This may genuinely be the right answer.
- **Plain Canvas 2D + `drawImage`.** ~30–50 lines. Hover detection is `pointermove` + a hit test against an array of `{x, y, w, h}`. Zoom is `ctx.setTransform(scale, 0, 0, scale, panX, panY)`. Pixel-art crispness is `ctx.imageSmoothingEnabled = false`. No texture lifecycle, no async init, no migration guide.
- **Konva.js.** If you specifically want an object model with built-in drag, click, hover, and a scene graph, Konva is the lighter-weight choice here. It's Canvas 2D under the hood (so it inherits the "no WebGL context loss" property) and ships a `Konva.Sprite` and event system with the right ergonomics for design-tool-style use cases — exactly what an interactive icon board is [7][8][33].

---

## Verdict

**❌ Don't use PixiJS for this project — at least, not as the starting point.**

For "render top-down building thumbnails from Anno 1800 on a static GitHub Pages site," the right starting point is:

1. **First choice — Plain Canvas 2D with `drawImage`.** Zero dependencies, ~30–50 lines, no migration risk, no WebGL context-loss risk on iOS Safari, trivially fast for 200 sprites [5][6][25]. Use `ctx.imageSmoothingEnabled = false` for crisp pixel-art scaling. Use `ctx.setTransform` for pan/zoom. Use a flat array of sprite rects for hit testing on `pointermove` / `pointerdown`.
2. **Second choice — Konva.js**, if and only if you discover you want a scene-graph object model with built-in drag/click/hover and don't want to write the event plumbing yourself. CDN script tag works on GitHub Pages [33]. Smaller and friendlier than PixiJS for this scope; Canvas 2D under the hood so no WebGL pitfalls [7][8].
3. **Even simpler — `<img>` + CSS Grid**, if interactivity reduces to "show all the buildings; hover highlights one." This is genuinely fine and you should not be embarrassed by it.

### When PixiJS *would* become the right tool

Switch to (or start with) PixiJS if the project scope grows to include any of:

- **Hundreds to thousands** of sprites visible and animated simultaneously (e.g., a live battle map, particle effects, animated water).
- **Real-time filters or shaders** (bloom, color grading, displacement, custom WGSL/GLSL).
- **A spritesheet/atlas-heavy pipeline** with frame-based animation, where Pixi's `Spritesheet` + `Assets` ergonomics earn their keep [10][19].
- **A real bundler is already in the project**, so the tree-shaken footprint is closer to what you actually use [10][17].
- **You want WebGPU**, where PixiJS v8 is one of the few mature 2D libraries that offers it [10].

If none of those apply, the Anno 1800 icon project is well-served by ~50 lines of Canvas 2D and never thinking about a v9 migration.

---

## Sources

1. [PixiJS Releases (GitHub)](https://github.com/pixijs/pixijs/releases) — v8.16, v8.17, v8.18 release notes.
2. [PixiJS Update – v8.10.0 (monthly cadence announcement)](https://pixijs.com/blog/8.10.0)
3. [pixi.js on npm](https://www.npmjs.com/package/pixi.js) — license, versions.
4. [PkgPulse — Fabric.js vs Konva vs PixiJS 2026](https://www.pkgpulse.com/guides/fabricjs-vs-konva-vs-pixijs-canvas-2d-graphics-2026) — bundle size and weekly download figures (Feb 2026 data).
5. [MDN — CanvasRenderingContext2D.drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
6. [Jim Fisher — How to draw sprites on an HTML canvas](https://jameshfisher.com/2018/12/29/how-to-draw-sprites-on-an-html-canvas/)
7. [Konva.js documentation home](https://konvajs.org/docs/index.html)
8. [slaylines/canvas-engines-comparison (GitHub)](https://github.com/slaylines/canvas-engines-comparison) — PixiJS vs Konva vs others perf benchmark.
9. [pixijs/pixijs#10311 — v8 migration guide missing key info](https://github.com/pixijs/pixijs/issues/10311)
10. [PixiJS v8 Migration Guide](https://pixijs.com/8.x/guides/migrations/v8) — single-package structure, async init, texture model, Graphics API, deprecations.
11. [pixijs/pixijs Discussion #9249 — Get rid of blurriness on image sprite](https://github.com/pixijs/pixijs/discussions/9249)
12. [pixijs/pixijs Discussion #9603 — Scaling down images quality](https://github.com/pixijs/pixijs/discussions/9603)
13. [pixijs/pixijs#7552 — PIXI JS CORS on Local](https://github.com/pixijs/pixijs/issues/7552)
14. [pixijs/pixijs#10845 — Cross Origin Image Loading doesn't work](https://github.com/pixijs/pixijs/issues/10845)
15. [pixijs/pixijs#9676 — iOS Safari 17.0 WebGL context lost](https://github.com/pixijs/pixijs/issues/9676)
16. [Apple Developer Forums — WebGL context lost when backgrounding Safari](https://developer.apple.com/forums/thread/737042)
17. [PixiJS v8 Launches!](https://pixijs.com/blog/pixi-v8-launches) — v8 announcement and rationale.
18. [PixiJS Getting Started (v7 guide; CDN guidance still current)](https://pixijs.com/7.x/guides/basics/getting-started)
19. [PixiJS Assets guide (v8)](https://pixijs.com/8.x/guides/components/assets)
20. [pixijs/pixijs#4043 — CORS not working with PIXI.Sprite.fromImage](https://github.com/pixijs/pixijs/issues/4043)
21. [pixijs/pixijs#6087 — PIXI.SCALE_MODES.NEAREST causing pixel glitches](https://github.com/pixijs/pixijs/issues/6087)
22. [pixijs/pixijs#6676 — SCALE_MODES.NEAREST causes spaces between pixels of touching sprites](https://github.com/pixijs/pixijs/issues/6676)
23. [PixiJS v8 Events / Interaction guide](https://pixijs.com/8.x/guides/components/events)
24. [pixi-viewport on npm](https://www.npmjs.com/package/pixi-viewport)
25. [Hacker News thread — evaluated Konva vs Pixi vs native Canvas, chose native](https://news.ycombinator.com/item?id=43413691)
26. [pixijs/pixijs#4056 — An error about CORS of Image](https://github.com/pixijs/pixijs/issues/4056)
27. [pixijs/pixijs#11173 — Missing types/properties on v8 interfaces](https://github.com/pixijs/pixijs/issues/11173)
28. [pixijs/pixijs#11594 — Type mismatch in `_onRender`](https://github.com/pixijs/pixijs/issues/11594)
29. [pixijs/pixijs#10533 — Memory leak / inappropriate cleanup of renderGroup](https://github.com/pixijs/pixijs/issues/10533)
30. [pixijs/pixijs#8986 — Memory leak after destroy application](https://github.com/pixijs/pixijs/issues/8986)
31. [PixiJS v8 Garbage Collection guide](https://pixijs.com/8.x/guides/concepts/garbage-collection)
32. [pixijs/pixijs#8215 — Too many active WebGL contexts even after destroyed](https://github.com/pixijs/pixijs/issues/8215)
33. [konva on cdnjs](https://cdnjs.com/libraries/konva) — Konva via CDN script tag.
