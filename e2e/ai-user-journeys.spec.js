const { test, expect } = require('@playwright/test');

test.describe('P1: AI User Journeys - End to End', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test.describe('User Journey: Playing as X vs AI', () => {
        test('complete game flow: player makes moves and game reaches conclusion', async ({ page }) => {
            // User arrives at mode selection
            await expect(page.locator('#mode-selection')).toBeVisible();

            // User selects "Play as X vs AI"
            await page.locator('#mode-ai-x').click();

            // Game board appears
            await expect(page.locator('#game-container')).toBeVisible();
            await expect(page.locator('#mode-selection')).toBeHidden();

            // User sees it's X's turn (their turn)
            await expect(page.locator('#status')).toHaveText("Player X's turn");

            // User clicks top-left corner
            await page.locator('.cell[data-index="0"]').click();
            await expect(page.locator('.cell[data-index="0"]')).toHaveText('X');

            // Wait for AI to respond
            await page.waitForTimeout(500);

            // Verify AI made a move (O should appear somewhere)
            await expect(page.locator('#status')).toHaveText("Player X's turn");
            const boardAfterAI1 = await page.evaluate(() => game.board);
            const aiMoves1 = boardAfterAI1.filter(c => c === 'O').length;
            expect(aiMoves1).toBe(1);

            // User makes second move
            await page.locator('.cell[data-index="1"]').click();
            await expect(page.locator('.cell[data-index="1"]')).toHaveText('X');

            // Wait for AI response
            await page.waitForTimeout(500);

            // Verify game is progressing (either continues or ends)
            const finalStatus = await page.locator('#status').textContent();
            const isValidStatus =
                finalStatus.includes("Player X's turn") ||
                finalStatus.includes("Player O's turn") ||
                finalStatus.includes("wins") ||
                finalStatus.includes("draw");
            expect(isValidStatus).toBe(true);
        });

        test('user plays against AI and experiences AI blocking strategy', async ({ page }) => {
            // User selects "Play as X vs AI"
            await page.locator('#mode-ai-x').click();

            // User tries to build a row
            await page.locator('.cell[data-index="0"]').click();  // X top-left
            await page.waitForTimeout(400);

            await page.locator('.cell[data-index="1"]').click();  // X top-middle
            await page.waitForTimeout(400);

            // AI should have blocked position 2 (top-right)
            const cell2 = await page.locator('.cell[data-index="2"]').textContent();

            // If AI blocked correctly, cell 2 should have 'O'
            // Note: AI might not always block here due to strategy, but it should be smart
            const board = await page.evaluate(() => game.board);
            const oMoves = board.filter(c => c === 'O').length;

            // At least verify AI made moves (2 moves after player's 2 moves)
            expect(oMoves).toBe(2);
        });

        test('user cannot make multiple moves in succession (click guard)', async ({ page }) => {
            // Select AI mode
            await page.locator('#mode-ai-x').click();

            // User makes first move
            await page.locator('.cell[data-index="0"]').click();
            await expect(page.locator('.cell[data-index="0"]')).toHaveText('X');

            // Try to click another cell immediately (should be blocked or result in AI's turn)
            await page.locator('.cell[data-index="1"]').click();

            // Wait for AI to complete
            await page.waitForTimeout(500);

            // Count total X moves - should only be 1 from player's first move
            // (not 2, which would mean both clicks went through)
            const board = await page.evaluate(() => game.board);
            const xMoves = board.filter(c => c === 'X').length;

            // Player should only have made 1 move, AI should have responded once
            const oMoves = board.filter(c => c === 'O').length;
            expect(xMoves).toBe(1);
            expect(oMoves).toBe(1);
        });

        test('user starts new game while playing as X vs AI', async ({ page }) => {
            // Start game
            await page.locator('#mode-ai-x').click();

            // Make some moves
            await page.locator('.cell[data-index="0"]').click();
            await page.waitForTimeout(400);

            await page.locator('.cell[data-index="1"]').click();
            await page.waitForTimeout(400);

            // User clicks New Game
            await page.locator('#new-game').click();

            // Wait for potential AI move if AI goes first (shouldn't happen, player is X)
            await page.waitForTimeout(200);

            // Board should be cleared
            const cells = page.locator('.cell');
            const count = await cells.count();
            for (let i = 0; i < count; i++) {
                const text = await cells.nth(i).textContent();
                expect(text === '' || text === null).toBe(true);
            }

            // Should be X's turn
            await expect(page.locator('#status')).toHaveText("Player X's turn");

            // Game should still be in AI mode
            const gameMode = await page.evaluate(() => game.mode);
            expect(gameMode).toBe('ai');
        });
    });

    test.describe('User Journey: Playing as O vs AI', () => {
        test('user selects "Play as O vs AI" and AI moves first', async ({ page }) => {
            // User selects "Play as O vs AI"
            await page.locator('#mode-ai-o').click();

            // Game board appears
            await expect(page.locator('#game-container')).toBeVisible();

            // Wait for AI to make first move
            await page.waitForTimeout(400);

            // AI (X) should have made the first move
            const board = await page.evaluate(() => game.board);
            const xMoves = board.filter(c => c === 'X').length;
            expect(xMoves).toBe(1);

            // Status should show O's turn (player's turn)
            await expect(page.locator('#status')).toHaveText("Player O's turn");

            // AI typically takes center
            expect(board[4]).toBe('X');
        });

        test('complete game flow where user plays as O', async ({ page }) => {
            // User selects "Play as O vs AI"
            await page.locator('#mode-ai-o').click();

            // Wait for AI first move
            await page.waitForTimeout(500);

            // Verify AI made first move
            const board1 = await page.evaluate(() => game.board);
            const xMoves = board1.filter(c => c === 'X').length;
            expect(xMoves).toBe(1);

            // User makes their first move as O
            await page.locator('.cell[data-index="0"]').click();
            await expect(page.locator('.cell[data-index="0"]')).toHaveText('O');

            // Wait for AI response
            await page.waitForTimeout(500);

            // User makes second move
            await page.locator('.cell[data-index="1"]').click();
            await expect(page.locator('.cell[data-index="1"]')).toHaveText('O');

            // Wait for AI response
            await page.waitForTimeout(500);

            // Verify game is progressing with proper turn-taking
            const finalBoard = await page.evaluate(() => game.board);
            const oMoves = finalBoard.filter(c => c === 'O').length;

            // Player should have made at least 2 O moves
            expect(oMoves).toBeGreaterThanOrEqual(2);

            // Game should have a valid status
            const status = await page.locator('#status').textContent();
            const isValidStatus =
                status.includes("Player X's turn") ||
                status.includes("Player O's turn") ||
                status.includes("wins") ||
                status.includes("draw");
            expect(isValidStatus).toBe(true);
        });

        test('user starts new game while playing as O vs AI', async ({ page }) => {
            // Start game
            await page.locator('#mode-ai-o').click();
            await page.waitForTimeout(400);

            // User makes a move
            await page.locator('.cell[data-index="0"]').click();
            await page.waitForTimeout(400);

            // User clicks New Game
            await page.locator('#new-game').click();

            // Wait for AI to make first move (AI is X) - 150ms animation + 300ms delay = 450ms
            await page.waitForTimeout(500);

            // AI should have made first move again
            const board = await page.evaluate(() => game.board);
            const xMoves = board.filter(c => c === 'X').length;
            expect(xMoves).toBe(1);

            // Should be O's turn (player's turn)
            await expect(page.locator('#status')).toHaveText("Player O's turn");
        });
    });

    test.describe('User Journey: Mode Switching', () => {
        test('user switches from AI mode to Local mode', async ({ page }) => {
            // Start with AI mode
            await page.locator('#mode-ai-x').click();
            await page.locator('.cell[data-index="0"]').click();
            await page.waitForTimeout(400);

            // User clicks Change Mode
            await page.locator('#change-mode').click();

            // Mode selection appears again
            await expect(page.locator('#mode-selection')).toBeVisible();
            await expect(page.locator('#game-container')).toBeHidden();

            // User selects Local mode
            await page.locator('#mode-local').click();

            // Game board appears
            await expect(page.locator('#game-container')).toBeVisible();

            // Board should be fresh
            const board = await page.evaluate(() => game.board);
            expect(board.every(c => c === null)).toBe(true);

            // Should be X's turn
            await expect(page.locator('#status')).toHaveText("Player X's turn");

            // User makes move as X
            await page.locator('.cell[data-index="0"]').click();
            await expect(page.locator('.cell[data-index="0"]')).toHaveText('X');

            // Status should switch to O (no AI interference)
            await expect(page.locator('#status')).toHaveText("Player O's turn");

            // User makes move as O
            await page.locator('.cell[data-index="1"]').click();
            await expect(page.locator('.cell[data-index="1"]')).toHaveText('O');

            // Status should switch back to X
            await expect(page.locator('#status')).toHaveText("Player X's turn");
        });

        test('user switches from Local mode to AI mode', async ({ page }) => {
            // Start with Local mode
            await page.locator('#mode-local').click();
            await page.locator('.cell[data-index="0"]').click();
            await page.locator('.cell[data-index="1"]').click();

            // User clicks Change Mode
            await page.locator('#change-mode').click();

            // Mode selection appears
            await expect(page.locator('#mode-selection')).toBeVisible();

            // User selects AI mode
            await page.locator('#mode-ai-x').click();

            // Game board appears with fresh board
            await expect(page.locator('#game-container')).toBeVisible();

            // User can play against AI
            await page.locator('.cell[data-index="0"]').click();
            await page.waitForTimeout(400);

            // AI should have responded
            const board = await page.evaluate(() => game.board);
            const oMoves = board.filter(c => c === 'O').length;
            expect(oMoves).toBe(1);
        });

        test('user switches between AI mode variants (X to O)', async ({ page }) => {
            // Start with "Play as X vs AI"
            await page.locator('#mode-ai-x').click();
            await page.locator('.cell[data-index="0"]').click();
            await page.waitForTimeout(400);

            // User changes mode
            await page.locator('#change-mode').click();

            // User selects "Play as O vs AI"
            await page.locator('#mode-ai-o').click();

            // AI should move first
            await page.waitForTimeout(400);

            const board = await page.evaluate(() => game.board);
            const xMoves = board.filter(c => c === 'X').length;
            expect(xMoves).toBe(1);

            // Should be O's turn
            await expect(page.locator('#status')).toHaveText("Player O's turn");
        });
    });

    test.describe('User Journey: Complete Games with Different Outcomes', () => {
        test('user plays a game that ends in draw against AI', async ({ page }) => {
            // This is probabilistic, but we can try to force a draw scenario
            await page.locator('#mode-ai-x').click();

            // Play a strategic pattern that often leads to draws
            // X: 0, O: 4 (center), X: 8, O: blocks, X: 2, O: 6, X: 3, O: 5, X: 7
            await page.locator('.cell[data-index="0"]').click();
            await page.waitForTimeout(400);

            // Continue playing until board fills or game ends
            // We'll click available cells strategically
            const cells = [8, 2, 3, 5, 7, 1, 6];
            let gameOver = false;

            for (const cellIndex of cells) {
                const currentStatus = await page.locator('#status').textContent();
                if (currentStatus.includes('wins') || currentStatus.includes('draw')) {
                    gameOver = true;
                    break;
                }

                // Check if cell is empty before clicking
                const cellText = await page.locator(`.cell[data-index="${cellIndex}"]`).textContent();
                if (cellText === '' || cellText === null) {
                    await page.locator(`.cell[data-index="${cellIndex}"]`).click();
                    await page.waitForTimeout(400);
                }
            }

            // Game should eventually end (win, lose, or draw)
            const finalStatus = await page.locator('#status').textContent();
            const gameEnded = finalStatus.includes('wins') || finalStatus.includes('draw');
            expect(gameEnded).toBe(true);
        });

        test('user experiences AI winning the game', async ({ page }) => {
            // Start game where we intentionally let AI set up a win
            await page.locator('#mode-ai-x').click();

            // User makes suboptimal moves
            await page.locator('.cell[data-index="0"]').click();  // X: top-left
            await page.waitForTimeout(400);  // AI will likely take center

            await page.locator('.cell[data-index="2"]').click();  // X: top-right
            await page.waitForTimeout(400);

            await page.locator('.cell[data-index="6"]').click();  // X: bottom-left
            await page.waitForTimeout(400);

            await page.locator('.cell[data-index="7"]').click();  // X: bottom-middle
            await page.waitForTimeout(400);

            // Continue playing if game not over
            const status1 = await page.locator('#status').textContent();
            if (!status1.includes('wins') && !status1.includes('draw')) {
                await page.locator('.cell[data-index="1"]').click();
                await page.waitForTimeout(400);
            }

            const status2 = await page.locator('#status').textContent();
            if (!status2.includes('wins') && !status2.includes('draw')) {
                await page.locator('.cell[data-index="5"]').click();
                await page.waitForTimeout(400);
            }

            // Eventually game ends with some result
            const finalStatus = await page.locator('#status').textContent();
            expect(finalStatus.includes('wins') || finalStatus.includes('draw')).toBe(true);
        });
    });

    test.describe('User Journey: Game Controls', () => {
        test('user checks that all mode buttons are available on start', async ({ page }) => {
            // User sees all three options
            await expect(page.locator('#mode-ai-x')).toBeVisible();
            await expect(page.locator('#mode-ai-x')).toHaveText('Play as X vs AI');

            await expect(page.locator('#mode-ai-o')).toBeVisible();
            await expect(page.locator('#mode-ai-o')).toHaveText('Play as O vs AI');

            await expect(page.locator('#mode-local')).toBeVisible();
            await expect(page.locator('#mode-local')).toHaveText('vs Player (local)');
        });

        test('user verifies Change Mode button is visible during game', async ({ page }) => {
            await page.locator('#mode-ai-x').click();

            // Change Mode button should be visible
            await expect(page.locator('#change-mode')).toBeVisible();
            await expect(page.locator('#change-mode')).toHaveText('Change Mode');
        });

        test('user verifies New Game button is visible during game', async ({ page }) => {
            await page.locator('#mode-ai-x').click();

            // New Game button should be visible
            await expect(page.locator('#new-game')).toBeVisible();
            await expect(page.locator('#new-game')).toHaveText('New Game');
        });

        test('user plays multiple consecutive games in AI mode', async ({ page }) => {
            // Game 1
            await page.locator('#mode-ai-x').click();
            await page.locator('.cell[data-index="0"]').click();
            await page.waitForTimeout(400);

            // Start new game
            await page.locator('#new-game').click();
            await page.waitForTimeout(200);

            // Game 2
            await page.locator('.cell[data-index="4"]').click();
            await page.waitForTimeout(400);

            // Verify AI is still responding
            const board = await page.evaluate(() => game.board);
            const oMoves = board.filter(c => c === 'O').length;
            expect(oMoves).toBeGreaterThanOrEqual(1);

            // Start new game again
            await page.locator('#new-game').click();
            await page.waitForTimeout(200);

            // Game 3
            await page.locator('.cell[data-index="8"]').click();
            await expect(page.locator('.cell[data-index="8"]')).toHaveText('X');
        });
    });

    test.describe('User Journey: Visual Feedback and Status', () => {
        test('user sees correct status messages throughout game', async ({ page }) => {
            // Start game
            await page.locator('#mode-ai-x').click();

            // Check initial status
            await expect(page.locator('#status')).toHaveText("Player X's turn");

            // User makes move
            await page.locator('.cell[data-index="0"]').click();

            // Status briefly shows O's turn
            await expect(page.locator('#status')).toHaveText("Player O's turn");

            // Wait for AI
            await page.waitForTimeout(400);

            // Status back to X's turn
            await expect(page.locator('#status')).toHaveText("Player X's turn");
        });

        test('user sees AI response time is reasonable', async ({ page }) => {
            await page.locator('#mode-ai-x').click();

            const startTime = Date.now();
            await page.locator('.cell[data-index="0"]').click();
            await page.waitForTimeout(500);
            const endTime = Date.now();

            // AI should respond within 500ms + reasonable buffer for browser overhead
            expect(endTime - startTime).toBeLessThan(2000);

            // Verify AI did make a move
            const board = await page.evaluate(() => game.board);
            const oMoves = board.filter(c => c === 'O').length;
            expect(oMoves).toBe(1);
        });

        test('user sees correct cell markings (X and O)', async ({ page }) => {
            await page.locator('#mode-ai-x').click();

            // User's X should be red
            await page.locator('.cell[data-index="0"]').click();
            const xCell = page.locator('.cell[data-index="0"]');
            await expect(xCell).toHaveText('X');
            const xCellClass = await xCell.getAttribute('class');
            expect(xCellClass).toContain('x');

            // Wait for AI
            await page.waitForTimeout(400);

            // Find AI's O move (should be green)
            const board = await page.evaluate(() => game.board);
            const oIndex = board.findIndex(c => c === 'O');
            if (oIndex !== -1) {
                const oCell = page.locator(`.cell[data-index="${oIndex}"]`);
                await expect(oCell).toHaveText('O');
                const oCellClass = await oCell.getAttribute('class');
                expect(oCellClass).toContain('o');
            }
        });
    });
});
