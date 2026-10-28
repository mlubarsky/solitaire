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
│ ⚙  [logo] Solitaire      Score  Moves        ↶ Undo  ⏪ Undo all  ⟳ New │
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
  Built up by suit from Ace to King. **Each suit has its own foundation**, top
  to bottom ♠ ♥ ♦ ♣: an Ace can only go on its own suit's foundation, and each
  empty foundation shows a faint symbol of its suit.
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
- **Settings menu** (gear icon button at the far left of the top bar,
  `aria-label="Settings"`, `aria-expanded` reflecting state): opens a panel
  that slides in from the left over the board (with a dimmed backdrop). The
  panel has its own theme: dark frosted glass (like the top bar) with cream text and gold accents
  (headings, dividers, selected options, switch). It
  contains one section, **"Table background"**, showing the 6 backgrounds from
  §7.1 as a grid of labeled thumbnails (a radio group: `role="radiogroup"`,
  each option `role="radio"` with `aria-checked`, arrow-key navigable).
  - Selecting a background applies it immediately, behind the live game, with
    no effect on game state, score, or history.
  - The selected thumbnail shows a highlighted border and a check mark.
  - Close via an ✕ button, the Escape key, or clicking the backdrop. Focus
    moves into the panel when it opens and returns to the gear button on close.
  - Below the grid, an **"Animate backgrounds"** switch (`role="switch"`, on by
    default, persisted in `localStorage` under `solitaire.animateBackground`).
    Pixel scenes animate only when it is on and the system does not ask for
    reduced motion; otherwise they show a still frame. See THEMES.md.
  - The choice is persisted in `localStorage` under `solitaire.background`
    (wrap every access in try/catch; unknown or unreadable value → default
    "Classic green"). It is restored on reload.
  - While the panel is open, game input (clicks/drags on the board, Ctrl+Z)
    is ignored.
- **Change table** (a paint-palette icon button right after the gear, `aria-label="Change
  table"`, `aria-expanded`): opens a small glass/gold popover under the top bar, "Choose a
  table", with the same six thumbnails as Settings in a 3×2 radio group. A pick applies at once
  (and is saved) and the popover stays open, with no dimming, so each table can be tried on the
  live board. Escape or a click outside closes it; focus starts on the current table and
  returns to the palette button. Below 380 px wide the header hides the logo mark to make room.
- **How to play** (a "?" icon button after the palette button, `aria-label="How to play"`; also a
  "HOW TO PLAY" outlined button under PLAY on the title screen): opens a dialog in the same
  glass/gold theme with the Easy-mode rules in short pixel-font lines, in five sections: Goal
  (with a mini A-2-3 of hearts), Columns (with a mini K-Q-J-10 cascade), The deck, Handy
  (click/drag, undo, changing the table, auto-finish) and Scoring (a table built from the engine's points). Only
  the rules scroll; "Got it" stays visible. Closes with Got it or Escape, and focus returns to
  the button that opened it. Only one of Settings, Change table and How to play is open at a
  time. While any is open the board and Ctrl+Z are ignored; while the rules are open on the
  title screen, its Enter and arrow shortcuts are too. On screens 420 px wide or less,
  each picture moves under its text.
- **God mode** (settings section below the backgrounds): a "God mode" button that makes the computer finish the current game.
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

- Show the modal right away: "You win!" with final score and moves, and a
  "Play again" button that starts a new game. Dialogs use the settings
  panel's theme (dark frosted glass, cream text, gold accents; the win title
  and primary button are gold).
- At the same time, a short burst of confetti (paper pieces in the game's
  gold, red, cream, green, blue and pink) falls from the top of the screen
  over everything for a few seconds (at most 4.5 s), once per win. It never
  blocks input.
- Respect `prefers-reduced-motion`: no confetti; shorten other animations to
  near-zero.

### Title screen

- The app opens on an 8-bit title screen (unless a specific deal was asked for with `?seed=`,
  which goes straight to the board). Pressing **PLAY** (or Enter anywhere; tap on phones) fades
  to black in a few hard steps (~0.45 s) and shows a freshly dealt game.
- **Table showcase and pick:** all six tables (Classic green felt and the five animated pixel
  scenes) cycle full-screen, 5 s each, with a stepped ~0.9 s crossfade, darkened at the edges
  (vignette) with faint CRT scanlines. It starts on the saved table. At the bottom: a gold
  "PLAY ON" caption, "◀ TABLE NAME ▶" arrow buttons, and one square dot per table. The arrows,
  dots or ←/→ keys pick a table, which stops the cycling. **The game starts on the table that
  is showing when Play is pressed**, and that becomes the saved background. Play's accessible
  description names the table.
