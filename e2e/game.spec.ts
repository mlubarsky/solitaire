import { makeState, nearWonState, autoCompletableState } from '../src/test/makeState';
import {
  card,
  dragCardToPile,
  expect,
  getState,
  idsIn,
  loadState,
  openGame,
  pile,
  readout,
  test,
  waitForAnimations,
} from './fixtures';

const dragFixture = () =>
  makeState({
    tableau: [['S7'], ['#D2', 'C9', 'H8'], ['C10'], ['D10'], ['HA']],
    waste: ['H6'],
  });

test('1. loads without console errors and renders every pile', async ({ page }) => {
  await openGame(page);
  await expect(page.getByRole('group', { name: /^Tableau column \d$/ })).toHaveCount(7);
  await expect(page.getByRole('button', { name: 'Stock, 24 cards' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Waste' })).toBeAttached();
  await expect(page.getByRole('group', { name: /^Foundation \d$/ })).toHaveCount(4);
  for (let i = 0; i < 7; i++) expect(await idsIn(page, `t${i}`)).toHaveLength(i + 1);
  await expect(readout(page, 'score')).toHaveText('0');
  // SPEC §5: no timer or clock anywhere.
  await expect(page.getByText(/\btime\b|\d{1,2}:\d{2}/i)).toHaveCount(0);
  await expect(page.locator('[role="timer"], time, [data-testid*="time"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

test('2. draws through the whole stock and recycles', async ({ page }) => {
  await openGame(page, 7);
  const stock = pile(page, 'stock');
  for (let i = 1; i <= 24; i++) {
    await stock.click();
    await expect(stock).toHaveAccessibleName(new RegExp(`^Stock, ${24 - i} cards?(,|$)`));
  }
  expect(await idsIn(page, 'waste')).toHaveLength(24);
  await expect(stock).toHaveAccessibleName(/click to recycle/);
  await stock.click();
  await expect(stock).toHaveAccessibleName('Stock, 24 cards');
  expect(await idsIn(page, 'waste')).toHaveLength(0);
  await expect(readout(page, 'moves')).toHaveText('25');
  await expect(readout(page, 'score')).toHaveText('0');
});

test('3. drags a card onto a tableau column with the mouse', async ({ page }) => {
  await openGame(page);
  await loadState(page, dragFixture());
  await dragCardToPile(page, 'H6', 't0');
  expect(await idsIn(page, 't0')).toEqual(['S7', 'H6']);
  await expect(readout(page, 'score')).toHaveText('5');
  await expect(readout(page, 'moves')).toHaveText('1');
});

test('4. an invalid drop returns the card to its origin', async ({ page }) => {
  await openGame(page);
  await loadState(page, dragFixture());
  const before = await getState(page);
  const origin = await card(page, 'H6').boundingBox();
  await dragCardToPile(page, 'H6', 't2'); // red 6 on black 10: illegal
  await waitForAnimations(page);
  expect(await getState(page)).toEqual(before);
  expect(await card(page, 'H6').boundingBox()).toEqual(origin);
  expect(await idsIn(page, 'waste')).toEqual(['H6']);
  await expect(readout(page, 'moves')).toHaveText('0');
});

test('5. drags a multi-card stack between columns', async ({ page }) => {
  await openGame(page);
  await loadState(page, dragFixture());
  await dragCardToPile(page, 'C9', 't3');
  expect(await idsIn(page, 't3')).toEqual(['D10', 'C9', 'H8']);
  expect(await idsIn(page, 't1')).toEqual(['D2']);
  await expect(card(page, 'D2')).toHaveAccessibleName('2 of diamonds'); // auto-flipped
  await expect(readout(page, 'score')).toHaveText('5');
});

test('6. clicking a card moves it to a foundation', async ({ page }) => {
  await openGame(page);
  await loadState(page, dragFixture());
  await card(page, 'HA').click();
  expect(await idsIn(page, 'f0')).toEqual(['HA']);
  expect(await idsIn(page, 't4')).toEqual([]);
  await expect(readout(page, 'score')).toHaveText('10');
});

test('7. undo with the button and with the keyboard', async ({ page }) => {
  await openGame(page);
  await loadState(page, dragFixture());
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await card(page, 'HA').click();
  await card(page, 'H6').click();
  await pile(page, 'stock').click();
  await expect(readout(page, 'moves')).toHaveText('3');
  await undo.click();
  await expect(readout(page, 'moves')).toHaveText('2');
  await page.keyboard.press('Control+z');
  await expect(readout(page, 'moves')).toHaveText('1');
  expect(await idsIn(page, 'waste')).toEqual(['H6']);
  await page.keyboard.press('Meta+z');
  await expect(readout(page, 'moves')).toHaveText('0');
  expect(await idsIn(page, 't4')).toEqual(['HA']);
  await expect(readout(page, 'score')).toHaveText('0');
  await expect(undo).toBeDisabled();
});

test('7b. Undo all goes back to the start of the game in one click', async ({ page }) => {
  await openGame(page, 42);
  const undoAll = page.getByRole('button', { name: 'Undo all' });
  await expect(undoAll).toBeDisabled();
  for (let i = 0; i < 5; i++) await pile(page, 'stock').click();
  await expect(readout(page, 'moves')).toHaveText('5');
  await undoAll.click();
  await expect(readout(page, 'moves')).toHaveText('0');
  expect(await idsIn(page, 'waste')).toEqual([]);
  expect((await getState(page)).stock).toHaveLength(24);
  await expect(undoAll).toBeDisabled();
});

test('8. winning shows the celebration, then the win dialog; Play again deals', async ({
  page,
}) => {
  await openGame(page);
  await loadState(page, nearWonState());
  await card(page, 'SK').click();
  await expect(page.getByTestId('celebration')).toBeVisible();
  const dialog = page.getByRole('dialog', { name: 'You win!' });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('celebration')).toHaveCount(0);
  await expect(dialog.getByTestId('win-score')).toHaveText('510');
  await expect(dialog.getByTestId('win-moves')).toHaveText('121');
  await expect(dialog.getByText(/\btime\b|\d{1,2}:\d{2}/i)).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Play again' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stock, 24 cards' })).toBeVisible();
  await expect(readout(page, 'moves')).toHaveText('0');
  const state = await getState(page);
  expect(state.tableau.map((c) => c.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

test('9. an auto-completable position finishes by itself', async ({ page }) => {
  await openGame(page);
  await loadState(page, autoCompletableState());
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await expect
    .poll(async () => (await getState(page)).foundations.map((f) => f.length))
    .toEqual([13, 13, 13, 13]);
  await expect(readout(page, 'moves')).toHaveText('12');
  // Skip the celebration with a click.
  await page.getByTestId('celebration').click();
  await expect(page.getByRole('dialog', { name: 'You win!' })).toBeVisible();
});

test('reduced motion skips the celebration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGame(page);
  await loadState(page, nearWonState());
  await card(page, 'SK').click();
  await expect(page.getByRole('dialog', { name: 'You win!' })).toBeVisible();
  await expect(page.getByTestId('celebration')).toHaveCount(0);
});

test('new game asks for confirmation once a move has been made', async ({ page }) => {
  await openGame(page, 3);
  const deal = await getState(page);
  await pile(page, 'stock').click();
  await page.getByRole('button', { name: 'New game' }).click();
  const dialog = page.getByRole('dialog', { name: 'Start a new game?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(readout(page, 'moves')).toHaveText('1');
  await page.getByRole('button', { name: 'New game' }).click();
  await dialog.getByRole('button', { name: 'New game' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(readout(page, 'moves')).toHaveText('0');
  expect((await getState(page)).stock).not.toEqual(deal.stock);
});
