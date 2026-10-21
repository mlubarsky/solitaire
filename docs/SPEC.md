# Game Specification

Klondike Solitaire, modeled on Google Solitaire, **Easy mode only**.

## 1. Cards and deck

- Standard 52-card deck: 4 suits (♠ spades, ♥ hearts, ♦ diamonds, ♣ clubs) ×
  13 ranks (A, 2–10, J, Q, K). Ace is low (rank 1), King is high (rank 13).
- Red suits: hearts, diamonds. Black suits: spades, clubs.
- Each card is face-up or face-down.

## 2. Layout

Three-column "side" layout (desktop / landscape, viewport width ≥ 600 px):

```
┌──────────────────────────── top bar ────────────────────────────┐
│ ☰  Solitaire             Score  Moves               ↶ Undo  ⟳ New │
├──────────────────────────────────────────────────────────────────┤
│ [Stock]   T1  T2  T3  T4  T5  T6  T7                    [F1]     │
│           ▒   ▒   ▒   ▒   ▒   ▒   ▒                              │
│ [Waste 1]     ▒   ▒   ▒   ▒   ▒   ▒                     [F2]     │
│ [Waste 2]         ▒   ▒   ▒   ▒   ▒                              │
│ [Waste 3]             ▒   ▒   ▒   ▒                     [F3]     │
│                           ▒   ▒   ▒                              │
│                               ▒   ▒                     [F4]     │
└──────────────────────────────────────────────────────────────────┘
```

- **Left column**: the **Stock** (face-down draw pile) at the top. Directly
  below it, the **Waste**: the last **3** drawn cards are shown fanned
  vertically, each overlapping the one before it (offset ≈ 22% of card
  height), with the **most recently drawn card at the bottom of the fan, fully
  visible, and the only interactive waste card**. Fewer than 3 cards in the
  waste → show what there is. When the top waste card is played, the fan
  re-forms from the remaining waste (the next-most-recent cards slide into
  view). Older waste cards beyond the last 3 are not rendered (or are rendered
  hidden directly under the oldest visible one).
- **Center**: the 7 **Tableau** columns, horizontally centered in the play
  area. Cards fan downward. This is the main play area and gets most of the width.
- **Right column**: the 4 **Foundations** stacked vertically, top to bottom.
  Built up by suit from Ace to King. A foundation is not pre-assigned a suit;
  the first Ace placed there decides it.
- **Horizontal placement**: the 7 tableau columns are centered horizontally
  in the viewport. The **left column is pushed out to the left edge** of the
  screen and the **right column to the right edge**, each inset by the same
  small edge margin (≈ 0.25 × card width, never less than 16 px). On wide
  screens the extra space therefore sits between the side columns and the
  tableau, not outside the side columns. There must be at least a normal
  column gap between each side column and the tableau.
- Cards are as large as possible (up to the max card width, then × the card
  scale) while edge margins, both side columns, 7 tableau columns and gaps
  fit the width, and the 4 foundations fit the height.
- The background behind the side columns is the same as everywhere else: no
  bands, panels, overlays, shading, or vertical lines separating the columns.

**Narrow / portrait fallback** (viewport width < 600 px, e.g. phones): use a
compact top-row layout so cards stay tappable: Stock + the 3-card waste fanned
**horizontally** at top-left, 4 foundations at top-right, 7 tableau columns
below. All the waste rules above still apply (last 3 shown, newest on the
right and the only one interactive).

## 3. Deal

- Shuffle with the seeded RNG (Fisher–Yates).
- Tableau column *i* (1-indexed) receives *i* cards; only the last card of each
  column is face-up. Total 28 cards dealt.
- Remaining 24 cards go to the stock, face-down.
- Waste and foundations start empty.

## 4. Rules (Easy mode)

### Legal moves

| From | To | Rule |
|---|---|---|
| Stock | Waste | Click stock: move the top 1 card to the waste, face-up. |
| Waste (empty stock) | Stock | Click the empty stock: move all waste cards back to stock, face-down, preserving draw order (the first card drawn earlier is drawn first again). **Unlimited** recycles. If both stock and waste are empty, clicking does nothing. |
| Waste top | Tableau | Card must be one rank lower and opposite color of the target's top card; or a King onto an empty column. |
| Waste top | Foundation | Ace onto empty foundation; otherwise same suit, one rank higher. |
| Tableau (any face-up card + all cards on top of it) | Tableau | The moved stack's bottom card must be one lower and opposite color of target top card; or bottom card is a King and target column is empty. A face-up sequence in the tableau is always validly built, so moving any face-up card with the cards below it is allowed. |
| Tableau top card | Foundation | Same as waste→foundation. Only a single card moves. |
| Foundation top | Tableau | Allowed (same tableau rules). |

