const { test, expect } = require('@playwright/test');

test.describe('P0: Complete Gameplay Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#mode-local').click();
  });

  test.describe('Turn Alternation', () => {
    test('should alternate between X and O correctly', async ({ page }) => {
      // X's turn (first move)
      await expect(page.locator('#status')).toHaveText("Player X's turn");
      await page.locator('.cell[data-index="0"]').click();
      await expect(page.locator('.cell[data-index="0"]')).toHaveText('X');

      // O's turn
      await expect(page.locator('#status')).toHaveText("Player O's turn");
      await page.locator('.cell[data-index="1"]').click();
      await expect(page.locator('.cell[data-index="1"]')).toHaveText('O');

      // X's turn again
      await expect(page.locator('#status')).toHaveText("Player X's turn");
      await page.locator('.cell[data-index="2"]').click();
      await expect(page.locator('.cell[data-index="2"]')).toHaveText('X');

      // O's turn again
      await expect(page.locator('#status')).toHaveText("Player O's turn");
    });

    test('X should always go first', async ({ page }) => {
      await expect(page.locator('#status')).toHaveText("Player X's turn");

      await page.locator('.cell[data-index="4"]').click();
      await expect(page.locator('.cell[data-index="4"]')).toHaveText('X');
    });
  });

  test.describe('Occupied Cell Protection', () => {
    test('should not allow overwriting an occupied cell', async ({ page }) => {
      // X places mark
      await page.locator('.cell[data-index="0"]').click();
      await expect(page.locator('.cell[data-index="0"]')).toHaveText('X');

      // O tries to click same cell
      await page.locator('.cell[data-index="0"]').click();
      await expect(page.locator('.cell[data-index="0"]')).toHaveText('X'); // Still X

      // Status should still show O's turn (click was ignored)
      await expect(page.locator('#status')).toHaveText("Player O's turn");
    });

    test('should keep same player turn if occupied cell clicked', async ({ page }) => {
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="0"]').click(); // Try again (should be ignored)

      // Should still be O's turn
      await expect(page.locator('#status')).toHaveText("Player O's turn");

      // O can place on different cell
      await page.locator('.cell[data-index="1"]').click();
      await expect(page.locator('.cell[data-index="1"]')).toHaveText('O');
    });
  });

  test.describe('Win Detection - Rows', () => {
    test('should detect win on row 1 (cells 0,1,2)', async ({ page }) => {
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X wins

      await expect(page.locator('#status')).toHaveText('Player X wins!');

      // Verify game state
      const gameState = await page.evaluate(() => ({
        isGameOver: game.isGameOver,
        winner: game.winner
      }));
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.winner).toBe('X');
    });

    test('should detect win on row 2 (cells 3,4,5)', async ({ page }) => {
      await page.locator('.cell[data-index="3"]').click(); // X
      await page.locator('.cell[data-index="0"]').click(); // O
      await page.locator('.cell[data-index="4"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="5"]').click(); // X wins

      await expect(page.locator('#status')).toHaveText('Player X wins!');
    });

    test('should detect win on row 3 (cells 6,7,8)', async ({ page }) => {
      await page.locator('.cell[data-index="6"]').click(); // X
      await page.locator('.cell[data-index="0"]').click(); // O
      await page.locator('.cell[data-index="7"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="8"]').click(); // X wins

      await expect(page.locator('#status')).toHaveText('Player X wins!');
    });
  });

  test.describe('Win Detection - Columns', () => {
    test('should detect win on column 1 (cells 0,3,6)', async ({ page }) => {
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="3"]').click(); // X
      await page.locator('.cell[data-index="2"]').click(); // O
      await page.locator('.cell[data-index="6"]').click(); // X wins

      await expect(page.locator('#status')).toHaveText('Player X wins!');
    });

    test('should detect win on column 2 (cells 1,4,7)', async ({ page }) => {
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="0"]').click(); // O
      await page.locator('.cell[data-index="4"]').click(); // X
      await page.locator('.cell[data-index="2"]').click(); // O
      await page.locator('.cell[data-index="7"]').click(); // X wins

      await expect(page.locator('#status')).toHaveText('Player X wins!');
    });

    test('should detect win on column 3 (cells 2,5,8)', async ({ page }) => {
      await page.locator('.cell[data-index="2"]').click(); // X
      await page.locator('.cell[data-index="0"]').click(); // O
      await page.locator('.cell[data-index="5"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="8"]').click(); // X wins

      await expect(page.locator('#status')).toHaveText('Player X wins!');
    });
  });

  test.describe('Win Detection - Diagonals', () => {
    test('should detect win on main diagonal (cells 0,4,8)', async ({ page }) => {
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="4"]').click(); // X
      await page.locator('.cell[data-index="2"]').click(); // O
      await page.locator('.cell[data-index="8"]').click(); // X wins

      await expect(page.locator('#status')).toHaveText('Player X wins!');
    });

    test('should detect win on anti-diagonal (cells 2,4,6)', async ({ page }) => {
      await page.locator('.cell[data-index="2"]').click(); // X
      await page.locator('.cell[data-index="0"]').click(); // O
      await page.locator('.cell[data-index="4"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="6"]').click(); // X wins

      await expect(page.locator('#status')).toHaveText('Player X wins!');
    });
  });

  test.describe('Win Detection - Player O', () => {
    test('should detect when Player O wins', async ({ page }) => {
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="8"]').click(); // X
      await page.locator('.cell[data-index="5"]').click(); // O wins (row 2)

      await expect(page.locator('#status')).toHaveText('Player O wins!');

      const gameState = await page.evaluate(() => ({
        isGameOver: game.isGameOver,
        winner: game.winner
      }));
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.winner).toBe('O');
    });
  });

  test.describe('Draw Detection', () => {
    test.skip('should detect a draw when board is full with no winner', async ({ page }) => {
      // OBSOLETE: With P5 disappearing marks mechanic, draws are impossible after move 5.
      // Play out a draw scenario (respecting turn order):
      // Final board:
      // X O X
      // O O X
      // X X O
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O (center)
      await page.locator('.cell[data-index="5"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="6"]').click(); // X
      await page.locator('.cell[data-index="8"]').click(); // O
      await page.locator('.cell[data-index="7"]').click(); // X

      await expect(page.locator('#status')).toHaveText("It's a draw!");

      const gameState = await page.evaluate(() => ({
        isGameOver: game.isGameOver,
        winner: game.winner
      }));
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.winner).toBe(null);
    });

    test.skip('should detect draw even with different move order', async ({ page }) => {
      // OBSOLETE: With P5 disappearing marks mechanic, draws are impossible after move 5.
      // Another draw pattern (respecting turn order):
      // Final board:
      // X X O
      // O O X
      // X O X
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="2"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="5"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O (center)
      await page.locator('.cell[data-index="6"]').click(); // X
      await page.locator('.cell[data-index="7"]').click(); // O
      await page.locator('.cell[data-index="8"]').click(); // X

      await expect(page.locator('#status')).toHaveText("It's a draw!");
    });
  });

  test.describe('Game Over Protection', () => {
    test('should not allow moves after X wins', async ({ page }) => {
      // X wins with row 1
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X wins

      await expect(page.locator('#status')).toHaveText('Player X wins!');

      // Try to make another move
      await page.locator('.cell[data-index="5"]').click();

      // Cell should remain empty
      await expect(page.locator('.cell[data-index="5"]')).toHaveText('');

      // Status should not change
      await expect(page.locator('#status')).toHaveText('Player X wins!');
    });

    test('should not allow moves after O wins', async ({ page }) => {
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="8"]').click(); // X
      await page.locator('.cell[data-index="5"]').click(); // O wins

      await expect(page.locator('#status')).toHaveText('Player O wins!');

      // Try to make another move
      await page.locator('.cell[data-index="2"]').click();
      await expect(page.locator('.cell[data-index="2"]')).toHaveText('');
    });

    test.skip('should not allow moves after draw', async ({ page }) => {
      // OBSOLETE: With P5 disappearing marks mechanic, draws are impossible after move 5.
      // Play to draw (same pattern as draw test)
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="5"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="6"]').click(); // X
      await page.locator('.cell[data-index="8"]').click(); // O
      await page.locator('.cell[data-index="7"]').click(); // X (draw)

      await expect(page.locator('#status')).toHaveText("It's a draw!");

      // Board should be full, but try clicking an already filled cell
      await page.locator('.cell[data-index="0"]').click();
      await expect(page.locator('.cell[data-index="0"]')).toHaveText('X'); // Should still be X

      // Status should not change
      await expect(page.locator('#status')).toHaveText("It's a draw!");
    });
  });

  test.describe('New Game Reset', () => {
    test('should reset board when New Game button clicked', async ({ page }) => {
      // Make some moves
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="4"]').click(); // X

      // Click New Game
      await page.locator('#new-game').click();

      // All cells should be empty
      const cells = page.locator('.cell');
      const count = await cells.count();
      for (let i = 0; i < count; i++) {
        await expect(cells.nth(i)).toHaveText('');
      }

      // Status should show X's turn
      await expect(page.locator('#status')).toHaveText("Player X's turn");

      // Game state should be reset
      const gameState = await page.evaluate(() => ({
        board: game.board,
        currentPlayer: game.currentPlayer,
        isGameOver: game.isGameOver,
        winner: game.winner
      }));

      expect(gameState.board).toEqual(Array(9).fill(null));
      expect(gameState.currentPlayer).toBe('X');
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.winner).toBe(null);
    });

    test('should reset board after X wins', async ({ page }) => {
      // X wins
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X wins

      await expect(page.locator('#status')).toHaveText('Player X wins!');

      // Reset
      await page.locator('#new-game').click();

      // Should be ready for new game
      await expect(page.locator('#status')).toHaveText("Player X's turn");

      // Should be able to play again
      await page.locator('.cell[data-index="4"]').click();
      await expect(page.locator('.cell[data-index="4"]')).toHaveText('X');
    });

    test.skip('should reset board after draw', async ({ page }) => {
      // OBSOLETE: With P5 disappearing marks mechanic, draws are impossible after move 5.
      // Play to draw (same pattern as draw test)
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="5"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="6"]').click(); // X
      await page.locator('.cell[data-index="8"]').click(); // O
      await page.locator('.cell[data-index="7"]').click(); // X

      await expect(page.locator('#status')).toHaveText("It's a draw!");

      // Reset
      await page.locator('#new-game').click();

      // All cells should be empty
      const cells = page.locator('.cell');
      const count = await cells.count();
      for (let i = 0; i < count; i++) {
        await expect(cells.nth(i)).toHaveText('');
      }

      await expect(page.locator('#status')).toHaveText("Player X's turn");
    });

    test('should allow multiple game resets', async ({ page }) => {
      // Game 1
      await page.locator('.cell[data-index="0"]').click();
      await page.locator('#new-game').click();

      // Game 2
      await page.locator('.cell[data-index="4"]').click();
      await page.locator('#new-game').click();

      // Game 3
      await page.locator('.cell[data-index="8"]').click();
      await expect(page.locator('.cell[data-index="8"]')).toHaveText('X');

      await page.locator('#new-game').click();
      await expect(page.locator('.cell[data-index="8"]')).toHaveText('');
    });
  });

  test.describe('Visual Feedback', () => {
    test('X marks should have red color class', async ({ page }) => {
      await page.locator('.cell[data-index="0"]').click(); // X

      const cellClass = await page.locator('.cell[data-index="0"]').getAttribute('class');
      expect(cellClass).toContain('x');
    });

    test('O marks should have green color class', async ({ page }) => {
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O

      const cellClass = await page.locator('.cell[data-index="1"]').getAttribute('class');
      expect(cellClass).toContain('o');
    });

    test('empty cells should not have x or o class', async ({ page }) => {
      const cellClass = await page.locator('.cell[data-index="0"]').getAttribute('class');
      expect(cellClass).not.toContain('x');
      expect(cellClass).not.toContain('o');
      expect(cellClass).toBe('cell');
    });

    test('cells should display correct text content', async ({ page }) => {
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X

      await expect(page.locator('.cell[data-index="0"]')).toHaveText('X');
      await expect(page.locator('.cell[data-index="1"]')).toHaveText('O');
      await expect(page.locator('.cell[data-index="2"]')).toHaveText('X');
      await expect(page.locator('.cell[data-index="3"]')).toHaveText('');
    });
  });

  test.describe('Complete Game Scenarios', () => {
    test('should play a complete game from start to finish (X wins)', async ({ page }) => {
      // Initial state
      await expect(page.locator('#status')).toHaveText("Player X's turn");

      // Turn 1
      await page.locator('.cell[data-index="0"]').click(); // X
      await expect(page.locator('#status')).toHaveText("Player O's turn");

      // Turn 2
      await page.locator('.cell[data-index="3"]').click(); // O
      await expect(page.locator('#status')).toHaveText("Player X's turn");

      // Turn 3
      await page.locator('.cell[data-index="1"]').click(); // X
      await expect(page.locator('#status')).toHaveText("Player O's turn");

      // Turn 4
      await page.locator('.cell[data-index="4"]').click(); // O
      await expect(page.locator('#status')).toHaveText("Player X's turn");

      // Turn 5 - X wins
      await page.locator('.cell[data-index="2"]').click(); // X
      await expect(page.locator('#status')).toHaveText('Player X wins!');

      // Verify final board state
      await expect(page.locator('.cell[data-index="0"]')).toHaveText('X');
      await expect(page.locator('.cell[data-index="1"]')).toHaveText('X');
      await expect(page.locator('.cell[data-index="2"]')).toHaveText('X');
      await expect(page.locator('.cell[data-index="3"]')).toHaveText('O');
      await expect(page.locator('.cell[data-index="4"]')).toHaveText('O');
    });

    test('should play a complete game from start to finish (O wins)', async ({ page }) => {
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="6"]').click(); // X
      await page.locator('.cell[data-index="5"]').click(); // O wins (column)

      await expect(page.locator('#status')).toHaveText('Player O wins!');
    });

    test.skip('should play a complete game ending in draw', async ({ page }) => {
      // OBSOLETE: With P5 disappearing marks mechanic, draws are impossible after move 5.
      // Play to draw (same pattern as draw test)
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="5"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="6"]').click(); // X
      await page.locator('.cell[data-index="8"]').click(); // O
      await page.locator('.cell[data-index="7"]').click(); // X

      await expect(page.locator('#status')).toHaveText("It's a draw!");

      // All cells should be filled
      const cells = page.locator('.cell');
      const count = await cells.count();
      for (let i = 0; i < count; i++) {
        const text = await cells.nth(i).textContent();
        expect(text).toMatch(/[XO]/);
      }
    });
  });
});
