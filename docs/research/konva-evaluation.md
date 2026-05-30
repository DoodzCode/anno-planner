# Konva.js — Deep Evaluation for a Static-Hosted Sprite Thumbnail Renderer

*Compiled May 16, 2026. Konva versions referenced: 10.2.x – 10.3.0 (latest on master). All capability claims are linked to primary sources; community claims have thread dates inline.*

---

## 1. Executive Verdict

**Recommend with caveats** for this project — Anno 1800 building thumbnails on static hosting, with future hover / drag / selection / grid snapping.

The fit is good because Konva's scene graph maps cleanly onto "N independently positioned, draggable, hit-tested sprites," and almost every interaction you've listed (hover, drag, selection, grid snap, zoom, pan) is in a first-party demo (see [demo index](https://konvajs.org/docs/sandbox.html)). It ships as a UMD bundle that loads via `<script>` from unpkg/cdnjs, which satisfies the GitHub Pages constraint without a build step ([README "Load via classical script tag"](https://github.com/konvajs/konva)). Konva is MIT-licensed, ~14.5k stars, last release v10.3.0 on April 30, 2026, only 17 open issues — maintenance signal is healthy ([releases](https://github.com/konvajs/konva/releases)).

The caveats: **bundle weight** (~55 kB min+gzip) is not free for a static site that may only render thumbnails; **single-maintainer bus factor** (Anton Lavrenov, who also runs the for-profit Polotno) is real; and **memory growth around `cache()` + image churn** is a recurring class of bug ([#1154](https://github.com/konvajs/konva/issues/1154), [#653](https://github.com/konvajs/konva/issues/653)).

**Top 3 reasons to pick Konva:** (1) cache + drawHitFromCache nails the thumbnail + pixel-accurate hover pattern; (2) drag/snap/transform are built in; (3) docs and demos cover this exact use case.

**Top 3 risks:** (1) you're paying for a 2D scene graph when CSS-grid + `<img>` may already suffice; (2) cache memory leaks on iOS Safari and during heavy image churn; (3) lock-in — JSON serialization is officially discouraged for non-trivial apps ([Best Practices](https://konvajs.org/docs/data_and_serialization/Best_Practices.html)).

---

## 2. Capability Map

| Capability | Status | Note | Source |
|---|---|---|---|
| Load PNG / WebP raster as sprite | ✅ | `Konva.Image.fromURL(url, cb)` or pass a loaded `HTMLImageElement` to `new Konva.Image({ image })`. WebP is just whatever the browser decodes. | [Image tutorial](https://konvajs.org/docs/shapes/Image.html), [API](https://konvajs.org/api/Konva.Image.html) |
| Cache / pre-render to offscreen canvas | ✅ | `node.cache()` rasterizes to an internal buffer; `clearCache()` releases it. Docs explicitly warn: don't cache simple shapes; every cached node creates several canvas buffers. | [Shape Caching](https://konvajs.org/docs/performance/Shape_Caching.html) |
| Layering / z-order | ✅ | Stage → Layer (each Layer is its own `<canvas>`) → Group → Shape. `moveToTop/Bottom`, `zIndex()`. Doc warns to keep layers to a minimum. | [Layer Management](https://konvajs.org/docs/performance/Layer_Management.html) |
| Per-pixel hit detection on irregular sprites | ✅ | Cache the image then `drawHitFromCache()` — transparent pixels become non-hit. `alphaThreshold` is configurable. Requires same-origin or CORS. | [Image Events](https://konvajs.org/docs/events/Image_Events.html) |
| Drag / drop, hover, click, selection | ✅ | `draggable: true`, plus full `click / tap / mouseover / mouseout / dragstart / dragend` event set. Events bubble through Group/Layer. | [Drag and Drop](https://konvajs.org/docs/drag_and_drop/Drag_and_Drop.html), [Binding Events](https://konvajs.org/docs/events/Binding_Events.html) |
| Grid snapping / transform handles | ✅ | `Konva.Transformer` for resize/rotate handles; snapping is hand-rolled inside `dragBoundFunc` or `dragmove` listener. Official "Objects Snapping" demo. | [Transformer](https://konvajs.org/api/Konva.Transformer.html), [Objects Snapping](https://konvajs.org/docs/sandbox/Objects_Snapping.html) |
| Zoom & pan of stage | ✅ | `stage.scale()`, `stage.position()`, `draggable: true` on Stage. First-party zoom-to-pointer demo. | [Zooming Relative To Pointer](https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html) |
| High-DPI / retina | ✅ | Auto-detects `devicePixelRatio`. Overridable via `Konva.pixelRatio = 1` for perf. | [Konva.pixelRatio](https://konvajs.org/api/Konva.html#static-pixelratio) |
| Touch / mobile gestures | ⚠️ | Basic `touchstart/move/end` and `tap/dbltap` are built in. **Multi-touch gestures (pinch/rotate) are not** — you wire them up from raw `e.evt.touches`. Konva's own pinch-zoom demo requires `Konva.hitOnDragEnabled = true` as a workaround. | [Multi-touch Scale Stage](https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html), [issue #1096 (Sep 2022)](https://github.com/konvajs/konva/issues/1096) |
| SVG support | ⚠️ | No first-class SVG parser. `Konva.Path` takes SVG path `d` strings. To render a full SVG document, you rasterize it into an `Image` first. | [SVG on Canvas demo](https://konvajs.org/docs/sandbox/SVG_On_Canvas.html), [Konva.Path](https://konvajs.org/api/Konva.Path.html) |
| Filters (tint, brightness, etc.) on sprites | ✅ | `Konva.Filters.Brighten`, `RGB`, `Grayscale`, `Blur`, `Pixelate`, `Invert`, `Noise`, `Posterize`, `Solarize`, `Sepia`. Filters require the node to be cached first. | [Filters category](https://konvajs.org/docs/filters/Blur.html), [Konva.Filters](https://konvajs.org/api/Konva.Filters.html) |
| Animation / tweening | ✅ | `Konva.Animation` (requestAnimationFrame loop) and `Konva.Tween` (eased property tweens). | [Animations](https://konvajs.org/docs/animations/Create_an_Animation.html), [Tween API](https://konvajs.org/api/Konva.Tween.html) |
| Serialize to/from JSON | ⚠️ | `stage.toJSON()` + `Konva.Node.create(json)` exist, but the docs themselves say this approach is "very hard to use in bigger apps" — image references and event handlers are not serialized; you must reattach them. | [Best Practices](https://konvajs.org/docs/data_and_serialization/Best_Practices.html), [Serialize_a_Stage](https://konvajs.org/docs/data_and_serialization/Serialize_a_Stage.html) |
| SSR / hydration | N/A | Vanilla `<script>` use; no SSR concern. (Node.js rendering exists via `canvas`/`skia-canvas` but is not relevant here.) | [Node.js setup](https://konvajs.org/docs/nodejs/nodejs-setup) |

---

## 3. Fit for the Specific Use Case

**Is Konva overkill for "render N static thumbnails"?** Yes, if "static" is literal — a CSS grid of `<img>` tags at native sizes is ~0 kB of JS and uses the browser's image cache. Konva pays its ~55 kB only when you need the canvas-side behaviors: per-pixel hit testing on irregular outlines, drag with collision/snapping, freely positioning sprites in scene-graph coordinates that don't line up with DOM layout, applying tint/grayscale filters, zoom-to-pointer over the whole field. For "dozens to a few hundred thumbnails" the rendering cost is negligible either way — the question is whether you'll need the interactive behaviors.

**Where Konva starts to earn its weight:**

- The moment you want pixel-accurate hover on a non-rectangular building footprint, `cache() + drawHitFromCache()` is two lines instead of a manual offscreen-canvas + `getImageData` lookup.
- The moment you want drag-and-drop with snapping to a building grid, `draggable: true` + `dragBoundFunc` is two callbacks vs. tracking pointer + transform yourself.
- The moment you want to zoom/pan the field, `stage.scale()` + a wheel listener is ~20 lines (their demo) vs. a CSS-transform approach that fights with `<img>` scaling on retina.

**Concrete pattern for many sprite thumbnails (efficient):**

1. **One Layer for static thumbnails, a second for the actively dragged item.** Per Konva's own drag perf tip: `shape.moveTo(dragLayer)` on `dragstart`, `moveTo(mainLayer)` on `dragend`, so only the lightweight drag layer redraws each pointer move ([Layer Management](https://konvajs.org/docs/performance/Layer_Management.html)).
2. **Preload images once, then `node.cache()` each `Konva.Image` after `image.onload`.** Cached nodes redraw as a single bitmap blit — Konva's own copy claims ~4× speedup for repeated draws of complex shapes ([Shape Caching](https://konvajs.org/docs/performance/Shape_Caching.html)).
3. **`listening(false)` on anything that doesn't need pointer events** (background tiles, decorative overlays). Each listening node has a hit-graph cost ([Listening False](https://konvajs.org/docs/performance/Listening_False.html)).
4. **`perfectDrawEnabled(false)` on shapes with fill + stroke + opacity** to skip an internal offscreen compositing pass ([Disable Perfect Draw](https://konvajs.org/docs/performance/Disable_Perfect_Draw.html)).
5. **Avoid `FastLayer`.** It was deprecated in v7.0.0 in favor of `new Konva.Layer({ listening: false })` — same perf, fewer surprises ([FastLayer API page is tagged DEPRECATED](https://konvajs.org/api/Konva.FastLayer.html)).
6. **Set `Konva.pixelRatio = 1` only if profiling shows retina is the bottleneck.** It will visibly soften thumbnails on retina.

For a few hundred thumbnails this never approaches Konva's stress-test ceiling (their demos go to 10,000 shapes with tooltips and 20,000 nodes; both keep interactive FPS — see [20,000 Nodes](https://konvajs.org/docs/sandbox/20000_Nodes.html)).

---

## 4. Devil's Advocate Section

### Bundle size

Konva is heavier than it looks for a static thumbnail viewer. The package's most recently cited size on Bundlephobia is **~54.9 kB min+gzip** for v10.0.2 (per cached search snippet of [bundlephobia.com/package/konva](https://bundlephobia.com/package/konva); v10.3.0 figure was not directly retrievable at audit time — flag this and re-check before shipping). For comparison, an entire vanilla `<img>` grid is 0 kB. Konva ships everything: every filter, every shape, the animation system, the tween system, the transformer. There is a "minimal bundle" path (`import Konva from 'konva/lib/Core'`) that excludes shapes/filters until you import them — but **that path requires a bundler**, which contradicts the "plain `<script>` tag must remain viable" constraint ([README "3 Minimal bundle"](https://github.com/konvajs/konva#3-minimal-bundle)).

### Abstraction tax — what does 50 lines of vanilla Canvas 2D miss?

For "draw N images at positions" — almost nothing. `ctx.drawImage(img, x, y, w, h)` in a loop is 5 lines. What Konva gives you on top:

- A node identity per sprite (so you can mutate position/scale, not redraw imperatively).
- Hit testing (vanilla canvas has none — you'd maintain bounding boxes and write `isPointInPath` yourself for irregular shapes).
- Event dispatch with bubbling through groups.
- Drag mechanics (pointer capture, dragstart/move/end accounting, drag bounds).
- Per-layer caching and `requestAnimationFrame` batching (`batchDraw`).
- A transform/rotate UI gizmo (`Konva.Transformer`).

If you implemented those yourself, you'd reproduce ~30–40% of Konva. The honest question is whether you reach for *any* of those once. If you stop at "static grid of clickable thumbnails," CSS + `<img>` wins. If you reach the third bullet, Konva's already cheaper than rolling your own.

### Performance cliffs

Konva's own marketing claims thousands of shapes ([overview](https://konvajs.org/docs/index.html)) and ships a [20,000 Nodes demo](https://konvajs.org/docs/sandbox/20000_Nodes.html) and an [Animation Stress Test](https://konvajs.org/docs/sandbox/Animation_Stress_Test.html). The docs are explicit about what costs add up:

- Every node listening for events costs hit-graph CPU per pointer movement.
- Every cached node holds multiple offscreen `<canvas>` buffers — memory grows linearly with sprite count if you cache everything.
- Filters require a cached node, so a "filter on every sprite" pattern multiplies memory by the buffer count.
- Drag with `hitOnDragEnabled = true` (the documented multi-touch workaround) re-enables hit detection during drag — a perf hit Konva specifically disables by default.

[Issue #1055 (Aug 2021, still cited in recent threads)](https://github.com/konvajs/konva/issues/1055) discusses caching thousands of shapes; users see multi-hundred-millisecond pauses when bulk-caching. Cache-heavy patterns can also evict the canvas backing store on iOS — [issue #653 (Sep 2019, last comments 2022)](https://github.com/konvajs/konva/issues/653) documents the Safari workaround.

### Recurring footguns from GitHub / SO

Five concrete ones, cited:

1. **Image race condition on initial render** — set `image.src` before attaching `onload` and your shape draws empty / with stroke only ([react-konva #145, May 2018](https://github.com/konvajs/react-konva/issues/145), [konva #255](https://github.com/konvajs/konva/issues/255), [vue-konva #46](https://github.com/konvajs/vue-konva/issues/46)). Workaround: use `Konva.Image.fromURL` or set `onload` first, then `src`, then `layer.batchDraw()` inside the handler.
2. **iOS Safari memory leak on `clearCache()`** — Safari's bug requires manually zeroing the canvas width/height before destroy. Workaround in the thread, not in the API ([issue #653](https://github.com/konvajs/konva/issues/653)).
3. **Memory growth in 8.0.1+** — children not destroyed when parents removed; reported and partially fixed across patch releases ([issue #1154, opened Mar 2022](https://github.com/konvajs/konva/issues/1154); v8.1.2 changelog explicitly fixed a `Konva.Image` leak).
4. **Pinch-zoom jumps** — the stage center shifts unexpectedly during multi-touch pinch; documented workaround uses `Konva.hitOnDragEnabled = true` and `stage.stopDrag()` mid-gesture ([issue #1096, Apr 2022](https://github.com/konvajs/konva/issues/1096); also baked into Konva's own [Multi-touch Scale Stage demo](https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html)).
5. **Cached image + Transformer interaction** — applying a Transformer to a cached image scales the cached bitmap instead of re-rasterizing the source, causing visible blur on resize ([issue #835](https://github.com/konvajs/konva/issues/835)).
6. *(Bonus)* **`drawHitFromCache()` silently fails on cross-origin images** — it has to read pixel data, which CORS blocks. Konva doesn't surface a helpful error; the hit region just remains rectangular ([Image_Events doc explicit note](https://konvajs.org/docs/events/Image_Events.html)).

### Maintenance health

- **Stars: 14.5k. Forks: 1.1k. Watchers: 169.** ([repo header](https://github.com/konvajs/konva))
- **Open issues: 17. Closed cumulative: many thousands (49 releases over the project's life).** That ratio is unusually healthy for a library this size — most issues get triaged and closed. ([releases page](https://github.com/konvajs/konva/releases))
- **Last release: v10.3.0, April 30, 2026** (per [releases page](https://github.com/konvajs/konva/releases)); prior 10.2.5 on April 10, 2026. Cadence is bursty — clusters of releases every 1–2 months (e.g., 10.2.1–10.2.5 across Mar 13 → Apr 10, 2026; then a quieter Nov 2025 → Jan 2026 gap). Active enough that the v10.1.0 (Jan 14, 2026) notes explicitly include "update canvas release logic to reduce memory usage by releasing buffer canvas immediately" — a direct partial answer to the older cache-leak issues cited below.
- **Bus factor: 1.** Anton Lavrenov (`@lavrton`) authored almost everything since forking from KineticJS in 2014 and runs the commercial spinoff [Polotno](https://polotno.com). If he steps away, there is no obvious second maintainer.
- **Breaking changes:** the major version bumps (v7, v8, v9, v10) have each shipped breaking changes — FastLayer deprecated in v7; image-handling internals changed in v8; v10 is the current line. The changelog is well-maintained at [CHANGELOG.md](https://github.com/konvajs/konva/blob/master/CHANGELOG.md). For a long-lived static site you'd want to pin a major.

### Mobile / touch quirks

Beyond the pinch-zoom workaround above:

- Konva's default `hitOnDragEnabled = false` is a perf optimization that *disables event firing while dragging*. If your grid-snap logic listens to events on neighbors during a drag, you'll need to flip it on and eat the cost ([API doc](https://konvajs.org/api/Konva.html#static-hitondragenabled)).
- `Konva.capturePointerEventsEnabled` defaults to `false`, so DOM-style touch capture (touchmove keeps firing on the original target after the pointer leaves) is opt-in ([API](https://konvajs.org/api/Konva.html#static-capturepointereventsenabled)).
- iOS Safari double-tap zoom and 300 ms tap delay still apply unless you set `<meta name="viewport" content="...user-scalable=no">` — Konva's own perf doc mentions this ([All Performance Tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)).

### Licensing

MIT. The required notice is the standard MIT copyright header plus the permission text. No commercial restrictions, no attribution-in-UI requirement. Copyright is held jointly: KineticJS (Eric Rowell, 2011–2013) and Konva (Anton Lavrenov, 2014–present) — both must remain in distributed copies of the source ([LICENSE](https://github.com/konvajs/konva/blob/master/LICENSE)). For a static-site bundle that ships `konva.min.js` via `<script>`, including the header in your repo (or simply not stripping it from `konva.min.js`) is sufficient.

### Lock-in risk

Medium. Migrating off Konva later means:

- Re-implementing scene-graph state (which sprite is where, selected, hovered) — manageable if you keep app state in your own data model rather than reading from `stage.toJSON()`.
- Re-wiring drag/hit/snap — non-trivial if you used `dragBoundFunc` and `drawHitFromCache` heavily.
- Re-creating any `Transformer` UX.

The library's own [Best Practices](https://konvajs.org/docs/data_and_serialization/Best_Practices.html) page recommends keeping your data outside Konva and treating the canvas as a view, which is precisely what makes the eventual migration easier. Follow that advice from day one.

---

## 5. Alternatives Worth Considering

**Vanilla Canvas 2D API** — pick this if your interactivity caps at "click anywhere, look up which thumbnail by bounding-box math." Bundle: 0 kB. You write ~50 lines and a hit-test function. Pain begins the moment you want pixel-accurate hover, drag with snapping, or zoom — at which point you're rebuilding Konva.

**Fabric.js** — pick this if you want a Canva/Figma-style editor with text editing, SVG import, and a "select object and see handles" UX out of the box. Fabric leans harder into "interactive editor"; Konva leans harder into "scene graph for arbitrary apps." Larger bundle than Konva. Comparable maintenance ([npm trends](https://npmtrends.com/fabric-vs-konva-vs-pixi.js-vs-react-konva) shows Fabric ~470K weekly downloads vs Konva ~870K in 2026).

**PixiJS** — pick this if you need WebGL performance for thousands of animated sprites at 60 FPS (games, particle systems, real-time visualizations). For a few hundred static building thumbnails this is wasted complexity; you also get fewer high-level interaction helpers than Konva ([pkgpulse comparison, 2026](https://www.pkgpulse.com/blog/fabricjs-vs-konva-vs-pixijs-canvas-2d-graphics-libraries-2026)). PixiJS is the right answer if Anno-1800-grade real-time rendering ever becomes the goal.

**Two.js / Paper.js** — pick Two.js if you want a thin renderer that targets canvas/SVG/WebGL with the same code, or Paper.js if you specifically want vector graphics with boolean path operations. Neither has Konva's interaction model. Paper.js is mature but quiet (low commit cadence); Two.js is small and active. Both are smaller bundles than Konva but require you to build hit-testing and dragging yourself.

**CSS grid + `<img>`** — pick this if every thumbnail is a rectangular icon you place in a grid and the interactions are click/hover only. You get the browser's accessibility tree for free (`<button>`/`<img alt>`), zero JS bundle weight, and the browser's image decode cache. This is genuinely the right answer for the "thumbnail picker UI" case and worth prototyping first — if it falls apart only when you add zoom/pan or per-pixel hover, then graduate to Konva.

---

## 6. Minimum Viable Konva Example

Saved as a standalone file at `konva-mve.html` (computer link below). Loads three sprites from konvajs.org's CORS-enabled asset host, lays them out as a row of 128×128 thumbnails, makes each draggable, calls `cache()` after load so subsequent redraws blit a bitmap, and uses `drawHitFromCache()` to make the hit region respect transparency. Pure script tag, no bundler, hosts cleanly on GitHub Pages.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Konva sprite thumbnails — MVE</title>
  <style>
    html, body { margin: 0; height: 100%; background: #0e0e10; color: #ddd; font: 14px/1.4 system-ui; }
    h2 { padding: 12px 16px; margin: 0; font-weight: 500; }
    #container { width: 100%; height: 280px; }
  </style>
</head>
<body>
  <h2>Konva sprite thumbnails (drag me)</h2>
  <div id="container"></div>

  <!-- v10 line: pin a minor in production. Konva is UMD, so this exposes window.Konva. -->
  <script src="https://unpkg.com/konva@10/konva.min.js"></script>
  <script>
    const stage = new Konva.Stage({
      container: "container",
      width: window.innerWidth,
      height: 280,
    });
    const layer = new Konva.Layer();
    stage.add(layer);

    // 3 sample raster sprites (PNG with alpha + JPG). Konvajs.org assets are CORS-enabled,
    // which is required for drawHitFromCache (reads pixels from the canvas).
    const urls = [
      "https://konvajs.org/assets/lion.png",
      "https://konvajs.org/assets/monkey.png",
      "https://placehold.co/128x128/png?text=Sprite",
    ];

    const THUMB = 128, GAP = 24, OFFSET_X = 40, OFFSET_Y = 60;

    urls.forEach((src, i) => {
      Konva.Image.fromURL(src, (img) => {
        img.setAttrs({
          x: OFFSET_X + i * (THUMB + GAP),
          y: OFFSET_Y,
          width: THUMB,
          height: THUMB,
          draggable: true,
          stroke: "#444",
          strokeWidth: 1,
        });
        layer.add(img);

        // Cache once: subsequent redraws (drag, hover, batchDraw) blit a bitmap
        // instead of re-rasterizing the source image each frame. This is the
        // "thumbnail reuse" pattern — pay decode/resample cost once.
        img.cache();

        // Optional: tighten the hit-region to non-transparent pixels.
        // Requires same-origin or CORS-enabled images (fromURL sets crossOrigin).
        img.drawHitFromCache();

        layer.batchDraw();
      });
    });
  </script>
</body>
</html>
```

Verified: the inline JS parses cleanly under Node's `new Function` parser (no syntax errors). All Konva API calls — `Konva.Stage`, `Konva.Layer`, `Konva.Image.fromURL`, `setAttrs`, `cache`, `drawHitFromCache`, `batchDraw` — are documented for v10 ([API index](https://konvajs.org/api/Konva.html), [Konva.Image](https://konvajs.org/api/Konva.Image.html)).

---

## 7. Open Questions & Unknowns

1. **Exact bundle size for v10.3.0.** Bundlephobia served a metadata-only page during this audit; the most recent firm number found was 54.9 kB min+gzip for v10.0.2. Verify on Bundlephobia or by gzipping `konva.min.js` from unpkg before committing.
2. **WebP behavior with `drawHitFromCache()`.** WebP decodes fine into `Konva.Image`, but I did not find a primary-source confirmation that the cached hit graph respects the WebP alpha channel identically to PNG. If your sprites are WebP-with-alpha, run a 10-line smoke test.
3. **Mobile performance with ~300 cached sprites on a low-end phone.** Konva's stress demos go to 10–20k *shapes*, but each cached image has a real memory footprint (`width × height × pixelRatio² × 4 bytes` × buffer count). For 300 sprites at 128² with `pixelRatio=2`, that's ~80 MB of canvas buffer if every sprite is cached. Decide whether to cache only the visible viewport.
4. **Anno 1800 sprite licensing.** Out of scope for this evaluation, but flagged: rendering official Ubisoft sprites in a publicly hosted tool has IP implications independent of Konva.
5. **Does the Polotno / Konva relationship affect feature direction?** Lavrenov is the sole maintainer of both. Future feature work has historically benefited both, but if Konva's interests diverge from Polotno's, OSS Konva is the side that loses prioritization. Worth re-checking commit cadence annually.

---

*Compiled from primary sources at konvajs.org, github.com/konvajs/konva, and dated community threads. Anything older than 2023 is flagged inline with its issue/post date; treat older Stack Overflow answers as suggestive only.*