- Face-down cards can never be moved or selected.
- When a tableau move exposes a face-down card at the top of a column, it is
  flipped face-up **automatically** as part of the same move (one undo step
  undoes both).
- Nothing can be placed on the stock or waste by the player.

### Winning

The game is won when all 52 cards are on the foundations.

### Auto-complete

When the stock and waste are both empty and every tableau card is face-up,
the game automatically plays all remaining cards to the foundations, one at a
time with a short animation (~80–120 ms per card), lowest available rank
first. Input is ignored during auto-complete. Auto-complete moves award normal
scoring points. Undo is disabled once auto-complete starts.

## 5. Scoring and moves

There is **no timer or clock anywhere** in the game (no time readout, no
time in the win dialog, no time-based scoring).

Standard Windows/Google-style scoring for draw-1:

| Event | Points |
|---|---|
| Waste → Tableau | +5 |
| Waste → Foundation | +10 |
| Tableau → Foundation | +10 |
| Tableau card turned face-up (auto-flip) | +5 |
| Foundation → Tableau | −15 |
| Recycle waste to stock | −100 |

- Score never goes below 0 (clamp after each move).
- Tableau → Tableau and Stock → Waste: 0 points.
- **Moves counter** increments by 1 for every applied move, including draws and
  recycles. Auto-flip is part of the move that caused it, not a separate move.
- **Undo all** (button right after Undo in the top bar, with a double
  back-arrow icon): reverts straight to the start of the current game (the
  deal, or the loaded position) in one step: board, score 0 and moves 0 as
  dealt; history is cleared. Enabled exactly when Undo is (also locked while
  god mode plays). Icon-only below 600 px like the other buttons.
- **Undo** reverts to the exact previous state: board, score, and moves count
  (the moves counter goes back too). Unlimited undo. Undo is disabled at game
  start and during/after auto-complete and after a win. Keyboard: `Ctrl+Z` /
  `Cmd+Z`.

## 6. Interaction

### Click / tap (primary, like Google)

- **Click stock** → draw (or recycle if empty).
- **Click a face-up card** (waste top, foundation top, or any face-up tableau
  card) → auto-move it to the best destination via `findAutoMove`:
  1. If it is a single card (top of its pile) and can go to a foundation → foundation.
  2. Else a non-empty tableau column where it fits, scanning left-to-right
     starting from the column after the source (wrapping), skipping the source.
  3. Else an empty tableau column, only if the moving stack's bottom card is a
     King **and** the move is not pointless (a King that is already the bottom
     card of its column with nothing under it must not hop to another empty
     column).
  4. Foundation cards only go to the tableau (steps 2–3).
  5. If no legal move exists: play a short horizontal "shake" animation on the
     card(s); state does not change; nothing is added to history.
- Clicking a face-down card does nothing.

### Drag and drop

- Implement with **pointer events** (works for mouse and touch); do not use
  the HTML5 drag-and-drop API.
- Pressing on a face-up card and moving more than ~5 px begins a drag of that
  card plus every card above it in the column. Movement under the threshold is
  a click.
- The dragged stack follows the pointer with its original grab offset, renders
  above everything, and has a subtle drop shadow.
- On release, determine the drop target by the greatest overlap between the
  dragged card's rect and pile rects. If legal, apply the move; otherwise
  animate the cards back to their origin (~150 ms).
- Only one drag at a time; ignore multi-touch.

### Other controls

- **New game** button: starts a new random deal immediately (new seed). If a
  game is in progress with ≥1 move, ask for confirmation in an in-app dialog
  (not `window.confirm`).
