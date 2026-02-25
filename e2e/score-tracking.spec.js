// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('P2 Score Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Score Initialization', () => {
    test('scores default to zero on fresh load', async ({ page }) => {
      // Clear any existing scores
      await page.evaluate(() => localStorage.removeItem('ticTacToeScores'));
      await page.reload();

      const scores = await page.evaluate(() => scores);
      expect(scores.singlePlayer.wins).toBe(0);
      expect(scores.singlePlayer.losses).toBe(0);
      expect(scores.singlePlayer.draws).toBe(0);
      expect(scores.multiplayer.xWins).toBe(0);
      expect(scores.multiplayer.oWins).toBe(0);
      expect(scores.multiplayer.draws).toBe(0);
    });

    test('score structure has correct shape', async ({ page }) => {
      const scores = await page.evaluate(() => scores);

      // Single player structure
      expect(scores.singlePlayer).toHaveProperty('wins');
      expect(scores.singlePlayer).toHaveProperty('losses');
      expect(scores.singlePlayer).toHaveProperty('draws');

      // Multiplayer structure
      expect(scores.multiplayer).toHaveProperty('xWins');
      expect(scores.multiplayer).toHaveProperty('oWins');
      expect(scores.multiplayer).toHaveProperty('draws');
    });
  });

  test.describe('Score Display UI', () => {
    test('score display container exists in game container', async ({ page }) => {
      await page.locator('#mode-local').click();

      // Verify parent container is visible (individual score row visibility tested separately)
      await expect(page.locator('#score-display')).toBeVisible();
    });

    test('single player scores show correct labels', async ({ page }) => {
      await page.locator('#mode-ai-x').click();

      const spScores = page.locator('#sp-scores');
      await expect(spScores).toContainText('W:');
      await expect(spScores).toContainText('L:');
      await expect(spScores).toContainText('D:');
    });

    test('multiplayer scores show correct labels', async ({ page }) => {
      await page.locator('#mode-local').click();

      const mpScores = page.locator('#mp-scores');
      await expect(mpScores).toContainText('X:');
      await expect(mpScores).toContainText('O:');
      await expect(mpScores).toContainText('D:');
    });

    test('shows single player scores in AI mode', async ({ page }) => {
      await page.locator('#mode-ai-x').click();

      await expect(page.locator('#sp-scores')).toBeVisible();
      await expect(page.locator('#mp-scores')).not.toBeVisible();
    });

    test('shows multiplayer scores in local mode', async ({ page }) => {
      await page.locator('#mode-local').click();

      await expect(page.locator('#mp-scores')).toBeVisible();
      await expect(page.locator('#sp-scores')).not.toBeVisible();
    });
  });

  test.describe('Score Display Updates', () => {
    test('updateScoreDisplay shows current scores', async ({ page }) => {
      await page.evaluate(() => {
        scores.singlePlayer.wins = 5;
        scores.singlePlayer.losses = 3;
        scores.singlePlayer.draws = 2;
        updateScoreDisplay();
      });

      await page.locator('#mode-ai-x').click();

      await expect(page.locator('#sp-wins')).toHaveText('5');
      await expect(page.locator('#sp-losses')).toHaveText('3');
      await expect(page.locator('#sp-draws')).toHaveText('2');
    });

    test('updateScoreDisplay shows multiplayer scores', async ({ page }) => {
      await page.evaluate(() => {
        scores.multiplayer.xWins = 4;
        scores.multiplayer.oWins = 6;
        scores.multiplayer.draws = 1;
        updateScoreDisplay();
      });

      await page.locator('#mode-local').click();

      await expect(page.locator('#mp-x-wins')).toHaveText('4');
      await expect(page.locator('#mp-o-wins')).toHaveText('6');
      await expect(page.locator('#mp-draws')).toHaveText('1');
    });
  });

  test.describe('Score Recording - Single Player', () => {
    test('win against AI increments singlePlayer.wins', async ({ page }) => {
      await page.evaluate(() => localStorage.removeItem('ticTacToeScores'));
      await page.reload();
      await page.locator('#mode-ai-x').click();

      // Set up board where player (X) wins next move
      await page.evaluate(() => {
        game.board = ['X', 'X', null, 'O', 'O', null, null, null, null];
        game.currentPlayer = 'X';
        updateUI();
      });

      // Player wins at position 2 (completes top row)
      await page.locator('.cell[data-index="2"]').click();

      // Verify game over and player won
      const state = await page.evaluate(() => ({
        isGameOver: game.isGameOver,
        winner: game.winner
      }));
      expect(state.isGameOver).toBe(true);
      expect(state.winner).toBe('X');

      // CRITICAL: Verify score actually incremented
      const scores = await page.evaluate(() => scores);
      expect(scores.singlePlayer.wins).toBe(1);
      expect(scores.singlePlayer.losses).toBe(0);
    });

    test('loss to AI increments singlePlayer.losses', async ({ page }) => {
      // validation-b #1 fix: ACTUAL test, not structure stub
      await page.evaluate(() => localStorage.removeItem('ticTacToeScores'));
      await page.reload();
      await page.locator('#mode-ai-x').click();

      // Set up board where AI (O) can win on its turn
      await page.evaluate(() => {
        game.board = ['X', null, 'X', 'O', 'O', null, null, null, null];
        game.currentPlayer = 'O';
        game.aiSymbol = 'O';
        game.playerSymbol = 'X';
        updateUI();
      });

      // Trigger AI move - it will win at position 5 (completing 3-4-5)
      await page.evaluate(() => makeAIMove());
      await page.waitForTimeout(100);

      // Verify AI won
      const state = await page.evaluate(() => ({
        isGameOver: game.isGameOver,
        winner: game.winner
      }));
      expect(state.isGameOver).toBe(true);
      expect(state.winner).toBe('O');

      // CRITICAL: Verify loss actually recorded
      const scores = await page.evaluate(() => scores);
      expect(scores.singlePlayer.losses).toBe(1);
      expect(scores.singlePlayer.wins).toBe(0);
    });

    test('draw with AI increments singlePlayer.draws', async ({ page }) => {
      // validation-b #1 fix: ACTUAL test, not structure stub
      await page.evaluate(() => localStorage.removeItem('ticTacToeScores'));
      await page.reload();
      await page.locator('#mode-ai-x').click();

      // Set up board one move from draw (no winner possible)
      await page.evaluate(() => {
        game.board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null];
        game.currentPlayer = 'X';
        game.aiSymbol = 'O';
        game.playerSymbol = 'X';
        updateUI();
      });

      // Player X fills last cell, resulting in draw
      await page.locator('.cell[data-index="8"]').click();

      // Verify draw (game over, no winner)
      const state = await page.evaluate(() => ({
        isGameOver: game.isGameOver,
        winner: game.winner
      }));
      expect(state.isGameOver).toBe(true);
      expect(state.winner).toBe(null);  // null = draw

      // CRITICAL: Verify draw actually recorded
      const scores = await page.evaluate(() => scores);
      expect(scores.singlePlayer.draws).toBe(1);
    });
  });

  test.describe('Score Recording - Multiplayer', () => {
    test('X win increments multiplayer.xWins', async ({ page }) => {
      await page.evaluate(() => localStorage.removeItem('ticTacToeScores'));
      await page.reload();

      await page.locator('#mode-local').click();

      // X wins with top row
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X wins

      const scores = await page.evaluate(() => scores);
      expect(scores.multiplayer.xWins).toBe(1);
    });

    test('O win increments multiplayer.oWins', async ({ page }) => {
      await page.evaluate(() => localStorage.removeItem('ticTacToeScores'));
      await page.reload();

      await page.locator('#mode-local').click();

      // O wins with middle row (3-4-5)
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="3"]').click(); // O
      await page.locator('.cell[data-index="1"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="6"]').click(); // X
      await page.locator('.cell[data-index="5"]').click(); // O wins

      const scores = await page.evaluate(() => scores);
      expect(scores.multiplayer.oWins).toBe(1);
    });

    test.skip('draw increments multiplayer.draws', async ({ page }) => {
      // OBSOLETE: With P5 disappearing marks mechanic, draws are impossible after move 5.
      await page.evaluate(() => localStorage.removeItem('ticTacToeScores'));
      await page.reload();

      await page.locator('#mode-local').click();

      // Play a draw: 0,1,2,4,3,6,5,8,7 (verified sequence)
      await page.locator('.cell[data-index="0"]').click(); // X
      await page.locator('.cell[data-index="1"]').click(); // O
      await page.locator('.cell[data-index="2"]').click(); // X
      await page.locator('.cell[data-index="4"]').click(); // O
      await page.locator('.cell[data-index="3"]').click(); // X
      await page.locator('.cell[data-index="6"]').click(); // O
      await page.locator('.cell[data-index="5"]').click(); // X
      await page.locator('.cell[data-index="8"]').click(); // O
      await page.locator('.cell[data-index="7"]').click(); // X - draw

      const scores = await page.evaluate(() => scores);
      expect(scores.multiplayer.draws).toBe(1);
    });
  });

  test.describe('Reset Scores', () => {
    test('reset button exists in controls', async ({ page }) => {
      await page.locator('#mode-local').click();
      await expect(page.locator('#reset-scores')).toBeVisible();
    });

    test('reset button clears all scores', async ({ page }) => {
      // Set up some scores
      await page.evaluate(() => {
        scores.singlePlayer = { wins: 5, losses: 3, draws: 2 };
        scores.multiplayer = { xWins: 4, oWins: 6, draws: 1 };
        saveScores();
      });
      await page.reload();

      await page.locator('#mode-local').click();
      await page.locator('#reset-scores').click();

      const scores = await page.evaluate(() => scores);
      expect(scores.singlePlayer.wins).toBe(0);
      expect(scores.singlePlayer.losses).toBe(0);
      expect(scores.singlePlayer.draws).toBe(0);
      expect(scores.multiplayer.xWins).toBe(0);
      expect(scores.multiplayer.oWins).toBe(0);
      expect(scores.multiplayer.draws).toBe(0);
    });

    test('reset updates localStorage', async ({ page }) => {
      await page.evaluate(() => {
        scores.singlePlayer.wins = 10;
        saveScores();
      });
      await page.reload();

      await page.locator('#mode-local').click();
      await page.locator('#reset-scores').click();

      // Check localStorage directly
      const saved = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('ticTacToeScores'));
      });
      expect(saved.singlePlayer.wins).toBe(0);
    });

    test('reset updates display immediately', async ({ page }) => {
      await page.evaluate(() => {
        scores.multiplayer.xWins = 7;
        saveScores();
      });
      await page.reload();

      await page.locator('#mode-local').click();
      await expect(page.locator('#mp-x-wins')).toHaveText('7');

      await page.locator('#reset-scores').click();
      await expect(page.locator('#mp-x-wins')).toHaveText('0');
    });
  });

  test.describe('Score Persistence', () => {
    test('scores persist after page reload', async ({ page }) => {
      await page.evaluate(() => localStorage.removeItem('ticTacToeScores'));
      await page.reload();

      await page.locator('#mode-local').click();

      // Play a game - X wins
      await page.locator('.cell[data-index="0"]').click();
      await page.locator('.cell[data-index="3"]').click();
      await page.locator('.cell[data-index="1"]').click();
      await page.locator('.cell[data-index="4"]').click();
      await page.locator('.cell[data-index="2"]').click();

      // Reload and check
      await page.reload();
      await page.locator('#mode-local').click();

      await expect(page.locator('#mp-x-wins')).toHaveText('1');
    });

    test('scores persist across mode changes', async ({ page }) => {
      await page.evaluate(() => localStorage.removeItem('ticTacToeScores'));
      await page.reload();

      // Play local game
      await page.locator('#mode-local').click();
      await page.locator('.cell[data-index="0"]').click();
      await page.locator('.cell[data-index="3"]').click();
      await page.locator('.cell[data-index="1"]').click();
      await page.locator('.cell[data-index="4"]').click();
      await page.locator('.cell[data-index="2"]').click();

      // Change mode and back
      await page.locator('#change-mode').click();
      await page.locator('#mode-local').click();

      await expect(page.locator('#mp-x-wins')).toHaveText('1');
    });

    test('scores restored on page load', async ({ page }) => {
      // Pre-populate localStorage
      await page.evaluate(() => {
        localStorage.setItem('ticTacToeScores', JSON.stringify({
          singlePlayer: { wins: 10, losses: 5, draws: 3 },
          multiplayer: { xWins: 7, oWins: 8, draws: 2 }
        }));
      });
      await page.reload();

      await page.locator('#mode-ai-x').click();
      await expect(page.locator('#sp-wins')).toHaveText('10');
      await expect(page.locator('#sp-losses')).toHaveText('5');
      await expect(page.locator('#sp-draws')).toHaveText('3');
    });

    test('corrupted localStorage handled gracefully', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('ticTacToeScores', 'invalid json{{{');
      });
      await page.reload();

      // Should not crash, scores should be default
      await page.locator('#mode-local').click();
      await expect(page.locator('#mp-x-wins')).toHaveText('0');
    });
  });
});
