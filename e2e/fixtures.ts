import { test as base, expect, type Locator, type Page } from '@playwright/test';
import type { GameState } from '../src/engine';

/** Fails any test that logs console errors/warnings or throws an uncaught page error. */
export const test = base.extend<{ consoleProblems: string[] }>({
  consoleProblems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          problems.push(`${msg.type()}: ${msg.text()}`);
        }
      });
      page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
      await use(problems);
      expect(problems, 'console errors during test').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function openGame(page: Page, seed = 42): Promise<void> {
  await page.goto(`/?seed=${seed}`);
  await page.waitForFunction(() => window.__solitaire !== undefined);
  await expect(page.getByTestId('board')).toBeVisible();
}

export async function loadState(page: Page, state: GameState): Promise<void> {
  await page.evaluate((s) => window.__solitaire!.loadState(s), state);
  await waitForAnimations(page);
}

export async function getState(page: Page): Promise<GameState> {
  return page.evaluate(() => window.__solitaire!.getState());
}

/** Waits until no CSS/Web animations (card moves, flips, shakes) are running. */
export async function waitForAnimations(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running'),
  );
}

export const card = (page: Page, id: string): Locator => page.locator(`[data-card-id="${id}"]`);
export const pile = (page: Page, key: string): Locator => page.locator(`[data-pile="${key}"]`);
export const readout = (page: Page, name: 'score' | 'moves'): Locator => page.getByTestId(name);

/** Card ids rendered in a pile, bottom first. */
export async function idsIn(page: Page, key: string): Promise<string[]> {
  return pile(page, key)
    .locator('[data-card-id]')
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.cardId as string));
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no bounding box');
  return box;
}

/**
 * Presses on `cardId` with the real mouse and moves it so the grabbed card lines up with the
 * target pile (just below its top card). Returns before releasing if `release` is false.
 */
export async function dragCardToPile(
  page: Page,
  cardId: string,
  targetKey: string,
  { release = true }: { release?: boolean } = {},
): Promise<void> {
  await waitForAnimations(page);
  const from = await boxOf(card(page, cardId));
  const targetCards = pile(page, targetKey).locator('[data-card-id]');
  const count = await targetCards.count();
  const anchor =
    count > 0 && targetKey.startsWith('t')
      ? await boxOf(targetCards.nth(count - 1))
      : await boxOf(pile(page, targetKey));
  const grabX = from.x + from.width / 2;
  const grabY = from.y + 4;
  const dropX = anchor.x + from.width / 2;
  const dropY = anchor.y + (count > 0 && targetKey.startsWith('t') ? from.height * 0.25 : 0) + 4;
  await page.mouse.move(grabX, grabY);
  await page.mouse.down();
  await page.mouse.move(grabX + 3, grabY + 3, { steps: 2 });
  await page.mouse.move(dropX, dropY, { steps: 10 });
  if (release) await page.mouse.up();
}
