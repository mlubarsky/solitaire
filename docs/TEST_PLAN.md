# Test Plan

Every bullet below must map to at least one test. Tests must be deterministic
(fixed seeds, fake timers where time is involved). Build small state fixtures
with a helper like `makeState({ tableau: [...], waste: [...] })` that fills the
remaining cards into the stock so every fixture is a valid 52-card state.

## A. Engine unit tests (Vitest)

### rng / deck / deal
- Same seed → identical deal; different seeds → different deals (check several).
- Shuffle is a permutation: 52 unique cards, all suits/ranks present.
- Deal shape: tableau column i has i+1 cards (0-indexed), only top face-up;
  stock has 24 face-down; waste and foundations empty; score 0; moves 0.
- Card helpers: color of each suit; labels ("A of spades", "10 of hearts", "K of clubs").

### rules
- Tableau: red 6 on black 7 ✓; black 6 on red 7 ✓; red 6 on red 7 ✗;
  6 on 8 ✗; 8 on 7 ✗; K on empty ✓; Q on empty ✗; anything on face-down top ✗.
- Foundation: A on empty ✓; 2 on empty ✗; 2♥ on A♥ ✓; 2♦ on A♥ ✗; 3♥ on A♥ ✗;
  K completes a foundation; nothing on a full foundation.

### moves (applyMove)
- Draw: moves exactly 1 card stock→waste, face-up, moves+1, score unchanged.
- Draw with empty stock is rejected (UI uses recycle instead).
- Recycle: waste→stock reversed and face-down so draw order repeats; −100
  score clamped at 0; moves+1. Recycle with empty waste rejected. Recycle with
  non-empty stock rejected. Unlimited recycles allowed (do 5 in a row).
- Waste→tableau (+5), waste→foundation (+10), tableau→foundation (+10),
  foundation→tableau (−15, clamped at 0), tableau→tableau (0).
- Multi-card tableau stack move: valid sequence moves intact and in order.
- Moving from the middle of a column requires that card to be face-up; moving a
  face-down card is rejected.
- Moving >1 card to a foundation rejected.
- Moving onto stock or waste rejected. Moving from empty pile rejected.
  Same source and target rejected. Count larger than pile rejected.
- Auto-flip: exposing a face-down card flips it, +5, `flipped: true`, still one
  move. Emptying a column (nothing to flip) gives no flip bonus.
- Inputs are never mutated (deep-freeze input state in tests).
- Every successful result passes `assertValidState`.

### scoring
- Table-driven test covering every row in SPEC §5 including clamping at 0.

### autoMove (click behavior)
- Prefers foundation over tableau for a single top card.
- Card in the middle of a column never goes to foundation; goes to tableau.
- Left-to-right scan starting after source column, wrapping around.
- King goes to empty column; King already alone at bottom of a column does not
  hop to another empty column (returns null if nothing else).
- Non-King never targets empty column.
- Foundation card returns to tableau when legal; null otherwise.
- Returns null when no legal move; face-down card returns null.

### autoComplete / status
- `canAutoComplete` false when stock non-empty, waste non-empty, or any
  face-down tableau card; true otherwise.
- Repeatedly applying `nextAutoCompleteMove` from such a state reaches `isWon`
  within ≤52 steps and always plays the lowest available rank.
- `isWon` true only with 52 cards on foundations.

### history / undo
- Undo restores the exact prior state (deep equal) including score and moves.
- Undo of a move that auto-flipped re-hides that card.
- Undo on empty history is a no-op.
- 100 random moves then 100 undos returns to the initial deal.

### Property tests (fast-check)
- For random seeds and random sequences of legal moves (chosen from
  `getLegalMoves`), after every step: exactly 52 unique cards; foundations are
  same-suit ascending from A; every face-up tableau run is alternating color
  descending; face-down cards only appear below face-up ones in a column;
  stock is all face-down; waste all face-up; score ≥ 0; moves == step count.
- Every move returned by `getLegalMoves` succeeds in `applyMove`; a random
  invalid move (random from/to/count) never corrupts state — it either
  succeeds and is in `getLegalMoves`, or fails with state unchanged.
- `findAutoMove` result, when non-null, is always in `getLegalMoves`.

## B. UI pure-function tests

- `layout.ts`: card width scales with viewport and respects min/max; 5:7
  aspect; column compression keeps a 19-card column inside the available height.
- `hitTest.ts`: picks pile with greatest overlap; returns null when no overlap;
  ties resolved deterministically.

