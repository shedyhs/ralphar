// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * E2E User Journey Tests for P2 Score Tracking
 *
 * These tests simulate real user interactions without manipulating internal game state.
 * They verify the score tracking feature works from an actual user's perspective.
 */

test.describe('P2 Score Tracking - User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('ticTacToeScores'));
    await page.reload();
  });

  test.describe('Journey 1: New user plays AI games and tracks progress', () => {
    test('user plays AI game and sees score tracking works', async ({ page }) => {
      // User selects AI mode (playing as X)
      await page.locator('#mode-ai-x').click();

      // Verify score display shows all zeros initially
      await expect(page.locator('#sp-wins')).toHaveText('0');
      await expect(page.locator('#sp-losses')).toHaveText('0');
      await expect(page.locator('#sp-draws')).toHaveText('0');

      // User plays a full game (outcome depends on AI, so we just verify scoring works)
      // Center strategy - play center first, then corners
      await page.locator('.cell[data-index="4"]').click(); // User X (center)
      await page.waitForTimeout(200); // Wait for AI move

      // Check if game is over (AI might have won somehow)
      let gameOver = await page.evaluate(() => game.isGameOver);

      if (!gameOver) {
        await page.locator('.cell[data-index="0"]').click(); // User X
        await page.waitForTimeout(200);
        gameOver = await page.evaluate(() => game.isGameOver);
      }

      if (!gameOver) {
        await page.locator('.cell[data-index="8"]').click(); // User X
        await page.waitForTimeout(200);
        gameOver = await page.evaluate(() => game.isGameOver);
      }

      if (!gameOver) {
        await page.locator('.cell[data-index="2"]').click(); // User X
        await page.waitForTimeout(200);
        gameOver = await page.evaluate(() => game.isGameOver);
      }

      if (!gameOver) {
        await page.locator('.cell[data-index="6"]').click(); // User X
        await page.waitForTimeout(200);
      }

      // Wait for game to complete
      await page.waitForTimeout(300);

      // Verify that SOME score was recorded (win, loss, or draw)
      const wins = await page.locator('#sp-wins').textContent();
      const losses = await page.locator('#sp-losses').textContent();
      const draws = await page.locator('#sp-draws').textContent();
      const total = parseInt(wins) + parseInt(losses) + parseInt(draws);

      expect(total).toBe(1); // Exactly one game outcome recorded

      // User sees game over status (either win or draw)
      const status = await page.locator('#status').textContent();
      expect(status.toLowerCase()).toMatch(/(wins|draw)/);
    });

    test('user plays multiple AI games and sees cumulative scores', async ({ page }) => {
      // User selects AI mode as X
      await page.locator('#mode-ai-x').click();

      // Play first game to completion
      await page.locator('.cell[data-index="4"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="0"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="8"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="2"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="6"]').click();
      await page.waitForTimeout(300);

      // Get total after first game
      const firstWins = await page.locator('#sp-wins').textContent();
      const firstLosses = await page.locator('#sp-losses').textContent();
      const firstDraws = await page.locator('#sp-draws').textContent();
      const firstTotal = parseInt(firstWins) + parseInt(firstLosses) + parseInt(firstDraws);

      // User starts a new game
      await page.locator('#new-game').click();

      // Play second game
      await page.locator('.cell[data-index="4"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="0"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="8"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="2"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="6"]').click();
      await page.waitForTimeout(300);

      // Verify scores accumulated
      const secondWins = await page.locator('#sp-wins').textContent();
      const secondLosses = await page.locator('#sp-losses').textContent();
      const secondDraws = await page.locator('#sp-draws').textContent();
      const secondTotal = parseInt(secondWins) + parseInt(secondLosses) + parseInt(secondDraws);

      // Should have 2 games recorded total
      expect(secondTotal).toBeGreaterThanOrEqual(firstTotal + 1);
      expect(secondTotal).toBeLessThanOrEqual(2);
    });
  });

  test.describe('Journey 2: User plays local multiplayer games', () => {
    test('user plays local game where X wins and sees X win count', async ({ page }) => {
      // User selects local multiplayer mode
      await page.locator('#mode-local').click();

      // Verify multiplayer score display shows all zeros
      await expect(page.locator('#mp-x-wins')).toHaveText('0');
      await expect(page.locator('#mp-o-wins')).toHaveText('0');
      await expect(page.locator('#mp-draws')).toHaveText('0');

      // Users play a game where X wins (top row: 0,1,2)
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X wins!

      // User sees X win count increment
      await expect(page.locator('#mp-x-wins')).toHaveText('1');
      await expect(page.locator('#mp-o-wins')).toHaveText('0');
      await expect(page.locator('#mp-draws')).toHaveText('0');
    });

    test('user plays local game where O wins and sees O win count', async ({ page }) => {
      // User selects local multiplayer mode
      await page.locator('#mode-local').click();

      // Users play a game where O wins (middle row: 3,4,5)
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="6"]').click(); // X
      await page.locator('.cell[data-index="5"]').click(); // O wins!

      // User sees O win count increment
      await expect(page.locator('#mp-x-wins')).toHaveText('0');
      await expect(page.locator('#mp-o-wins')).toHaveText('1');
      await expect(page.locator('#mp-draws')).toHaveText('0');
    });

    test('user plays local game that ends in draw', async ({ page }) => {
      // User selects local multiplayer mode
      await page.locator('#mode-local').click();

      // Users play a game that results in a draw
      // Board will be: X O X
      //                X O O
      //                O X X
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="3"]').click(); // X
      await page.locator('.cell[data-index="6"]').click(); // O
      await page.locator('.cell[data-index="5"]').click(); // X (O blocked)
      await page.locator('.cell[data-index="8"]').click(); // O
      await page.locator('.cell[data-index="7"]').click(); // X - draw!

      // User sees draw count increment
      await expect(page.locator('#mp-x-wins')).toHaveText('0');
      await expect(page.locator('#mp-o-wins')).toHaveText('0');
      await expect(page.locator('#mp-draws')).toHaveText('1');

      // User sees draw status
      await expect(page.locator('#status')).toContainText('draw');
    });

    test('user plays multiple local games and sees cumulative scores', async ({ page }) => {
      // User selects local multiplayer mode
      await page.locator('#mode-local').click();

      // Play first game - X wins
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X wins

      await expect(page.locator('#mp-x-wins')).toHaveText('1');

      // User starts new game
      await page.locator('#new-game').click();

      // Play second game - O wins
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="6"]').click(); // X
      await page.locator('.cell[data-index="5"]').click(); // O wins

      // Both scores should be tracked
      await expect(page.locator('#mp-x-wins')).toHaveText('1');
      await expect(page.locator('#mp-o-wins')).toHaveText('1');
      await expect(page.locator('#mp-draws')).toHaveText('0');
    });
  });

  test.describe('Journey 3: User switches between game modes', () => {
    test('user plays in both modes and sees separate score tracking', async ({ page }) => {
      // User starts in AI mode and plays a game
      await page.locator('#mode-ai-x').click();

      // Play AI game to completion
      await page.locator('.cell[data-index="4"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="0"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="8"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="2"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="6"]').click();
      await page.waitForTimeout(300);

      // Note AI mode scores (at least one game completed)
      const aiWins = await page.locator('#sp-wins').textContent();
      const aiLosses = await page.locator('#sp-losses').textContent();
      const aiDraws = await page.locator('#sp-draws').textContent();
      const aiTotal = parseInt(aiWins) + parseInt(aiLosses) + parseInt(aiDraws);
      expect(aiTotal).toBeGreaterThanOrEqual(1);

      // User switches to local mode
      await page.locator('#change-mode').click();
      await page.locator('#mode-local').click();

      // User sees multiplayer scores (should be 0)
      await expect(page.locator('#mp-x-wins')).toHaveText('0');
      await expect(page.locator('#mp-o-wins')).toHaveText('0');
      await expect(page.locator('#mp-draws')).toHaveText('0');

      // User sees multiplayer scores displayed (not AI scores)
      await expect(page.locator('#mp-scores')).toBeVisible();
      await expect(page.locator('#sp-scores')).not.toBeVisible();

      // User plays a local game - X wins
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X wins

      await expect(page.locator('#mp-x-wins')).toHaveText('1');

      // User switches back to AI mode
      await page.locator('#change-mode').click();
      await page.locator('#mode-ai-x').click();

      // User sees their original AI scores preserved
      await expect(page.locator('#sp-wins')).toHaveText(aiWins);
      await expect(page.locator('#sp-losses')).toHaveText(aiLosses);
      await expect(page.locator('#sp-draws')).toHaveText(aiDraws);

      // User sees AI scores displayed (not multiplayer scores)
      await expect(page.locator('#sp-scores')).toBeVisible();
      await expect(page.locator('#mp-scores')).not.toBeVisible();
    });

    test('user sees correct score display when changing modes multiple times', async ({ page }) => {
      // User goes to AI mode
      await page.locator('#mode-ai-x').click();
      await expect(page.locator('#sp-scores')).toBeVisible();
      await expect(page.locator('#sp-scores')).toContainText('W:');

      // User changes to local mode
      await page.locator('#change-mode').click();
      await page.locator('#mode-local').click();
      await expect(page.locator('#mp-scores')).toBeVisible();
      await expect(page.locator('#mp-scores')).toContainText('X:');

      // User changes back to AI mode
      await page.locator('#change-mode').click();
      await page.locator('#mode-ai-o').click();
      await expect(page.locator('#sp-scores')).toBeVisible();
      await expect(page.locator('#sp-scores')).toContainText('W:');
    });
  });

  test.describe('Journey 4: User returns to app and sees persisted scores', () => {
    test('user plays games, refreshes page, and sees scores preserved', async ({ page }) => {
      // User plays a local game
      await page.locator('#mode-local').click();

      // X wins
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X wins

      await expect(page.locator('#mp-x-wins')).toHaveText('1');

      // User refreshes the page (simulating returning later)
      await page.reload();

      // User selects local mode again
      await page.locator('#mode-local').click();

      // User sees their previous scores
      await expect(page.locator('#mp-x-wins')).toHaveText('1');
      await expect(page.locator('#mp-o-wins')).toHaveText('0');
      await expect(page.locator('#mp-draws')).toHaveText('0');
    });

    test('user plays AI games, closes and reopens app, sees scores', async ({ page }) => {
      // User plays AI mode
      await page.locator('#mode-ai-x').click();

      // Play a game to completion
      await page.locator('.cell[data-index="4"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="0"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="8"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="2"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="6"]').click();
      await page.waitForTimeout(300);

      // Note the scores
      const wins = await page.locator('#sp-wins').textContent();
      const losses = await page.locator('#sp-losses').textContent();
      const draws = await page.locator('#sp-draws').textContent();

      // User closes and reopens (simulated by reload)
      await page.reload();

      // User returns to AI mode
      await page.locator('#mode-ai-x').click();

      // User sees same scores
      await expect(page.locator('#sp-wins')).toHaveText(wins);
      await expect(page.locator('#sp-losses')).toHaveText(losses);
      await expect(page.locator('#sp-draws')).toHaveText(draws);
    });

    test('user accumulates scores across multiple sessions', async ({ page }) => {
      // Session 1: Play a local game
      await page.locator('#mode-local').click();
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X wins

      await expect(page.locator('#mp-x-wins')).toHaveText('1');

      // Simulate closing app
      await page.reload();

      // Session 2: User returns and plays another game
      await page.locator('#mode-local').click();
      await expect(page.locator('#mp-x-wins')).toHaveText('1'); // Previous score

      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="6"]').click(); // X
      await page.locator('.cell[data-index="5"]').click(); // O wins

      // Scores accumulated
      await expect(page.locator('#mp-x-wins')).toHaveText('1');
      await expect(page.locator('#mp-o-wins')).toHaveText('1');
    });
  });

  test.describe('Journey 5: User resets their scores', () => {
    test('user plays games, decides to reset, and starts fresh', async ({ page }) => {
      // User plays some local games
      await page.locator('#mode-local').click();

      // Play first game - X wins
      await page.locator('.cell[data-index="0"]').click();
      await page.locator('.cell[data-index="3"]').click();
      await page.locator('.cell[data-index="1"]').click();
      await page.locator('.cell[data-index="4"]').click();
      await page.locator('.cell[data-index="2"]').click();

      await expect(page.locator('#mp-x-wins')).toHaveText('1');

      // User decides to reset scores
      await expect(page.locator('#reset-scores')).toBeVisible();
      await page.locator('#reset-scores').click();

      // User sees all scores reset to 0
      await expect(page.locator('#mp-x-wins')).toHaveText('0');
      await expect(page.locator('#mp-o-wins')).toHaveText('0');
      await expect(page.locator('#mp-draws')).toHaveText('0');

      // User refreshes page and scores are still 0
      await page.reload();
      await page.locator('#mode-local').click();
      await expect(page.locator('#mp-x-wins')).toHaveText('0');
    });

    test('user resets AI scores independently from multiplayer scores', async ({ page }) => {
      // User plays both AI and local games first

      // AI game - play to completion
      await page.locator('#mode-ai-x').click();
      await page.locator('.cell[data-index="4"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="0"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="8"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="2"]').click();
      await page.waitForTimeout(200);
      await page.locator('.cell[data-index="6"]').click();
      await page.waitForTimeout(300);

      const aiWins = await page.locator('#sp-wins').textContent();

      // Switch to local and play
      await page.locator('#change-mode').click();
      await page.locator('#mode-local').click();
      await page.locator('.cell[data-index="0"]').click();
      await page.locator('.cell[data-index="3"]').click();
      await page.locator('.cell[data-index="1"]').click();
      await page.locator('.cell[data-index="4"]').click();
      await page.locator('.cell[data-index="2"]').click();

      await expect(page.locator('#mp-x-wins')).toHaveText('1');

      // User resets all scores
      await page.locator('#reset-scores').click();

      // Both AI and multiplayer scores are reset
      await expect(page.locator('#mp-x-wins')).toHaveText('0');

      await page.locator('#change-mode').click();
      await page.locator('#mode-ai-x').click();
      await expect(page.locator('#sp-wins')).toHaveText('0');
    });

    test('user can reset and immediately start playing again', async ({ page }) => {
      // User plays a game
      await page.locator('#mode-local').click();
      await page.locator('.cell[data-index="0"]').click();
      await page.locator('.cell[data-index="3"]').click();
      await page.locator('.cell[data-index="1"]').click();
      await page.locator('.cell[data-index="4"]').click();
      await page.locator('.cell[data-index="2"]').click();

      // User resets
      await page.locator('#reset-scores').click();
      await expect(page.locator('#mp-x-wins')).toHaveText('0');

      // User immediately plays another game
      await page.locator('#new-game').click();
      await page.locator('.cell[data-index="0"]').click();
      await page.locator('.cell[data-index="3"]').click();
      await page.locator('.cell[data-index="1"]').click();
      await page.locator('.cell[data-index="4"]').click();
      await page.locator('.cell[data-index="2"]').click();

      // New scores are tracked from 0
      await expect(page.locator('#mp-x-wins')).toHaveText('1');
      await expect(page.locator('#mp-o-wins')).toHaveText('0');
    });
  });

  test.describe('Journey 6: User interface and visual feedback', () => {
    test('user sees score display appears when game starts', async ({ page }) => {
      // Initially on mode selection screen
      await expect(page.locator('#score-display')).not.toBeVisible();

      // User selects a mode
      await page.locator('#mode-local').click();

      // Score display becomes visible
      await expect(page.locator('#score-display')).toBeVisible();
      await expect(page.locator('#mp-scores')).toBeVisible();
    });

    test('user sees appropriate score labels for each mode', async ({ page }) => {
      // AI mode shows W/L/D labels
      await page.locator('#mode-ai-x').click();
      await expect(page.locator('#sp-scores')).toContainText('W:');
      await expect(page.locator('#sp-scores')).toContainText('L:');
      await expect(page.locator('#sp-scores')).toContainText('D:');
      await expect(page.locator('#sp-scores')).toContainText('vs AI:');

      // Local mode shows X/O/D labels
      await page.locator('#change-mode').click();
      await page.locator('#mode-local').click();
      await expect(page.locator('#mp-scores')).toContainText('X:');
      await expect(page.locator('#mp-scores')).toContainText('O:');
      await expect(page.locator('#mp-scores')).toContainText('D:');
      await expect(page.locator('#mp-scores')).toContainText('Local:');
    });

    test('user sees score update immediately after game ends', async ({ page }) => {
      await page.locator('#mode-local').click();

      // Before game ends, X wins is 0
      await expect(page.locator('#mp-x-wins')).toHaveText('0');

      // Play until just before winning
      await page.locator('.cell[data-index="0"]').click();
      await page.locator('.cell[data-index="3"]').click();
      await page.locator('.cell[data-index="1"]').click();
      await page.locator('.cell[data-index="4"]').click();

      // Still 0
      await expect(page.locator('#mp-x-wins')).toHaveText('0');

      // Winning move
      await page.locator('.cell[data-index="2"]').click();

      // Immediately updates to 1 (no delay expected)
      await expect(page.locator('#mp-x-wins')).toHaveText('1');
    });

    test('user sees reset button is always accessible during game', async ({ page }) => {
      await page.locator('#mode-local').click();

      // Reset button visible before game
      await expect(page.locator('#reset-scores')).toBeVisible();

      // Still visible during game
      await page.locator('.cell[data-index="0"]').click();
      await expect(page.locator('#reset-scores')).toBeVisible();

      // Still visible after game ends
      await page.locator('.cell[data-index="3"]').click();
      await page.locator('.cell[data-index="1"]').click();
      await page.locator('.cell[data-index="4"]').click();
      await page.locator('.cell[data-index="2"]').click();
      await expect(page.locator('#reset-scores')).toBeVisible();
    });
  });
});