- **Center:** a fan of four pixel cards (A♠, K♥, Q♣, J♦) gently bobbing; the "SOLITAIRE" title
  in a bold 9-pixel-tall pixel font (gold with a light top band, darker bottom band, dark
  outline and a drop shadow); "KLONDIKE · DRAW ONE" in a 5×7 pixel font; a chunky gold pixel
  PLAY button with stepped corners and a bevel (focused on load); a blinking "PRESS ENTER"
  (hidden on touch screens).
- All motion uses stepped (8-bit) timing. Under reduced motion: no animations, still
  backgrounds, Play starts at once. The "Animate backgrounds" setting also applies.

## 7. Visual spec

- **Background**: chosen in Settings (§6). See §7.1 for the 6 options. Full
  viewport, no page scroll on desktop. The background is fixed behind the
  board and covers the viewport at any size/aspect (`object-fit: cover`
  behavior, anchored to the bottom so the horizon/ground stays visible).
- **Top bar**: dark translucent strip across the top with, left to right:
  gear (⚙) settings button, the logo (two fanned cards — a blue back and a white
  card with a red heart — plus a bold "Solitaire" wordmark; only the card mark on
  phones, with the name kept for screen readers), then centered **Score** and
  **Moves** readouts, and on the right **Undo** and **New game**
  buttons. White text. Must stay readable over every background.
- **Empty pile slots**: rounded rectangle outlines with semi-transparent white
  border **and a semi-transparent dark fill** (≈ `rgba(0,0,0,0.18)`) so they
  are visible over busy pixel-art backgrounds. Foundations show a faint symbol of their suit
  in the empty slot; the empty stock shows a circular "recycle" arrow icon
  when the waste has cards, and an empty outline/"✕" when both stock and
  waste are empty.
- **Cards — 8-bit pixel style (the only card style).** The card shape is a
  clean, flat card; only what's printed on it is pixel art, moderately chunky
  (about halfway between smooth and full 8-bit), drawn as crisp-edged SVG
  rectangles. Every face follows one minimal layout, and nothing else is drawn
  on it:
  - **Top-left corner:** the rank, once (`A`, `2`–`10`, `J`, `Q`, `K`), in a
    bold pixel font 9 pixels tall with 2-pixel strokes.
  - **Top-right corner:** the suit, once, on the same pixel grid as the rank.
  - **Center:** for **A and 2–10**, one large 13-pixel suit. For **J, Q, K**, a
    24 × 24 pixel-art headshot on the same pixel grid as the corner:
    - **King:** jeweled gold crown and a full beard.
    - **Queen:** gold tiara with a jewel, long hair, gold necklace.
    - **Jack:** cap in the suit's dark color with a gold band and a feather.
    - Clothing uses the suit color family (red suits: reds; black suits:
      charcoal/navy) with a tiny white suit on the chest; hair color varies by
      suit (spades black, hearts auburn, diamonds blond, clubs brown) so all
      12 face cards look distinct.
  - **No** bottom-right/rotated index, **no** pip layouts, no frames.
  - Color: red `#d32f2f` (hearts, diamonds), near-black `#1f1f1f` (spades,
    clubs) for the rank and suits.
  - Flat, clean face: pure white, rounded corners (~7% of width), a very faint
    1 px `rgba(0,0,0,0.12)` edge, soft drop shadow (`0 1px 3px rgba(0,0,0,.3)`).
  - In fanned tableau columns, only the top strip of a covered card shows; the
    rank (left) and suit (right) must both be readable in that strip, so the
    face-up fan offset must be at least the height of the corner row.
  - **Card back**: rounded white border (~5% of width) around a blue
    (`#1a73e8`) field with a subtle 8-bit pattern: an 8×8-pixel stepped
    diamond with a 2×2 center dot in a lighter blue (`#4a90ee`), tiling into a
    pixel diamond lattice, on the same pixel size as the card faces. Same back
    for every card.
  - The corner rank and suit must remain legible at the minimum card width.
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

### 7.2 Pixel font across the interface

- All interface text uses the title screen's pixel fonts (uppercase): the 5×7 font for labels,
  numbers, buttons, settings, dialog text and the god-mode bar; the bold 9-pixel-tall font with
  the gold outlined arcade treatment for "SOLITAIRE" in the header (a small copy of the title
  screen logo, next to a pixel-art card mark) and "YOU WIN!" in the win dialog. The browser-tab
  icon is the same pixel card mark.
- Each word is drawn as its own small pixel image, so longer text wraps like normal text. The
  real text stays in the page (visually hidden) for screen readers.

## 8. Out of scope

Hard mode / draw-3, hints, statistics, persistence of the game across reloads
(only the background choice persists), sounds, multiplayer, accounts, Vegas
scoring, any timer/clock or time-based scoring.
