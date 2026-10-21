import type { GameState } from '../src/engine';
import { makeState, upTo } from '../src/test/makeState';
import {
  card,
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

const DIR = 'e2e/screenshots';
const THEMES = [
  ['classic', 'Classic green'],
  ['night-city', 'Night city'],
  ['aurora', 'Aurora'],
  ['ice-mountains', 'Snowy peaks'],
  ['forest', 'Woodland'],
  ['ocean', 'Deep sea'],
] as const;

/** Moves the given card ids to the top of the stock (last id = drawn first). */
function withStockTop(state: GameState, ids: string[]): GameState {
  const rest = state.stock.filter((c) => !ids.includes(c.id));
  const top = ids.map((id) => state.stock.find((c) => c.id === id)!);
  return { ...state, stock: [...rest, ...top] };
}

async function box(page: import('@playwright/test').Page, key: string) {
  const b = await pile(page, key).boundingBox();
  if (!b) throw new Error(`no box for ${key}`);
  return b;
}

test.describe('side layout (1280×800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('12. stock left of the tableau, foundations stacked on the right, side columns at the edges', async ({
    page,
  }) => {
    await openGame(page, 42);
    const stock = await box(page, 'stock');
    const waste = await box(page, 'waste');
    const t0 = await box(page, 't0');
    const t6 = await box(page, 't6');
    expect(stock.x + stock.width).toBeLessThanOrEqual(t0.x);
    expect(waste.x).toBe(stock.x);
    expect(waste.y).toBeGreaterThan(stock.y + stock.height);
    let previousBottom = -Infinity;
    for (let i = 0; i < 4; i++) {
      const f = await box(page, `f${i}`);
      expect(f.x).toBeGreaterThanOrEqual(t6.x + t6.width);
      expect(f.y).toBeGreaterThanOrEqual(previousBottom);
      previousBottom = f.y + f.height;
    }
    expect(previousBottom).toBeLessThanOrEqual(800);
    // Side columns hug the screen edges (edge margin ≈ 0.25 × card width, ≥ 16 px).
    const f0 = await box(page, 'f0');
    const leftMargin = stock.x;
    const rightMargin = 1280 - (f0.x + f0.width);
    expect(Math.abs(leftMargin - rightMargin)).toBeLessThanOrEqual(1);
    expect(leftMargin).toBeGreaterThanOrEqual(16);
    expect(leftMargin).toBeLessThanOrEqual(Math.max(16, stock.width * 0.25) + 1);
    // Tableau centered.
    const tLeft = t0.x;
    const tRight = 1280 - (t6.x + t6.width);
    expect(Math.abs(tLeft - tRight)).toBeLessThanOrEqual(1);
  });

  test('13. the waste shows the last 3 cards fanned; only the newest plays', async ({ page }) => {
    await openGame(page, 42);
    const fixture = withStockTop(makeState({ tableau: [['S8'], ['C9']] }), [
      'D8',
      'H7',
      'CA',
      'H5',
    ]);
    await loadState(page, fixture);
    for (let i = 0; i < 4; i++) await pile(page, 'stock').click();
    await waitForAnimations(page);
    const visible = pile(page, 'waste').locator('[data-card-id]:visible');
    await expect(visible).toHaveCount(3);
    const ids = await visible.evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.cardId),
    );
    expect(ids).toEqual(['CA', 'H7', 'D8']);
    // Vertically fanned, newest at the bottom.
    const boxes = await Promise.all(ids.map((id) => card(page, id!).boundingBox()));
    expect(boxes[0]!.x).toBe(boxes[2]!.x);
    expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);
    expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y);
    const h = boxes[0]!.height;
    expect((boxes[1]!.y - boxes[0]!.y) / h).toBeCloseTo(0.22, 1);

    // A non-newest waste card does nothing.
    await card(page, 'H7').click({ position: { x: 20, y: 8 } }); // its visible strip
    await expect(readout(page, 'moves')).toHaveText('4');
    // The newest plays and the fan reflows.
    await card(page, 'D8').click();
    expect(await idsIn(page, 't1')).toEqual(['C9', 'D8']);
    await waitForAnimations(page);
    const after = await pile(page, 'waste')
      .locator('[data-card-id]:visible')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.cardId));
    expect(after).toEqual(['H5', 'CA', 'H7']);
  });

  test('14. every background can be picked, is screenshotted, and persists', async ({ page }) => {
    await openGame(page, 42);
    for (let i = 0; i < 3; i++) await pile(page, 'stock').click();
    const settings = page.getByRole('button', { name: 'Settings' });
    for (const [id, name] of THEMES) {
      await settings.click();
      const panel = page.getByRole('dialog', { name: 'Settings' });
      await panel.getByRole('radio', { name }).click();
      await expect(panel.getByRole('radio', { name })).toHaveAttribute('aria-checked', 'true');
      await expect(page.getByTestId('background')).toHaveAttribute('data-background', id);
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      await waitForAnimations(page);
      await page.screenshot({ path: `${DIR}/bg-${id}.png` });
    }
    expect((await getState(page)).moves).toBe(3);
    await page.reload();
    await page.waitForFunction(() => window.__solitaire !== undefined);
    await expect(page.getByTestId('background')).toHaveAttribute('data-background', 'ocean');
    // The pixel background is crisp (nearest-neighbour scaling) and covers the viewport.
    const style = await page
      .getByTestId('background')
      .locator('canvas')
      .evaluate((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { rendering: s.imageRendering, fit: s.objectFit, w: r.width, h: r.height };
      });
    expect(style).toEqual({ rendering: 'pixelated', fit: 'cover', w: 1280, h: 800 });
  });
});

