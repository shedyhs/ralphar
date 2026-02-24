const { test, expect } = require('@playwright/test');

test.describe('P0 Task 3: Game State Initialization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#mode-local').click();
  });

  test('should initialize game object in script scope', async ({ page }) => {
    const gameExists = await page.evaluate(() => typeof game === 'object');
    expect(gameExists).toBe(true);
  });

  test('should initialize board as array of 9 nulls', async ({ page }) => {
    const board = await page.evaluate(() => game.board);

    expect(Array.isArray(board)).toBe(true);
    expect(board.length).toBe(9);
    expect(board.every(cell => cell === null)).toBe(true);
  });

  test('should set initial currentPlayer to X', async ({ page }) => {
    const currentPlayer = await page.evaluate(() => game.currentPlayer);
    expect(currentPlayer).toBe('X');
  });

  test('should set initial isGameOver to false', async ({ page }) => {
    const isGameOver = await page.evaluate(() => game.isGameOver);
    expect(isGameOver).toBe(false);
  });

  test('should set initial winner to null', async ({ page }) => {
    const winner = await page.evaluate(() => game.winner);
    expect(winner).toBe(null);
  });

  test('should define WINNING_LINES constant', async ({ page }) => {
    const winningLines = await page.evaluate(() => WINNING_LINES);

    expect(Array.isArray(winningLines)).toBe(true);
    expect(winningLines.length).toBe(8);
  });

  test('WINNING_LINES should contain all row combinations', async ({ page }) => {
    const winningLines = await page.evaluate(() => WINNING_LINES);

    const rows = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8]
    ];

    rows.forEach(row => {
      const hasRow = winningLines.some(line =>
        JSON.stringify(line) === JSON.stringify(row)
      );
      expect(hasRow).toBe(true);
    });
  });

  test('WINNING_LINES should contain all column combinations', async ({ page }) => {
    const winningLines = await page.evaluate(() => WINNING_LINES);

    const columns = [
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8]
    ];

    columns.forEach(column => {
      const hasColumn = winningLines.some(line =>
        JSON.stringify(line) === JSON.stringify(column)
      );
      expect(hasColumn).toBe(true);
    });
  });

  test('WINNING_LINES should contain both diagonal combinations', async ({ page }) => {
    const winningLines = await page.evaluate(() => WINNING_LINES);

    const diagonals = [
      [0, 4, 8],
      [2, 4, 6]
    ];

    diagonals.forEach(diagonal => {
      const hasDiagonal = winningLines.some(line =>
        JSON.stringify(line) === JSON.stringify(diagonal)
      );
      expect(hasDiagonal).toBe(true);
    });
  });

  test('should cache DOM element references', async ({ page }) => {
    const domElements = await page.evaluate(() => ({
      hasBoardEl: typeof boardEl !== 'undefined',
      hasStatusEl: typeof statusEl !== 'undefined',
      hasNewGameBtn: typeof newGameBtn !== 'undefined',
      hasCells: typeof cells !== 'undefined'
    }));

    expect(domElements.hasBoardEl).toBe(true);
    expect(domElements.hasStatusEl).toBe(true);
    expect(domElements.hasNewGameBtn).toBe(true);
    expect(domElements.hasCells).toBe(true);
  });

  test('should cache correct number of cell elements', async ({ page }) => {
    const cellsCount = await page.evaluate(() => cells.length);
    expect(cellsCount).toBe(9);
  });

  test('should log initialization message to console', async ({ page }) => {
    const logs = [];

    page.on('console', msg => {
      logs.push(msg.text());
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const hasInitLog = logs.some(log =>
      log.includes('Game state initialized')
    );

    expect(hasInitLog).toBe(true);
  });
});

test.describe('P0 Task 3: DOM References Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#mode-local').click();
  });

  test('boardEl should reference the correct DOM element', async ({ page }) => {
    const isCorrect = await page.evaluate(() => {
      return boardEl === document.getElementById('board');
    });
    expect(isCorrect).toBe(true);
  });

  test('statusEl should reference the correct DOM element', async ({ page }) => {
    const isCorrect = await page.evaluate(() => {
      return statusEl === document.getElementById('status');
    });
    expect(isCorrect).toBe(true);
  });

  test('newGameBtn should reference the correct DOM element', async ({ page }) => {
    const isCorrect = await page.evaluate(() => {
      return newGameBtn === document.getElementById('new-game');
    });
    expect(isCorrect).toBe(true);
  });

  test('cells should be a NodeList of all cell buttons', async ({ page }) => {
    const cellsValidation = await page.evaluate(() => {
      const allCells = document.querySelectorAll('.cell');

      return {
        sameLength: cells.length === allCells.length,
        allMatch: Array.from(cells).every((cell, index) =>
          cell === allCells[index]
        )
      };
    });

    expect(cellsValidation.sameLength).toBe(true);
    expect(cellsValidation.allMatch).toBe(true);
  });
});
