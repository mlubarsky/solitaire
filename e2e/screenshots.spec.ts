import { nearWonState } from '../src/test/makeState';
import {
  card,
  dragCardToPile,
  expect,
  loadState,
  openGame,
  pile,
  test,
  waitForAnimations,
} from './fixtures';

const DIR = 'e2e/screenshots';

test('11. screenshots: initial deal, mid-drag, win dialog (desktop)', async ({ page }) => {
  await openGame(page, 42);
  await waitForAnimations(page);
  await page.screenshot({ path: `${DIR}/initial-deal.png` });

  // Play a little so the mid-drag shot has some variety, then drag a stack mid-air.
  for (let i = 0; i < 5; i++) await pile(page, 'stock').click();
  await dragCardToPile(page, 'D9', 't0', { release: false });
  await expect(card(page, 'D9')).toHaveClass(/dragging/);
  await page.screenshot({ path: `${DIR}/mid-drag.png` });
  await page.mouse.up();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadState(page, nearWonState());
  await card(page, 'SK').click();
  await expect(page.getByRole('dialog', { name: 'You win!' })).toBeVisible();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${DIR}/win-dialog.png` });
});

test('11b. screenshots: confetti and phone layout', async ({ page }) => {
  await openGame(page, 42);
  await loadState(page, nearWonState());
  await card(page, 'SK').click();
  await expect(page.getByTestId('confetti')).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${DIR}/confetti.png` });
  await expect(page.getByRole('dialog', { name: 'You win!' })).toBeVisible();

  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByRole('button', { name: 'Play again' }).click();
  await page.goto('/?seed=42');
  await waitForAnimations(page);
  await page.screenshot({ path: `${DIR}/phone-initial-deal.png` });
});