## C. Component / integration tests (Testing Library + jsdom, fake timers)

- Initial render with `?seed` fixture: 7 tableau columns with correct card
  counts, 24-card stock, aria-labels correct, Undo disabled, score 0, moves 0, and no
  time/clock element anywhere in the DOM.
- Clicking stock draws a card; clicking empty stock with waste recycles; score
  and moves readouts update.
- Clicking a playable card moves it (verify DOM pile membership); clicking an
  unplayable card leaves state unchanged and adds a shake class.
- Undo button and Ctrl+Z / Cmd+Z both undo; Undo disabled after returning to start.
- New game: with no moves starts immediately; with moves shows confirm dialog;
  Cancel keeps the game; Confirm deals a new one and resets score/moves.
- Auto-complete: load an all-face-up state, advance timers, all cards end on
  foundations, input ignored meanwhile, Undo disabled.
- Win: dialog shows final score/moves (and no time); "Play again" starts a new game.
  With `prefers-reduced-motion` mocked, the confetti is skipped.
- No `console.error` / React warnings during any test (fail the test if one
  occurs — set this up in the Vitest setup file).

## D. End-to-end (Playwright, Chromium)

Use `?seed=` and `window.__solitaire.loadState` for deterministic setups.

1. Loads with no console errors; board renders 7 columns, stock, waste, 4 foundations.
2. Click stock repeatedly through all 24 cards, then recycle; verify counts, moves = 25, and score stays 0 (−100 clamped).
3. Drag a valid card to a tableau column with the real mouse (`page.mouse`) → lands; score +5 where applicable.
4. Drag to an invalid target → card returns to origin; state unchanged.
5. Drag a multi-card stack between columns.
6. Click-to-move a card to a foundation.
7. Undo via button and via keyboard.
8. Load a near-won state, make the final move, see the win dialog at once with confetti over
   it (confetti never blocks clicks, ends by itself); click "Play again" → fresh deal.
9. Load an auto-completable state → game finishes by itself.
10. Mobile viewport (375×667): board fits without horizontal scroll; tap-to-move works.
11. Screenshot initial deal, mid-drag, and win dialog to `e2e/screenshots/`
    (for manual review; not pixel-diffed).

## E. Manual verification checklist (agent does this before finishing)

- Run `npm run dev`, look at the Playwright screenshots, confirm the visual
  spec (§7) is met and nothing overlaps or clips.
- Play at least one full game programmatically via a script that uses the
  engine's solver-free greedy strategy plus `loadState`, and confirm the UI
  reaches the win dialog.

## F. Layout, card art, settings, and backgrounds (added in revision 2)

### Pure-function tests
- `layout.ts` side layout (width ≥ 600): left column (stock + waste fan),
  7 tableau columns, right column (4 foundations stacked vertically) fit the
  viewport width with no overlap at 1280×720, 1440×900, 1920×1080, 1024×768,
  and 800×600; 4 foundations fit the height; tableau horizontally centered (within 1
  px); left column's left edge and right column's right edge are both at
  the edge margin (≈ 0.25 × card width, ≥ 16 px) from the viewport edges;
  at least one column gap between each side column and the tableau; card
  width within min/max.
- `layout.ts` narrow layout (width < 600): top-row arrangement fits 375 px
  and 320 px wide with no horizontal overflow.
- Waste fan selector (pure): returns the last ≤ 3 waste cards in display
  order with only the newest marked interactive; correct for waste sizes
  0, 1, 2, 3, 10; after playing the top card the fan shows the next 3.
- `hitTest.ts`: drop targets work for the vertically stacked foundations
  (dropping on F3 in the right column targets foundation index 2).

### Revision 3 additions
- `layout.ts`: card width equals 0.88 × the space-limited width (within 1
  px) and never exceeds 105 px; existing layout-fit tests still pass at all
  listed viewports.
- Revision 4: no side band / shading / overlay elements exist in any layout
  (assert none rendered; delete the old band tests).
- Every pixel scene: buffer is 160×90; no checkerboard dithering (fewer than
  1% of 2×2 windows form an `a b / b a` checker pattern).
- Night city: lit-window ratio is between 0.38 and 0.48 of all window cells.

### Card art
- Every one of the 52 cards renders: exactly one rank text in the top-left,
  exactly one suit symbol in the top-right, and one center element; correct
  suit color on all three; correct `aria-label`.
- Center element is the large suit symbol for A and 2–10, and a portrait
  headshot (e.g. `data-testid="portrait-king"`) for J / Q / K — not a letter.