- **Undo** button (with icon) in the top bar.
- **Settings menu** (☰ hamburger button at the far left of the top bar,
  `aria-label="Settings"`, `aria-expanded` reflecting state): opens a panel
  that slides in from the left over the board (with a dimmed backdrop). It
  contains one section, **"Table background"**, showing the 6 backgrounds from
  §7.1 as a grid of labeled thumbnails (a radio group: `role="radiogroup"`,
  each option `role="radio"` with `aria-checked`, arrow-key navigable).
  - Selecting a background applies it immediately, behind the live game, with
    no effect on game state, score, or history.
  - The selected thumbnail shows a highlighted border and a check mark.
  - Close via an ✕ button, the Escape key, or clicking the backdrop. Focus
    moves into the panel when it opens and returns to the ☰ button on close.
  - Below the grid, an **"Animate backgrounds"** switch (`role="switch"`, on by
    default, persisted in `localStorage` under `solitaire.animateBackground`).
    Pixel scenes animate only when it is on and the system does not ask for
    reduced motion; otherwise they show a still frame. See THEMES.md.
  - The choice is persisted in `localStorage` under `solitaire.background`
    (wrap every access in try/catch; unknown or unreadable value → default
    "Classic green"). It is restored on reload.
  - While the panel is open, game input (clicks/drags on the board, Ctrl+Z)
    is ignored.
- **God mode** (second section of the settings panel, below the background
  picker): a "God mode" button that makes the computer finish the current game.
  The button has no icon or emoji; it is styled with a loud, animated
  multicolor gradient (static under reduced motion).
  - Pressing it closes the panel. God mode first works out a line (the solver
    knows every face-down card and the stock order), then plays it on the real
    board **one move every 0.5 s**, each with the normal move animation. Moves
    count and score normally and stay undoable afterwards.
  - It plays the **shortest winning line it can find** within a few seconds of
    searching (shortest = fewest moves, counting draws). Once the board can
    auto-complete, auto-complete finishes the game at the same 0.5 s pace.
  - If the deal can't be won (proven by exhausting the search), or no win is
    found within the search budget, it plays the line that gets the most cards
    onto the foundations, then shows a short note saying so.
  - While it runs, a status pill at the bottom center shows "working out the
    best line…", then "move N of M" (or "finishing the game"), a **Speed**
    slider, and a **Stop** button. The slider runs from 1 s per move (left) to
    0.05 s per move (right) in 0.05 s steps, starting at 0.5 s, and shows the
    current pace. It applies immediately, to auto-complete too, and card move
    animations last 60% of the pause (at least 30 ms) so moves never overlap.
    The chosen speed lasts for the session. The board, Undo and Ctrl+Z are locked; Stop (in the pill or in the
    settings panel, where the button becomes "Stop god mode") hands the game
    back as it stands. New game stops it.
  - The button is disabled when there is no game in progress (won or
    auto-completing).
- No Easy/Hard toggle and no hints. The settings menu contains only the
  background picker and god mode.

### Win

- Play a celebration: cards cascade/bounce off the foundations
  across the screen (classic Windows-style bouncing cards, drawn on a
  `<canvas>`), lasting a few seconds; click or key press skips it.
- Then show a modal: "You win!" with final score and moves, and a
  "Play again" button that starts a new game.
- Respect `prefers-reduced-motion`: skip the cascade and go straight to the
  modal; shorten other animations to near-zero.

## 7. Visual spec

- **Background**: chosen in Settings (§6). See §7.1 for the 6 options. Full
  viewport, no page scroll on desktop. The background is fixed behind the
  board and covers the viewport at any size/aspect (`object-fit: cover`
  behavior, anchored to the bottom so the horizon/ground stays visible).
- **Top bar**: dark translucent strip across the top with, left to right:
  ☰ settings button, game title "Solitaire", then centered **Score** and
  **Moves** readouts, and on the right **Undo** and **New game**
  buttons. White text. Must stay readable over every background.
- **Empty pile slots**: rounded rectangle outlines with semi-transparent white
  border **and a semi-transparent dark fill** (≈ `rgba(0,0,0,0.18)`) so they
  are visible over busy pixel-art backgrounds. Foundations show a faint "A"
  in the empty slot; the empty stock shows a circular "recycle" arrow icon
  when the waste has cards, and an empty outline/"✕" when both stock and
  waste are empty.
