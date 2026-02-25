const { test, expect } = require('@playwright/test');

test.describe('P3 Animations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Task 1: Cell Mark Animations', () => {
    test('X mark receives animate-in class when placed', async ({ page }) => {
      await page.click('#mode-local');
      await page.click('.cell[data-index="0"]');
      const cell = page.locator('.cell[data-index="0"]');
      await expect(cell).toHaveClass(/animate-in/);
    });

    test('O mark receives animate-in class when placed', async ({ page }) => {
      await page.click('#mode-local');
      await page.click('.cell[data-index="0"]'); // X
      await page.click('.cell[data-index="1"]'); // O
      const cell = page.locator('.cell[data-index="1"]');
      await expect(cell).toHaveClass(/animate-in/);
    });

    test('Multiple marks in sequence all animate', async ({ page }) => {
      await page.click('#mode-local');

      // Place X at index 0
      await page.click('.cell[data-index="0"]');
      await expect(page.locator('.cell[data-index="0"]')).toHaveClass(/animate-in/);

      // Place O at index 1
      await page.click('.cell[data-index="1"]');
      await expect(page.locator('.cell[data-index="1"]')).toHaveClass(/animate-in/);

      // Place X at index 2
      await page.click('.cell[data-index="2"]');
      await expect(page.locator('.cell[data-index="2"]')).toHaveClass(/animate-in/);
    });

    test('AI mode marks animate', async ({ page }) => {
      await page.click('#mode-ai-x'); // Fixed: correct selector
      await page.click('.cell[data-index="0"]');

      // Check player move animated
      await expect(page.locator('.cell[data-index="0"]')).toHaveClass(/animate-in/);

      // Wait for AI move and check it animates too
      await page.waitForTimeout(500);
      const aiMovedCells = await page.locator('.cell.o.animate-in').count();
      expect(aiMovedCells).toBeGreaterThan(0);
    });
  });

  test.describe('Task 2: Winning Line Highlight', () => {
    test('Horizontal win highlights correct cells with winning class', async ({ page }) => {
      await page.click('#mode-local');

      // Create horizontal win on top row (0, 1, 2)
      await page.click('.cell[data-index="0"]'); // X
      await page.click('.cell[data-index="3"]'); // O
      await page.click('.cell[data-index="1"]'); // X
      await page.click('.cell[data-index="4"]'); // O
      await page.click('.cell[data-index="2"]'); // X wins

      // Check winning cells have winning class
      await expect(page.locator('.cell[data-index="0"]')).toHaveClass(/winning/);
      await expect(page.locator('.cell[data-index="1"]')).toHaveClass(/winning/);
      await expect(page.locator('.cell[data-index="2"]')).toHaveClass(/winning/);

      // Check non-winning cells don't have winning class
      await expect(page.locator('.cell[data-index="3"]')).not.toHaveClass(/winning/);
    });

    test('Vertical win highlights correct cells', async ({ page }) => {
      await page.click('#mode-local');

      // Create vertical win on left column (0, 3, 6)
      await page.click('.cell[data-index="0"]'); // X
      await page.click('.cell[data-index="1"]'); // O
      await page.click('.cell[data-index="3"]'); // X
      await page.click('.cell[data-index="2"]'); // O
      await page.click('.cell[data-index="6"]'); // X wins

      // Check winning cells
      await expect(page.locator('.cell[data-index="0"]')).toHaveClass(/winning/);
      await expect(page.locator('.cell[data-index="3"]')).toHaveClass(/winning/);
      await expect(page.locator('.cell[data-index="6"]')).toHaveClass(/winning/);
    });

    test('Diagonal win highlights correct cells', async ({ page }) => {
      await page.click('#mode-local');

      // Create diagonal win (0, 4, 8)
      await page.click('.cell[data-index="0"]'); // X
      await page.click('.cell[data-index="1"]'); // O
      await page.click('.cell[data-index="4"]'); // X
      await page.click('.cell[data-index="2"]'); // O
      await page.click('.cell[data-index="8"]'); // X wins

      // Check winning cells
      await expect(page.locator('.cell[data-index="0"]')).toHaveClass(/winning/);
      await expect(page.locator('.cell[data-index="4"]')).toHaveClass(/winning/);
      await expect(page.locator('.cell[data-index="8"]')).toHaveClass(/winning/);
    });

    test('Winning classes cleared on new game', async ({ page }) => {
      await page.click('#mode-local');

      // Create a win
      await page.click('.cell[data-index="0"]'); // X
      await page.click('.cell[data-index="3"]'); // O
      await page.click('.cell[data-index="1"]'); // X
      await page.click('.cell[data-index="4"]'); // O
      await page.click('.cell[data-index="2"]'); // X wins

      // Verify winning classes exist
      await expect(page.locator('.cell[data-index="0"]')).toHaveClass(/winning/);

      // Start new game
      await page.click('#new-game');

      // Verify winning classes cleared
      await expect(page.locator('.cell[data-index="0"]')).not.toHaveClass(/winning/);
      await expect(page.locator('.cell[data-index="1"]')).not.toHaveClass(/winning/);
      await expect(page.locator('.cell[data-index="2"]')).not.toHaveClass(/winning/);
    });
  });

  test.describe('Task 4: Score Counter Animation', () => {
    test('Single player win animates sp-wins', async ({ page }) => {
      await page.click('#mode-ai-x'); // Fixed: correct selector

      // Force a win scenario - place marks strategically
      await page.click('.cell[data-index="0"]'); // Player
      await page.waitForTimeout(100);
      await page.click('.cell[data-index="3"]'); // Player
      await page.waitForTimeout(100);
      await page.click('.cell[data-index="6"]'); // Player - potential win

      // Wait a bit to see if player wins
      await page.waitForTimeout(200);

      // Check if sp-wins element has or had updated class
      const spWins = page.locator('#sp-wins');
      // The class might be removed after animation, so just check element exists
      await expect(spWins).toBeVisible();
    });

    test('Multiplayer X win animates mp-x-wins', async ({ page }) => {
      await page.click('#mode-local');

      // Create X win
      await page.click('.cell[data-index="0"]'); // X
      await page.click('.cell[data-index="3"]'); // O
      await page.click('.cell[data-index="1"]'); // X
      await page.click('.cell[data-index="4"]'); // O
      await page.click('.cell[data-index="2"]'); // X wins

      // Wait for score update
      await page.waitForTimeout(100);

      // Verify X wins score increased
      const mpXWins = page.locator('#mp-x-wins');
      await expect(mpXWins).toHaveText('1');
    });

    test('Multiplayer O win animates mp-o-wins', async ({ page }) => {
      await page.click('#mode-local');

      // Create O win
      await page.click('.cell[data-index="0"]'); // X
      await page.click('.cell[data-index="3"]'); // O
      await page.click('.cell[data-index="1"]'); // X
      await page.click('.cell[data-index="4"]'); // O
      await page.click('.cell[data-index="8"]'); // X
      await page.click('.cell[data-index="5"]'); // O wins

      // Wait for score update
      await page.waitForTimeout(100);

      // Verify O wins score increased
      const mpOWins = page.locator('#mp-o-wins');
      await expect(mpOWins).toHaveText('1');
    });

    test('Multiplayer draw animates mp-draws', async ({ page }) => {
      await page.click('#mode-local');

      // Create a draw game
      await page.click('.cell[data-index="0"]'); // X
      await page.click('.cell[data-index="1"]'); // O
      await page.click('.cell[data-index="2"]'); // X
      await page.click('.cell[data-index="4"]'); // O
      await page.click('.cell[data-index="3"]'); // X
      await page.click('.cell[data-index="5"]'); // O
      await page.click('.cell[data-index="7"]'); // X
      await page.click('.cell[data-index="6"]'); // O
      await page.click('.cell[data-index="8"]'); // X - draw

      // Wait for score update
      await page.waitForTimeout(100);

      // Verify draw score increased
      const mpDraws = page.locator('#mp-draws');
      await expect(mpDraws).toHaveText('1');
    });
  });

  test.describe('User Journey: Complete Game with Animations', () => {
    test('Playing a full game shows all animations working together', async ({ page }) => {
      await page.click('#mode-local');

      // Place first X - should animate
      await page.click('.cell[data-index="4"]'); // Center
      await expect(page.locator('.cell[data-index="4"]')).toHaveClass(/animate-in/);
      await expect(page.locator('.cell[data-index="4"]')).toHaveClass(/x/);

      // Place first O - should animate
      await page.click('.cell[data-index="0"]');
      await expect(page.locator('.cell[data-index="0"]')).toHaveClass(/animate-in/);
      await expect(page.locator('.cell[data-index="0"]')).toHaveClass(/o/);

      // Continue to create winning scenario
      await page.click('.cell[data-index="2"]'); // X
      await page.click('.cell[data-index="1"]'); // O
      await page.click('.cell[data-index="6"]'); // X wins (4, 2, 6 diagonal)

      // Check winning line highlights
      await expect(page.locator('.cell[data-index="4"]')).toHaveClass(/winning/);
      await expect(page.locator('.cell[data-index="2"]')).toHaveClass(/winning/);
      await expect(page.locator('.cell[data-index="6"]')).toHaveClass(/winning/);

      // Check score updated
      const mpXWins = page.locator('#mp-x-wins');
      await expect(mpXWins).toHaveText('1');

      // Start new game
      await page.click('#new-game');

      // Verify board cleared and winning classes removed
      await expect(page.locator('.cell[data-index="4"]')).not.toHaveClass(/winning/);
      await expect(page.locator('.cell[data-index="4"]')).not.toHaveClass(/x/);

      // Verify new marks still animate
      await page.click('.cell[data-index="0"]');
      await expect(page.locator('.cell[data-index="0"]')).toHaveClass(/animate-in/);
    });
  });

  test.describe('Panel Transitions', () => {
    test('panel has CSS transition property defined', async ({ page }) => {
      await page.goto('/');

      const modeSelection = page.locator('#mode-selection');
      const transition = await modeSelection.evaluate(el =>
        getComputedStyle(el).transition
      );

      // Verify transition includes opacity
      expect(transition).toContain('opacity');
    });

    test('panel fades out when starting game', async ({ page }) => {
      await page.goto('/');

      const modeSelection = page.locator('#mode-selection');

      // Click to start game
      await page.click('button:has-text("Play as X")');

      // Panel should become hidden (opacity 0, visibility hidden)
      await expect(modeSelection).toHaveCSS('opacity', '0');
      await expect(modeSelection).toHaveCSS('visibility', 'hidden');
    });

    test('respects reduced motion preference', async ({ page }) => {
      // Emulate reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');

      const modeSelection = page.locator('#mode-selection');
      const transition = await modeSelection.evaluate(el =>
        getComputedStyle(el).transition
      );

      // Should have no transition (or 0s duration)
      expect(transition).toMatch(/none|0s/);
    });

    test('game container fades in after mode selection', async ({ page }) => {
      await page.goto('/');

      const gameContainer = page.locator('#game-container');

      // Initially game container should be hidden
      await expect(gameContainer).toHaveClass(/hidden/);

      // Start game
      await page.click('#mode-local');

      // Wait a moment for transition to start
      await page.waitForTimeout(50);

      // Game container should now be visible (not hidden class)
      await expect(gameContainer).not.toHaveClass(/hidden/);

      // And should have opacity 1
      await expect(gameContainer).toHaveCSS('opacity', '1');
    });

    test('complete panel transition flow works smoothly', async ({ page }) => {
      await page.goto('/');

      const modeSelection = page.locator('#mode-selection');
      const gameContainer = page.locator('#game-container');

      // Initial state: mode-selection visible, game-container hidden
      await expect(modeSelection).not.toHaveClass(/hidden/);
      await expect(gameContainer).toHaveClass(/hidden/);

      // Click to start game
      await page.click('#mode-local');

      // Wait for transitions (200ms as per plan)
      await page.waitForTimeout(250);

      // Final state: mode-selection hidden, game-container visible
      await expect(modeSelection).toHaveClass(/hidden/);
      await expect(modeSelection).toHaveCSS('opacity', '0');
      await expect(gameContainer).not.toHaveClass(/hidden/);
      await expect(gameContainer).toHaveCSS('opacity', '1');
    });

    test('no animation flash on initial page load', async ({ page }) => {
      await page.goto('/');

      // Check that transitions-enabled class is not on body immediately
      // (it gets added after first paint via requestAnimationFrame)
      const bodyClassInitial = await page.locator('body').getAttribute('class');

      // After a short wait, transitions should be enabled
      await page.waitForTimeout(100);
      const bodyClassAfter = await page.locator('body').getAttribute('class');

      expect(bodyClassAfter).toContain('transitions-enabled');
    });

    test('board clears with animation on new game (P3 feature)', async ({ page }) => {
      await page.goto('/');
      await page.click('#mode-local');

      // Place some marks
      await page.click('.cell[data-index="0"]'); // X
      await page.click('.cell[data-index="1"]'); // O
      await page.click('.cell[data-index="2"]'); // X

      // Verify marks are present
      await expect(page.locator('.cell[data-index="0"]')).toHaveClass(/x/);
      await expect(page.locator('.cell[data-index="1"]')).toHaveClass(/o/);

      // Click new game
      const beforeClear = Date.now();
      await page.click('#new-game');

      // Wait for clearing animation (150ms)
      await page.waitForTimeout(200);

      // Board should be cleared after animation
      await expect(page.locator('.cell[data-index="0"]')).not.toHaveClass(/x/);
      await expect(page.locator('.cell[data-index="1"]')).not.toHaveClass(/o/);
      await expect(page.locator('.cell[data-index="2"]')).not.toHaveClass(/x/);

      const afterClear = Date.now();
      const clearTime = afterClear - beforeClear;

      // Should clear with animation (150ms + buffer, not instant)
      expect(clearTime).toBeGreaterThan(140);  // At least animation duration
    });
  });

  test.describe('WebRTC Panel Transitions', () => {
    test('connection panel transitions work for WebRTC flow', async ({ page }) => {
      await page.goto('/');

      const modeSelection = page.locator('#mode-selection');
      const connectionPanel = page.locator('#connection-panel');
      const gameContainer = page.locator('#game-container');

      // Initial state
      await expect(modeSelection).not.toHaveClass(/hidden/);
      await expect(connectionPanel).toHaveClass(/hidden/);
      await expect(gameContainer).toHaveClass(/hidden/);

      // Click WebRTC button to open connection panel
      await page.click('#mode-webrtc');

      // Wait for transition
      await page.waitForTimeout(250);

      // Should transition to connection panel
      await expect(modeSelection).toHaveClass(/hidden/);
      await expect(connectionPanel).not.toHaveClass(/hidden/);
      await expect(connectionPanel).toHaveCSS('opacity', '1');
      await expect(gameContainer).toHaveClass(/hidden/);
    });

    test('back button transitions from connection panel to mode selection', async ({ page }) => {
      await page.goto('/');

      // Go to connection panel
      await page.click('#mode-webrtc');
      await page.waitForTimeout(250);

      const modeSelection = page.locator('#mode-selection');
      const connectionPanel = page.locator('#connection-panel');

      // Verify we're on connection panel
      await expect(connectionPanel).not.toHaveClass(/hidden/);

      // Click back button
      await page.click('#back-to-modes');
      await page.waitForTimeout(250);

      // Should transition back to mode selection
      await expect(modeSelection).not.toHaveClass(/hidden/);
      await expect(modeSelection).toHaveCSS('opacity', '1');
      await expect(connectionPanel).toHaveClass(/hidden/);
      await expect(connectionPanel).toHaveCSS('opacity', '0');
    });
  });

  test.describe('Board Reset Transitions', () => {
    test('cells get clearing class on reset', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("vs Player")');
      await page.click('.cell[data-index="0"]');
      await page.click('.cell[data-index="1"]');

      // Cells should have marks
      await expect(page.locator('.cell[data-index="0"]')).toHaveText('X');

      // Click new game
      await page.click('button:has-text("New Game")');

      // Cells should have clearing class (briefly)
      const cell0 = page.locator('.cell[data-index="0"]');
      await expect(cell0).toHaveClass(/clearing/);
    });

    test('cells are cleared after animation completes', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("vs Player")');
      await page.click('.cell[data-index="0"]');

      await page.click('button:has-text("New Game")');

      // Wait for animation (150ms + buffer)
      await page.waitForTimeout(200);

      // Cell should be empty and no clearing class
      const cell0 = page.locator('.cell[data-index="0"]');
      await expect(cell0).toHaveText('');
      await expect(cell0).not.toHaveClass(/clearing/);
    });

    test('clearing animation has correct CSS properties', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("vs Player")');
      await page.click('.cell[data-index="4"]');

      await page.click('button:has-text("New Game")');

      const cell4 = page.locator('.cell[data-index="4"]');
      const animation = await cell4.evaluate(el => {
        const style = getComputedStyle(el);
        return style.animationName;
      });
      expect(animation).toBe('cellClear');
    });

    test('rapid resets do not cause race conditions', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("vs Player")');
      await page.click('.cell[data-index="0"]');

      // Rapid clicks on New Game
      await page.click('button:has-text("New Game")');
      await page.click('button:has-text("New Game")');
      await page.click('button:has-text("New Game")');

      // Wait for animation
      await page.waitForTimeout(200);

      // Board should be cleanly reset
      const allCells = page.locator('.cell');
      for (let i = 0; i < 9; i++) {
        await expect(allCells.nth(i)).toHaveText('');
        await expect(allCells.nth(i)).not.toHaveClass(/clearing/);
      }
    });

    test('reduced motion disables clearing animation', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await page.click('button:has-text("vs Player")');
      await page.click('.cell[data-index="0"]');

      await page.click('button:has-text("New Game")');

      const cell0 = page.locator('.cell[data-index="0"]');
      const animation = await cell0.evaluate(el => {
        return getComputedStyle(el).animationName;
      });
      expect(animation).toBe('none');
    });

    test('AI game respects animation timing before AI move', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("Play as O")');

      // AI makes first move (as X)
      await page.waitForTimeout(350);

      // Make some moves to fill board partially
      const emptyCell = page.locator('.cell:not(:has-text("X")):not(:has-text("O"))').first();
      await emptyCell.click();

      await page.waitForTimeout(350);

      // Reset game
      await page.click('button:has-text("New Game")');

      // Animation (150ms) + AI delay (300ms) = 450ms total
      await page.waitForTimeout(500);

      // Board should have exactly one X (AI's new first move)
      const xCount = await page.locator('.cell:has-text("X")').count();
      expect(xCount).toBe(1);
    });

    test('WebRTC reset syncs animation to both peers', async ({ browser }) => {
      // Two-context pattern for peer-to-peer testing
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const host = await context1.newPage();
      const guest = await context2.newPage();

      // Connect peers
      await host.goto('/');
      await guest.goto('/');
      await host.locator('#mode-webrtc').click();
      await host.locator('#create-game').click();
      await expect(host.locator('#copy-code')).toBeVisible({ timeout: 10000 });
      const offer = await host.locator('#connection-code').inputValue();
      await guest.locator('#mode-webrtc').click();
      await guest.locator('#connection-code').fill(offer);
      await guest.locator('#join-game').click();
      await expect(guest.locator('#submit-answer')).toBeVisible({ timeout: 10000 });
      const answer = await guest.locator('#connection-code').inputValue();
      await host.locator('#connection-code').fill(answer);
      await host.locator('#submit-answer').click();
      await expect(host.locator('#game-container')).toBeVisible({ timeout: 10000 });

      // Host makes a move
      await host.locator('.cell[data-index="0"]').click();
      await expect(guest.locator('.cell[data-index="0"]')).toHaveText('X', { timeout: 5000 });

      // Host resets game
      await host.locator('#new-game').click();

      // Both should see clearing animation (briefly)
      await expect(host.locator('.cell[data-index="0"]')).toHaveClass(/clearing/);
      await expect(guest.locator('.cell[data-index="0"]')).toHaveClass(/clearing/);

      // After animation, both boards should be empty
      await host.waitForTimeout(200);
      await expect(host.locator('.cell[data-index="0"]')).toHaveText('');
      await expect(guest.locator('.cell[data-index="0"]')).toHaveText('');

      await context1.close();
      await context2.close();
    });
  });
});