- The three ranks render structurally different headwear (king crown, queen
  tiara, jack cap with feather); King has a beard; per-suit hair colors
  differ so all 12 face cards produce distinct SVG markup.
- No other content: no bottom-right index, no pips (assert the number of
  suit-symbol elements on a 7 is exactly 2: corner + center).
- Card back renders the same for all cards.

### Pixel scenes (`src/themes`)
- For each of the 5 scenes: buffer is 160×90; every pixel alpha = 255; every
  pixel color is in the scene's declared palette (≤ 24 colors); ≥ 8 distinct
  colors used; deterministic (two renders are byte-identical, and the SHA-1/
  FNV hash matches a stored snapshot); calm-zone variance < bottom-band
  variance (see THEMES.md).
- `PixelBuffer` helpers: `fillRect` clips at edges, `ditherGradient`
  produces only its two colors with the expected ratio per band, `ridge`
  fills below the line.

### Settings component tests
- ☰ button has `aria-label="Settings"`, toggles `aria-expanded`, opens the
  panel, focus moves into panel; Escape / ✕ / backdrop close it and focus
  returns to ☰.
- Panel lists exactly 6 options with the names from SPEC §7.1; exactly one
  `aria-checked="true"`; arrow keys move selection.
- Selecting a background updates the app's background element (data
  attribute e.g. `data-background="aurora"`), writes
  `localStorage["solitaire.background"]`, and does **not** change game state,
  score, moves, or undo history.
- On mount, a stored valid id is restored; an invalid id or a throwing
  `localStorage` (mock getItem/setItem to throw) falls back to `classic`
  without errors.
- While the panel is open, clicking a card and Ctrl+Z do nothing.

### E2E additions
12. Side layout at 1280×800: stock is left of tableau column 1; all 4
    foundations are right of tableau column 7 and stacked top-to-bottom;
    tableau is horizontally centered; stock and foundations sit at the edge
    margin from the left/right viewport edges.
13. Draw 4 cards: exactly 3 waste cards visible, vertically fanned, newest at
    the bottom; clicking the newest plays it (if legal) and the fan reflows;
    clicking a non-newest waste card does nothing.
14. Open settings, pick each of the 6 backgrounds in turn, take a screenshot
    of the full board for each (`e2e/screenshots/bg-<id>.png`), reload, and
    confirm the last choice persisted.
15. Narrow viewport 375×667: fallback layout, no horizontal scroll, settings
    panel usable.
16. Screenshots for review: `cards-closeup.png` (a zoomed region showing
    A, 7, 10, J, Q, K across both colors and a card back, plus a fanned
    column showing corner rows are readable) and the side-layout
    initial deal.

### Manual review (agent)
- Look at every `bg-*.png`, `cards-closeup.png`, and the initial-deal
  screenshot. Confirm: cards legible over every background, top bar readable,
  empty slots visible, pixel art crisp (no blurry scaling), scenes match the
  descriptions in THEMES.md, every card matches the SPEC §7 card layout exactly.

## G. God mode (revision 5)

### Solver (`src/engine/solver.ts`, pure)
- Candidate moves: safe foundation moves (A, 2, or both opposite-color
  foundations at rank − 1) are forced; unsafe foundation moves come first;
  then reveals, waste → tableau, column-emptying moves, partial moves that
  free a foundation card, then draw/recycle. Pointless moves are pruned (King
  already at a column bottom, partial moves that free nothing, a second empty
  column for the same stack). Every candidate is legal.
- `positionKey` ignores column and foundation order but distinguishes hidden
  cards, stock order and waste.
- `solve`: empty line when auto-complete can already finish; finds and proves
  the shortest line on a small fixture; plays through the stock; `unsolvable`
  for a dead position and for a real unwinnable deal (exhaustive), with the
  best partial line; `gave-up` when the node budget runs out; solves real
  deals with lines that replay legally to a win; shortening never makes a
  line longer.

### Hook, client, worker
- `useGodMode`: one move per 500 ms; hands over to auto-complete and stays
  active until won; unsolvable / gave-up notes; stops if a planned move is
  illegal; Stop cancels a pending solve and ignores late results; solver
  failure note; only starts from a game in progress, never twice; a new deal
  cancels it; unmount cancels the solve.
- `solverClient`: inline fallback without Web Workers; module worker gets the
  position and resolves with its reply; worker errors reject; cancel
  terminates. The worker replies with `solve(position)`.

