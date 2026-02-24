const { test, expect } = require('@playwright/test');

test.describe('User Interactions - Current State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#mode-local').click();
  });

  test('cells should be clickable and place marks', async ({ page }) => {
    const cells = page.locator('.cell');

    // Click first cell - should place X
    const firstCell = cells.nth(0);
    await expect(firstCell).toBeEnabled();
    await firstCell.click();
    await expect(firstCell).toHaveText('X');

    // Click second cell - should place O
    const secondCell = cells.nth(1);
    await secondCell.click();
    await expect(secondCell).toHaveText('O');

    // Click third cell - should place X again
    const thirdCell = cells.nth(2);
    await thirdCell.click();
    await expect(thirdCell).toHaveText('X');
  });

  test('New Game button should be clickable', async ({ page }) => {
    const newGameBtn = page.locator('#new-game');

    await expect(newGameBtn).toBeEnabled();

    // Should be able to click without errors
    await newGameBtn.click();

    // Page should still be loaded
    await expect(page.locator('h1')).toBeVisible();
  });

  test('clicking cells should update game state correctly', async ({ page }) => {
    // Get initial game state
    const initialState = await page.evaluate(() => ({
      board: [...game.board],
      currentPlayer: game.currentPlayer,
      isGameOver: game.isGameOver,
      winner: game.winner
    }));

    // Verify initial state
    expect(initialState.board).toEqual([null, null, null, null, null, null, null, null, null]);
    expect(initialState.currentPlayer).toBe('X');
    expect(initialState.isGameOver).toBe(false);
    expect(initialState.winner).toBe(null);

    // Click cell 0 - X's move
    await page.locator('.cell[data-index="0"]').click();
    const afterFirstClick = await page.evaluate(() => ({
      board: [...game.board],
      currentPlayer: game.currentPlayer
    }));
    expect(afterFirstClick.board[0]).toBe('X');
    expect(afterFirstClick.currentPlayer).toBe('O');

    // Click cell 4 - O's move
    await page.locator('.cell[data-index="4"]').click();
    const afterSecondClick = await page.evaluate(() => ({
      board: [...game.board],
      currentPlayer: game.currentPlayer
    }));
    expect(afterSecondClick.board[4]).toBe('O');
    expect(afterSecondClick.currentPlayer).toBe('X');

    // Click cell 8 - X's move
    await page.locator('.cell[data-index="8"]').click();
    const afterThirdClick = await page.evaluate(() => ({
      board: [...game.board],
      currentPlayer: game.currentPlayer
    }));
    expect(afterThirdClick.board[8]).toBe('X');
    expect(afterThirdClick.currentPlayer).toBe('O');
  });

  test('clicking cells should update UI correctly', async ({ page }) => {
    const cell = page.locator('.cell[data-index="0"]');
    const status = page.locator('#status');

    // Initial status should show X's turn
    await expect(status).toHaveText("Player X's turn");

    // Click the cell - should place X
    await cell.click();

    // Cell should now contain X
    await expect(cell).toHaveText('X');

    // Status should now show O's turn
    await expect(status).toHaveText("Player O's turn");
  });

  test('multiple clicks on same cell should be ignored after first placement', async ({ page }) => {
    const cell = page.locator('.cell[data-index="4"]');
    const status = page.locator('#status');

    // First click should place X
    await cell.click();
    await expect(cell).toHaveText('X');
    await expect(status).toHaveText("Player O's turn");

    // Additional clicks should be ignored (still X, still O's turn)
    await cell.click();
    await expect(cell).toHaveText('X');
    await expect(status).toHaveText("Player O's turn");

    await cell.click();
    await expect(cell).toHaveText('X');
    await expect(status).toHaveText("Player O's turn");

    // Cell should still be enabled for accessibility
    await expect(cell).toBeEnabled();
  });

  test('keyboard navigation should work on cells', async ({ page }) => {
    const firstCell = page.locator('.cell[data-index="0"]');
    const status = page.locator('#status');

    // Focus first cell
    await firstCell.focus();

    // Verify initial state
    await expect(status).toHaveText("Player X's turn");

    // Press Enter - should place X
    await firstCell.press('Enter');

    // Cell should now contain X
    await expect(firstCell).toHaveText('X');

    // Status should update to O's turn
    await expect(status).toHaveText("Player O's turn");
  });

  test('keyboard navigation should work on New Game button', async ({ page }) => {
    const button = page.locator('#new-game');

    // Focus button
    await button.focus();

    // Press Enter (should not cause errors)
    await button.press('Enter');

    // Page should still be loaded
    await expect(page.locator('h1')).toBeVisible();
  });

  test('cells should be accessible via keyboard tab navigation', async ({ page }) => {
    // Tab through elements
    await page.keyboard.press('Tab');

    // First cell should receive focus
    const firstCell = page.locator('.cell[data-index="0"]');
    await expect(firstCell).toBeFocused();
  });
});

test.describe('Page Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#mode-local').click();
  });

  test('page should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // All elements should still be visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#board')).toBeVisible();
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('#new-game')).toBeVisible();

    const cells = page.locator('.cell');
    await expect(cells).toHaveCount(9);
  });

  test('page should be responsive on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    // All elements should still be visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#board')).toBeVisible();
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('#new-game')).toBeVisible();
  });

  test('page should be responsive on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // All elements should still be visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#board')).toBeVisible();
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('#new-game')).toBeVisible();
  });
});
