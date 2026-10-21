# Decisions

Places where the spec was silent or ambiguous, and what we chose. When in doubt we followed
Google Solitaire (Easy mode).

## Rules and engine

- **Foundation → foundation moves are illegal.** SPEC §4 lists only "Foundation top → Tableau".
  Moving an Ace between empty foundations is pointless, and Google does not allow it.
- **Which foundation an Ace goes to (revision 10).** Each suit has its own foundation, top to
  bottom ♠ ♥ ♦ ♣ (the engine's suit order). Clicking, dragging, auto-complete, the solver and
  god mode all go through the same rule (`canPlaceOnFoundation(card, pile, index)`), and
  `assertValidState` rejects a foundation holding the wrong suit. Empty foundations show a
  faint suit symbol (smooth or pixel, following the card style) instead of an "A".
- **Click scan order for non-tableau sources.** SPEC §6 says to scan "starting from the column
  after the source". Waste and foundation cards have no source column, so they scan from
  column 1.
- **Empty-column target for a King.** A King uses the first empty column in that same scan order.
- **`getLegalMoves` lists every legal move**, including "pointless" ones such as moving a King
  that already sits alone at the bottom of a column to another empty column. Only the click
  behavior (`findAutoMove`) avoids those moves, as SPEC §6 requires.
- **Score clamping.** The score delta for a move, including the +5 for an auto-flip, is applied
  first and the result is clamped at 0 once per move.
- **Pile ids** use the object form from ARCHITECTURE.md (`{ kind: 'tableau', index: 3 }`). The
  string form (`"t3"`) is used only as a DOM/data key (`pileKey` / `parsePileKey`).
- **Greedy strategy.** To cover TEST_PLAN §E ("the engine's solver-free greedy strategy"), the
  engine has `greedyMove` / `playGreedy` in `src/engine/greedy.ts`. The priority order is:
  foundation plays (lowest rank first), then tableau moves that reveal a face-down card, then
  waste → tableau, then draw or recycle. It stops after a full pass through the stock with no
  progress. It is test tooling only; the game has no hints.

## Undo and phases

- **No timer.** Revision 2 removed the timer completely (SPEC §5 and §8). There is no clock,
  elapsed time, or time-based scoring anywhere. Tests assert that no time or clock element is
  rendered. This supersedes the earlier timer entries.
- **Scoring is table-driven.** Every point value lives in the `POINTS` table in
  `src/engine/scoring.ts`, and `TRANSFER_EVENTS` maps move kinds to table rows. The values are
  unchanged from SPEC §5, as the user confirmed.
- **Auto-complete** steps every 100 ms. It starts right after the move that makes it possible, or
  right away when a position loaded through the test hook already allows it. Auto-complete moves
  count toward moves and score like any other move. Undo and all input are disabled from the
  first auto-complete step.
- **New-game confirmation** appears only when the current game has `moves > 0` and is not won.
  After undoing back to the deal, `moves` is 0 again, so no confirmation is needed. After a
  win, "New game" starts at once.
- **Keyboard.** Ctrl+Z and Cmd+Z undo. Ctrl+Shift+Z does nothing because there is no redo.
  Escape closes the new-game confirmation and the settings panel. Undo shortcuts are ignored
  while a dialog or the settings panel is open. Face-up playable cards can be focused and
  activated with Enter or Space, which does the same as clicking them.

## Layout (revision 2: side layout)

- **Side layout (≥ 600 px wide).** Stock and the waste fan sit in the left column, the 7 tableau
  columns in the center, and the 4 foundations stacked in the right column. The space-limited
  card width is the largest that satisfies both constraints: 9 card widths plus gaps fit the
  width (tableau gap 16% of card width, side-column gap at least 50%, plus edge margins), and
  the 4 foundations plus 12% gaps fit the board height.
- **Side columns at the screen edges (revision 4).** The stock/waste column and the foundation
  column are inset from the viewport edges by `max(16 px, 0.25 × card width)`; the tableau is
  centered in the viewport. On wide screens the extra space sits between the side columns and
  the tableau.
- **Card scale (revision 3).** The drawn card width is `floor(0.88 × space-limited width)`,
  clamped to 40–105 px (`CARD_SCALE`, `MAX_CARD_WIDTH`). Gaps, fan offsets and the waste fan
  are all ratios of the card width, so they shrink with it. The space-limited value is exposed
  as `layout.fitCardWidth` for tests. At 1280×800, cards are 100 px.
- **Minimum card width is 40 px, not 44.** TEST_PLAN §F requires the narrow layout to fit a
  320 px viewport with no horizontal overflow, which needs cards slightly under 44 px. With the
  0.88 scale, phone cards at 375 px wide are 41 px. Corner ranks stay legible because the
  corner row is about 33% of the card width.
- **No side column shading (revision 4).** The revision-3 darker bands behind the side columns
  were removed at the user's request; the background is uniform behind every column.
- **Narrow layout (< 600 px).** This is the compact top-row layout: stock, then the waste fanned
  horizontally (offset 40% of card width so each covered card's rank shows), then the
  foundations at top-right, with the tableau below. Tableau gaps are 12% of card width. Card
  size is also capped so that about 4.5 card heights fit below the top bar.
- **Waste fan** (supersedes the earlier "Waste display" entry). The last 3 waste cards are
  fanned: vertically by 22% of card height in the side layout, horizontally in the narrow one.
  The newest is the only interactive card. Older waste cards stay mounted but hidden
  (`visibility: hidden`, `aria-hidden`) under the oldest visible card, so they slide into view
  when the fan re-forms. Visible, non-newest waste cards are `role="img"` with their label. An
  empty waste has no outline, as in Google.
- **Tableau compression.** When a column is too tall, face-down offsets are squeezed first (down
  to 5% of card height). Then face-up offsets shrink, but never below 23% of card height. That
  keeps every covered card's corner row (rank and suit, about 22.9% of card height) readable, as
  SPEC §7 requires. The side layout always has room for a 19-card column at those minimums.

## Cards (revision 2, per the user's direct instruction)

- **Card face.** Each face shows the rank once (top-left), the suit once (top-right), and in the
  center either a large suit symbol (A–10, 54% of card width) or a portrait headshot (J, Q, K).
  There is no bottom-right index, no pips, and no frames. Faces are a single SVG in a 250 × 350
  box, scaled to the card. Suits are our own SVG paths. Ranks are bold Roboto, Helvetica Neue
  or Arial text. Rank, corner suit and center suit use `#d32f2f` (red suits) or `#1f1f1f`
  (black suits).
- **Process note.** The user first asked for "exactly Google's cards" with this layout. I had
  already built the earlier revision-2 design (traditional pips, illustrated court figures,
  rotated bottom-right index); I deleted it and its tests. A later message asked for portrait
  headshots instead of a large J/Q/K letter. The art is drawn in code in Google's flat style.
  No Google image files were fetched or copied; none were needed for this layout.
- **Portraits** (`src/ui/cards/FacePortrait.tsx`). Each is a flat-vector head and shoulders,
  about 62% of card width (the figure is enlarged 18% around the face so it reads at small
  sizes):
  - King: tall pointed gold crown with jewels, full beard and mustache.
  - Queen: long hair, small rounded tiara with a sapphire, earrings and a bead necklace.
  - Jack: no beard, short hair, a soft cap with a gold feather.
  - Clothing: reds for hearts and diamonds, charcoal for spades, navy for clubs, with a white
    suit symbol on the chest.
  - Hair color by suit: spades black, hearts auburn, diamonds blond, clubs brown, so all 12
    face cards differ.
  - Screenshots confirm they read as King, Queen and Jack at phone size (≈ 47 px cards).
- **Card back.** A white border (5% of card width) around a `#1a73e8` field with a lighter-blue
  diamond lattice (inline SVG data URI). It is the same for every card.

## Settings and backgrounds (revision 2)

- **Settings panel.** It is a `role="dialog"` that slides in from the left over a dimmed
  backdrop. Its options are `<button role="radio">` elements with a roving tabindex. Arrow keys,
  Home and End move the selection and apply it at once (standard radio-group behavior). When
  the panel opens, focus moves to the checked option. On close, focus returns to ☰. While the
  panel is open the board is non-interactive and Ctrl+Z is ignored.
- **Persistence.** The choice is saved to `localStorage["solitaire.background"]`. Every access
  is wrapped in try/catch, and a missing, unknown or unreadable value falls back to `classic`.
- **Rendering.** Pixel scenes are rendered once per scene (memoized) into a `<canvas>` at the
  scene's native resolution with `ImageData`. Every scene is 160 × 90 (revision 4: chunky
  pixels everywhere). Large areas use solid horizontal bands (`solidBands`), never
  checkerboard dithering; a test rejects checker patterns. The calm zone is defined as
  fractions of the scene size. CSS `object-fit: cover; object-position: center bottom;
image-rendering: pixelated` keeps them crisp and bottom-anchored at any size. Thumbnails use
  the same buffers.
- **Scene composition.** Each scene keeps its busy detail at the sides and bottom. The test
  `calm zone variance < bottom band variance` guards this (luminance variance). Specific choices:
  - Night city (revision 3):
    - The sky is solid bands with no dithering; the spec allows one alternating boundary row
      per band, but I left it out because it read as a dashed line.
    - About 20 single-pixel stars; none behind the tableau.
    - Buildings are flat blocks with regular 1×1 window grids, about 42% lit. About 1 in 6 lit
      windows is pale yellow `#fff2a8`; the rest are warm yellow or orange.
    - The moon sits in the gap between the last tableau column and the foundation column
      (art x ≈ 126–136), so it stays visible at 16:10 and 16:9; stars keep clear of it.
  - Aurora: solid vertical-streak curtains that hang low and bright at the sides (each curtain
    drops a different amount so they don't form one uniform arch) and stay high and dim
    behind the tableau. The frozen lake shows a striped, dimmed reflection.
  - Snowy peaks: the sky runs from darker at the top (`#8fc9f0`) to paler at the horizon
    (`#bfe6ff`), the natural reading of the gradient.
  - Deep sea (id `ocean`, menu name "Deep sea"): the wreck, squid and coral sit at the
    bottom-right, the shark at mid-left, and the fish school and jellyfish at the upper sides.
    The center is open water with faint tapering light shafts and sparse marine snow. The
    shark sits low on the left so the waste fan doesn't cover it.
  - Woodland: the optional light shafts were dropped in revision 4; at 160 × 90 they read as
    harsh zig-zag lines.
- **Readability over bright scenes.**
  - Top bar: `rgba(0,0,0,0.45)` with a 6 px backdrop blur and a light text shadow.
  - Empty slots: `rgba(0,0,0,0.2)` fill, a 55% white border, and a faint dark outer ring so
    they stay visible over pale skies.
- **Classic green.** A radial gradient from `#239a52` to `#18803f`, plus `feTurbulence` noise
  at 6% opacity.

## Presentation

- **Empty stock.** It shows a circular recycle arrow when the waste has cards, and "✕" when both
  stock and waste are empty (SPEC §7). Clicking it in the second case does nothing.
- **Accessible names.** The stock is a `<button>` named "Stock, N cards". When it is empty and
  the waste has cards, it is named "Stock, 0 cards, click to recycle the waste". Cards buried
  under the top of the stock, waste, or a foundation are `aria-hidden`. Face-up playable cards
  have `role="button"`. Other cards have `role="img"` with names like "7 of hearts" or
  "face-down card". The win message ("You win! Score N, M moves.") is announced through one
  `aria-live="polite"` region.
- **Phone top bar.** Below 600 px wide, Undo and New game are icon-only buttons. Their
  accessible names stay "Undo" and "New game".
- **Drop targets.** Only foundations and tableau columns can receive a drop. A tableau column's
  hit area covers its whole fanned stack, not just the slot. Dropping onto the source pile, onto
  nothing, or onto an illegal target, or a cancelled pointer, animates the cards back over
  150 ms.
- **Win confetti (revision 13).** The classic bouncing-cards celebration was too much, so it was
  replaced by a light confetti burst: 140 paper pieces (game colors, staggered over 0.6 s) that
  flutter down with gentle gravity and sway, drawn on a canvas with `pointer-events: none` above
  the win dialog. The dialog appears immediately; the confetti ends when every piece has fallen
  out of view or after 4.5 s, and plays once per win.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, there is no confetti, no
  position or flip animations (FLIP is disabled), and CSS animations (shake, dialogs, panel)
  run in 1 ms. Auto-complete still advances one card per 100 ms so the result is visible.

## Tooling

- **Random seeds** come from `Math.random()` in the UI layer (`src/ui/seed.ts`), never in the
  engine. `?seed=<n>` is read as an unsigned 32-bit integer.
- **Test hooks.** `window.__solitaire.newGame(seed?)` takes an optional seed. Without one it
  deals a random game. `loadState` validates the position with `assertValidState` and throws
  if it is invalid. The hooks are installed only when `import.meta.env.DEV` is true, which covers
  Vite dev and Vitest. They are compiled out of production builds.
- **E2E server.** Playwright runs against the Vite dev server on port 5179 (a dev build, so the
  test hooks exist).
- **Prettier ignores the provided spec documents** (`CLAUDE.md`, `docs/SPEC.md`,
  `docs/ARCHITECTURE.md`, `docs/TEST_PLAN.md`; `docs/THEMES.md` is formatted as delivered) so
  they stay byte-for-byte as delivered. All code and this file are formatted.
- **Scene snapshots.** `src/themes/scenes.test.ts` stores an FNV-1a hash per scene. Changing a
  scene's pixels means updating its hash on purpose.

## God mode (revision 5)

- **What "optimal" means.** The solver looks for the line with the fewest moves (draws count
  as moves) to a position auto-complete can finish, plus one move per remaining card for
  auto-complete. It knows the face-down cards and stock order. Phase 1 is a depth-first search
  that never revisits a position, to find any win fast; phase 2 is branch-and-bound that
  re-expands a position only when reached in fewer moves and cuts branches whose moves so far
  plus cards left can't beat the best line. The result is the shortest line found, not a
  proven optimum, unless the search is exhaustive.
- **Pruning.** Moves that can't help are never tried: foundation → tableau moves, partial
  stack moves that don't free a card for a foundation, a King already at a column bottom,
  and more than one empty column for the same stack. Safe foundation moves (Aces, 2s, or both
  opposite-color foundations at rank − 1) are forced. An "unsolvable" verdict is relative to
  these rules (they are standard and very rarely lose a win).
- **Budget.** 1.5M positions in total (about 3–5 s in Chromium for the hardest deals), of which
  at most 300k are spent shortening a win once found, so easy deals start in under a second.
  On deals 1–40 this solves 31, proves 4 unwinnable and gives up on 5.
- **Off the main thread.** `solve` runs in a module Web Worker (`src/state/solver.worker.ts`)
  so the page stays responsive while the status pill says "working out the best line…".
- **Pace.** 500 ms between god-mode moves; while god mode is active, auto-complete also runs at
  500 ms per card instead of 100 ms.
- **Status pill placement.** Bottom center: under the top bar it covered the tops of the middle
  tableau columns.
- **Speed slider (revision 6).** In the status pill: 1 s to 0.05 s per move in 0.05 s steps,
  linear, right = faster (the input value is mirrored). Card move animations last 60% of the
  pause, at least 30 ms, so a fast pace never stacks animations. The speed is kept for the
  session only. `window.__solitaire.setGodModeDelay(ms)` (dev/test only) sets the same value.
- **Button style (revision 6).** No emoji. An animated 8-stop rainbow gradient with a glow; under
  reduced motion the gradient stays still (an explicit `animation: none`, because the global
  1 ms reduced-motion rule would otherwise make it strobe).

## Animated backgrounds (revision 8)

- **Layered scenes.** Scenes are lists of static and moving layers (`src/themes/scene.ts`).
  Static layers render once into a base and sparse plates; each frame copies the base,
  redraws moving layers and stamps plates into one reused buffer. Approved animations only
  (see THEMES.md). Shared geometry that moving layers need (stars, buildings, windows) is
  generated once at module load from a fixed seed.
- **12 fps** via `requestAnimationFrame`, painting only on frame changes; paused by the browser
  in background tabs; disabled by reduced motion or the new "Animate backgrounds" switch
  (on by default, `localStorage["solitaire.animateBackground"]`).
- **Deep sea tweaks.** Great-white shark colors; the shark moved 4 art pixels right so its
  moving tail isn't cropped at 16:10; the middle bubble column moved beside the wreck so no
  motion happens behind the tableau; bluer water and slightly lighter sand.
- **Aurora.** Curtains drop with the cube of the edge factor (not the square) so their
  rippling stays out of the calm zone.
- **Snow and specks** only fall/drift in the left and right side columns.

- **Revision 9 (deep sea).** The squid is gone; the shark took its spot in front of the wreck
  (x 74–100), with its nose short of the sail. The clownfish that was beneath it was removed
  too, leaving one clownfish and the yellow reef fish.
- **Revision 9 (deep sea), continued.** A half-buried treasure chest sits left of the wreck
  under the two pink corals. Its wood is a warmer, lighter brown (`#8a5a2e`) than the wreck so
  it stands out from the dark sand; to stay within 24 colors the anglerfish's lure now uses the
  chest's gold. Jellyfish tentacles now sway side to side together (2.5 s period, up to 2 art
  pixels at the tips) instead of rippling independently.
- **Jellyfish never hang straight.** The tentacle lean is `±(1 + |sin|)` art pixels at the tips,
  so they jump from one side to the other instead of passing through vertical.

## Pixel card style (revision 10)

- Offered as a setting ("Card style": Classic / Pixel) so both looks can be compared; Classic
  stays the default.
- "About 50% 8-bit": rank glyphs are 9 pixels tall with 2-pixel strokes (a classic 8-bit font
  is 5×7), corner suits share the rank's pixel size, and center suits are 13 pixels across.
  At a 100 px card each art pixel is about 3–4 screen pixels.
- The rank, suit symbols and J/Q/K portraits change; the card shape, back and colors don't.
  The win confetti doesn't depend on the card style.
- **Pixel J/Q/K (revision 10).** The Pixel style also redraws the J/Q/K headshots as 24×24
  multi-color pixel art on the same pixel grid as the corner rank, keeping the classic cues
  and the per-suit hair and clothing colors, with a tiny white suit on the chest.

## Header (revision 11)

- **Logo.** The "Solitaire" text became a logo: a card mark (a blue-backed card fanned behind a
  white card with a red heart) plus a bold wordmark. On phones only the mark shows; the heading
  still reads "Solitaire" to screen readers. The browser-tab icon uses the same mark.
- **Settings icon.** The ☰ became a gear (Material Design "settings" glyph, Apache 2.0).

## Settings panel theme (revision 12)

- The panel uses its own theme instead of a white sheet with blue highlights: dark frosted glass
  (`rgba(8, 20, 14, 0.8)` + an 18 px backdrop blur, the same material as the top bar, with a
  solid `#0f2419` fallback), cream text, and gold accents
  (`#f2c14e`, the gold of the crowns and the treasure chest) for section headings, hairline
  dividers, selected tiles (gold border + soft glow), the check badge and the switch. The colors
  live in `--sp-*` custom properties on `.settings-panel`.
- Hover highlights apply only on devices that really hover (`@media (hover: hover)`), so a tap on
  a touch screen doesn't leave a stuck highlight.
- **Why glass (revision 12b).** A first version used a green felt gradient with a gold glow in
  the corner; side-by-side renders showed the glow turning olive and muddy over the green, the
  gradient darkening to near-black at the bottom, and a fixed green clashing with the blue/purple
  scenes. Glass takes a hint of whatever is behind it, so it matches every background and the
  top bar.

## One card style (revision 14)

- The classic (smooth) card style was removed; the pixel style is the only one, since it fits
  the 8-bit backgrounds. The "Card style" settings section, its `solitaire.cardStyle`
  preference (now ignored if present), the classic SVG portraits and the style context are
  gone. Empty foundations always show the pixel suit. The logo and favicon keep their smooth
  card mark.
- **Pixel card back (revision 15).** The smooth diamond lattice became an 8×8-pixel tile (stepped
  diamond + 2×2 dot, `#4a90ee` on `#1a73e8`) as a crisp-edged SVG data URI, sized so one tile
  pixel is 2.64% of the card width, matching the face pixels.

## Title screen (revision 16)

- Shown on every app start; `?seed=` deal links (and the e2e/unit tests, which always pass a
  seed or position) skip it so a shared deal opens straight on the board. There's no way back
  to the title screen from the game yet.
- Video-game look built from the game's own parts: the animated pixel tables as the attract
  loop, pixel cards, gold from the crowns and chest. Two pixel fonts drawn as bitmaps (a 5×7
  font for labels and a bold 9-tall font for the title and PLAY), so no web fonts are loaded.
- All title motion uses CSS `steps()` timing for a choppy 8-bit feel. Only the current and the
  fading-out table canvases exist at any moment, so at most two scenes animate at once.

## Pixel font everywhere (revision 17)

- `<Pixel text>` renders interface text in the 5×7 pixel font as one crisp SVG per word (so it
  wraps), sized from the CSS font size (cap height = 7/8 em), with the real text in a
  visually hidden span, so accessible names, live regions and `textContent` are unchanged.
  The font gained digits and punctuation (`. , : ' ? - … ( ) / ✕`).
- `PixelTitle` takes either font, so the header logo (bold font) and "YOU WIN!" (5×7 font, which
  has the letters the bold one lacks) share the gold outlined arcade look.
- The logo mark and favicon are now a 15×14 pixel-art card pair instead of a smooth vector.