### App integration
- Settings panel has the God mode section; the button starts it and closes
  the panel; status pill text; one move per 500 ms until the win dialog; board,
  Undo and Ctrl+Z locked while active; Stop (pill or panel) hands the game back
  with moves kept and undoable; auto-complete runs at 500 ms while active; New
  game stops it; unwinnable note can be dismissed; button disabled after a win.

### E2E
18. Real deal: moves arrive ~0.5 s apart; Undo disabled while playing; Stop
    freezes the board state and re-enables Undo. Screenshots
    `god-mode-settings.png`, `god-mode-playing.png`.
19. Real deal with the delay sped up via `window.__solitaire.setGodModeDelay`:
    god mode wins on its own (real Web Worker).

### Revision 6: speed slider and button style
- The God mode button shows only its text (no emoji anywhere).
- While active, the status pill has a "Speed" slider: min 50, max 1000 (mirrored so right =
  faster), starts at 0.5 s; all the way right plays a move after 50 ms, all the way left after
  1000 ms; the pace label and `aria-valuetext` update.
- Card move animations last `godModeAnimationMs(delay)` = 60% of the pause (≥ 30 ms) while god
  mode is active.
- E2E 19 drags the slider to fastest and god mode wins a real deal on its own.

### Revision 7: Undo all
- `undoAll(history, current)` returns the oldest state and an empty history; no-op when empty.
- Reducer `UNDO_ALL` returns to the deal in one step (same `dealId`); ignored at the start,
  during auto-complete and after a win.
- App: the button sits right after Undo, is disabled at the start, restores the deal (cards,
  re-hidden face-down cards, waste, score 0, moves 0) and then both undo buttons are disabled;
  disabled while god mode plays.
- E2E 7b: five draws then Undo all → moves 0, empty waste, 24-card stock.

## H. Animated backgrounds (revision 8)

- Renderer (`createAnimator`): base + plates + moving layers composite in order; frame 0
  equals the still render; frames are deterministic; one buffer is reused for every frame.
- Every scene, at frames 0, 1, 37, 72 and ~1170: opaque, palette-only, calm zone calmer than
  the bottom band; snapshot hashes for frames 0 and 37.
- Every scene animates (> 20 pixels change over 10 s) and fewer than 2% of the calm-zone
  pixels ever change.
- Night city: antenna lights blink; switching windows are a small share and toggle.
- `PixelCanvas`: still canvas and no loop when not animating; 12 fps (paints only on a new
  frame number); stops on unmount; shares the buffer with `ImageData` when available; no 2D
  context → nothing.
- Settings switch "Animate backgrounds": on by default; off stops the loop and persists;
  storage failures fall back to on; reduced motion never animates.
- E2E 20–22: each pixel scene's canvas changes over 0.7 s; the switch freezes it and survives
  a reload; reduced motion keeps it still; no long tasks while animating.

## I. Pixel cards (revisions 10 and 14: the only card style)

- Every glyph bitmap is rectangular and uses only `X`/`.`; every rank label has 9-pixel-tall
  glyphs ("10" = "1" + "0" with one pixel between); `bitmapPath` merges row runs into rects.
- All 52 cards: no `<text>`; one rank path (top-left, inside the corner row, suit color, crisp
  edges, `data-rank`); one corner suit (top-right, never touching the rank); a centered pixel
  suit for A–10 and a pixel portrait for J/Q/K (per-suit hair and clothing, chest suit).
- Portrait bitmaps are 24×24 with known color codes and keep the crown/beard, tiara/long hair
  and cap/feather cues.
- Empty foundations show their own pixel suit and name it.

## J. Title screen (revision 16)

- Pixel fonts: every glyph rectangular and the right height; every string the title screen
  writes has glyphs; layout with gaps; `dilate` and `rowsOnly`.
- `PixelText` viewBox matches the bitmap; `PixelTitle` has shadow, outline, fill, highlight and
  shade layers.
- `TitleScreen`: heading "Solitaire", four pixel cards, Play focused; cycles all five tables
  every 5 s with the previous one kept during the crossfade, wrapping around; dots jump and
  mark the current table; Play fades out then starts once; Enter starts; reduced motion starts
  at once.
- App: opens on the title screen and Play deals a game; `?seed=` or a passed seed skips it.
- E2E 23–25: title visible and animated, dots work, Enter enters the game; a deal link skips
  it and reduced motion starts at once; phone fit and tap to play. Screenshots
  `title-screen.png`, `title-screen-deep-sea.png`, `title-screen-phone.png`.