- **Cards — exactly Google Solitaire's card design.** Every card face
  follows this one minimal layout, and nothing else is drawn on it:
  - **Top-left corner:** the rank, once (`A`, `2`–`10`, `J`, `Q`, `K`), bold
    sans-serif (e.g. `"Roboto", "Helvetica Neue", Arial`, weight 700).
  - **Top-right corner:** the suit symbol, once, about the same height as the
    rank.
  - **Center:** for **A and 2–10**, one large suit symbol (≈ 50–55% of card
    width). For **J, Q, K**, a small **portrait headshot** of the figure
    (head and shoulders, ≈ 60–65% of card width, centered), drawn as flat
    vector SVG in the clean, friendly style of Google's cards:
    - **King:** older man, full beard and mustache, tall pointed gold crown
      (`#f9a825`) with a few jewel dots.
    - **Queen:** woman with long hair framing the face, smaller rounded gold
      crown/tiara, earrings or necklace.
    - **Jack:** young beardless man, short hair, a soft cap/beret with a
      feather (no crown).
    - Clothing (collar/robe at the shoulders) uses the suit color (red suits:
      reds; black suits: dark navy/charcoal) with a small suit symbol on the
      chest. Vary hair color per suit (e.g. spades black, hearts auburn,
      diamonds blond, clubs brown) so all 12 face cards look distinct.
    - Simple, readable faces: skin tone fill, dot eyes, small nose/mouth
      lines, rosy cheeks. Must read clearly as King / Queen / Jack even at the
      44 px minimum card width (headwear is the main cue).
    - The rank letter is still shown in the top-left corner as for every card.
  - **No** bottom-right/rotated index, **no** pip layouts, and no decorative
    frames or borders around the portrait.
  - Color: red `#d32f2f` (hearts, diamonds), near-black `#1f1f1f` (spades,
    clubs) for the rank, corner suit, and center symbol/letter.
  - Flat, clean face: pure white, rounded corners (~7% of width), a very faint
    1 px `rgba(0,0,0,0.12)` edge, soft drop shadow (`0 1px 3px rgba(0,0,0,.3)`).
  - Suit symbols drawn as SVG paths (not font glyphs) so they render
    identically on every platform.
  - In fanned tableau columns, only the top strip of a covered card shows; the
    rank (left) and suit (right) must both be readable in that strip, so the
    face-up fan offset must be at least the height of the corner row.
  - **Card back**: Google-style flat back — rounded white border (~5% of
    width) around a blue (`#1a73e8`-ish) field with a subtle repeating
    geometric pattern in a slightly lighter blue. Same back for every card.
  - Text in the corner indices must remain legible at the minimum card width.
- **Aspect ratio**: card width:height = 5:7. Card width scales with the
  viewport per the layout rules in §2, then is multiplied by a **card scale of
  0.88** (cards ~12% smaller than the space allows, leaving more breathing
  room around them). Clamp: min ~40 px on phones, max **~105 px** on large
  desktops. Gaps and fan offsets scale with the card width.
- **Tableau fanning**: face-down cards offset ~12% of card height; face-up
  cards ~25%. If a column would overflow the viewport height, compress offsets
  for that column so it fits.
- **Animations**: card moves animate position (~150–200 ms ease-out); flips
  animate a quick scale-X flip. Use CSS transforms only (no layout thrash).
- **Responsive**: playable on desktop and on a 375×667 phone portrait screen.
- **Accessibility**: each card has an `aria-label` like "7 of hearts" or
  "face-down card"; piles have labels ("Tableau column 3", "Foundation 1",
  "Stock, 12 cards", "Waste"). Buttons are real `<button>` elements. Readouts
  use `aria-live="polite"` only for the win message (not every tick).

### 7.1 Table backgrounds

Six options. Full details, palettes, and the rendering approach are in
`docs/THEMES.md`.

| id | Name in menu | Kind |
|---|---|---|
| `classic` (default) | Classic green | Smooth felt: a slightly **lighter** green than before, radial gradient ≈ `#239a52` center → `#18803f` edges, with a very faint felt noise texture. |
| `night-city` | Night city | 8-bit pixel art |
| `aurora` | Aurora | 8-bit pixel art |
| `ice-mountains` | Snowy peaks | 8-bit pixel art |
| `forest` | Woodland | 8-bit pixel art |
| `ocean` | Deep sea | 8-bit pixel art |

## 8. Out of scope

Hard mode / draw-3, hints, statistics, persistence of the game across reloads
(only the background choice persists), sounds, multiplayer, accounts, Vegas
scoring, any timer/clock or time-based scoring.
