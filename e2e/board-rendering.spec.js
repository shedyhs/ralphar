const { test, expect } = require('@playwright/test');

test.describe('P0 Task 1-2: Board Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#mode-local').click();
  });

  test('should load the page successfully', async ({ page }) => {
    await expect(page).toHaveTitle('Tic-Tac-Toe');
  });

  test('should display the main heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Tic-Tac-Toe');
    await expect(heading).toBeVisible();
  });

  test('should display the game container', async ({ page }) => {
    const gameContainer = page.locator('#game-container');
    await expect(gameContainer).toBeVisible();
  });

  test('should display initial status message', async ({ page }) => {
    const status = page.locator('#status');
    await expect(status).toHaveText("Player X's turn");
    await expect(status).toBeVisible();
  });

  test('should render 3x3 game board', async ({ page }) => {
    const board = page.locator('#board');
    await expect(board).toBeVisible();

    // Check that board has grid display
    const displayValue = await board.evaluate(el => window.getComputedStyle(el).display);
    expect(displayValue).toBe('grid');
  });

  test('should render exactly 9 cells', async ({ page }) => {
    const cells = page.locator('.cell');
    await expect(cells).toHaveCount(9);
  });

  test('should have cells with correct data-index attributes', async ({ page }) => {
    for (let i = 0; i < 9; i++) {
      const cell = page.locator(`.cell[data-index="${i}"]`);
      await expect(cell).toBeVisible();
    }
  });

  test('should display New Game button', async ({ page }) => {
    const newGameBtn = page.locator('#new-game');
    await expect(newGameBtn).toHaveText('New Game');
    await expect(newGameBtn).toBeVisible();
    await expect(newGameBtn).toBeEnabled();
  });

  test('all cells should be empty initially', async ({ page }) => {
    const cells = page.locator('.cell');
    const count = await cells.count();

    for (let i = 0; i < count; i++) {
      const cellText = await cells.nth(i).textContent();
      expect(cellText).toBe('');
    }
  });

  test('cells should have button element type', async ({ page }) => {
    const cells = page.locator('.cell');
    const count = await cells.count();

    for (let i = 0; i < count; i++) {
      const tagName = await cells.nth(i).evaluate(el => el.tagName);
      expect(tagName).toBe('BUTTON');
    }
  });
});

test.describe('P0 Task 2: CSS Styling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#mode-local').click();
  });

  test('body should have dark background color', async ({ page }) => {
    const bgColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    // #1a1a2e should be rgb(26, 26, 46)
    expect(bgColor).toBe('rgb(26, 26, 46)');
  });

  test('body should have light text color', async ({ page }) => {
    const textColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).color
    );
    // #eee should be rgb(238, 238, 238)
    expect(textColor).toBe('rgb(238, 238, 238)');
  });

  test('cells should have correct background color', async ({ page }) => {
    const cell = page.locator('.cell').first();
    const bgColor = await cell.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    // #0f3460 should be rgb(15, 52, 96)
    expect(bgColor).toBe('rgb(15, 52, 96)');
  });

  test('cells should have pointer cursor', async ({ page }) => {
    const cell = page.locator('.cell').first();
    const cursor = await cell.evaluate(el =>
      window.getComputedStyle(el).cursor
    );
    expect(cursor).toBe('pointer');
  });

  test('board should use CSS Grid layout', async ({ page }) => {
    const board = page.locator('#board');
    const gridColumns = await board.evaluate(el =>
      window.getComputedStyle(el).gridTemplateColumns
    );
    const gridRows = await board.evaluate(el =>
      window.getComputedStyle(el).gridTemplateRows
    );

    // Should have 3 columns and 3 rows of 100px each
    expect(gridColumns).toContain('100px');
    expect(gridRows).toContain('100px');
  });

  test('cell hover effect should change background color', async ({ page }) => {
    const cell = page.locator('.cell').first();

    // Get initial background color
    const initialBg = await cell.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Hover over the cell
    await cell.hover();

    // Note: We can't directly test :hover pseudo-class via computed styles,
    // but we can verify the CSS rule exists
    const hasHoverRule = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          const hoverRule = rules.find(rule =>
            rule.selectorText === '.cell:hover'
          );
          if (hoverRule) {
            return hoverRule.style.background === 'rgb(26, 74, 122)' ||
                   hoverRule.style.background === '#1a4a7a';
          }
        } catch (e) {
          // Skip if can't access sheet
        }
      }
      return false;
    });

    expect(hasHoverRule).toBe(true);
  });

  test('New Game button should have red background', async ({ page }) => {
    const button = page.locator('#new-game');
    const bgColor = await button.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    // #e94560 should be rgb(233, 69, 96)
    expect(bgColor).toBe('rgb(233, 69, 96)');
  });
});
