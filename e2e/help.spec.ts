import { expect, openGame, test } from './fixtures';

const DIR = 'e2e/screenshots';

test('26. How to play opens from the header and the title screen, and fits on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openGame(page, 42);
  await page.getByRole('button', { name: 'How to play' }).click();
  const rules = page.getByRole('dialog', { name: 'How to play' });
  await expect(rules).toBeVisible();
  await expect(rules.getByRole('heading', { name: 'Scoring' })).toBeAttached();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/rules.png` });
  await rules.getByRole('button', { name: 'Got it' }).click();
  await expect(rules).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'How to play' })).toBeFocused();

  // On a phone the rules scroll inside the dialog, which stays on screen.
  await page.setViewportSize({ width: 390, height: 760 });
  await page.getByRole('button', { name: 'How to play' }).click();
  const box = await rules.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(760);
  expect(box!.width).toBeLessThanOrEqual(390);
  await expect(rules.getByRole('button', { name: 'Got it' })).toBeInViewport();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/rules-phone.png` });
  await page.keyboard.press('Escape');

  // The title screen has its own How to play button.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByTestId('title-screen').getByRole('button', { name: 'How to play' }).click();
  await expect(rules).toBeVisible();
  await page.keyboard.press('Enter'); // presses Got it, not Play
  await expect(rules).toHaveCount(0);
  await expect(page.getByTestId('title-screen')).toBeVisible();
});

test('27. the palette button opens a quick table picker over the live board', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openGame(page, 42);
  const button = page.getByRole('button', { name: 'Change table' });
  await button.click();
  const picker = page.getByRole('dialog', { name: 'Choose a table' });
  await expect(picker.getByRole('radio', { name: 'Classic green' })).toBeFocused();
  await picker.getByRole('radio', { name: 'Woodland' }).click();
  await expect(page.getByTestId('background')).toHaveAttribute('data-background', 'forest');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/table-picker.png` });
  await page.mouse.click(640, 700); // outside the picker
  await expect(picker).toHaveCount(0);
  await expect(button).toBeFocused();

  // The narrowest phones: the header still fits and the picker stays on screen.
  await page.setViewportSize({ width: 340, height: 640 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(340);
  await button.click();
  const box = (await picker.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(340);
  await page.screenshot({ path: `${DIR}/table-picker-phone.png` });
});
