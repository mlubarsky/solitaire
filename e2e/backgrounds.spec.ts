import type { Page } from '@playwright/test';
import { expect, openGame, test } from './fixtures';

test.use({ viewport: { width: 1280, height: 800 } });

const snapshot = (page: Page) =>
  page.locator('canvas.background-pixels').evaluate((c: HTMLCanvasElement) => c.toDataURL());

async function pickBackground(page: Page, name: string) {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('radio', { name }).click();
}

test('20. pixel backgrounds animate, and the settings switch freezes them', async ({ page }) => {
  await openGame(page, 42);
  for (const name of ['Night city', 'Aurora', 'Snowy peaks', 'Woodland', 'Deep sea']) {
    await pickBackground(page, name);
    await page.keyboard.press('Escape');
    const a = await snapshot(page);
    await page.waitForTimeout(700);
    expect(await snapshot(page), `${name} should move`).not.toBe(a);
  }
  await page.screenshot({ path: 'e2e/screenshots/bg-ocean-animated.png' });

  await page.getByRole('button', { name: 'Settings' }).click();
  const toggle = page.getByRole('switch', { name: 'Animate backgrounds' });
  await expect(toggle).toBeChecked();
  await page.locator('.settings-switch').click();
  await expect(toggle).not.toBeChecked();
  await page.keyboard.press('Escape');
  const still = await snapshot(page);
  await page.waitForTimeout(700);
  expect(await snapshot(page)).toBe(still);

  // The choice survives a reload.
  await page.reload();
  await page.waitForTimeout(300);
  const reloaded = await snapshot(page);
  await page.waitForTimeout(700);
  expect(await snapshot(page)).toBe(reloaded);
});

test('21. reduced motion keeps pixel backgrounds still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGame(page, 42);
  await pickBackground(page, 'Deep sea');
  await page.keyboard.press('Escape');
  const a = await snapshot(page);
  await page.waitForTimeout(700);
  expect(await snapshot(page)).toBe(a);
});

test('22. the animation never blocks the main thread (no long tasks)', async ({ page }) => {
  await openGame(page, 42);
  await pickBackground(page, 'Deep sea');
  await page.keyboard.press('Escape');
  // Main-thread time spent in long tasks while the animation runs for two seconds.
  const longTaskMs = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) total += entry.duration;
        });
        observer.observe({ type: 'longtask', buffered: false });
        setTimeout(() => {
          observer.disconnect();
          resolve(total);
        }, 2000);
      }),
  );
  expect(longTaskMs).toBe(0);
});
