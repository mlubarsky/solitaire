# Architecture

```
src/
  engine/                 # pure TS, no React/DOM/time/Math.random
    types.ts              # Suit, Rank, Card, PileId, GameState, Move, MoveResult
    rng.ts                # seeded PRNG (mulberry32) + shuffle (Fisher–Yates)
    deck.ts               # createDeck(), cardId(), color(), labels
    deal.ts               # newGame(seed): GameState
    rules.ts              # canStackOnTableau, canPlaceOnFoundation, isMovableStack
    moves.ts              # getLegalMoves(state), applyMove(state, move): MoveResult
    scoring.ts            # scoreForMove(move, flipped): number
    autoMove.ts           # findAutoMove(state, source): Move | null   (click behavior)
    autoComplete.ts       # canAutoComplete(state), nextAutoCompleteMove(state)
    history.ts            # pushHistory, undo — immutable stack of GameState
    status.ts             # isWon(state)
    solver.ts             # god mode: candidateMoves, positionKey, solve (branch-and-bound)
    invariants.ts         # assertValidState(state) — used by tests & dev builds
    index.ts              # public API barrel
  state/
    gameReducer.ts        # React reducer wrapping the engine (NEW_GAME, MOVE, UNDO, DRAW…)
    useGame.ts            # hook: reducer + auto-complete scheduling
    useGodMode.ts         # god mode: solve, then play one move every 500 ms
    solverClient.ts       # runs solve() in a Web Worker (inline fallback)
    solver.worker.ts
  ui/
    App.tsx
    TopBar.tsx            # title, score/moves, Undo, New game
    Board.tsx             # lays out piles, measures pile rects for hit-testing
    Pile.tsx              # stock / waste / foundation / tableau rendering
    Card.tsx              # face + back rendering, aria-label
    useDrag.ts            # pointer-event drag/drop + click-vs-drag threshold
    hitTest.ts            # pure: pick drop target by max overlap (unit-tested)
    layout.ts             # pure: card size, fan offsets, column compression (unit-tested)
    Confetti.tsx          # canvas confetti burst on a win
    WinDialog.tsx
    ConfirmDialog.tsx
    RulesDialog.tsx       # "How to play": short rules, mini cards, scoring from POINTS
    styles/*.css
  themes/
    themes.ts             # registry: { id, name, kind: 'felt' | 'pixel', scene?, palette? }
    pixelBuffer.ts        # pure RGBA buffer + drawing helpers (dither, ridge, rects)
    scenes/               # nightCity.ts, aurora.ts, iceMountains.ts, forest.ts, ocean.ts (deep sea)
    scene.ts              # layered scenes + createAnimator (cached static layers, 12 fps frames)
    useBackground.ts      # selected theme + animate switch, localStorage persistence (try/catch)
  ui/settings/
    SettingsButton.tsx    # gear in TopBar
    SettingsPanel.tsx     # slide-in panel: backgrounds, animate switch, god mode
    BackgroundPicker.tsx  # the six-table radio group (settings panel + quick picker)
    TablePicker.tsx       # palette button and its quick "Choose a table" popover
  ui/background/
    PixelBackground.tsx   # renders a scene buffer to a <canvas>, pixelated, cover
    FeltBackground.tsx
  ui/cards/
    CardFace.tsx          # pixel face: rank top-left, suit top-right, big suit or portrait center
    pixelGlyphs.ts        # rank font and suit bitmaps, bitmap → SVG path
    PixelPortrait.tsx     # J/Q/K pixel headshots and their colors
    CardBack.tsx
    suitPaths.ts          # SVG path data for the 4 suits
  ui/title/
    TitleScreen.tsx       # 8-bit title screen: table showcase, title, card fan, PLAY
    PixelText.tsx         # PixelText, Pixel (wrapping UI text) and the outlined arcade title
    pixelFont.ts          # 5×7 and bold 9-tall pixel fonts, text → bitmap, outline
  testHooks.ts            # window.__solitaire in DEV/test only
  main.tsx
tests/                    # or colocated *.test.ts(x) next to sources — pick one and be consistent
e2e/                      # Playwright specs
```

## Data model (suggested)

```ts
type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type Rank = 1|2|3|4|5|6|7|8|9|10|11|12|13;
interface Card { id: string; suit: Suit; rank: Rank; faceUp: boolean } // id e.g. "H7"

type PileId =
  | { kind: 'stock' } | { kind: 'waste' }
  | { kind: 'foundation'; index: 0|1|2|3 }
  | { kind: 'tableau'; index: 0|1|2|3|4|5|6 };

interface GameState {
  seed: number;
  stock: Card[];        // last element = top
  waste: Card[];        // last element = top
  foundations: [Card[], Card[], Card[], Card[]];
  tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]];
  score: number;
  moves: number;
}

type Move =
  | { type: 'draw' }                                   // stock -> waste
  | { type: 'recycle' }                                // waste -> stock
  | { type: 'transfer'; from: PileId; to: PileId; count: number };

type MoveResult = { ok: true; state: GameState; flipped: boolean }
                | { ok: false; reason: string };
```

String-literal pile ids (e.g. `"t3"`, `"f0"`) are also fine if simpler — be consistent.

## Boundaries

- The reducer holds `{ game: GameState, history: GameState[], phase: 'playing' | 'autocompleting' | 'won' }`.
- `applyMove` validates everything. The UI dispatches intents (click source,
  drop on target); invalid intents produce `{ ok: false }` and no state change.
- Auto-complete is driven by `useGame` with `setTimeout` stepping
  `nextAutoCompleteMove`; the engine itself is synchronous.
- `layout.ts` and `hitTest.ts` are pure functions so drag/drop geometry is
  unit-testable without a real browser.
