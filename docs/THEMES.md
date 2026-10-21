# Table Backgrounds

Six selectable backgrounds (see SPEC §6 settings menu and §7.1). One is a
smooth felt; five are **8-bit-style pixel-art scenes**, which are gently
**animated** (see "Animation" below).

## Rendering approach

- All pixel-art scenes are **generated procedurally in code** — no image files,
  no downloaded or copied art.
- Each scene is a pure function in `src/themes/scenes/<id>.ts`:

  ```ts
  type SceneFn = (buf: PixelBuffer, rng: Rng) => void;
  ```

  `PixelBuffer` (`src/themes/pixelBuffer.ts`) is a tiny pure-TS RGBA buffer
  (`width`, `height`, `Uint8ClampedArray`) with helpers: `fillRect`,
  `setPixel`, `hLine`, `vLine`, `ditherGradient` (ordered/Bayer 4×4 dithering
  between two palette colors), `polygon`/`ridge` fill, `circle`. No canvas
  API in scene code, so scenes are unit-testable in jsdom.

- Native resolution: **160 × 90** (16:9) for **all five** pixel scenes, so
  every art pixel is large and chunky on screen. Use integer coordinates
  only; no anti-aliasing, no alpha blending (every pixel fully opaque).
- **No fine-grained texture**: large areas (sky, water, ground) use **solid
  horizontal color bands** stepping between palette colors, not
  checkerboard/Bayer dithering. Dithering may be used only sparingly on
  small accents (a few pixels), never across big areas. No 1-px random
  speckle noise; scattered details (stars, snowflakes, marine snow,
  bubbles) are sparse.
- Each scene declares a fixed **palette** of ≤ 24 colors and must draw only
  palette colors. Seeded with a constant per scene (use the engine's
  `mulberry32`), so output is byte-for-byte deterministic.
- UI: `PixelBackground.tsx` renders the buffer once into a 160×90 `<canvas>`
  via `ImageData` (memoize per theme; generate lazily the first time a theme
  is shown), displayed fixed full-viewport behind the board with
  `image-rendering: pixelated`, scaled to **cover** the viewport and anchored
  to the bottom center. Must look crisp (no blur) at any size.
- Composition rule for every scene: keep the **busiest detail in the bottom
  ~35% and edges**; the upper-middle area (behind the tableau) should be
  relatively calm and mid/low contrast so cards stay readable. Never put a
  bright, saturated element directly behind the center of the tableau.
- Thumbnails in the settings menu are the same buffers scaled down (classic
  uses a CSS swatch of its gradient).

## The six backgrounds

### 1. `classic` — Classic green (default)

Not pixel art. CSS radial gradient ≈ `#239a52` (center) → `#18803f` (edges),
plus a very subtle noise/felt texture (inline SVG `feTurbulence` or a tiny
generated data-URI, opacity ≤ 0.06). Visibly lighter than the original
`#0b7a3b` felt.

### 2. `night-city` — Night city

- Sky: **solid horizontal color bands** (no checkerboard dithering) stepping
  from deep navy `#0b1026` (top) through indigo `#1b1f4a` to dusky purple
  `#3a2a5e` near the horizon. Bands may have a single row of alternating
  pixels at each boundary at most.
- Stars: fewer and bigger: ~15–25 single-pixel stars (which are 2×2 on the
  320-scale), a handful in pale yellow; no 1-px noise speckle. A blocky
  crescent or full moon near the top-right corner.
- Skyline in **3 depth layers**: far (dark purple-blue silhouettes, short,
  few windows), mid (taller, varied rooftops: antenna, water tower, stepped
  tops), near (darkest, along the bottom). Buildings are clean flat-colored
  blocks with no texture speckle.
- **Windows a little brighter / more lit**: ~40–45% of windows lit (up from
  ~30%), lit colors warm yellow `#ffd65c`, a brighter pale yellow `#fff2a8`
  for ~1 in 6 lit windows, and warm orange `#ffad42`. Window grid is regular
  per building (1×1 windows with 1-px spacing at 160×90).
- Optional: a red antenna light (static), a thin street line of streetlights
  at the very bottom.

### 3. `aurora` — Aurora

- Sky: near-black blue `#050b1a` → dark teal `#0a2a3a` near horizon,
  in solid bands. Sparse stars.
- 2–3 **aurora ribbons**: wavy vertical-curtain bands across the upper sky in
  green `#3dff9a` / `#1fcf7a` stepping in solid bands into teal and a touch of
  magenta/purple `#b45cff` at the top edges. Built from sine-wave paths with
  vertical streak columns of varying length.
- Bottom: snowy ground and a row of dark pine-tree silhouettes (pixel
  triangles, varied heights), with a frozen lake strip that **reflects** a
  dimmed, banded copy of the aurora.

### 4. `ice-mountains` — Snowy peaks

- Sky: pale icy blue `#bfe6ff` → `#8fc9f0` in solid bands, a few chunky pixel clouds.
- 3–4 layered **jagged mountain ranges** (ridge lines from a random walk /
  midpoint displacement): farthest pale blue-grey, nearest darkest slate
  `#3d5a7a`. **White snowcaps** `#ffffff` with light-blue shading `#d6ecff`
  on the shadow side of each peak.
- Foreground: snowfield with icy blue shadows, a few small pixel pine trees
  dusted with snow, scattered 1-px snowflakes in the air.
