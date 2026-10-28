import { expect, test } from './fixtures';

const DIR = 'e2e/screenshots';

test.describe('title screen', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('23. opens on the title screen, shows off the tables, and Play starts a game', async ({
    page,
  }) => {
    await page.goto('/');
    const title = page.getByTestId('title-screen');
    await expect(title).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Solitaire' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
    await expect(page.getByTestId('board')).toHaveCount(0);

    // It opens on the saved table (Classic green for a new player); the arrows pick another.
    await expect(page.getByText('Showing the Classic green table')).toBeAttached();
    await expect(title.locator('.title-bg-scene.current.background-felt')).toBeVisible();
    await page.getByRole('button', { name: 'Next table' }).click();
    await expect(page.getByText('Showing the Night city table')).toBeAttached();

    // Pixel tables animate.
    const canvas = title.locator('canvas.title-bg-scene.current');
    const before = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
    await page.waitForTimeout(600);
    expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${DIR}/title-screen.png` });
    await page.getByRole('button', { name: 'Show the Deep sea table' }).click();
    await expect(page.getByText('Showing the Deep sea table')).toBeAttached();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${DIR}/title-screen-deep-sea.png` });

    await page.keyboard.press('Enter');
    await expect(title).toHaveCount(0);
    await expect(page.getByTestId('board')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Stock, 24 cards/ })).toBeVisible();
    // The game starts on the table that was showing, and it is remembered.
    await expect(page.getByTestId('background')).toHaveAttribute('data-background', 'ocean');
    await page.reload();
    await expect(page.getByText('Showing the Deep sea table')).toBeAttached();
  });

  test('24. a deal link skips the title screen; reduced motion starts at once', async ({
    page,
  }) => {
    await page.goto('/?seed=3');
    await expect(page.getByTestId('board')).toBeVisible();
    await expect(page.getByTestId('title-screen')).toHaveCount(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByTestId('board')).toBeVisible();
  });
});

test.describe('title screen on a phone', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

  test('25. fits a phone, and tapping Play starts a game', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(375);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${DIR}/title-screen-phone.png` });
    await page.getByRole('button', { name: 'Play', exact: true }).tap();
    await expect(page.getByTestId('board')).toBeVisible();
  });
});
