import { isWon } from '../src/engine';
import { expect, getState, openGame, readout, test } from './fixtures';

/** Deal 6 is solvable; the solver's line is 79 moves. */
const SOLVABLE_SEED = 6;

async function startGodMode(page: import('@playwright/test').Page, screenshot = false) {
  await page.getByRole('button', { name: 'Settings' }).click();
  if (screenshot) {
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'e2e/screenshots/god-mode-settings.png' });
  }
  await page
    .getByRole('dialog', { name: 'Settings' })
    .getByRole('button', { name: /God mode/ })
    .click();
}

test.describe('god mode', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('18. plays roughly one move every half second, and Stop hands the game back', async ({
    page,
  }) => {
    await openGame(page, SOLVABLE_SEED);
    await startGodMode(page, true);
    const banner = page.getByTestId('god-banner');
    await expect(banner).toContainText(/God mode: move 1 of \d+/);
    await expect(readout(page, 'moves')).toHaveText('1', { timeout: 3000 });
    const t0 = Date.now();
    await expect(readout(page, 'moves')).toHaveText('3', { timeout: 3000 });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThan(700);
    expect(elapsed).toBeLessThan(1600);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
    await page.screenshot({ path: 'e2e/screenshots/god-mode-playing.png' });

    await banner.getByRole('button', { name: 'Stop' }).click();
    await expect(banner).toHaveCount(0);
    const moves = Number(await readout(page, 'moves').textContent());
    await page.waitForTimeout(1200);
    await expect(readout(page, 'moves')).toHaveText(String(moves));
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  });

  test('19. the speed slider set to fastest wins a solvable deal by itself', async ({ page }) => {
    await openGame(page, SOLVABLE_SEED);
    await startGodMode(page);
    const slider = page.getByTestId('god-banner').getByRole('slider', { name: 'Speed' });
    await slider.fill('1000');
    await expect(slider).toHaveAttribute('aria-valuetext', '0.05 s per move');
    await page.screenshot({ path: 'e2e/screenshots/god-mode-fast.png' });
    await expect(page.getByRole('dialog', { name: /You win/ })).toBeVisible({ timeout: 30_000 });
    expect(isWon(await getState(page))).toBe(true);
  });
});