- Keep contrast moderate: this is the brightest theme, so the top bar and
  empty-slot fill must still be readable (verify in screenshots).

### 5. `forest` — Woodland

- Sky: soft morning gradient (pale yellow-green `#e8f3c4` → light blue
  `#a9d8e8`) in solid bands.
- 3 layers of trees: far (misty blue-green silhouettes), mid (rounded
  deciduous canopies + pines in mid greens), near (dark green trunks and
  foliage framing the left and right edges).
- Ground: grass strip with tufts, a few red-cap mushrooms and small flowers,
  a dirt path winding toward the center.

### 6. `ocean` — Deep sea

Deep underwater, far below the surface (no sky, no surface visible).

- Water: solid horizontal bands from dark blue `#0d3b66` at the top to near-black
  navy `#020814` at the bottom. A few faint **light shafts** slanting down
  from the top edge (solid slightly-lighter-blue diagonal stripes, low contrast), fading
  out by mid-height.
- **Marine snow**: sparse 1-px pale specks drifting throughout; small
  bubble columns (1–2 px hollow circles) rising from the wreck and seabed.
- **Seabed** (bottom ~20–25%): uneven sand and dark rock with banded
  shading, small shells and pebbles.
- **Coral & plants**: clusters of branching coral (pink `#ff6f91`, orange
  `#ff9a3c`), a round brain coral, purple sea fans, and tall green kelp /
  seaweed strands rising from the seabed, mostly along the left and right
  thirds.
- Revision 8 colors: the water is a little bluer (`#0e4278` → `#030d24`) and the sand a
  little lighter (`#776549` / `#4c402c`).
- **Treasure chest**: a warm-wood chest with gold bands and a lock, half-buried in a
  slanted sand mound left of the wreck, below the two pink corals, with two gold coins
  spilled beside it (revision 9).
- **Shipwreck**: a rotted wooden sailing-ship hull lying tilted on the
  seabed near one side (e.g. bottom-right), broken in places with dark holes
  and missing planks, a snapped mast leaning at an angle, tattered sail
  scraps, a little coral/barnacles growing on it. Muted browns (`#5a3d2b`,
  `#3b2a1e`) so it stays moody.
- **Wildlife**:
  - A **great white shark** in front of the wreck, just left of its sail (slate
    grey `#6e7f8d` with a pale belly `#dde4e9`); it stays in place and only its
    tail moves.
  - A **school of small fish** (a dozen or so 3–5 px fish in the same
    direction), plus 2–3 larger colorful reef fish (yellow, orange/white
    clownfish-style) near the coral.
  - Optional: a jellyfish or two with faint glowing tentacles, an anglerfish
    with a tiny glowing lure in a dark corner.
- Keep the calm-zone rule: wildlife and the wreck sit at the sides and the
  bottom; the area behind the center of the tableau is just dark water,
  light shafts, and marine snow.

## Animation (revision 8)

Built to cost as little as possible:

- A scene is a stack of **layers**, each static or moving. Static layers are rendered **once**:
  those below the first moving layer flatten into an opaque base; each later run of static
  layers becomes a sparse "plate" (only the pixels it covers). A frame = copy the base (57 KB),
  redraw the moving layers, stamp the plates, into **one reused buffer** (no allocation per
  frame). Measured: well under 0.3 ms per frame even for a full redraw.
- Moving layers get an RNG that restarts from the same seed every frame, so random choices
  (positions, sizes) are stable and only the frame number moves things.
- Plays at **12 fps** (retro and cheap) from a `requestAnimationFrame` loop that only paints
  when the frame number changes, and that the browser pauses in background tabs. The canvas
  is opaque (`alpha: false`), wraps the frame buffer directly in `ImageData` when possible,
  and sits on its own compositor layer (`will-change: transform`, `contain: strict` on the
  wrapper) so repainting it never repaints the cards.
- Off under `prefers-reduced-motion`, or when the settings switch is off (still frame 0).
  Settings thumbnails are always still.
- Motion stays at the sides and bottom, out of the calm zone behind the tableau.

What moves:

- **Night city:** stars twinkle; antenna lights blink about once a second; a few windows
  (~5%) switch on/off every 5–15 s.
- **Aurora:** stars twinkle; the curtains drift very slowly in wide, smooth waves (about a
  minute per ripple; fast, narrow folds looked like flickering flames); the lake reflection
  follows them.
- **Snowy peaks:** clouds drift right and wrap around; snow falls at the left and right sides.
- **Woodland:** grass tufts sway; light specks drift up at the sides; two butterflies flutter
  near the ground.
- **Deep sea:** kelp sways; bubbles rise from the wreck and reef; the fish school swims a slow
  loop beside the foundations (turning to face its direction); the great-white shark stays put
  and only sweeps its tail; jellyfish bells stay still while their three tentacles sway
  left and right together (all in the same direction, bending more toward the tips). They
  never hang straight down: they flip from leaning one way to leaning the other. The reef fish
  and anglerfish are still. (The squid was removed in revision 9.)

## Tests (summary — full list in TEST_PLAN.md §F)

For every pixel scene: correct dimensions; deterministic (hash of buffer is
stable across runs and equals a recorded snapshot hash); every pixel opaque
and in the declared palette; ≥ 8 distinct colors used (not blank); the
"calm zone" (center 50% width × rows 20%–60%) has lower color variance than
the bottom 35%.
