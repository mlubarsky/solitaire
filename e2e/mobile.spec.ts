import { makeState } from '../src/test/makeState';
import { card, expect, idsIn, loadState, openGame, pile, readout, test } from './fixtures';

test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

test('10. fits a 375×667 phone without horizontal scroll; tap-to-move works', async ({ page }) => {
  await openGame(page, 42);
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(375);
  expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(375);

  // Every pile is fully inside the viewport.
  for (const key of ['stock', 'waste', 'f0', 'f3', 't0', 't6']) {
    const box = await pile(page, key).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  }
  // Top bar controls are visible and inside the viewport.
  for (const name of ['Settings', 'Undo', 'Undo all', 'New game']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  }
  await page.screenshot({ path: 'e2e/screenshots/phone-initial-deal.png' });

  await loadState(
    page,
    makeState({ tableau: [['S7'], ['#D2', 'C9', 'H8'], [], [], ['HA']], waste: ['H6'] }),
  );
  await card(page, 'H6').tap();
  expect(await idsIn(page, 't0')).toEqual(['S7', 'H6']);
  await card(page, 'HA').tap();
  expect(await idsIn(page, 'f1')).toEqual(['HA']);
  await pile(page, 'stock').tap();
  await expect(readout(page, 'moves')).toHaveText('3');
});
