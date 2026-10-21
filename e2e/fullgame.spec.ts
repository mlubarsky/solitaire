import { getPile, newGame, pileKey, playGreedy, type GameState, type Move } from '../src/engine';
import {
  dragCardToPile,
  expect,
  getState,
  openGame,
  pile,
  readout,
  test,
  waitForAnimations,
} from './fixtures';

/** First seed that the engine's greedy strategy wins (deterministic). */
function winningSeed(): number {
  for (let seed = 1; seed < 2000; seed++) if (playGreedy(newGame(seed)).won) return seed;
  throw new Error('no winning seed found');
}

async function playThroughUi(page: import('@playwright/test').Page, state: GameState, move: Move) {
  if (move.type !== 'transfer') {
    await pile(page, 'stock').click();
    return;
  }
  const source = getPile(state, move.from)!;
  const grabbed = source[source.length - move.count]!;
  await dragCardToPile(page, grabbed.id, pileKey(move.to));
}

test('E. a full game played through the UI with the greedy strategy reaches the win dialog', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const seed = winningSeed();
  const plan = playGreedy(newGame(seed), { stopAtAutoComplete: true });
  expect(plan.moves.length).toBeGreaterThan(50);

  await openGame(page, seed);
  for (let i = 0; i < plan.moves.length; i++) {
    await playThroughUi(page, plan.states[i]!, plan.moves[i]!);
    await waitForAnimations(page);
    // Every UI move must land exactly where the engine says it should.
    if (i % 10 === 9 || i === plan.moves.length - 1) {
      const actual = await getState(page);
      const expected = plan.states[i + 1]!;
      if (i < plan.moves.length - 1) expect(actual).toEqual(expected);
    }
  }
  // The last move made the position auto-completable: the UI finishes the game by itself.
  const dialog = page.getByRole('dialog', { name: 'You win!' });
  await page.waitForFunction(
    () => window.__solitaire!.getState().foundations.every((f) => f.length === 13),
    undefined,
    { timeout: 20_000 },
  );
  await expect(dialog).toBeVisible();
  const final = await getState(page);
  await expect(dialog.getByTestId('win-moves')).toHaveText(String(final.moves));
  await expect(readout(page, 'moves')).toHaveText(String(final.moves));
});