test.describe('no side column shading (revision 4)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('17. no band or overlay separates the side columns from the tableau', async ({ page }) => {
    await openGame(page, 42);
    await expect(page.locator('.side-band, [data-testid^="side-band"]')).toHaveCount(0);
    // The board itself paints no background over the scene.
    const bg = await page
      .getByTestId('board')
      .evaluate(
        (el) => getComputedStyle(el).backgroundImage + getComputedStyle(el).backgroundColor,
      );
    expect(bg).toBe('nonergba(0, 0, 0, 0)');
  });
});

test.describe('narrow layout (375×667)', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

  test('15. compact top-row layout, no horizontal scroll, settings usable', async ({ page }) => {
    await openGame(page, 42);
    const stock = await box(page, 'stock');
    const f0 = await box(page, 'f0');
    const t0 = await box(page, 't0');
    expect(f0.y).toBe(stock.y);
    expect(f0.x).toBeGreaterThan(stock.x);
    expect(t0.y).toBeGreaterThan(stock.y + stock.height);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(375);

    // Horizontal waste fan, newest on the right.
    for (let i = 0; i < 3; i++) await pile(page, 'stock').tap();
    await waitForAnimations(page);
    const fan = await pile(page, 'waste')
      .locator('[data-card-id]:visible')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().x));
    expect(fan).toHaveLength(3);
    expect(fan[1]!).toBeGreaterThan(fan[0]!);
    expect(fan[2]!).toBeGreaterThan(fan[1]!);

    await page.getByRole('button', { name: 'Settings' }).tap();
    const panel = page.getByRole('dialog', { name: 'Settings' });
    await expect(panel).toBeVisible();
    const panelBox = await panel.boundingBox();
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(375);
    await panel.getByRole('radio', { name: 'Night city' }).tap();
    await expect(page.getByTestId('background')).toHaveAttribute('data-background', 'night-city');
    await page.waitForTimeout(250); // let the selection border finish its fade
    await page.screenshot({ path: `${DIR}/phone-settings.png` });
    await panel.getByRole('button', { name: 'Close settings' }).tap();
    await expect(panel).toHaveCount(0);
    await waitForAnimations(page);
    await page.screenshot({ path: `${DIR}/phone-night-city.png` });
  });
});

test.describe('review screenshots', () => {
  test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

  test('16. cards close-up (with a fanned column) and the side-layout deal', async ({ page }) => {
    await openGame(page, 42);
    await waitForAnimations(page);
    await page.screenshot({ path: `${DIR}/side-layout-initial-deal.png` });

    // J, Q, K in red and black; A, 7, 10 in both colors; a card back; a fanned column.
    await loadState(
      page,
      makeState({
        tableau: [
          ['#C2', '#C3', 'DK', 'CQ', 'DJ', 'C10', 'H9', 'C8'],
          ['HJ'],
          ['HQ'],
          ['HK'],
          ['SJ'],
          ['SQ'],
          ['SK'],
        ],
        foundations: [['HA'], ['CA'], upTo('D', 10), upTo('S', 10)],
        waste: ['C7', 'H7'],
      }),
    );
    const stock = await box(page, 'stock');
    const t0 = await box(page, 't0');
    const f0 = await box(page, 'f0');
    const f3 = await box(page, 'f3');
    const bottom = Math.max(t0.y + t0.height, f3.y + f3.height);
    const clip = {
      x: stock.x - 8,
      y: stock.y - 8,
      width: f0.x + f0.width - stock.x + 16,
      height: bottom - stock.y + 16,
    };
    await page.screenshot({ path: `${DIR}/cards-closeup.png`, clip });
  });
});
