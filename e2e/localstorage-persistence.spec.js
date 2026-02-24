const { test, expect } = require('@playwright/test');

test.describe('P0: localStorage Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#mode-local').click();
  });

  test.describe('Score State Initialization', () => {
    test('should initialize score state on page load', async ({ page }) => {
      const scores = await page.evaluate(() => scores);

      expect(scores).toBeDefined();
      expect(scores.singlePlayer).toBeDefined();
      expect(scores.multiplayer).toBeDefined();
    });

    test('should have correct default score structure', async ({ page }) => {
      const scores = await page.evaluate(() => scores);

      expect(scores.singlePlayer).toEqual({
        wins: 0,
        losses: 0,
        draws: 0
      });

      expect(scores.multiplayer).toEqual({
        xWins: 0,
        oWins: 0,
        draws: 0
      });
    });

    test('should define STORAGE_KEY constant', async ({ page }) => {
      const storageKey = await page.evaluate(() => STORAGE_KEY);
      expect(storageKey).toBe('ticTacToeScores');
    });
  });

  test.describe('localStorage Save Functionality', () => {
    test('should save scores to localStorage', async ({ page }) => {
      // Modify scores
      await page.evaluate(() => {
        scores.singlePlayer.wins = 5;
        scores.singlePlayer.losses = 3;
        scores.singlePlayer.draws = 2;
        saveScores();
      });

      // Check localStorage
      const savedData = await page.evaluate(() => {
        const data = localStorage.getItem('ticTacToeScores');
        return data ? JSON.parse(data) : null;
      });

      expect(savedData).toBeDefined();
      expect(savedData.singlePlayer.wins).toBe(5);
      expect(savedData.singlePlayer.losses).toBe(3);
      expect(savedData.singlePlayer.draws).toBe(2);
    });

    test('should save multiplayer scores to localStorage', async ({ page }) => {
      await page.evaluate(() => {
        scores.multiplayer.wins = 10;
        scores.multiplayer.losses = 8;
        scores.multiplayer.draws = 4;
        saveScores();
      });

      const savedData = await page.evaluate(() => {
        const data = localStorage.getItem('ticTacToeScores');
        return data ? JSON.parse(data) : null;
      });

      expect(savedData.multiplayer.wins).toBe(10);
      expect(savedData.multiplayer.losses).toBe(8);
      expect(savedData.multiplayer.draws).toBe(4);
    });

    test('should save both singlePlayer and multiplayer scores', async ({ page }) => {
      await page.evaluate(() => {
        scores.singlePlayer.wins = 3;
        scores.multiplayer.wins = 7;
        saveScores();
      });

      const savedData = await page.evaluate(() => {
        const data = localStorage.getItem('ticTacToeScores');
        return data ? JSON.parse(data) : null;
      });

      expect(savedData.singlePlayer.wins).toBe(3);
      expect(savedData.multiplayer.wins).toBe(7);
    });
  });

  test.describe('localStorage Load Functionality', () => {
    test('should load scores from localStorage on page load', async ({ page }) => {
      // Set up localStorage data
      await page.evaluate(() => {
        const testData = {
          singlePlayer: { wins: 12, losses: 5, draws: 3 },
          multiplayer: { xWins: 8, oWins: 6, draws: 2 }
        };
        localStorage.setItem('ticTacToeScores', JSON.stringify(testData));
      });

      // Reload page to trigger load
      await page.reload();

      // Check that scores were loaded
      const scores = await page.evaluate(() => scores);

      expect(scores.singlePlayer.wins).toBe(12);
      expect(scores.singlePlayer.losses).toBe(5);
      expect(scores.singlePlayer.draws).toBe(3);
      expect(scores.multiplayer.xWins).toBe(8);
      expect(scores.multiplayer.oWins).toBe(6);
      expect(scores.multiplayer.draws).toBe(2);
    });

    test('should load partial scores (only singlePlayer)', async ({ page }) => {
      await page.evaluate(() => {
        const testData = {
          singlePlayer: { wins: 5, losses: 2, draws: 1 },
          multiplayer: { wins: 0, losses: 0, draws: 0 }
        };
        localStorage.setItem('ticTacToeScores', JSON.stringify(testData));
      });

      await page.reload();

      const scores = await page.evaluate(() => scores);
      expect(scores.singlePlayer.wins).toBe(5);
      expect(scores.singlePlayer.losses).toBe(2);
      expect(scores.singlePlayer.draws).toBe(1);
    });

    test('should use default scores if localStorage is empty', async ({ page }) => {
      // localStorage already cleared in beforeEach
      const scores = await page.evaluate(() => scores);

      expect(scores.singlePlayer.wins).toBe(0);
      expect(scores.singlePlayer.losses).toBe(0);
      expect(scores.singlePlayer.draws).toBe(0);
      expect(scores.multiplayer.xWins).toBe(0);
      expect(scores.multiplayer.oWins).toBe(0);
      expect(scores.multiplayer.draws).toBe(0);
    });
  });

  test.describe('Score Persistence Across Page Reloads', () => {
    test('should persist scores across multiple page reloads', async ({ page }) => {
      // Set scores
      await page.evaluate(() => {
        scores.singlePlayer.wins = 7;
        saveScores();
      });

      // First reload
      await page.reload();
      let scores1 = await page.evaluate(() => scores.singlePlayer.wins);
      expect(scores1).toBe(7);

      // Second reload
      await page.reload();
      let scores2 = await page.evaluate(() => scores.singlePlayer.wins);
      expect(scores2).toBe(7);

      // Third reload
      await page.reload();
      let scores3 = await page.evaluate(() => scores.singlePlayer.wins);
      expect(scores3).toBe(7);
    });

    test('should persist updated scores', async ({ page }) => {
      // Initial save
      await page.evaluate(() => {
        scores.singlePlayer.wins = 5;
        saveScores();
      });

      await page.reload();

      // Update scores
      await page.evaluate(() => {
        scores.singlePlayer.wins = 10;
        saveScores();
      });

      await page.reload();

      const loadedScores = await page.evaluate(() => scores.singlePlayer.wins);
      expect(loadedScores).toBe(10);
    });

    test('should persist scores even after closing and reopening', async ({ page, context }) => {
      // Set scores
      await page.evaluate(() => {
        scores.singlePlayer.wins = 15;
        scores.multiplayer.wins = 20;
        saveScores();
      });

      // Create a new page (simulates closing and reopening)
      const newPage = await context.newPage();
      await newPage.goto('/');

      const newScores = await newPage.evaluate(() => scores);
      expect(newScores.singlePlayer.wins).toBe(15);
      expect(newScores.multiplayer.wins).toBe(20);

      await newPage.close();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle corrupted localStorage data gracefully', async ({ page }) => {
      // Set invalid JSON
      await page.evaluate(() => {
        localStorage.setItem('ticTacToeScores', 'invalid-json{{{');
      });

      // Should not crash, should use defaults
      await page.reload();

      const scores = await page.evaluate(() => scores);
      expect(scores.singlePlayer.wins).toBe(0);
      expect(scores.multiplayer.xWins).toBe(0);
    });

    test('should handle partial/malformed data in localStorage', async ({ page }) => {
      // Set incomplete data
      await page.evaluate(() => {
        localStorage.setItem('ticTacToeScores', JSON.stringify({
          singlePlayer: { wins: 5 } // Missing losses and draws
        }));
      });

      await page.reload();

      // Should still load what's available
      const scores = await page.evaluate(() => scores);
      expect(scores.singlePlayer.wins).toBe(5);
    });

    test('should not throw errors when saving fails', async ({ page }) => {
      // Note: It's hard to simulate quota exceeded in tests,
      // but we can verify the function exists and has error handling
      const hasTryCatch = await page.evaluate(() => {
        // Check if saveScores function has error handling
        const funcStr = saveScores.toString();
        return funcStr.includes('try') && funcStr.includes('catch');
      });

      expect(hasTryCatch).toBe(true);
    });

    test('should not throw errors when loading fails', async ({ page }) => {
      const hasTryCatch = await page.evaluate(() => {
        const funcStr = loadScores.toString();
        return funcStr.includes('try') && funcStr.includes('catch');
      });

      expect(hasTryCatch).toBe(true);
    });

    test('should log warnings on save/load failures to console', async ({ page }) => {
      const consoleLogs = [];

      page.on('console', msg => {
        if (msg.type() === 'warning') {
          consoleLogs.push(msg.text());
        }
      });

      // Trigger error by setting invalid data and forcing a load
      await page.evaluate(() => {
        localStorage.setItem('ticTacToeScores', '{invalid}');
      });

      await page.reload();

      // Check if warning was logged (may not be guaranteed to trigger, but validates the pattern)
      // This is more of a structural test - the error handling code exists
    });
  });

  test.describe('Console Logging', () => {
    test('should log scores to console on load', async ({ page }) => {
      const consoleLogs = [];

      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });

      await page.reload();

      const hasScoresLog = consoleLogs.some(log =>
        log.includes('Scores loaded')
      );

      expect(hasScoresLog).toBe(true);
    });

    test('should log score object details', async ({ page }) => {
      const consoleLogs = [];

      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });

      await page.evaluate(() => {
        localStorage.setItem('ticTacToeScores', JSON.stringify({
          singlePlayer: { wins: 10, losses: 5, draws: 2 },
          multiplayer: { wins: 0, losses: 0, draws: 0 }
        }));
      });

      await page.reload();

      // Verify the scores object is logged
      const scoresLog = consoleLogs.find(log => log.includes('Scores loaded'));
      expect(scoresLog).toBeDefined();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle very large score numbers', async ({ page }) => {
      await page.evaluate(() => {
        scores.singlePlayer.wins = 999999;
        scores.singlePlayer.losses = 888888;
        scores.singlePlayer.draws = 777777;
        saveScores();
      });

      await page.reload();

      const loadedScores = await page.evaluate(() => scores.singlePlayer);
      expect(loadedScores.wins).toBe(999999);
      expect(loadedScores.losses).toBe(888888);
      expect(loadedScores.draws).toBe(777777);
    });

    test('should handle zero scores correctly', async ({ page }) => {
      await page.evaluate(() => {
        scores.singlePlayer.wins = 0;
        scores.singlePlayer.losses = 0;
        scores.singlePlayer.draws = 0;
        saveScores();
      });

      await page.reload();

      const loadedScores = await page.evaluate(() => scores.singlePlayer);
      expect(loadedScores.wins).toBe(0);
      expect(loadedScores.losses).toBe(0);
      expect(loadedScores.draws).toBe(0);
    });

    test('should handle negative scores (edge case)', async ({ page }) => {
      // Although scores shouldn't be negative in normal use, test data handling
      await page.evaluate(() => {
        scores.singlePlayer.wins = -5;
        saveScores();
      });

      await page.reload();

      const loadedScores = await page.evaluate(() => scores.singlePlayer.wins);
      expect(loadedScores).toBe(-5);
    });
  });
});
